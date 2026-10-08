// Checks on the LLM's output (it still chooses everything): drop items dated in the past, priced over budget,
// farther than the user's travel limit, or outdoors during bad weather the model itself reported for that day.

// Distances are the model's estimates, so allow a small margin before dropping.
const DISTANCE_MARGIN = 1.15;

/** Splits items into kept and dropped, with a reason for each dropped one. Breaks are always kept. */
export function screenItems(items, { today, budgetMax = null, maxDistanceKm = null, weather = [], dateKey = 'startDate', timeKey = 'startTime' }) {
  const badWeather = new Map(weather.filter((w) => w.outdoorUnsuitableFrom && w.outdoorUnsuitableUntil).map((w) => [w.date, w]));
  const kept = [];
  const dropped = [];
  for (const item of items) {
    const date = item[dateKey];
    const km = item.approxDistanceKm;
    if (item.isBreak) kept.push(item);
    else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today) dropped.push({ item, reason: 'past' });
    else if (budgetMax != null && typeof item.price === 'number' && item.price > budgetMax) dropped.push({ item, reason: 'budget' });
    else if (maxDistanceKm != null && typeof km === 'number' && km > maxDistanceKm * DISTANCE_MARGIN) dropped.push({ item, reason: 'distance' });
    else if (item.outdoor && duringBadWeather(badWeather.get(date), item[timeKey])) dropped.push({ item, reason: 'weather' });
    else kept.push(item);
  }
  return { kept, dropped };
}

/**
 * True if an outdoor item falls in the day's bad-weather window. Untimed items (e.g. a park) only count when the
 * window covers most of the daytime, since they can be visited at another hour.
 */
function duringBadWeather(window, time) {
  if (!window) return false;
  const { outdoorUnsuitableFrom: from, outdoorUnsuitableUntil: until } = window;
  if (/^\d{2}:\d{2}$/.test(time ?? '')) return time >= from && time < until;
  return from <= '10:00' && until >= '18:00';
}

/** One user-facing note per reason, e.g. "Left out 1 suggestion over your ₹3,000 budget." */
export function screenNotes(dropped, { budgetMax, maxDistanceKm, currency = 'INR' }) {
  const count = (reason) => dropped.filter((d) => d.reason === reason).length;
  const plural = (n) => `${n} suggestion${n > 1 ? 's' : ''}`;
  const money = currency === 'INR' ? `₹${Number(budgetMax).toLocaleString('en-IN')}` : `${budgetMax} ${currency}`;
  const notes = [];
  if (count('budget')) notes.push(`Left out ${plural(count('budget'))} over your ${money} budget.`);
  if (count('distance')) notes.push(`Left out ${plural(count('distance'))} farther than your ${maxDistanceKm} km travel limit.`);
  if (count('weather')) notes.push(`Left out ${plural(count('weather'))} outdoors during the rain or storms forecast.`);
  if (count('past')) notes.push(`Left out ${plural(count('past'))} with a date that has already passed.`);
  return notes;
}
