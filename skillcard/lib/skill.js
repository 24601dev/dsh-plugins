/**
 * Host half of the skill bar: unpack a skill_card_v1 files map onto disk so
 * dsh-tool-skill can inject <skill_content> when the client casts `/name`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_FILES = 400;
const MAX_BYTES = 2_000_000;

function skillsRoot() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "skills");
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
    if (total > MAX_BYTES * 2) throw new Error("install body too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function safeName(name) {
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    throw new Error("skill name must be 1–64 letters, digits, dot, underscore, or hyphen");
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

async function installSkill(name, files) {
  const id = safeName(name);
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("files must be an object");
  }
  const keys = Object.keys(files);
  if (!keys.length) throw new Error("skill has no files");
  if (keys.length > MAX_FILES) throw new Error(`too many files (${keys.length})`);
  if (!keys.some((k) => k === "SKILL.md" || k.endsWith("/SKILL.md"))) {
    throw new Error("skill is missing SKILL.md");
  }

  const root = join(skillsRoot(), id);
  const extras = [];
  let skillMd = null;
  let bytes = 0;

  for (const rawPath of keys) {
    const rel = safeRel(rawPath);
    const entry = files[rawPath];
    if (!entry || typeof entry !== "object") throw new Error(`bad file entry ${rel}`);
    const encoding = entry.encoding;
    const content = entry.content;
    if (typeof content !== "string") throw new Error(`${rel} has no content`);
    let buf;
    if (encoding === "utf-8") {
      buf = Buffer.from(content, "utf8");
    } else if (encoding === "base64") {
      buf = Buffer.from(content, "base64");
    } else {
      throw new Error(`${rel}: unsupported encoding ${encoding}`);
    }
    bytes += buf.length;
    if (bytes > MAX_BYTES) throw new Error("skill files exceed 2MB");
    const dest = { rel, buf };
    if (rel === "SKILL.md") skillMd = dest;
    else extras.push(dest);
  }

  await mkdir(root, { recursive: true });
  for (const file of extras) {
    const dest = join(root, file.rel);
    await mkdir(join(dest, ".."), { recursive: true });
    await writeFile(dest, file.buf);
  }
  // Write SKILL.md last so the filesystem watcher sees a complete skill.
  if (skillMd) {
    await writeFile(join(root, skillMd.rel), skillMd.buf);
  }

  return { ok: true, name: id, path: root };
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillbar/install",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const result = await installSkill(body.name, body.files);
        ctx.logger?.("plugin-skillbar")?.info(`[plugin-skillbar] installed ${result.name} -> ${result.path}`);
        sendJson(res, 200, result);
      } catch (error) {
        const message = String(error?.message ?? error);
        ctx.logger?.("plugin-skillbar")?.info(`[plugin-skillbar] install failed: ${message}`);
        sendJson(res, 400, { error: message });
      }
    },
  }));
}
