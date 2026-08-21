/**
 * Host half of the class seat. The legacy role API remains the transport,
 * while CLASSES.md + the standing class contract form the always-on overlay.
 * Workflows stay on disk and are not dumped into the prompt.
 */
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyClassSkillSync } from "./class-skill-sync.js";
import { DomainQualificationError, isClassPacket } from "./card-boundary.js";
import { restoreWear } from "./restore-safe.js";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_FILES = 400;
const MAX_BYTES = 2_000_000;
const MAX_PROMPT = 80_000;
const SECTION = "plugin:role";
const ORDER = 0.6;

function homeRoot() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "roles");
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
    throw new Error("class name must be 1–64 letters, digits, dot, underscore, or hyphen");
  }
  return name.startsWith("sc-") && name.length > 3 ? name.slice(3) : name;
}

async function isPacketLink(root) {
  try {
    return (await lstat(root)).isSymbolicLink();
  } catch {
    return false;
  }
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

function composeText(name, files, diskPath) {
  if (!isClassPacket(files)) {
    throw new DomainQualificationError("not a class card: needs canonical class: frontmatter or a legacy role (ROLE.md / role: / kind: role) packet, not an ordinary skill");
  }
  const contract = fileText(files, "SKILL.md") || fileText(files, "ROLE.md");
  if (!contract.trim()) throw new Error("class card needs SKILL.md (or legacy ROLE.md)");
  const classes = stripFrontmatter(fileText(files, "CLASSES.md") || fileText(files, "ROLES.md"));
  const body = stripFrontmatter(contract);
  const parts = [
    `# Worn class: ${name}`,
    `You are wearing this job as a standing overlay for the whole session. Do not wait for a slash invocation. Workflow and reference files are on disk at ${diskPath}; open one only when this task needs that procedure.`,
  ];
  if (classes) {
    parts.push("## Class law", classes);
  }
  parts.push("## Class contract", body);
  const text = parts.join("\n\n");
  return text.length > MAX_PROMPT ? `${text.slice(0, MAX_PROMPT)}\n\n[truncated]` : text;
}

async function writeFiles(name, files) {
  const id = safeName(name);
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("files must be an object");
  }
  const keys = Object.keys(files);
  if (!keys.length) throw new Error("class has no files");
  if (keys.length > MAX_FILES) throw new Error(`too many files (${keys.length})`);
  const anchors = keys.filter((k) => k === "SKILL.md" || k === "ROLE.md" || k === "SOUL.md");
  if (!anchors.length) throw new Error("class is missing SKILL.md");

  const root = join(homeRoot(), id);
  if (await isPacketLink(root)) return root;
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
    if (bytes > MAX_BYTES) throw new Error("class files exceed 2MB");
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
  }), "plugin-roles.section()");

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
    let path = join(homeRoot(), id);
    if (files) path = await writeFiles(id, files);
    const canonicalFiles = await readStoredFiles(id);
    const text = composeText(id, canonicalFiles, path);
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
    if (!files["CLASSES.md"]) {
      let cursor = await realpath(root);
      for (let depth = 0; depth < 5; depth += 1) {
        try {
          files["CLASSES.md"] = { content: await readFile(join(cursor, "CLASSES.md"), "utf8"), encoding: "utf-8" };
          break;
        } catch { /* keep walking toward the canonical packet root */ }
        const parent = join(cursor, "..");
        if (parent === cursor) break;
        cursor = parent;
      }
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

  applyClassSkillSync(ctx, wear);

  ctx.effect(() => {
    void readFile(wornFile(), "utf8").then(async (raw) => {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.name !== "string" || !saved.name) return;
      await restoreWear(
        (name, description) => wear(name, description),
        saved,
        (row) => {
          worn.name = row.name;
          worn.description = typeof row.description === "string" ? row.description : "";
          worn.text = row.text;
        },
        notifyPrompt,
      );
    }).catch(() => { /* no previous class */ });
  });

  const routes = [
    ["GET", "/dsh-plugin-roles/worn", async (_req, res) => {
      sendJson(res, 200, {
        name: worn.name || null,
        description: worn.description || "",
      });
    }],
    ["POST", "/dsh-plugin-roles/wear", async (req, res) => {
      const body = await readJson(req);
      const result = await wear(body.name, body.description, body.files);
      ctx.logger?.("plugin-roles")?.info(`[plugin-roles] wearing ${result.name}`);
      sendJson(res, 200, result);
    }],
    ["POST", "/dsh-plugin-roles/unequip", async (_req, res) => {
      const result = await unequip();
      ctx.logger?.("plugin-roles")?.info("[plugin-roles] unequipped");
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
          ctx.logger?.("plugin-roles")?.info(`[plugin-roles] ${path} failed: ${message}`);
          sendJson(res, 400, { error: message });
        }
      },
    }));
  }
}
