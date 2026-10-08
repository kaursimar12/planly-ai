import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';

const scrypt = promisify(crypto.scrypt);
export const SESSION_COOKIE = 'planly_session';

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionDays * 86400_000);
  await prisma.session.create({ data: { id: tokenHash(token), userId, expiresAt } });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    expires: expiresAt,
    path: '/',
  });
}

export async function endSession(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) await prisma.session.deleteMany({ where: { id: tokenHash(token) } });
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) {
    const session = await prisma.session.findUnique({ where: { id: tokenHash(token) }, include: { user: true } });
    if (session && session.expiresAt > new Date()) {
      req.user = session.user;
      return next();
    }
  }
  res.status(401).json({ error: 'Not signed in' });
}
