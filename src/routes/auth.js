import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { deleteUserVectors } from '../db/vector.js';
import { endSession, hashPassword, requireAuth, startSession, verifyPassword } from '../lib/auth.js';
import { badRequest, EMPTY_PROFILE, HttpError } from '../lib/http.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });

authRouter.post('/signup', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const name = String(req.body.name ?? '').trim().slice(0, 80) || null;
  if (!EMAIL_RE.test(email)) throw badRequest('Enter a valid email address.');
  if (password.length < 8) throw badRequest('Password must be at least 8 characters.');
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'An account with this email already exists.');

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password), profile: { create: EMPTY_PROFILE } },
  });
  await startSession(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(String(req.body.password ?? ''), user.passwordHash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  await startSession(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user.id }, select: { onboarded: true } });
  res.json({ user: publicUser(req.user), onboarded: profile?.onboarded ?? false });
});

// Deletes the account, all relational data (cascade) and the user's vectors (PRD §53).
authRouter.delete('/account', requireAuth, async (req, res) => {
  await deleteUserVectors(req.user.id);
  await prisma.user.delete({ where: { id: req.user.id } });
  await endSession(req, res);
  res.json({ ok: true });
});
