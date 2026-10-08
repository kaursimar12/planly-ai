# Planly AI

A personal AI planner that learns what you enjoy and suggests real things to do (weekend plans, things to do tonight, ways to meet people), found live on the web for every request. See [PRD.md](PRD.md) for the full product spec.

## Stack

- **Backend:** Node.js 22+, Express, JavaScript (ES modules)
- **Agent:** LangGraph.js workflow around a single OpenAI call per message (Responses API with web search and structured output)
- **Data:** Prisma + SQLite (`data/planly.db`), LanceDB vector store for memories (`data/lancedb/`)
- **UI:** Plain HTML, CSS and vanilla JS in `public/`, with no build step

## Setup

```bash
npm install
cp .env.example .env        # then set OPENAI_API_KEY
npx prisma migrate deploy   # creates data/planly.db
npm run dev                 # http://localhost:3000
```

`OPENAI_MODEL` (default `gpt-4.1`) answers every message, so it must support the `web_search` tool together with structured outputs.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the server with auto-reload |
| `npm start` | Start the server |
| `npm test` | Unit tests for reply streaming and source verification |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |

## How a message is answered

Every answer comes from the LLM. There are no rule-based shortcuts, cached or pre-fetched events, or fallback answers.

| Step | What it does | Code |
| --- | --- | --- |
| **loadContext** | Loads the profile, learned preferences, "never recommend" list, this conversation's exclusions, relevant memories (LanceDB) and the current plan | [graph.js](src/agent/graph.js) |
| **think** | **Two LLM calls.** (1) **Research:** a required live web search in plain-text mode finds real current events and places, plus weather, with cited source pages. Strict-JSON mode drops the links, so this step stays in text. (2) **Answer:** the model turns the research into 3–5 recommendations with reasons, builds or edits the plan, and extracts preferences and memories, using only researched options and URLs. The reply streams to the browser while it's written; search progress shows as status updates. | [planner.js](src/agent/planner.js), [prompts.js](src/agent/prompts.js) |
| **save** | Keeps only recommendations whose URL is a page the model actually visited in this search. Then it stores the recommendations and plan, saves memories, updates preferences (asking for confirmation when one contradicts your profile), and remembers this chat's exclusions. | [graph.js](src/agent/graph.js) |

If the LLM call fails, the user sees the error. No substitute answer is generated.

Expect about 10–20 seconds per request (about 6s of web search, then the answer streams in). Every message runs the search step, including plain chat, so the model can't skip it and answer from memory. Each request logs its timings, e.g. `[agent] make_plan {"firstToken":…,"llm":…}`.

## Project layout

```
prisma/schema.prisma     data model
src/server.js            Express app
src/routes/              auth, profile & memories, chat (SSE), plans & feedback
src/agent/               LangGraph workflow, planner LLM call, prompts, learning, memory
src/tools/geo.js         geocoding for the profile's home city, map links
src/db/                  Prisma client, LanceDB store
public/                  HTML/CSS/JS frontend
test/                    node:test unit tests
```

## Not in this MVP

Map view, calendar integration and booking are planned for Phase 2 (PRD §57).
