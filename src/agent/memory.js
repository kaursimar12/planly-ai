// Long-term semantic memory: Prisma row + LanceDB embedding (PRD §21–24).
import { prisma } from '../db/prisma.js';
import { addMemoryVector, deleteMemoryVector, searchMemories } from '../db/vector.js';
import { embed } from '../lib/openai.js';

// Below this L2 distance two memories are treated as duplicates.
const DUPLICATE_DISTANCE = 0.1;

export async function saveMemory(userId, text, { kind = 'fact', source = 'conversation' } = {}) {
  const clean = text.trim().slice(0, 500);
  if (!clean) return null;
  const [vector] = await embed([clean]);
  const [nearest] = await searchMemories(userId, vector, 1);
  if (nearest && nearest.distance < DUPLICATE_DISTANCE) return null;

  const memory = await prisma.memory.create({ data: { userId, text: clean, kind, source } });
  try {
    await addMemoryVector({ memoryId: memory.id, userId, text: clean, kind, vector });
  } catch (err) {
    await prisma.memory.delete({ where: { id: memory.id } });
    throw err;
  }
  return memory;
}

export async function editMemory(memory, text) {
  const clean = text.trim().slice(0, 500);
  const [vector] = await embed([clean]);
  await deleteMemoryVector(memory.id);
  await addMemoryVector({ memoryId: memory.id, userId: memory.userId, text: clean, kind: memory.kind, vector });
  return prisma.memory.update({ where: { id: memory.id }, data: { text: clean } });
}

export async function removeMemory(memory) {
  await deleteMemoryVector(memory.id);
  await prisma.memory.delete({ where: { id: memory.id } });
}

export async function recallMemories(userId, query, limit = 5) {
  const [vector] = await embed([query]);
  return searchMemories(userId, vector, limit);
}
