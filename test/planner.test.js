import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMessageStreamer, normalizeUrl, sourcesFrom, verifyRecommendations } from '../src/agent/planner.js';
import { screenItems, screenNotes } from '../src/agent/screen.js';
import { localNow } from '../src/agent/dates.js';

test('createMessageStreamer streams the message field out of partial JSON', () => {
  const chunks = [];
  const stream = createMessageStreamer((t) => chunks.push(t));
  const full = JSON.stringify({ message: 'Try the **photo walk**\n"Old Delhi" — café ☕', intent: 'find_activities' });
  let raw = '';
  for (const ch of full.match(/.{1,5}/gs)) {
    raw += ch;
    stream(raw);
  }
  assert.equal(chunks.join(''), 'Try the **photo walk**\n"Old Delhi" — café ☕');
});

test('createMessageStreamer waits for incomplete escapes', () => {
  const chunks = [];
  const stream = createMessageStreamer((t) => chunks.push(t));
  stream('{"message":"a\\');
  stream('{"message":"a\\u00');
  stream('{"message":"a\\u00e9b"');
  assert.equal(chunks.join(''), 'aéb');
});

test('sourcesFrom collects search sources, opened pages and citations', () => {
  const response = {
    output: [
      { type: 'web_search_call', action: { type: 'search', sources: [{ type: 'url', url: 'https://a.com/x' }] } },
      { type: 'web_search_call', action: { type: 'open_page', url: 'https://b.com/y' } },
      { type: 'message', content: [{ type: 'output_text', annotations: [{ type: 'url_citation', url: 'https://c.com/z' }] }] },
    ],
  };
  assert.deepEqual(sourcesFrom(response), ['https://a.com/x', 'https://b.com/y', 'https://c.com/z']);
});

test('verifyRecommendations keeps only pages seen during the search', () => {
  const recs = [
    { title: 'Real', url: 'https://www.meetup.com/event/1/?utm_source=x' },
    { title: 'Invented', url: 'https://made-up.example/gala' },
    { title: 'Bad url', url: 'not a url' },
  ];
  const { kept, dropped } = verifyRecommendations(recs, ['https://meetup.com/event/1']);
  assert.deepEqual(kept.map((r) => r.title), ['Real']);
  assert.deepEqual(dropped.map((r) => r.title), ['Invented', 'Bad url']);
  assert.equal(normalizeUrl('https://www.A.com/b/'), 'a.com/b');
  assert.equal(normalizeUrl('https://delhi2go.in/x?utm_source=openai'), 'delhi2go.in/x');
});

test('verifyRecommendations keeps nothing when there is no source list, but honours allowed links', () => {
  const recs = [{ title: 'Unverifiable', url: 'https://a.com/1' }, { title: 'In plan', url: 'https://b.com/2' }];
  assert.deepEqual(verifyRecommendations(recs, []).kept, []);
  assert.deepEqual(verifyRecommendations(recs, [], ['https://b.com/2']).kept.map((r) => r.title), ['In plan']);
});

test('screenItems drops past-dated and over-budget items, keeps breaks and unknown prices', () => {
  const items = [
    { title: 'Past workshop', startDate: '2026-10-07', price: 500 },
    { title: 'Pricey concert', startDate: '2026-10-10', price: 4500 },
    { title: 'Free walk', startDate: '2026-10-10', price: 0 },
    { title: 'Unknown price', startDate: null, price: null },
    { title: 'Exactly at budget', startDate: '2026-10-08', price: 3000 },
    { title: 'Lunch', isBreak: true, startDate: '2026-10-01' },
  ];
  const { kept, dropped } = screenItems(items, { today: '2026-10-08', budgetMax: 3000 });
  assert.deepEqual(kept.map((i) => i.title), ['Free walk', 'Unknown price', 'Exactly at budget', 'Lunch']);
  assert.deepEqual(dropped.map((d) => `${d.item.title}:${d.reason}`), ['Past workshop:past', 'Pricey concert:budget']);
  assert.deepEqual(screenNotes(dropped, { budgetMax: 3000, currency: 'INR' }), [
    'Left out 1 suggestion over your ₹3,000 budget.',
    'Left out 1 suggestion with a date that has already passed.',
  ]);
});

test('screenItems with no budget only checks dates, and supports plan "day" fields', () => {
  const { kept } = screenItems([{ day: '2026-10-09', price: 99999 }, { day: '2026-10-07' }], { today: '2026-10-08', budgetMax: null, dateKey: 'day' });
  assert.equal(kept.length, 1);
});

