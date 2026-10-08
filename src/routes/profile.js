import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { confirmPreferenceChange, syncProfilePreferences } from '../agent/learning.js';
import { editMemory, removeMemory } from '../agent/memory.js';
import { badRequest, EMPTY_PROFILE, normalizeKey, notFound, optionalInt, stringList } from '../lib/http.js';
import { geocode, reverseGeocode } from '../tools/geo.js';

export const profileRouter = Router();

const GROUP_SIZES = ['solo', 'small', 'large', 'any'];
const INTENSITIES = ['low', 'moderate', 'high'];

profileRouter.get('/profile', async (req, res) => {
  const profile = await prisma.profile.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, ...EMPTY_PROFILE }, update: {} });
  res.json({ profile });
});

profileRouter.put('/profile', async (req, res) => {
  const b = req.body;
  const data = {
    interests: stringList(b.interests),
    hobbies: stringList(b.hobbies),
    dislikes: stringList(b.dislikes),
    budgetMin: optionalInt(b.budgetMin),
    budgetMax: optionalInt(b.budgetMax),
    currency: /^[A-Z]{3}$/.test(b.currency ?? '') ? b.currency : 'INR',
    meetNewPeople: Boolean(b.meetNewPeople),
    groupSize: GROUP_SIZES.includes(b.groupSize) ? b.groupSize : null,
    activityIntensity: INTENSITIES.includes(b.activityIntensity) ? b.activityIntensity : null,
    maxDistanceKm: Math.min(Math.max(optionalInt(b.maxDistanceKm) ?? 25, 1), 500),
    onboarded: true,
  };
  if ((data.budgetMin ?? 0) < 0 || (data.budgetMax ?? 0) < 0) {
    throw badRequest("Budget can't be negative.");
  }
  if (data.budgetMin != null && data.budgetMax != null && data.budgetMin > data.budgetMax) {
    throw badRequest('Minimum budget is higher than maximum.');
  }

  // Location: precise coordinates only if the browser shared them; otherwise geocode the typed place.
  const current = await prisma.profile.findUnique({ where: { userId: req.user.id } });
  const lat = Number(b.latitude);
  const lon = Number(b.longitude);
  const locationName = typeof b.locationName === 'string' ? b.locationName.trim().slice(0, 120) : '';
  if (b.latitude != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    const place = await reverseGeocode(lat, lon);
    Object.assign(data, { locationName: place.name, latitude: lat, longitude: lon });
  } else if (!locationName) {
    Object.assign(data, { locationName: null, latitude: null, longitude: null });
  } else if (locationName !== current?.locationName) {
    const place = await geocode(locationName);
    if (!place) throw badRequest(`Couldn't find "${locationName}". Try a city name.`);
    Object.assign(data, { locationName: place.name, latitude: place.latitude, longitude: place.longitude });
  }

  const profile = await prisma.profile.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, ...data }, update: data });
  await syncProfilePreferences(req.user.id, profile);
  res.json({ profile });
});

// "What Planly knows about you" (PRD §24).
profileRouter.get('/memories', async (req, res) => {
  const [preferences, memories] = await Promise.all([
    prisma.preference.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' } }),
    prisma.memory.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({
    told: preferences.filter((p) => p.kind !== 'inferred'),
    learned: preferences.filter((p) => p.kind === 'inferred'),
    memories,
  });
});

async function ownMemory(req) {
  const memory = await prisma.memory.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!memory) throw notFound('Memory not found');
  return memory;
}

profileRouter.put('/memories/:id', async (req, res) => {
  const text = String(req.body.text ?? '').trim();
  if (!text) throw badRequest('Memory text is empty.');
  res.json({ memory: await editMemory(await ownMemory(req), text) });
});

profileRouter.delete('/memories/:id', async (req, res) => {
  await removeMemory(await ownMemory(req));
  res.json({ ok: true });
});

profileRouter.delete('/preferences/:id', async (req, res) => {
  const pref = await prisma.preference.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!pref) throw notFound('Preference not found');
  await prisma.preference.delete({ where: { id: pref.id } });

  // Profile-form preferences also live in the profile lists; drop them there so a later save doesn't restore them.
  if (pref.source === 'profile') {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    const without = (list) => list.filter((s) => normalizeKey(s) !== pref.key);
    await prisma.profile.update({
      where: { userId: req.user.id },
      data: { interests: without(profile.interests), hobbies: without(profile.hobbies), dislikes: without(profile.dislikes) },
    });
  }
  res.json({ ok: true });
});

// The user answered "yes" to "It sounds like your preference changed — update your profile?" (PRD §49).
profileRouter.post('/preferences/confirm', async (req, res) => {
  const key = normalizeKey(req.body.key ?? '');
  const sentiment = req.body.sentiment;
  if (!key || !['like', 'dislike'].includes(sentiment)) throw badRequest('Invalid preference change.');
  await confirmPreferenceChange(req.user.id, { key, sentiment });
  res.json({ profile: await prisma.profile.findUnique({ where: { userId: req.user.id } }) });
});
