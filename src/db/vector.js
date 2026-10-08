// LanceDB memory store. Each row links back to a Prisma Memory via memory_id.
import * as lancedb from '@lancedb/lancedb';
import { config } from '../config.js';

const TABLE = 'memories';
const ID_RE = /^[a-z0-9]+$/i;

let connection;
let tablePromise;

function connect() {
  connection ??= lancedb.connect(config.lancedbDir);
  return connection;
}

async function openTable() {
  const db = await connect();
  const names = await db.tableNames();
  return names.includes(TABLE) ? db.openTable(TABLE) : null;
}

// Cache the open table; the table is created lazily on first insert.
function getTable() {
  tablePromise ??= openTable().then((t) => {
    if (!t) tablePromise = undefined;
    return t;
  });
  return tablePromise;
}

function safeId(id) {
  if (!ID_RE.test(id)) throw new Error(`Invalid id for vector filter: ${id}`);
  return id;
}

let writeChain = Promise.resolve();

export function addMemoryVector({ memoryId, userId, text, kind, vector }) {
  const row = { memory_id: memoryId, user_id: userId, text, kind, vector };
  // Serialize writes so two concurrent first inserts don't both try to create the table.
  const write = writeChain.then(async () => {
    const table = await getTable();
    if (table) {
      await table.add([row]);
    } else {
      const db = await connect();
      await db.createTable(TABLE, [row]);
      tablePromise = undefined;
    }
  });
  writeChain = write.catch(() => {});
  return write;
}

export async function searchMemories(userId, vector, limit = 5) {
  const table = await getTable();
  if (!table) return [];
  const rows = await table
    .vectorSearch(vector)
    .where(`user_id = '${safeId(userId)}'`)
    .limit(limit)
    .toArray();
  return rows.map((r) => ({ memoryId: r.memory_id, text: r.text, kind: r.kind, distance: r._distance }));
}

export async function deleteMemoryVector(memoryId) {
  const table = await getTable();
  if (table) await table.delete(`memory_id = '${safeId(memoryId)}'`);
}

export async function deleteUserVectors(userId) {
  const table = await getTable();
  if (table) await table.delete(`user_id = '${safeId(userId)}'`);
}
