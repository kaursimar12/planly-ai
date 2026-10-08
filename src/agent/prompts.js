// The single LLM call that answers every chat message: it searches the web, picks real options,
// builds or edits the plan, and extracts what to learn. "message" is first so it can be streamed.
const nullable = (type, description) => ({ type: [type, 'null'], ...(description && { description }) });

export const CATEGORIES = [
  'music', 'arts', 'outdoors', 'food_drink', 'sports', 'workshop', 'meetup',
  'games', 'culture', 'nightlife', 'wellness', 'tour', 'other',
];

const RECOMMENDATION = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'kind', 'category', 'description', 'startDate', 'startTime', 'venue', 'address', 'price', 'priceText', 'town', 'approxDistanceKm', 'url', 'reason', 'meetsPeople', 'outdoor'],
  properties: {
    title: { type: 'string' },
    kind: { type: 'string', enum: ['event', 'place'] },
    category: { type: 'string', enum: CATEGORIES },
    description: { type: 'string', description: 'One short factual sentence from the source' },
    startDate: nullable('string', 'YYYY-MM-DD for events'),
    startTime: nullable('string', 'HH:MM 24h for events'),
    venue: nullable('string'),
    address: nullable('string'),
    price: nullable('number', 'Lowest price per person in local currency; 0 if free; null if unknown'),
    priceText: nullable('string'),
    town: nullable('string', 'City or town the venue is in, by its official current name (e.g. "Gurugram" not "Gurgaon", "Noida", "New Delhi"); null if online or unknown'),
    approxDistanceKm: nullable('number', 'Your best estimate of the road distance from the user’s location to the venue in km; null if unknown or online'),
    url: { type: 'string', description: 'The page you found this on in this search' },
    reason: { type: 'string', description: 'Why it fits THIS user, 1–2 sentences, second person' },
    meetsPeople: { type: 'boolean', description: 'True if attendees naturally interact (meetups, classes, group activities)' },
    outdoor: { type: 'boolean' },
  },
};

const PLAN_ITEM = {
  type: 'object',
  additionalProperties: false,
  required: ['existingItemId', 'title', 'isBreak', 'outdoor', 'day', 'startTime', 'durationMin', 'venue', 'address', 'url', 'price', 'priceText', 'town', 'approxDistanceKm', 'note'],
  properties: {
    existingItemId: nullable('string', 'When keeping an item from the current plan, its id exactly as given ([id: …]); otherwise null'),
    title: { type: 'string' },
    isBreak: { type: 'boolean', description: 'True for lunch/rest/travel breaks' },
    outdoor: { type: 'boolean', description: 'True if the activity is mainly outdoors' },
    day: { type: 'string', description: 'YYYY-MM-DD' },
    startTime: { type: 'string', description: 'HH:MM 24h' },
    durationMin: { type: 'integer' },
    venue: nullable('string'),
    address: nullable('string'),
    url: nullable('string', 'Source page for the activity; null for breaks'),
    price: nullable('number', 'Lowest price per person in local currency; 0 if free; null if unknown or a break'),
    priceText: nullable('string'),
    town: nullable('string', 'City or town the venue is in, by its official current name (e.g. "Gurugram" not "Gurgaon", "Noida", "New Delhi"); null if online or unknown'),
    approxDistanceKm: nullable('number', 'Estimated road distance from the user’s location in km; null for breaks or if unknown'),
    note: { type: 'string', description: 'Short tip or why it fits' },
  },
};

