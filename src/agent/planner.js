// Runs the planner LLM call: web search + structured answer, streamed.
import { config } from '../config.js';
import { openai } from '../lib/openai.js';
import { PLANNER_INSTRUCTIONS, PLANNER_SCHEMA, RESEARCH_INSTRUCTIONS } from './prompts.js';

/**
 * Streams the "message" field out of a growing JSON document (it's the first key in the schema),
 * calling onDelta with each newly completed piece of text.
 */
export function createMessageStreamer(onDelta) {
  const ESCAPES = { n: '\n', t: '\t', r: '', b: '', f: '', '"': '"', '\\': '\\', '/': '/' };
  let sent = 0;
  return (raw) => {
    const key = raw.indexOf('"message"');
    if (key < 0) return;
    const colon = raw.indexOf(':', key + 9);
    if (colon < 0) return;
    const open = raw.indexOf('"', colon + 1);
    if (open < 0) return;
    let text = '';
    for (let i = open + 1; i < raw.length; ) {
      const ch = raw[i];
      if (ch === '"') break;
      if (ch === '\\') {
        const next = raw[i + 1];
        if (next === undefined) break;
        if (next === 'u') {
          if (i + 6 > raw.length) break;
          text += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16));
          i += 6;
        } else {
          text += ESCAPES[next] ?? next;
          i += 2;
        }
        continue;
      }
      text += ch;
      i += 1;
    }
    if (text.length > sent) {
      onDelta(text.slice(sent));
      sent = text.length;
    }
  };
}

/** URLs the model actually saw: web search sources, opened pages and citations. */
export function sourcesFrom(response) {
  const urls = [];
  for (const item of response?.output ?? []) {
    if (item.type === 'web_search_call') {
      for (const s of item.action?.sources ?? []) urls.push(s.url);
      if (item.action?.url) urls.push(item.action.url);
    }
    if (item.type === 'message') {
      for (const c of item.content ?? []) for (const a of c.annotations ?? []) if (a.type === 'url_citation') urls.push(a.url);
    }
  }
  return urls;
}

// Compare URLs without tracking params, fragments, "www." or trailing slashes.
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    for (const p of [...u.searchParams.keys()]) if (p.startsWith('utm_')) u.searchParams.delete(p);
    return `${u.host.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Keeps only items whose URL is a real http(s) page the model saw during this search (or `allowed` extras,
 * such as links already in the user's plan). With no source list nothing can be verified, so nothing is kept.
 */
export function verifyRecommendations(recommendations, sources, allowed = []) {
  const seen = new Set([...sources, ...allowed].map(normalizeUrl).filter(Boolean));
  const kept = [];
  const dropped = [];
  for (const r of recommendations) {
    const url = r.url && /^https?:\/\//.test(r.url) ? normalizeUrl(r.url) : null;
    (url && seen.has(url) ? kept : dropped).push(r);
  }
  return { kept, dropped };
}

/** Consumes a Responses API stream, reporting search progress and text deltas. Returns the final response. */
async function consume(stream, { onStatus, onText }) {
  let response = null;
  let searches = 0;
  for await (const event of stream) {
    switch (event.type) {
      case 'response.web_search_call.searching':
        searches += 1;
        onStatus?.(searches === 1 ? 'Searching the web…' : `Searching the web (${searches})…`);
        break;
      case 'response.web_search_call.completed':
        onStatus?.('Reading what I found…');
        break;
      case 'response.output_text.delta':
        onText?.(event.delta);
        break;
      case 'response.completed':
        response = event.response;
        break;
      case 'response.failed':
      case 'response.incomplete':
        throw new Error(event.response?.error?.message ?? event.response?.incomplete_details?.reason ?? 'The AI response did not complete.');
      case 'error':
        throw new Error(event.message ?? 'The AI service returned an error.');
      default:
    }
  }
  return response;
}

/**
 * Two LLM calls:
 *  1. research: required live web search in text mode, which returns real cited URLs
 *     (in strict-JSON mode the model drops the links);
 *  2. answer: turns the research into the structured reply, streamed. It may only use the researched options.
 */
export async function runPlanner({ input, onStatus = () => {}, onDelta = () => {} }) {
  let notes = '';
  const researched = await consume(
    await openai().responses.create({
      model: config.openaiModel,
      instructions: RESEARCH_INSTRUCTIONS,
      input,
      tools: [{ type: 'web_search' }],
      tool_choice: 'required',
      include: ['web_search_call.action.sources'],
      stream: true,
    }),
    { onStatus, onText: (t) => { notes += t; } },
  );
  const sources = [...new Set(sourcesFrom(researched))];

  onStatus('Picking the best options for you…');
  const output = await answer({ input, notes, sources, onDelta });
  return { output, sources, notes };
}

/**
 * The structured answer step on its own, streamed. `feedback` asks the model to revise its previous answer
 * (e.g. some options were removed for being too far) using the same research notes, with no new search.
 */
export async function answer({ input, notes, sources, feedback = '', onDelta = () => {} }) {
  const streamMessage = createMessageStreamer(onDelta);
  let raw = '';
  await consume(
    await openai().responses.create({
      model: config.openaiModel,
      instructions: PLANNER_INSTRUCTIONS,
      input: `${input}\n\nResearch notes from a live web search just now:\n${notes}\n\nSource URLs found (copy these exactly):\n${sources.join('\n') || 'none'}${feedback ? `\n\n${feedback}` : ''}`,
      text: { format: { type: 'json_schema', name: 'planly_answer', schema: PLANNER_SCHEMA, strict: true } },
      stream: true,
    }),
    {
      onText: (t) => {
        raw += t;
        streamMessage(raw);
      },
    },
  );
  return JSON.parse(raw);
}
