/**
 * Host half of the persona seat: unpack a skill_card_v1 soul onto disk and
 * inject it as an always-on system-prompt section. Does not install into the
 * skill catalog — wearing is not slash-casting.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_FILES = 400;
const MAX_BYTES = 2_000_000;
const MAX_PROMPT = 80_000;
const SECTION = "plugin:soul";
const ORDER = 0.4;

function homeRoot() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "personas");
}

function wornFile() {
  return join(homeRoot(), "_worn.json");
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
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BYTES * 2) throw new Error("wear body too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function safeName(name) {
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    throw new Error("persona name must be 1–64 letters, digits, dot, underscore, or hyphen");
  }
  return name;
}

function safeRel(rel) {
  if (typeof rel !== "string" || !rel) throw new Error("empty file path");
  const n = rel.replaceAll("\\", "/");
  if (n.startsWith("/") || n.includes("\0")) throw new Error(`unsafe path ${rel}`);
  const parts = n.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) {
    throw new Error(`unsafe path ${rel}`);
  }
  return n;
}

function fileText(files, rel) {
  const entry = files[rel];
  if (!entry || typeof entry !== "object") return "";
  if (typeof entry.content !== "string") return "";
  if (entry.encoding === "utf-8") return entry.content;
  if (entry.encoding === "base64") return Buffer.from(entry.content, "base64").toString("utf8");
  return "";
}

function stripFrontmatter(md) {
  return String(md).replace(/^\uFEFF/, "").replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
}

function composeText(name, files) {
  const soul = fileText(files, "SOUL.md") || fileText(files, "SKILL.md") || fileText(files, "ROLE.md");
  if (!soul.trim()) throw new Error("persona card needs SOUL.md (or SKILL.md)");
  const body = stripFrontmatter(soul);
  if (!body) throw new Error("persona markdown is empty");
  const text = [
    `# Worn persona: ${name}`,
    "You are wearing this identity as a standing overlay. It sits after the harness persona and does not remove your tools. Speak, value, and decide as this persona unless the user unequips it.",
    body,
  ].join("\n\n");
  return text.length > MAX_PROMPT ? `${text.slice(0, MAX_PROMPT)}\n\n[truncated]` : text;
}

async function writeFiles(name, files) {
  const id = safeName(name);
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("files must be an object");
  }
  const keys = Object.keys(files);
  if (!keys.length) throw new Error("persona has no files");
  if (keys.length > MAX_FILES) throw new Error(`too many files (${keys.length})`);
  const anchors = keys.filter((k) => k === "SOUL.md" || k === "SKILL.md" || k === "ROLE.md");
  if (!anchors.length) throw new Error("persona is missing SOUL.md");

  const root = join(homeRoot(), id);
  const extras = [];
  const last = [];
  let bytes = 0;

  for (const rawPath of keys) {
    const rel = safeRel(rawPath);
    const entry = files[rawPath];
    if (!entry || typeof entry !== "object") throw new Error(`bad file entry ${rel}`);
    const content = entry.content;
    if (typeof content !== "string") throw new Error(`${rel} has no content`);
    let buf;
    if (entry.encoding === "utf-8") buf = Buffer.from(content, "utf8");
    else if (entry.encoding === "base64") buf = Buffer.from(content, "base64");
    else throw new Error(`${rel}: unsupported encoding ${entry.encoding}`);
    bytes += buf.length;
    if (bytes > MAX_BYTES) throw new Error("persona files exceed 2MB");
    const dest = { rel, buf };
    if (anchors.includes(rel)) last.push(dest);
    else extras.push(dest);
  }

  await mkdir(root, { recursive: true });
  for (const file of extras) {
    const dest = join(root, file.rel);
    await mkdir(join(dest, ".."), { recursive: true });
    await writeFile(dest, file.buf);
  }
  for (const file of last) {
    await writeFile(join(root, file.rel), file.buf);
  }
  return root;
}

export function apply(ctx) {
  const worn = { name: "", description: "", text: "" };

  ctx.effect(() => ctx.systemPrompt.section({
    name: SECTION,
    order: ORDER,
    text: () => worn.text,
  }), "plugin-persona.section()");

  const persist = async () => {
    await mkdir(homeRoot(), { recursive: true });
    await writeFile(wornFile(), `${JSON.stringify({
      name: worn.name,
      description: worn.description,
      text: worn.text,
    }, null, 2)}\n`);
  };

  const wear = async (name, description, files) => {
    const id = safeName(name);
    // Re-wear without re-uploading: the folder from the last wear is still on
    // disk, so { name } alone is enough. Needed for per-session wear restore,
    // where the card may not be in the gallery at all.
    let payload = files;
    if (!payload) payload = await readStoredFiles(id);
    const text = composeText(id, payload);
    const path = await writeFiles(id, payload);
    worn.name = id;
    worn.description = typeof description === "string" ? description : "";
    worn.text = text;
    await persist();
    notifyPrompt();
    return { ok: true, name: id, path };
  };

  async function readStoredFiles(id) {
    const root = join(homeRoot(), id);
    const files = {};
    const walk = async (dir, prefix) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(join(dir, entry.name), rel);
        } else if (entry.isFile()) {
          files[rel] = { content: await readFile(join(dir, entry.name), "utf8"), encoding: "utf-8" };
        }
      }
    };
    try {
      await walk(root, "");
    } catch {
      throw new Error(`${id} was never worn here — no stored files to re-wear`);
    }
    if (!Object.keys(files).length) throw new Error(`${id} has no stored files`);
    return files;
  }

  const unequip = async () => {
    worn.name = "";
    worn.description = "";
    worn.text = "";
    await persist();
    notifyPrompt();
    return { ok: true, name: null };
  };

  const notifyPrompt = () => {
    try { ctx.emit("system-prompt/change"); } catch { /* next assemble still reads worn.text */ }
  };

  ctx.effect(() => {
    void readFile(wornFile(), "utf8").then((raw) => {
      const saved = JSON.parse(raw);
      if (saved && typeof saved.text === "string" && saved.text && typeof saved.name === "string") {
        worn.name = saved.name;
        worn.description = typeof saved.description === "string" ? saved.description : "";
        worn.text = saved.text;
        notifyPrompt();
      }
    }).catch(() => { /* no previous soul */ });
  });

  const routes = [
    ["GET", "/dsh-plugin-persona/worn", async (_req, res) => {
      sendJson(res, 200, {
        name: worn.name || null,
        description: worn.description || "",
      });
    }],
    ["POST", "/dsh-plugin-persona/wear", async (req, res) => {
      const body = await readJson(req);
      const result = await wear(body.name, body.description, body.files);
      ctx.logger?.("plugin-persona")?.info(`[plugin-persona] wearing ${result.name}`);
      sendJson(res, 200, result);
    }],
    ["POST", "/dsh-plugin-persona/unequip", async (_req, res) => {
      const result = await unequip();
      ctx.logger?.("plugin-persona")?.info("[plugin-persona] unequipped");
      sendJson(res, 200, result);
    }],
  ];

  for (const [method, path, handler] of routes) {
    ctx.effect(() => ctx.webServer.register({
      kind: "exact",
      path,
      async handler(req, res) {
        if (req.method !== method) {
          sendJson(res, 405, { error: `${method} required` });
          return;
        }
        try {
          await handler(req, res);
        } catch (error) {
          const message = String(error?.message ?? error);
          ctx.logger?.("plugin-persona")?.info(`[plugin-persona] ${path} failed: ${message}`);
          sendJson(res, 400, { error: message });
        }
      },
    }));
  }
}
