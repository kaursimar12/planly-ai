import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { runAgent } from '../agent/graph.js';
import { badRequest, notFound } from '../lib/http.js';

export const chatRouter = Router();

async function ownConversation(req) {
  const conversation = await prisma.conversation.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!conversation) throw notFound('Conversation not found');
  return conversation;
}

chatRouter.get('/conversations', async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true },
    take: 50,
  });
  res.json({ conversations });
});

chatRouter.post('/conversations', async (req, res) => {
  const conversation = await prisma.conversation.create({ data: { userId: req.user.id, sessionState: {} } });
  res.status(201).json({ conversation });
});

chatRouter.get('/conversations/:id', async (req, res) => {
  const conversation = await ownConversation(req);
  const [messages, plan] = await Promise.all([
    prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' } }),
    conversation.sessionState?.currentPlanId
      ? prisma.plan.findUnique({ where: { id: conversation.sessionState.currentPlanId }, include: { items: { orderBy: { position: 'asc' } } } })
      : null,
  ]);
  res.json({ conversation: { id: conversation.id, title: conversation.title }, messages, plan });
});

chatRouter.delete('/conversations/:id', async (req, res) => {
  await prisma.conversation.delete({ where: { id: (await ownConversation(req)).id } });
  res.json({ ok: true });
});

// Runs the planning agent and streams progress as Server-Sent Events.
chatRouter.post('/conversations/:id/messages', async (req, res) => {
  const conversation = await ownConversation(req);
  const text = String(req.body.text ?? '').trim().slice(0, 2000);
  if (!text) throw badRequest('Message is empty.');

  const loc = req.body.location;
  const clientLocation =
    loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))
      ? { latitude: Number(loc.latitude), longitude: Number(loc.longitude) }
      : null;

  const history = (await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 8 })).reverse();

  await prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: text } });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { title: conversation.title ?? text.slice(0, 60), updatedAt: new Date() },
  });

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    // The browser's time zone, so "tonight" and "today" are in the user's local time.
    const timeZone = typeof req.body.timeZone === 'string' ? req.body.timeZone.slice(0, 64) : undefined;
    const result = await runAgent({ userId: req.user.id, conversation, text, clientLocation, timeZone, history, emit: send });
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.message,
        data: {
          recommendations: result.recommendations,
          planId: result.plan?.id ?? null,
          quickReplies: result.quickReplies,
          confirm: result.confirm,
          warnings: result.warnings,
        },
      },
    });
    send('result', { ...result, messageId: message.id });
  } catch (err) {
    console.error(err);
    send('error', { message: err.message || 'Something went wrong.' });
  }
  res.end();
});