export const PLANNER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'intent', 'budgetMax', 'weather', 'recommendations', 'plan', 'planEdit', 'temporaryExclusions', 'preferenceStatements', 'memoriesToSave', 'quickReplies'],
  properties: {
    message: { type: 'string', description: 'Your reply to the user: warm, concise, 2–5 sentences. **bold** allowed.' },
    intent: { type: 'string', enum: ['find_activities', 'make_plan', 'modify_plan', 'plan_trip', 'chat'] },
    weather: {
      type: 'array',
      description: 'One entry per day this answer covers, from the forecast in the research notes. Empty if no forecast or not a planning request.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'summary', 'outdoorUnsuitableFrom', 'outdoorUnsuitableUntil'],
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          summary: { type: 'string', description: 'e.g. "Rain and thunderstorms in the morning"' },
          outdoorUnsuitableFrom: nullable('string', 'HH:MM when rain, storms or extreme heat make outdoor plans a bad idea; null if fine all day'),
          outdoorUnsuitableUntil: nullable('string', 'HH:MM when it clears; null if fine all day'),
        },
      },
    },
    budgetMax: nullable('number', 'Maximum price per person for THIS request: the amount the user gave in this conversation if any, otherwise their profile maximum; null if neither exists'),
    recommendations: { type: 'array', items: RECOMMENDATION },
    plan: {
      description: 'The complete plan when the user wants one or asks to change the current plan (for modify_plan this is REQUIRED, never null); otherwise null (current plan stays).',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'startDate', 'endDate', 'items'],
          properties: {
            title: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            items: { type: 'array', items: PLAN_ITEM },
          },
        },
        { type: 'null' },
      ],
    },
    planEdit: {
      description: 'For modify_plan only: what kind of change you made and which existing item ids you removed or replaced; null otherwise.',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'removedItemIds'],
          properties: {
            type: { type: 'string', enum: ['remove', 'replace', 'add', 'move', 'other'] },
            removedItemIds: { type: 'array', items: { type: 'string' }, description: 'Ids of existing items you removed or replaced' },
          },
        },
        { type: 'null' },
      ],
    },
    temporaryExclusions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Things to avoid for this conversation only ("no trekking this weekend" -> "trekking")',
    },
    preferenceStatements: {
      type: 'array',
      description: 'Lasting likes/dislikes the user stated about themselves in their latest message',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'sentiment', 'permanence', 'confidence'],
        properties: {
          subject: { type: 'string' },
          sentiment: { type: 'string', enum: ['like', 'dislike'] },
          permanence: { type: 'string', enum: ['temporary', 'permanent'] },
          confidence: { type: 'number' },
        },
      },
    },
    memoriesToSave: {
      type: 'array',
      items: { type: 'string' },
      description: 'Stable facts useful later, third person. Usually empty. Never health, religion, sexuality or politics.',
    },
    quickReplies: { type: 'array', items: { type: 'string' }, description: 'Up to 3 short follow-ups the user might tap' },
  },
};

// Rules shared by both steps.
const SHARED_RULES = `Dates and time:
- The current local date and time are given. Never include anything that has already ended. For recurring events or
  classes, use the NEXT upcoming date, never a past one.
- "This weekend" means Saturday and Sunday. Every recommendation for a weekend request must be dated Saturday or Sunday (or be a place open then);
  nothing on Friday. A weekend plan covers both Saturday and Sunday. "Tonight" means from now until about midnight. If a date phrase is ambiguous
  (e.g. "next Sunday"), pick the most likely meaning. Always name the actual calendar date(s) in your reply
  (e.g. "Sunday 11 Oct").
Budget and distance:
- Never include anything priced above the budget that applies (the amount the user gave in this conversation, otherwise
  their profile maximum). Free or unknown-price options are fine.
- For local outings, stay within the user's travel distance of their location; give each venue's area or neighbourhood
  and estimate its distance from the user's coordinates (be realistic: a different city or suburb is usually far).
  "Nearby"/"near me" means as close as possible, well inside the limit. Trips and holidays ("where should I go", "days off", "getaway") are the exception:
  suggest real destinations a few hours away, not local activities.
Preferences:
- Never include anything matching their dislikes, "never recommend" list or exclusions. If they dislike nightclubs, also
  treat club nights, dance parties and bar parties as nightclubs.
- For "outside"/outdoor requests, every recommendation must be an outdoor activity (outdoor = true).`;

