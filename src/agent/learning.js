// Preference learning (PRD §15–19, §49, §52): explicit vs stated vs inferred, confidence, history.
import { prisma } from '../db/prisma.js';
import { normalizeKey } from '../lib/http.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export async function upsertPreference(userId, key, { weight, confidence, kind, source }) {
  const data = { weight: clamp(weight, -1, 1), confidence: clamp(confidence, 0, 1), kind, source };
  const pref = await prisma.preference.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, ...data },
    update: data,
  });
  await prisma.preferenceHistory.create({
    data: { preferenceId: pref.id, weight: pref.weight, confidence: pref.confidence, source },
  });
  return pref;
}

/** Mirrors the profile form into explicit preferences and drops explicit ones the user removed. */
export async function syncProfilePreferences(userId, profile) {
  const wanted = new Map();
  for (const s of [...profile.interests, ...profile.hobbies]) wanted.set(normalizeKey(s), 1);
  for (const s of profile.dislikes) wanted.set(normalizeKey(s), -1);

  const existing = await prisma.preference.findMany({ where: { userId, kind: 'explicit', source: 'profile' } });
  const stale = existing.filter((p) => !wanted.has(p.key)).map((p) => p.id);
  if (stale.length) await prisma.preference.deleteMany({ where: { id: { in: stale } } });

  for (const [key, weight] of wanted) {
    const current = existing.find((p) => p.key === key);
    if (current && current.weight === weight) continue;
    await upsertPreference(userId, key, { weight, confidence: 1, kind: 'explicit', source: 'profile' });
  }
}

const FEEDBACK_DELTA = { loved: 0.3, liked: 0.15, okay: 0, disliked: -0.2, never: -0.35 };

export async function learnFromFeedback(userId, { subject, category, rating }) {
  if (rating === 'never') {
    await upsertPreference(userId, `never:${normalizeKey(subject)}`, { weight: -1, confidence: 1, kind: 'explicit', source: 'feedback' });
  }
  if (!category) return;
  const key = `category:${category}`;
  const existing = await prisma.preference.findUnique({ where: { userId_key: { userId, key } } });
  const delta = FEEDBACK_DELTA[rating] ?? 0;
  if (!existing && delta === 0) return;
  await upsertPreference(userId, key, {
    weight: (existing?.weight ?? 0) + delta,
    confidence: existing ? existing.confidence + 0.1 : 0.4,
    kind: 'inferred',
    source: 'feedback',
  });
}

/**
 * A long-term statement from chat ("I don't like trekking").
 * A single statement is stored with moderate confidence; repeats raise it.
 * If it contradicts the profile, nothing is written and a confirmation request is returned instead (PRD §49).
 */
export async function learnFromStatement(userId, profile, { subject, sentiment, confidence }) {
  const key = normalizeKey(subject);
  if (!key) return null;
  const sign = sentiment === 'like' ? 1 : -1;
  const interests = [...profile.interests, ...profile.hobbies].map(normalizeKey);
  const dislikes = profile.dislikes.map(normalizeKey);
  const existing = await prisma.preference.findUnique({ where: { userId_key: { userId, key } } });

  const contradictsProfile = sign < 0 ? interests.includes(key) : dislikes.includes(key);
  const contradictsLearned = existing && Math.sign(existing.weight) === -sign && Math.abs(existing.weight) >= 0.3 && existing.kind !== 'inferred';
  if (contradictsProfile || contradictsLearned) {
    return { key, subject, sentiment };
  }

  if (existing && Math.sign(existing.weight) === sign) {
    await upsertPreference(userId, key, {
      weight: sign * Math.max(Math.abs(existing.weight), 0.6),
      confidence: existing.confidence + 0.15,
      kind: existing.kind === 'explicit' ? 'explicit' : 'stated',
      source: 'conversation',
    });
  } else {
    await upsertPreference(userId, key, {
      weight: sign * 0.6,
      confidence: clamp(confidence * 0.7, 0.3, 0.7),
      kind: 'stated',
      source: 'conversation',
    });
  }
  return null;
}

/** The user confirmed a preference change: update the profile lists and make it explicit. */
export async function confirmPreferenceChange(userId, { key, sentiment }) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const k = normalizeKey(key);
  const without = (list) => list.filter((s) => normalizeKey(s) !== k);
  const interests = without(profile.interests);
  const hobbies = without(profile.hobbies);
  const dislikes = without(profile.dislikes);
  if (sentiment === 'like') interests.push(k);
  else dislikes.push(k);

  await prisma.profile.update({ where: { userId }, data: { interests, hobbies, dislikes } });
  await upsertPreference(userId, k, { weight: sentiment === 'like' ? 1 : -1, confidence: 1, kind: 'explicit', source: 'profile' });
}
