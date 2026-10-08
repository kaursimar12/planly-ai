// Geocoding (Open-Meteo), reverse geocoding (Nominatim) and distance helpers. No API keys needed.
import { config } from '../config.js';

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'User-Agent': config.userAgent, Accept: 'application/json', ...options.headers },
    signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

export async function geocode(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(query)}`;
  const data = await fetchJson(url);
  const r = data.results?.[0];
  if (!r) return null;
  return {
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    city: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

/** All candidate matches for a place name (names like "Dwarka" or "Gurgaon" exist in several states). */
export async function geocodeAll(query, count = 10) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=${count}&language=en&format=json&name=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, { timeoutMs: 8000 });
  return (data.results ?? []).map((r) => ({ name: [r.name, r.admin1, r.country].filter(Boolean).join(', '), latitude: r.latitude, longitude: r.longitude }));
}

export async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${latitude}&lon=${longitude}`;
  try {
    const data = await fetchJson(url);
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.county ?? a.state_district ?? a.state;
    return { name: [city, a.state, a.country].filter(Boolean).join(', '), city, latitude, longitude };
  } catch {
    return { name: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`, city: null, latitude, longitude };
  }
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function mapUrl({ latitude, longitude, venue, address, city }) {
  if (latitude != null && longitude != null) {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  }
  const q = [venue, address, city].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