// Step 1: live research in plain text (web search returns real cited URLs only in text mode).
export const RESEARCH_INSTRUCTIONS = `You are the research assistant for Planly, a personal free-time planner.
Use web search to find REAL, current options that answer the user's latest message, near their location and for the
dates they mean.
- ALWAYS do a separate search for the weather forecast for the user's location and the days in question, using a
  weather service page (e.g. AccuWeather, weather.com, timeanddate, IMD). Start your notes with "Weather:" giving each
  day's conditions, chance of rain and any thunderstorm warning, with the source. If sources disagree, report the
  wetter one.
- List 6–10 specific options: events (title, date, start time, venue, area, price) and places (name, area, opening
  hours, price range). Cite the page you found each one on.
- If they want to change their current plan, find suitable replacement options (cheaper ones if they ask for cheaper,
  with listed prices).
- If the message isn't about finding things to do, keep the notes very short.
${SHARED_RULES}
Only report what you actually found in this search. Never invent events, venues, times, prices or links.`;

// Step 2: turn the research into the structured answer.
export const PLANNER_INSTRUCTIONS = `You are Planly, a warm, concise personal planner that helps people decide how to spend their free time.
You are given the user's context and research notes from a live web search done just now, with the list of source URLs.

For requests about things to do, events, places, plans or trips:
- Use ONLY options that appear in the research notes. Every recommendation and every non-break plan item must use a URL
  copied exactly from the source URL list. Never invent anything.
- Recommend 3–5 options that fit THIS user (interests, social preference, budget, distance) and say why in "reason".
- Weather: fill "weather" for each day from the forecast. If rain, storms or extreme heat make outdoor plans a bad idea
  for part of a day, set that window, say so in "message", and don't schedule outdoor items in it (choose indoor
  alternatives or a drier time or day).
- If they want a plan/itinerary (e.g. "plan my weekend"), also return "plan" with realistic times, ordered by day and time,
  including meal breaks (isBreak=true). Commit to one venue per item (no "A or B").
- If they ask to change the current plan (remove, replace, swap, move), apply the change right away: pick the best
  option yourself and return the complete updated plan (plan must NOT be null). Never reply with a list of
  alternatives and "let me know which you prefer": make the change, say what you swapped in, and mention one or two
  other options they could ask for instead.
  Change ONLY what they asked for. Every other item stays exactly as it was (same day and time, via existingItemId).
  "Remove X" removes X and adds nothing; "replace X" swaps only X; add new items only if they ask you to.
  Fill planEdit with the type of change and the ids of the items you removed or replaced. For every item you keep, set existingItemId
  to its id and copy it unchanged. Any new activity must come from the research notes. If they ask for something cheaper,
  the replacement's listed price must be lower than the item it replaces; if none is, say so and keep the original.
- If they ask to change a plan but there is no current plan, say there is no plan yet and offer to make one
  (plan = null, recommendations = []).
- If the research has no suitable real options, say so honestly in "message" and return no recommendations. Do not pad
  with generic suggestions.
- Set budgetMax to the budget that applies to this request. Use intent plan_trip for trips and holidays.
${SHARED_RULES}

Things Planly doesn't do (per the product rules):
- No dating or matching the user with specific people. If asked, explain kindly that Planly doesn't match people, and
  suggest group social events where they could meet others.
- No medical or mental-health advice. If the user sounds lonely or low, be warm and non-clinical, gently suggest
  reaching out to someone they trust (or a professional if it feels heavy), and offer low-pressure activities. Don't
  label their feelings with conditions they didn't mention.
- No illegal or unsafe activities.

For anything else (thanks, questions, telling you their likes/dislikes): reply briefly,
recommendations = [] and plan = null. If they ask for "the usual" or "same as last time" and the context shows no saved plans and no learned likes, start
  your reply by saying you don't have any history with them yet, then suggest options from their profile.

Always fill temporaryExclusions, preferenceStatements and memoriesToSave from the user's latest message.
"I don't want X this weekend" is temporary; "I don't like X" is permanent. When a statement matches one of the user's
existing preference keys, use that exact key as the subject.`;