test('localNow uses the given time zone and falls back for invalid ones', () => {
  const now = new Date('2026-10-07T22:15:00Z');
  assert.deepEqual(localNow({ timeZone: 'Asia/Kolkata', now }), { date: '2026-10-08', time: '03:45', weekday: 'Thursday', timeZone: 'Asia/Kolkata' });
  assert.equal(localNow({ timeZone: 'America/New_York', now }).date, '2026-10-07');
  assert.ok(localNow({ timeZone: 'Not/AZone', now }).timeZone);
});

test('screenItems drops items clearly beyond the travel limit, with a margin for estimates', () => {
  const items = [
    { title: 'Near', approxDistanceKm: 8 },
    { title: 'Just over (within margin)', approxDistanceKm: 11 },
    { title: 'Gurugram', approxDistanceKm: 28 },
    { title: 'Unknown', approxDistanceKm: null },
  ];
  const { kept, dropped } = screenItems(items, { today: '2026-10-08', maxDistanceKm: 10 });
  assert.deepEqual(kept.map((i) => i.title), ['Near', 'Just over (within margin)', 'Unknown']);
  assert.deepEqual(screenNotes(dropped, { maxDistanceKm: 10 }), ['Left out 1 suggestion farther than your 10 km travel limit.']);
  assert.equal(screenItems(items, { today: '2026-10-08', maxDistanceKm: null }).kept.length, 4);
});

test('screenItems drops outdoor items during a bad-weather window the model reported', () => {
  const weather = [
    { date: '2026-10-11', summary: 'Thunderstorms in the morning', outdoorUnsuitableFrom: '05:00', outdoorUnsuitableUntil: '12:00' },
    { date: '2026-10-12', summary: 'Rain all day', outdoorUnsuitableFrom: '06:00', outdoorUnsuitableUntil: '20:00' },
  ];
  const items = [
    { title: 'Sunday 7 AM walk', outdoor: true, startDate: '2026-10-11', startTime: '07:00' },
    { title: 'Sunday 5 PM walk', outdoor: true, startDate: '2026-10-11', startTime: '17:00' },
    { title: 'Sunday 7 AM museum', outdoor: false, startDate: '2026-10-11', startTime: '07:00' },
    { title: 'Park (any time) Sunday', outdoor: true, startDate: '2026-10-11', startTime: null },
    { title: 'Park (any time) Monday', outdoor: true, startDate: '2026-10-12', startTime: null },
    { title: 'Saturday walk', outdoor: true, startDate: '2026-10-10', startTime: '07:00' },
  ];
  const { kept, dropped } = screenItems(items, { today: '2026-10-08', weather });
  assert.deepEqual(kept.map((i) => i.title), ['Sunday 5 PM walk', 'Sunday 7 AM museum', 'Park (any time) Sunday', 'Saturday walk']);
  assert.deepEqual(dropped.map((d) => `${d.item.title}:${d.reason}`), ['Sunday 7 AM walk:weather', 'Park (any time) Monday:weather']);
  assert.deepEqual(screenNotes(dropped, {}), ['Left out 2 suggestions outdoors during the rain or storms forecast.']);
});

import { enforcePlanEdit } from '../src/agent/planMerge.js';

test('enforcePlanEdit keeps undeclared items and blocks additions on a pure remove', () => {
  const current = [
    { id: 'a', day: '2026-10-10', startTime: '09:00', title: 'Walk', kind: 'activity' },
    { id: 'b', day: '2026-10-10', startTime: '13:00', title: 'Lunch', kind: 'break' },
    { id: 'c', day: '2026-10-11', startTime: '11:00', title: 'Workshop', kind: 'activity' },
  ];
  // Model was asked to remove the walk, but also dropped the workshop and added two new things.
  const modelItems = [
    { existingItemId: 'b', title: 'Lunch', day: '2026-10-10', startTime: '13:00' },
    { existingItemId: null, title: 'New café', day: '2026-10-10', startTime: '10:00' },
    { existingItemId: null, title: 'New concert', day: '2026-10-11', startTime: '19:00' },
  ];
  const out = enforcePlanEdit(current, modelItems, { type: 'remove', removedItemIds: ['a'] });
  assert.deepEqual(out.map((i) => i.title).sort(), ['Lunch', 'Workshop']);

  // A replace keeps the new item and restores anything not declared removed.
  const replaced = enforcePlanEdit(current, [{ existingItemId: null, title: 'Museum', day: '2026-10-10', startTime: '09:00' }, { existingItemId: 'b', title: 'Lunch' }], { type: 'replace', removedItemIds: ['a'] });
  assert.deepEqual(replaced.map((i) => i.title).sort(), ['Lunch', 'Museum', 'Workshop']);

  // No planEdit (not an edit): model output passes through.
  assert.equal(enforcePlanEdit(current, modelItems, null), modelItems);
});
