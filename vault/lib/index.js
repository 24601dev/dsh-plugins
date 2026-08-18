/**
 * Host half: treat an Obsidian vault as a folder of markdown.
 * We read files on disk (same source of truth Obsidian uses) rather than
 * speaking Local REST API, so the graph works even when Obsidian is closed.
 *
 * Agent tools retrieve by BM25 over chunks (vault_search) then read one note
 * (vault_read). Nothing from the vault is injected into the system prompt.
 */
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { buildSearchIndex, searchVault } from "./search.js";

const MAX_NOTES = 2500;
const MAX_NOTE_BYTES = 200_000;
const INDEX_TEXT_BYTES = 32_000;
const READ_CHARS = 8_000;
const LIST_CAP = 80;
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const SKIP_DIRS = new Set(["node_modules", ".git", ".trash", "Trash"]);

function configPath() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "plugin-vault.json");
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function loadConfig() {
  try {
    const raw = JSON.parse(await readFile(configPath(), "utf8"));
    if (raw && typeof raw.path === "string") return { path: raw.path };
  } catch {
    /* missing is fine */
  }
  return { path: "" };
}

async function saveConfig(path) {
  await mkdir(dirname(configPath()), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify({ path }, null, 2)}\n`);
}

function insideVault(root, file) {
  const rel = relative(root, file);
  return rel !== "" && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function stemOf(rel) {
  return rel.replace(/\.md$/i, "");
}

function titleOf(rel, text) {
  const heading = text.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return basename(stemOf(rel));
}

function parseLinks(text) {
  const links = [];
  WIKILINK.lastIndex = 0;
  let match;
  while ((match = WIKILINK.exec(text))) {
    const target = match[1].trim().replace(/\\/g, "/").replace(/\.md$/i, "");
    if (target) links.push(target);
  }
  return links;
}

async function collectNotes(root) {
  const notes = [];
  async function walk(dir) {
    if (notes.length >= MAX_NOTES) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (notes.length >= MAX_NOTES) return;
      if (entry.name.startsWith(".")) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      let text = "";
      try {
        const info = await stat(full);
        if (info.size > MAX_NOTE_BYTES) text = (await readFile(full, "utf8")).slice(0, MAX_NOTE_BYTES);
        else text = await readFile(full, "utf8");
      } catch {
        continue;
      }
      const rel = relative(root, full).split(sep).join("/");
      notes.push({
        id: stemOf(rel),
        rel,
        title: titleOf(rel, text),
        links: parseLinks(text),
        text: text.slice(0, INDEX_TEXT_BYTES),
      });
    }
  }
  await walk(root);
  return notes;
}

function resolveTarget(raw, byStem, byBase) {
  const key = raw.trim().replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();
  if (byStem.has(key)) return byStem.get(key);
  const base = key.split("/").pop();
  const hits = byBase.get(base) ?? [];
  if (hits.length === 1) return hits[0];
  const suffix = hits.find((note) => note.id.toLowerCase().endsWith(`/${key}`) || note.id.toLowerCase() === key);
  return suffix ?? null;
}

function buildGraph(notes) {
  const byStem = new Map();
  const byBase = new Map();
  for (const note of notes) {
    byStem.set(note.id.toLowerCase(), note);
    const base = basename(note.id).toLowerCase();
    const list = byBase.get(base) ?? [];
    list.push(note);
    byBase.set(base, list);
  }

  const nodes = notes.map((note) => ({
    id: note.id,
    title: note.title,
    rel: note.rel,
    degree: 0,
    ghost: false,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = [];
  const seen = new Set();

  for (const note of notes) {
    for (const link of note.links) {
      const target = resolveTarget(link, byStem, byBase);
      const to = target ? target.id : link;
      if (!nodeIds.has(to)) {
        nodes.push({ id: to, title: link, rel: "", degree: 0, ghost: true });
        nodeIds.add(to);
      }
      const key = `${note.id}\0${to}`;
      if (seen.has(key) || note.id === to) continue;
      seen.add(key);
      edges.push({ from: note.id, to });
    }
  }

  const degree = new Map();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  return {
    nodes,
    edges,
    truncated: notes.length >= MAX_NOTES,
    count: notes.length,
  };
}

async function requireVault() {
  const { path } = await loadConfig();
  if (!path) throw new Error("Set a vault path in Settings → Vault");
  const root = resolve(path);
  if (!isAbsolute(root)) throw new Error("Vault path must be absolute");
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error("Vault path is not a directory");
  return root;
}

let indexCache = null;

async function vaultIndex() {
  const root = await requireVault();
  if (indexCache && indexCache.root === root && Date.now() - indexCache.at < 20_000) {
    return indexCache;
  }
  const notes = await collectNotes(root);
  indexCache = {
    root,
    at: Date.now(),
    notes,
    graph: buildGraph(notes),
    search: buildSearchIndex(notes),
  };
  return indexCache;
}

function bumpCache() {
  indexCache = null;
}

function findNote(notes, raw) {
  const byStem = new Map();
  const byBase = new Map();
  for (const note of notes) {
    byStem.set(note.id.toLowerCase(), note);
    const base = basename(note.id).toLowerCase();
    const list = byBase.get(base) ?? [];
    list.push(note);
    byBase.set(base, list);
  }
  return resolveTarget(raw, byStem, byBase);
}

function extractHeading(text, heading) {
  const want = heading.trim().toLowerCase();
  if (!want) return { text, heading: "" };
  const lines = text.split(/\r?\n/);
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match && match[2].trim().toLowerCase() === want) {
      start = i;
      level = match[1].length;
      break;
    }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }
  return { text: lines.slice(start, end).join("\n"), heading: heading.trim() };
}

function listNotes(notes, folder) {
  const prefix = String(folder ?? "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  const rows = [];
  for (const note of notes) {
    if (prefix) {
      const id = note.id.toLowerCase();
      const rel = note.rel.toLowerCase();
      if (id !== prefix && !id.startsWith(`${prefix}/`) && !rel.startsWith(`${prefix}/`)) continue;
    }
    rows.push({ id: note.id, title: note.title, rel: note.rel });
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return {
    notes: rows.slice(0, LIST_CAP),
    truncated: rows.length > LIST_CAP,
    total: rows.length,
  };
}

function relatedIds(graph, hits, cap = 6) {
  const have = new Set(hits.map((hit) => hit.id));
  const out = [];
  for (const hit of hits.slice(0, 3)) {
    for (const edge of graph.edges) {
      const other = edge.from === hit.id ? edge.to : edge.to === hit.id ? edge.from : null;
      if (!other || have.has(other)) continue;
      have.add(other);
      out.push(other);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

function formatSearchHits(value) {
  if (!value.hits.length) {
    return `No vault notes matched “${value.query}”. Indexed ${value.indexed} notes.`;
  }
  const lines = value.hits.map((hit, index) => {
    const heading = hit.heading ? ` › ${hit.heading}` : "";
    return `${index + 1}. [[${hit.id}]] ${hit.title}${heading}\n   ${hit.snippet}`;
  });
  let text = `Vault search for “${value.query}” (${value.hits.length} of ${value.indexed} indexed notes):\n\n${lines.join("\n\n")}`;
  if (value.related.length) text += `\n\nRelated: ${value.related.map((id) => `[[${id}]]`).join(", ")}`;
  if (value.truncated) text += "\n\nMore matches exist; refine the query rather than asking for everything.";
  text += "\nUse vault_read with an id above if you need the full note.";
  return text;
}

function formatRead(value) {
  const heading = value.heading ? ` › ${value.heading}` : "";
  const links = value.links.length ? `\nOutgoing: ${value.links.map((id) => `[[${id}]]`).join(", ")}` : "";
  const back = value.backlinks.length ? `\nBacklinks: ${value.backlinks.map((id) => `[[${id}]]`).join(", ")}` : "";
  const more = value.truncated ? "\n\n(Truncated. Pass heading to read one section, or search instead of loading the rest.)" : "";
  return `[[${value.id}]] ${value.title}${heading}\n${value.rel}${links}${back}\n\n${value.text}${more}`;
}

export const name = "plugin-vault";
export const inject = ["webServer", "tools", "systemPrompt"];

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-vault/status",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      const cfg = await loadConfig();
      sendJson(res, 200, { path: cfg.path, vault: cfg.path ? basename(cfg.path) : "" });
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-vault/path",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const next = typeof body.path === "string" ? body.path.trim() : "";
        if (next) {
          const root = resolve(next);
          if (!isAbsolute(root)) throw new Error("Vault path must be absolute");
          const info = await stat(root);
          if (!info.isDirectory()) throw new Error("Vault path is not a directory");
          await saveConfig(root);
          bumpCache();
          sendJson(res, 200, { path: root, vault: basename(root) });
          return;
        }
        await saveConfig("");
        bumpCache();
        sendJson(res, 200, { path: "", vault: "" });
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-vault/graph",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      try {
        const { root, graph, notes } = await vaultIndex();
        sendJson(res, 200, {
          path: root,
          vault: basename(root),
          ...graph,
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-vault/note",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      try {
        const url = new URL(req.url, "http://127.0.0.1");
        const id = url.searchParams.get("id") ?? "";
        if (!id) throw new Error("id required");
        const { root, notes, graph } = await vaultIndex();
        const note = findNote(notes, id);
        if (!note) {
          sendJson(res, 404, { error: "Note not found", id, ghost: true });
          return;
        }
        const file = resolve(root, note.rel);
        if (!insideVault(root, file)) throw new Error("unsafe path");
        let text = "";
        try {
          text = (await readFile(file, "utf8")).slice(0, MAX_NOTE_BYTES);
        } catch {
          text = "";
        }
        const backlinks = graph.edges.filter((e) => e.to === note.id).map((e) => e.from);
        sendJson(res, 200, {
          id: note.id,
          title: note.title,
          rel: note.rel,
          text,
          links: [...new Set(note.links)],
          backlinks,
          obsidian: `obsidian://open?vault=${encodeURIComponent(basename(root))}&file=${encodeURIComponent(note.id)}`,
        });
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.systemPrompt.section({
    name: "tool:vault",
    order: 115,
    text: "The user may have a local Obsidian vault. You do not have its notes in context. When a question might be answered by campaign notes, NPCs, places, or lore, call vault_search with a specific query, then vault_read only the ids that look relevant. Use vault_list to see titles in a folder. Never dump the vault. If no vault path is set, say so.",
  });

  ctx.tools.register(defineTool({
    name: "vault_search",
    description: "Search the user's Obsidian vault with BM25 over note chunks. Returns ranked snippets and ids only — not full notes. Use this before vault_read.",
    parameters: {
      query: {
        type: "string",
        required: true,
        description: "Search query. Prefer names, places, and concrete terms over full sentences.",
      },
      folder: {
        type: "string",
        description: "Optional folder prefix to search inside, e.g. \"npcs\" or \"places/cities\".",
      },
      limit: {
        type: "integer",
        description: "Max notes to return (1–16). Defaults to 8.",
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          vault: { type: "string", required: true },
          query: { type: "string", required: true },
          indexed: { type: "integer", required: true },
          truncated: { type: "boolean", required: true },
          hits: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", required: true },
                title: { type: "string", required: true },
                rel: { type: "string", required: true },
                heading: { type: "string" },
                score: { type: "number", required: true },
                snippet: { type: "string", required: true },
              },
            },
          },
          related: {
            type: "array",
            required: true,
            items: { type: "string" },
          },
        },
      },
      render: (_args, value) => [{ type: "text", text: formatSearchHits(value) }],
    },
    timeoutMs: 20_000,
    isConcurrencySafe: () => true,
    async execute(args) {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("query must be non-empty");
      const { root, graph, search } = await vaultIndex();
      const found = searchVault(search, query, {
        folder: args.folder,
        limit: args.limit,
      });
      return {
        vault: basename(root),
        query,
        indexed: found.indexed,
        truncated: found.truncated,
        hits: found.hits,
        related: relatedIds(graph, found.hits),
      };
    },
    presentCall: (args) => ({
      card: "generic",
      title: args.query || "Vault search",
      kind: "search",
      rawInput: args.query,
    }),
  }));

  ctx.tools.register(defineTool({
    name: "vault_read",
    description: "Read one vault note by wikilink id (the id returned by vault_search). Returns a capped excerpt, outgoing links, and backlinks. Pass heading to read one section of a long note.",
    parameters: {
      id: {
        type: "string",
        required: true,
        description: "Note id, e.g. \"npcs/kael\" or the basename \"kael\" if it is unique.",
      },
      heading: {
        type: "string",
        description: "Optional heading to read only that section.",
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", required: true },
          title: { type: "string", required: true },
          rel: { type: "string", required: true },
          heading: { type: "string" },
          text: { type: "string", required: true },
          links: {
            type: "array",
            required: true,
            items: { type: "string" },
          },
          backlinks: {
            type: "array",
            required: true,
            items: { type: "string" },
          },
          truncated: { type: "boolean", required: true },
        },
      },
      render: (_args, value) => [{ type: "text", text: formatRead(value) }],
    },
    timeoutMs: 10_000,
    isConcurrencySafe: () => true,
    async execute(args) {
      const id = String(args.id ?? "").trim();
      if (!id) throw new Error("id required");
      const { root, notes, graph } = await vaultIndex();
      const note = findNote(notes, id);
      if (!note) throw new Error(`Note not found: ${id}`);
      const file = resolve(root, note.rel);
      if (!insideVault(root, file)) throw new Error("unsafe path");
      let raw = "";
      try {
        raw = (await readFile(file, "utf8")).slice(0, MAX_NOTE_BYTES);
      } catch {
        raw = note.text ?? "";
      }
      let body = raw;
      let heading;
      if (args.heading) {
        const section = extractHeading(raw, String(args.heading));
        if (!section) throw new Error(`Heading not found in ${note.id}: ${args.heading}`);
        body = section.text;
        heading = section.heading;
      }
      const truncated = body.length > READ_CHARS;
      const backlinks = graph.edges.filter((edge) => edge.to === note.id).map((edge) => edge.from);
      return {
        id: note.id,
        title: note.title,
        rel: note.rel,
        ...heading ? { heading } : {},
        text: body.slice(0, READ_CHARS),
        links: [...new Set(note.links)],
        backlinks,
        truncated,
      };
    },
    presentCall: (args) => ({
      card: "generic",
      title: args.id || "Vault note",
      kind: "read",
      rawInput: args.id,
    }),
  }));

  ctx.tools.register(defineTool({
    name: "vault_list",
    description: "List vault note titles in a folder. Returns ids and titles only, never note bodies. Use to see what exists before searching.",
    parameters: {
      folder: {
        type: "string",
        description: "Folder prefix, e.g. \"npcs\". Empty lists the vault root (capped).",
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          vault: { type: "string", required: true },
          folder: { type: "string", required: true },
          total: { type: "integer", required: true },
          truncated: { type: "boolean", required: true },
          notes: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", required: true },
                title: { type: "string", required: true },
                rel: { type: "string", required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => {
        if (!value.notes.length) return [{ type: "text", text: `No notes in ${value.folder || "(vault root)"}.` }];
        const lines = value.notes.map((note) => `- [[${note.id}]] ${note.title}`);
        const more = value.truncated ? `\n\nShowing ${value.notes.length} of ${value.total}. Narrow folder or search.` : "";
        return [{ type: "text", text: `${value.total} notes in ${value.folder || "(vault root)"}:\n${lines.join("\n")}${more}` }];
      },
    },
    timeoutMs: 15_000,
    isConcurrencySafe: () => true,
    async execute(args) {
      const folder = String(args.folder ?? "").trim();
      const { root, notes } = await vaultIndex();
      const listed = listNotes(notes, folder);
      return {
        vault: basename(root),
        folder,
        total: listed.total,
        truncated: listed.truncated,
        notes: listed.notes,
      };
    },
    presentCall: (args) => ({
      card: "generic",
      title: args.folder ? `Vault / ${args.folder}` : "Vault list",
      kind: "search",
      rawInput: args.folder,
    }),
  }));
}
