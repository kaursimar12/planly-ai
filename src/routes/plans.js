import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { learnFromFeedback } from '../agent/learning.js';
import { saveMemory } from '../agent/memory.js';
import { badRequest, notFound } from '../lib/http.js';

export const plansRouter = Router();

const withItems = { items: { orderBy: { position: 'asc' } } };

async function ownPlan(req, id = req.params.id) {
  const plan = await prisma.plan.findFirst({ where: { id, userId: req.user.id }, include: withItems });
  if (!plan) throw notFound('Plan not found');
  return plan;
}

plansRouter.get('/plans', async (req, res) => {
  const plans = await prisma.plan.findMany({
    where: { userId: req.user.id, status: { in: ['saved', 'completed'] } },
    orderBy: { updatedAt: 'desc' },
    include: withItems,
  });
  res.json({ plans });
});

plansRouter.get('/plans/:id', async (req, res) => {
  res.json({ plan: await ownPlan(req) });
});

plansRouter.patch('/plans/:id', async (req, res) => {
  const plan = await ownPlan(req);
  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) data.title = req.body.title.trim().slice(0, 120);
  if (['draft', 'saved', 'completed'].includes(req.body.status)) data.status = req.body.status;
  res.json({ plan: await prisma.plan.update({ where: { id: plan.id }, data, include: withItems }) });
});

plansRouter.post('/plans/:id/duplicate', async (req, res) => {
  const { id, createdAt, updatedAt, items, conversationId, ...plan } = await ownPlan(req);
  const copy = await prisma.plan.create({
    data: {
      ...plan,
      title: `${plan.title} (copy)`,
      status: 'saved',
      items: { create: items.map(({ id: _id, planId, ...item }) => item) },
    },
    include: withItems,
  });
  res.status(201).json({ plan: copy });
});

plansRouter.delete('/plans/:id', async (req, res) => {
  await prisma.plan.delete({ where: { id: (await ownPlan(req)).id } });
  res.json({ ok: true });
});

plansRouter.delete('/plans/:id/items/:itemId', async (req, res) => {
  const plan = await ownPlan(req);
  const item = plan.items.find((i) => i.id === req.params.itemId);
  if (!item) throw notFound('Plan item not found');
  await prisma.planItem.delete({ where: { id: item.id } });
  res.json({ plan: await ownPlan(req) });
});

// Explicit feedback (PRD §13, §45) on a recommendation or a plan item.
const RATINGS = ['loved', 'liked', 'okay', 'disliked', 'never'];
const REASONS = ['too_expensive', 'too_far', 'not_interested', 'already_visited', 'too_crowded', 'wrong_time', 'not_social_enough', 'weather'];

plansRouter.post('/feedback', async (req, res) => {
  const { recommendationId, planItemId, rating } = req.body;
  const reason = REASONS.includes(req.body.reason) ? req.body.reason : null;
  if (!RATINGS.includes(rating)) throw badRequest('Invalid rating.');

  let subject;
  let category;
  if (recommendationId) {
    const rec = await prisma.recommendation.findFirst({ where: { id: recommendationId, userId: req.user.id } });
    if (!rec) throw notFound('Recommendation not found');
    ({ title: subject, category } = rec);
  } else if (planItemId) {
    const item = await prisma.planItem.findFirst({ where: { id: planItemId, plan: { userId: req.user.id } } });
    if (!item) throw notFound('Plan item not found');
    ({ title: subject, category } = item);
  } else {
    throw badRequest('recommendationId or planItemId is required.');
  }

  const feedback = await prisma.feedback.create({
    data: { userId: req.user.id, recommendationId: recommendationId ?? null, planItemId: planItemId ?? null, subject, category, rating, reason },
  });
  await learnFromFeedback(req.user.id, { subject, category, rating });

  // Strong reactions to things the user actually did become experience memories.
  if (planItemId && ['loved', 'disliked'].includes(rating)) {
    await saveMemory(req.user.id, `${rating === 'loved' ? 'Loved' : 'Did not enjoy'} "${subject}"${category ? ` (${category.replace(/_/g, ' ')})` : ''}`, {
      kind: 'experience',
      source: 'feedback',
    }).catch(() => {});
  }
  res.status(201).json({ feedback });
});
