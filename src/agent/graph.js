// The Planly workflow as a LangGraph.js state graph. Every answer comes from the LLM:
//   loadContext  → gather what the LLM needs to know about the user (profile, learned preferences, memories, plan)
//   think        → ONE LLM call with live web search: understands the request, finds real options, picks
//                  recommendations, builds/edits the plan, extracts preferences. The reply streams as it's written.
//   save         → store recommendations, plan and what was learned
import { performance } from 'node:perf_hooks';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { prisma } from '../db/prisma.js';
import { normalizeKey } from '../lib/http.js';
import { mapUrl } from '../tools/geo.js';
import { localNow } from './dates.js';
import { applyTownDistances } from './distance.js';
import { enforcePlanEdit } from './planMerge.js';
import { learnFromStatement } from './learning.js';
import { recallMemories, saveMemory } from './memory.js';
import { answer, runPlanner, verifyRecommendations } from './planner.js';
import { screenItems, screenNotes } from './screen.js';

const withItems = { items: { orderBy: { position: 'asc' } } };

const State = Annotation.Root({
  userId: Annotation(),
  conversationId: Annotation(),
  text: Annotation(),
  clientLocation: Annotation(),
  now: Annotation(),
  history: Annotation(),
  sessionState: Annotation(),
  profile: Annotation(),
  preferences: Annotation(),
  memories: Annotation(),
  currentPlan: Annotation(),
  recentPlans: Annotation(),
  input: Annotation(),
  notes: Annotation(),
  output: Annotation(),
  sources: Annotation(),
  result: Annotation(),
});

const emit = (config, event, data) => config.configurable?.emit?.(event, data);
const status = (config, text) => emit(config, 'status', { text });

// ── Nodes ────────────────────────────────────────────────────────────────

async function loadContext(state, config) {
  status(config, 'Reading your preferences…');
  const { userId, sessionState } = state;
  const [profile, preferences, memories, currentPlan, recentPlans] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.preference.findMany({ where: { userId } }),
    recallMemories(userId, state.text, 5).catch(() => []),
    sessionState.currentPlanId ? prisma.plan.findUnique({ where: { id: sessionState.currentPlanId }, include: withItems }) : null,
    // Saved plans from other chats, so "same as last time" has something to refer to.
    prisma.plan.findMany({
      where: { userId, status: { in: ['saved', 'completed'] }, NOT: { conversationId: state.conversationId } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: withItems,
    }),
  ]);
  return { profile, preferences, memories, currentPlan, recentPlans };
}

function describeUser(state) {
  const { profile, preferences, memories, sessionState, clientLocation } = state;
  const likes = preferences.filter((p) => p.weight > 0.3 && !p.key.includes(':')).map((p) => `${p.key} (${p.kind})`);
  const dislikes = preferences.filter((p) => p.weight < -0.3 && !p.key.includes(':')).map((p) => p.key);
  const categories = preferences.filter((p) => p.key.startsWith('category:')).map((p) => `${p.key.slice(9)} ${p.weight > 0 ? 'liked' : 'disliked'} (from feedback)`);
  const never = preferences.filter((p) => p.key.startsWith('never:')).map((p) => p.key.slice(6));
  const location = clientLocation
    ? `Current position: ${clientLocation.latitude.toFixed(4)}, ${clientLocation.longitude.toFixed(4)}${profile.locationName ? ` (home: ${profile.locationName})` : ''}`
    : profile.locationName
      ? `Home location: ${profile.locationName}${profile.latitude != null ? ` (coordinates ${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)})` : ''}`
      : 'Location: unknown (ask the user for their city before searching)';

  return [
    location,
    `Interests: ${[...profile.interests, ...profile.hobbies].join(', ') || 'not set'}`,
    `Dislikes: ${[...new Set([...profile.dislikes, ...dislikes])].join(', ') || 'none stated'}`,
    likes.length && `Learned likes: ${likes.join(', ')}`,
    categories.length && `Feedback patterns: ${categories.join(', ')}`,
    never.length && `Never recommend: ${never.join(', ')}`,
    sessionState.exclusions?.length && `Avoid in this conversation: ${sessionState.exclusions.join(', ')}`,
    `Social: ${profile.meetNewPeople ? 'wants to meet new people' : 'no strong preference'}; preferred group size: ${profile.groupSize ?? 'any'}`,
    profile.activityIntensity && `Activity level: ${profile.activityIntensity}`,
    profile.budgetMax != null && `Budget per outing: ${profile.budgetMin ?? 0}–${profile.budgetMax} ${profile.currency}`,
    `Willing to travel: up to ${profile.maxDistanceKm} km`,
    memories.length && `Things they've told you before:\n${memories.map((m) => `- ${m.text}`).join('\n')}`,
    preferences.length && `Preference keys on file (reuse these exact words): ${preferences.filter((p) => !p.key.includes(':')).map((p) => p.key).join(', ')}`,
  ].filter(Boolean).join('\n');
}

