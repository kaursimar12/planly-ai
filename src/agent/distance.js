// Checks the LLM's distance estimates: geocodes the town each venue is in and measures from the user.
// The larger of the model's estimate and the measured town distance is used, so a venue in another city
// can't slip under the travel limit with an optimistic estimate.
import { geocodeAll, haversineKm } from '../tools/geo.js';

const cache = new Map();
// Place names repeat across regions ("Gurgaon", "Dwarka"), so take the match nearest the user,
// and ignore it if even that one is implausibly far (likely a different place entirely).
const IMPLAUSIBLE_KM = 500;

// Renamed cities the geocoder only knows by their current name.
const ALIASES = { gurgaon: 'Gurugram', bombay: 'Mumbai', calcutta: 'Kolkata', madras: 'Chennai', bangalore: 'Bengaluru', poona: 'Pune', 'new bombay': 'Navi Mumbai' };

function candidates(town) {
  const key = town.toLowerCase().trim();
  if (ALIASES[key]) return candidates(ALIASES[key]);
  if (!cache.has(key)) cache.set(key, geocodeAll(town).catch(() => []));
  return cache.get(key);
}

/** Distance in km from origin to the nearest place called `town`, or null if none is plausible. */
export async function townDistanceKm(town, origin) {
  const matches = await candidates(town);
  let best = null;
  for (const m of matches) {
    const km = haversineKm(origin.latitude, origin.longitude, m.latitude, m.longitude);
    if (best == null || km < best) best = km;
  }
  return best != null && best <= IMPLAUSIBLE_KM ? best : null;
}

/** Mutates items: sets approxDistanceKm to max(model estimate, measured distance to the item's town). */
export async function applyTownDistances(items, origin) {
  if (!origin || origin.latitude == null) return;
  const towns = [...new Set(items.map((i) => i.town).filter((t) => typeof t === 'string' && t.trim()))];
  const measured = new Map(await Promise.all(towns.map(async (t) => [t, await townDistanceKm(t, origin)])));
  for (const item of items) {
    const km = measured.get(item.town);
    if (km == null) continue;
    if (typeof item.approxDistanceKm !== 'number' || km > item.approxDistanceKm) item.approxDistanceKm = Math.round(km);
  }
}
