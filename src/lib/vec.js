// Embeddings are stored in SQLite as raw float32 bytes.
export const toBytes = (vector) => new Uint8Array(new Float32Array(vector).buffer);

export function fromBytes(bytes) {
  if (!bytes) return null;
  const u = new Uint8Array(bytes);
  // Copy so the Float32Array is 4-byte aligned regardless of the source buffer.
  return new Float32Array(u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength));
}
