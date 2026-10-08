import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import { config } from './config.js';
import { requireAuth } from './lib/auth.js';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { plansRouter } from './routes/plans.js';
import { profileRouter } from './routes/profile.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Request bodies must be JSON, which a cross-site HTML form can't send (cookies are also SameSite=Lax).
app.use('/api', (req, res, next) => {
  if (req.is() !== null && !req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api', requireAuth, profileRouter, chatRouter, plansRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(publicDir, { extensions: ['html'] }));

app.use((err, req, res, _next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong.' : err.message });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(config.port, () => {
    console.log(`Planly AI running at http://localhost:${config.port}`);
    if (!process.env.OPENAI_API_KEY) console.warn('OPENAI_API_KEY is not set; chat will not work until you add it to .env.');
  });
}
