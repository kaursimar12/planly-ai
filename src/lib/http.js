export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);

export function stringList(value, max = 30) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  for (const v of value) {
    if (typeof v !== 'string') continue;
    const s = v.trim().slice(0, 60);
    if (s) seen.add(s);
  }
  return [...seen].slice(0, max);
}

export function optionalInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw badRequest(`Not a number: ${value}`);
  return Math.round(n);
}

// Prisma can't express JSON defaults on SQLite, so new rows set them explicitly.
export const EMPTY_PROFILE = { interests: [], hobbies: [], dislikes: [] };

// Normalized key used for preferences and keyword matching: "Board Games" -> "board games"
export const normalizeKey = (s) => String(s).toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 80);
