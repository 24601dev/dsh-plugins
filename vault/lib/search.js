/**
 * Lexical retrieval over vault notes. BM25 on heading-aware chunks, not
 * embeddings: no extra model, works offline, and proper names in a GM vault
 * usually match better than a generic embedding would.
 */

const STOP = new Set([
  "the", "a", "an", "of", "and", "to", "in", "for", "on", "is", "it", "as",
  "at", "by", "or", "be", "this", "that", "with", "from", "are", "was", "were",
  "but", "not", "into", "its", "his", "her", "their", "they", "them", "you",
  "your", "we", "our", "can", "has", "have", "had", "will", "would", "which",
  "who", "what", "when", "where", "how", "than", "then", "also", "just",
]);

const K1 = 1.2;
const B = 0.75;
const CHUNK_CHARS = 900;
const SNIPPET_CHARS = 360;

export function tokenize(text) {
  if (!text) return [];
  const raw = String(text).toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
  return raw.filter((token) => !STOP.has(token));
}

function flushChunk(chunks, note, heading, buf) {
  const body = buf.trim();
  if (body.length < 8 && chunks.length > 0) return "";
  chunks.push({
    noteId: note.id,
    title: note.title,
    rel: note.rel,
    heading,
    text: body.slice(0, 1400),
  });
  return "";
}

export function chunkNote(note) {
  const chunks = [];
  const text = note.text ?? "";
  const parts = text.length ? text.split(/(?=^#{1,6}\s)/m) : [""];
  let heading = "";
  for (const part of parts) {
    const match = part.match(/^#{1,6}\s+(.+)$/m);
    if (match) heading = match[1].trim();
    let buf = "";
    for (const para of part.split(/\n{2,}/)) {
      if (buf && `${buf}\n\n${para}`.length > CHUNK_CHARS) {
        buf = flushChunk(chunks, note, heading, buf);
      }
      buf = buf ? `${buf}\n\n${para}` : para;
    }
    if (buf.trim()) buf = flushChunk(chunks, note, heading, buf);
  }
  if (chunks.length === 0) {
    chunks.push({
      noteId: note.id,
      title: note.title,
      rel: note.rel,
      heading: "",
      text: `${note.title}\n${text}`.slice(0, 1400),
    });
  }
  return chunks;
}

function idf(N, n) {
  return Math.log((N - n + 0.5) / (n + 0.5) + 1);
}

function bm25(queryTokens, doc, index) {
  let score = 0;
  const seen = new Set();
  for (const token of queryTokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    const freq = doc.tf.get(token) ?? 0;
    if (!freq) continue;
    const n = index.df.get(token) ?? 0;
    const weight = idf(index.N, n);
    const denom = freq + K1 * (1 - B + B * (doc.len / index.avgdl));
    score += weight * (freq * (K1 + 1)) / denom;
  }
  return score;
}

function snippet(text, queryTokens) {
  const lower = text.toLowerCase();
  let at = 0;
  for (const token of queryTokens) {
    const index = lower.indexOf(token);
    if (index >= 0) {
      at = Math.max(0, index - 72);
      break;
    }
  }
  let slice = text.slice(at, at + SNIPPET_CHARS).replace(/\s+/g, " ").trim();
  if (at > 0) slice = `…${slice}`;
  if (at + SNIPPET_CHARS < text.length) slice = `${slice}…`;
  return slice;
}

export function buildSearchIndex(notes) {
  const chunks = [];
  for (const note of notes) chunks.push(...chunkNote(note));
  const docs = chunks.map((chunk) => {
    const titleTokens = tokenize(`${chunk.title} ${chunk.noteId.replace(/\//g, " ")} ${chunk.heading}`);
    const bodyTokens = tokenize(chunk.text);
    const tokens = [...titleTokens, ...titleTokens, ...bodyTokens];
    const tf = new Map();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    return { chunk, tf, len: Math.max(tokens.length, 1) };
  });
  const df = new Map();
  for (const doc of docs) {
    for (const token of doc.tf.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const N = Math.max(docs.length, 1);
  const avgdl = docs.reduce((sum, doc) => sum + doc.len, 0) / N;
  return { docs, df, N, avgdl, notes };
}

export function searchVault(index, query, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 16);
  const folder = String(options.folder ?? "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return { hits: [], truncated: false, indexed: index.notes.length };

  const scored = [];
  for (const doc of index.docs) {
    if (folder) {
      const rel = doc.chunk.rel.toLowerCase();
      const id = doc.chunk.noteId.toLowerCase();
      if (!rel.startsWith(`${folder}/`) && !id.startsWith(`${folder}/`) && rel !== `${folder}.md`) continue;
    }
    const score = bm25(queryTokens, doc, index);
    if (score <= 0) continue;
    scored.push({ doc, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const bestByNote = new Map();
  for (const row of scored) {
    const id = row.doc.chunk.noteId;
    if (!bestByNote.has(id)) bestByNote.set(id, row);
  }
  const collapsed = [...bestByNote.values()].sort((a, b) => b.score - a.score);
  const truncated = collapsed.length > limit;
  const hits = collapsed.slice(0, limit).map((row) => {
    const hit = {
      id: row.doc.chunk.noteId,
      title: row.doc.chunk.title,
      rel: row.doc.chunk.rel,
      score: Math.round(row.score * 1000) / 1000,
      snippet: snippet(row.doc.chunk.text, queryTokens),
    };
    if (row.doc.chunk.heading) hit.heading = row.doc.chunk.heading;
    return hit;
  });
  return { hits, truncated, indexed: index.notes.length };
}