const itemLine = (i) =>
  `- [id: ${i.id}] ${i.day} ${i.startTime ?? ''} ${i.title}${i.venue ? ` @ ${i.venue}` : ''}${i.priceText ? ` · ${i.priceText}` : ''}${i.url ? ` (${i.url})` : ''}${i.kind === 'break' ? ' [break]' : ''}`;

function describePlan(plan) {
  if (!plan) return 'Current plan: none.';
  return `Current plan "${plan.title}" (${plan.startDate} to ${plan.endDate}):\n${plan.items.map(itemLine).join('\n')}`;
}

function describeRecentPlans(plans) {
  if (!plans.length) return 'Saved plans from earlier chats: none.';
  return `Saved plans from earlier chats (most recent first):\n${plans
    .map((p) => `- "${p.title}" (${p.startDate}–${p.endDate}, ${p.status}): ${p.items.filter((i) => i.kind !== 'break').map((i) => i.title).join('; ')}`)
    .join('\n')}`;
}

async function think(state, config) {
  const { now } = state;
  const input = [
    `Now: ${now.weekday}, ${now.date}, ${now.time} local time (${now.timeZone}).`,
    `About the user:\n${describeUser(state)}`,
    describePlan(state.currentPlan),
    describeRecentPlans(state.recentPlans),
    state.history.length && `Recent conversation:\n${state.history.map((m) => `${m.role}: ${m.content.slice(0, 600)}`).join('\n')}`,
    `User's message: ${state.text}`,
  ].filter(Boolean).join('\n\n');

  status(config, 'Thinking…');
  const t = performance.now();
  const { output, sources, notes } = await runPlanner({
    input,
    onStatus: (text) => status(config, text),
    onDelta: (text) => {
      config.configurable.timings.firstToken ??= Math.round(performance.now() - config.configurable.startedAt);
      emit(config, 'delta', { text });
    },
  });
  config.configurable.timings.llm = Math.round(performance.now() - t);
  return { output, sources, notes, input };
}

const hostOf = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/**
 * Checks one LLM answer: copies kept plan items from the database, keeps only options whose source page was
 * visited, and drops past, over-budget or too-distant ones. Mutates output.plan; returns what's left.
 */
async function checkOutput(state, output, sources) {
  const { profile } = state;
  const warnings = [];

  // Plan edits must match what the model says it changed (no silent drops, no additions on "remove").
  if (output.plan && state.currentPlan && output.intent === 'modify_plan') {
    output.plan.items = enforcePlanEdit(state.currentPlan.items, output.plan.items, output.planEdit);
  }

  // Kept plan items are copied exactly from the database, so the model can't rewrite them.
  const existing = new Map((state.currentPlan?.items ?? []).map((i) => [i.id, i]));
  if (output.plan) {
    output.plan.items = output.plan.items.map((i) => {
      const old = existing.get(i.existingItemId);
      if (!old) return { ...i, existingItemId: null };
      return { ...i, title: old.title, venue: old.venue, address: old.address, url: old.url, price: old.price, priceText: old.priceText, note: old.note ?? i.note, isBreak: old.kind === 'break', original: old };
    });
  }

  // Only keep options the model actually found on a page during this search
  // (plan items may also keep links already in the current plan).
  const { kept: verified, dropped } = verifyRecommendations(output.recommendations, sources);
  const planUrls = state.currentPlan?.items.map((i) => i.url).filter(Boolean) ?? [];
  const planActivities = output.plan?.items.filter((i) => !i.isBreak) ?? [];
  const { kept: verifiedActivities } = verifyRecommendations(planActivities, sources, planUrls);
  const droppedCount = dropped.length + planActivities.length - verifiedActivities.length;
  if (droppedCount) warnings.push(`Left out ${droppedCount} suggestion${droppedCount > 1 ? 's' : ''} whose source page couldn't be verified.`);

  // Drop anything dated in the past, priced above the budget the model says applies, or (for local outings)
  // beyond the travel limit. Trips are meant to go further, so distance isn't checked for them.
  const budgetMax = output.budgetMax ?? profile.budgetMax;
  const maxDistanceKm = output.intent === 'plan_trip' ? null : profile.maxDistanceKm;
  if (maxDistanceKm != null) {
    const origin = state.clientLocation ?? (profile.latitude != null ? { latitude: profile.latitude, longitude: profile.longitude } : null);
    await applyTownDistances([...verified, ...verifiedActivities.filter((i) => !i.original)], origin);
  }
  const rules = { today: state.now.date, budgetMax, maxDistanceKm, weather: output.weather ?? [] };
  const recScreen = screenItems(verified, rules);
  const planScreen = screenItems(verifiedActivities.filter((i) => !i.original), { ...rules, dateKey: 'day' });
  planScreen.kept.push(...verifiedActivities.filter((i) => i.original)); // items the user already has stay
  const screened = [...recScreen.dropped, ...planScreen.dropped];
  warnings.push(...screenNotes(screened, { budgetMax, maxDistanceKm, currency: profile.currency }));
  if (output.plan) output.plan.items = output.plan.items.filter((i) => i.isBreak || planScreen.kept.includes(i));
  if (output.plan && !output.plan.items.some((i) => !i.isBreak)) output.plan = null;
  return { kept: recScreen.kept, screened, planDropped: planScreen.dropped.length, warnings, budgetMax, maxDistanceKm };
}

