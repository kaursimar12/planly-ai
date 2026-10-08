export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Answers every chat message; must support web_search and structured outputs.
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  lancedbDir: process.env.LANCEDB_DIR ?? 'data/lancedb',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionDays: 30,
  userAgent: 'PlanlyAI/0.1 (personal planning assistant)',
};
