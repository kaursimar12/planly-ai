import OpenAI from 'openai';
import { config } from '../config.js';

let client;

export function openai() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set. Add it to .env.');
    client = new OpenAI();
  }
  return client;
}

export async function embed(texts) {
  if (!texts.length) return [];
  const res = await openai().embeddings.create({
    model: config.embeddingModel,
    input: texts.map((t) => t.slice(0, 8000) || ' '),
  });
  return res.data.map((d) => d.embedding);
}