const MIN_OPTIONS = 3;

/** Tells the model which of its options the checks removed, so it can pick others from the same research. */
function revisionRequest(check, currency) {
  const why = ({ item, reason }) => {
    if (reason === 'distance') return `too far (about ${Math.round(item.approxDistanceKm)} km; limit ${check.maxDistanceKm} km)`;
    if (reason === 'budget') return `over budget (${item.priceText ?? item.price}; limit ${check.budgetMax} ${currency})`;
    if (reason === 'weather') return `outdoors during the bad weather you reported for ${item.startDate ?? item.day}`;
    return `date already passed (${item.startDate ?? item.day})`;
  };
  return [
    "Planly's checks removed these options from your previous answer:",
    ...check.screened.map((d) => `- "${d.item.title}": ${why(d)}`),
    'Give your complete answer again, replacing them with other options from the research notes that meet the limits',
    '(prefer venues close to the user). If not enough suitable options remain, give fewer and say so honestly.',
  ].join('\n');
}

async function save(state, config) {
  const { userId, conversationId, sources, profile } = state;
  let { output } = state;
  const city = profile.locationName?.split(',')[0];
  const retrievedAt = new Date().toISOString();

  let check = await checkOutput(state, output, sources);

  // If the checks left too little (e.g. most options were in another city), ask the model once to revise
  // from the same research notes. Still the model's answer, no new web search.
  const wantedOptions = output.recommendations.length > 0;
  if (check.screened.length && ((wantedOptions && check.kept.length < MIN_OPTIONS) || check.planDropped)) {
    const reasons = new Set(check.screened.map((d) => d.reason));
    status(config, reasons.has('distance') ? 'Finding options closer to you…' : reasons.has('weather') ? 'Swapping outdoor plans for the weather…' : 'Swapping out a few options…');
    emit(config, 'reset', {});
    const t = performance.now();
    output = await answer({
      input: state.input,
      notes: state.notes,
      sources,
      feedback: revisionRequest(check, profile.currency),
      onDelta: (text) => emit(config, 'delta', { text }),
    });
    config.configurable.timings.revision = Math.round(performance.now() - t);
    check = await checkOutput(state, output, sources);
  }

  const { kept, warnings } = check;
  const recommendations = [];
  for (const r of kept) {
    const candidate = {
      ...r,
      social: r.meetsPeople ? 8 : 3,
      distanceKm: typeof r.approxDistanceKm === 'number' ? Math.round(r.approxDistanceKm) : null,
      source: hostOf(r.url),
      retrievedAt,
      mapUrl: mapUrl({ venue: r.venue, address: r.address, city }),
    };
    const row = await prisma.recommendation.create({
      data: { userId, conversationId, title: r.title, category: r.category, data: candidate, scores: {}, reason: r.reason },
    });
    recommendations.push({ id: row.id, reason: r.reason, candidate });
  }

  // The LLM returns the complete plan when creating or changing one; it replaces the conversation's current plan.
  let plan = state.currentPlan;
  if (output.plan?.items.length) {
    // Show the timeline in order even if the model listed items out of sequence.
    output.plan.items.sort((a, b) => `${a.day} ${a.startTime}`.localeCompare(`${b.day} ${b.startTime}`));
    const items = output.plan.items.map((i, position) => {
      if (i.original) {
        // Unchanged item: keep every stored field; only the timing may move.
        const { id, planId, position: _p, ...copy } = i.original;
        return { ...copy, position, day: i.day, startTime: i.startTime, durationMin: i.durationMin };
      }
      return {
        position,
        day: i.day,
        startTime: i.startTime,
        durationMin: i.durationMin,
        title: i.title,
        kind: i.isBreak ? 'break' : 'activity',
        venue: i.venue,
        address: i.address,
        url: i.url,
        price: i.price,
        priceText: i.priceText,
        distanceKm: typeof i.approxDistanceKm === 'number' ? Math.round(i.approxDistanceKm) : null,
        note: i.note,
        mapUrl: i.isBreak ? null : mapUrl({ venue: i.venue, address: i.address, city }),
        source: i.url ? hostOf(i.url) : null,
        retrievedAt: i.isBreak ? null : new Date(retrievedAt),
      };
    });
    const planData = { title: output.plan.title, startDate: output.plan.startDate, endDate: output.plan.endDate };
    plan = state.currentPlan
      ? await prisma.$transaction(async (tx) => {
          await tx.planItem.deleteMany({ where: { planId: state.currentPlan.id } });
          return tx.plan.update({ where: { id: state.currentPlan.id }, data: { ...planData, items: { create: items } }, include: withItems });
        })
      : await prisma.plan.create({
          data: { userId, conversationId, locationName: profile.locationName, ...planData, items: { create: items } },
          include: withItems,
        });
  }

  // Learning (PRD §19, §23, §49).
  for (const text of output.memoriesToSave.slice(0, 3)) {
    await saveMemory(userId, text).catch((err) => warnings.push(`Couldn't save a memory (${err.message}).`));
  }
  let confirm = null;
  for (const statement of output.preferenceStatements.filter((p) => p.permanence === 'permanent')) {
    confirm ??= await learnFromStatement(userId, profile, statement);
  }
  const temporary = [
    ...output.temporaryExclusions,
    ...output.preferenceStatements.filter((p) => p.permanence === 'temporary' && p.sentiment === 'dislike').map((p) => p.subject),
  ].map(normalizeKey);

  const session = {
    ...state.sessionState,
    exclusions: [...new Set([...(state.sessionState.exclusions ?? []), ...temporary])],
    ...(plan ? { currentPlanId: plan.id } : {}),
  };
  await prisma.conversation.update({ where: { id: conversationId }, data: { sessionState: session } });

  return {
    output,
    result: {
      message: output.message,
      recommendations,
      plan: output.plan?.items.length ? plan : null,
      quickReplies: output.quickReplies.slice(0, 3),
      confirm,
      warnings,
    },
  };
}

// ── Graph ────────────────────────────────────────────────────────────────

function timed(name, fn) {
  return async (state, config) => {
    const t = performance.now();
    try {
      return await fn(state, config);
    } finally {
      config.configurable.timings[name] = Math.round(performance.now() - t);
    }
  };
}

const graph = new StateGraph(State)
  .addNode('loadContext', timed('loadContext', loadContext))
  .addNode('think', timed('think', think))
  .addNode('save', timed('save', save))
  .addEdge(START, 'loadContext')
  .addEdge('loadContext', 'think')
  .addEdge('think', 'save')
  .addEdge('save', END)
  .compile();

export async function runAgent({ userId, conversation, text, clientLocation, timeZone, history, emit: onEvent }) {
  const timings = {};
  const final = await graph.invoke(
    {
      userId,
      conversationId: conversation.id,
      text,
      clientLocation: clientLocation ?? null,
      now: localNow({ timeZone }),
      history,
      sessionState: conversation.sessionState ?? {},
    },
    { configurable: { emit: onEvent, timings, startedAt: performance.now() } },
  );
  console.log(`[agent] ${final.output.intent} ${JSON.stringify(timings)}`);
  return { ...final.result, timings };
}
