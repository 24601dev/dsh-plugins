/**
 * Host half of Skillcard Press: skill_card_v1 PNGs live in $DSH_HOME/skill-cards.
 * Unpacked files still go to $DSH_HOME/skills so dsh-tool-skill can load them.
 */
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { defineTool } from "@deepseek-ai/dsh-tools";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_FILES = 400;
const MAX_BYTES = 2_000_000;
const MAX_PNG_BYTES = 8_000_000;
const MAX_CARDS = 200;
const ANCHORS = ["SKILL.md", "SOUL.md", "ROLE.md"];

function skillsRoot() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "skills");
}

function cardsRoot() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "skill-cards");
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req, max = MAX_BYTES * 2) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > max) throw new Error("body too large");
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

function extractSkillPayload(png) {
  if (png.length < 24 || png[0] !== 0x89 || png[1] !== 0x50) {
    throw new Error("not a PNG");
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  while (pos + 12 <= png.length) {
    const length = view.getUint32(pos);
    if (pos + 12 + length > png.length) break;
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    const data = png.subarray(pos + 8, pos + 8 + length);
    if (type === "tEXt") {
      const nul = data.indexOf(0);
      if (nul > 0 && data.subarray(0, nul).toString("latin1") === "skill") {
        return data.subarray(nul + 1).toString("latin1");
      }
    }
    if (type === "IEND") break;
    pos += 12 + length;
  }
  throw new Error("PNG has no skill chunk");
}

function unpackCard(png) {
  const json = gunzipSync(Buffer.from(extractSkillPayload(png), "base64")).toString("utf8");
  const card = JSON.parse(json);
  if (card.spec !== "skill_card_v1") throw new Error(`unsupported spec ${card.spec ?? "?"}`);
  if (!card.name || !card.files || typeof card.files !== "object") {
    throw new Error("skill card is missing name or files");
  }
  return card;
}

async function installSkill(name, files) {
  const id = safeName(name);
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("files must be an object");
  }
  const keys = Object.keys(files);
  if (!keys.length) throw new Error("skill has no files");
  if (keys.length > MAX_FILES) throw new Error(`too many files (${keys.length})`);
  if (!keys.some((k) => ANCHORS.includes(k) || ANCHORS.includes(k.split("/").pop()))) {
    throw new Error("card is missing SKILL.md, SOUL.md, or ROLE.md");
  }

  const root = join(skillsRoot(), id);
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
    if (bytes > MAX_BYTES) throw new Error("skill files exceed 2MB");
    const dest = { rel, buf };
    if (ANCHORS.includes(rel)) last.push(dest);
    else extras.push(dest);
  }

  await mkdir(root, { recursive: true });
  for (const file of extras) {
    const dest = join(root, file.rel);
    await mkdir(join(dest, ".."), { recursive: true });
    await writeFile(dest, file.buf);
  }
  for (const file of last) await writeFile(join(root, file.rel), file.buf);
  return { ok: true, name: id, path: root };
}

function isAnchor(rel) {
  return ANCHORS.includes(String(rel).split("/").pop());
}

function pickAnchor(files) {
  for (const name of ANCHORS) {
    if (files[name]) return name;
  }
  const nested = Object.keys(files).filter(isAnchor);
  if (nested.length === 1) return nested[0];
  throw new Error("card is missing SKILL.md, SOUL.md, or ROLE.md");
}

function fileText(files, rel) {
  const entry = files?.[rel];
  if (!entry || typeof entry !== "object") return "";
  if (entry.encoding === "utf-8") return String(entry.content ?? "");
  if (entry.encoding === "base64") return Buffer.from(String(entry.content ?? ""), "base64").toString("utf8");
  return "";
}

function kindFromMeta(meta, fallback = "skill") {
  const raw = String(meta?.kind || "").trim().toLowerCase();
  if (raw === "soul" || raw === "persona") return "persona";
  if (raw === "role") return "role";
  if (raw === "skill") return "skill";
  if (String(meta?.role || "").trim()) return "role";
  return fallback;
}

function inferKind(card) {
  const files = card?.files && typeof card.files === "object" ? card.files : {};
  const raw = String(card?.kind || "").trim().toLowerCase();
  if (raw === "soul" || raw === "persona") return "persona";
  if (raw === "role" || raw === "skill") return raw;
  try {
    const anchor = pickAnchor(files);
    const base = anchor.split("/").pop();
    if (base === "SOUL.md") return "persona";
    if (base === "ROLE.md") return "role";
    return kindFromMeta(parseFrontmatter(fileText(files, anchor)));
  } catch {
    return "skill";
  }
}

function cardPath(name) {
  return join(cardsRoot(), `${safeName(name)}.png`);
}

async function savePng(png) {
  if (!Buffer.isBuffer(png) && !(png instanceof Uint8Array)) throw new Error("png required");
  const buf = Buffer.from(png);
  if (buf.length > MAX_PNG_BYTES) throw new Error("PNG exceeds 8MB");
  const card = unpackCard(buf);
  const name = safeName(String(card.name).trim());
  const kind = inferKind(card);
  await mkdir(cardsRoot(), { recursive: true });
  const file = cardPath(name);
  await writeFile(file, buf);
  let skill = null;
  if (kind === "skill") {
    skill = (await installSkill(name, card.files)).path;
  }
  return {
    ok: true,
    name,
    kind,
    card: file,
    skill,
    description: String(card.description ?? ""),
    files: Object.keys(card.files).length,
    bytes: buf.length,
  };
}

async function listCards() {
  let names = [];
  try {
    names = (await readdir(cardsRoot())).filter((n) => n.toLowerCase().endsWith(".png"));
  } catch {
    return { cards: [], dir: cardsRoot(), truncated: false };
  }
  names.sort((a, b) => a.localeCompare(b));
  const truncated = names.length > MAX_CARDS;
  const cards = [];
  for (const filename of names.slice(0, MAX_CARDS)) {
    const file = join(cardsRoot(), filename);
    try {
      const [png, info] = await Promise.all([readFile(file), stat(file)]);
      const card = unpackCard(png);
      const name = safeName(String(card.name).trim());
      cards.push({
        name,
        kind: inferKind(card),
        description: String(card.description ?? ""),
        files: Object.keys(card.files).length,
        bytes: info.size,
        mtime: info.mtime.toISOString(),
        url: `/dsh-plugin-skillpress/card?name=${encodeURIComponent(name)}`,
      });
    } catch {
      /* skip corrupt or non-card PNGs */
    }
  }
  return { cards, dir: cardsRoot(), truncated };
}

function parseFrontmatter(skillMd) {
  const text = String(skillMd ?? "").replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error("card markdown must start with YAML frontmatter delimited by ---");
  const data = {};
  let key = null;
  let folded = false;
  let buf = [];
  const unquote = (value) => {
    const v = String(value ?? "").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1);
    }
    return v;
  };
  const flush = () => {
    if (!key) return;
    data[key] = folded ? buf.filter(Boolean).join(" ").trim() : unquote(buf.join("\n").trim());
    key = null;
    folded = false;
    buf = [];
  };
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const start = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (start) {
      flush();
      key = start[1];
      const rest = start[2];
      if (rest === ">" || rest === ">-" || rest === "|" || rest === "|-") {
        folded = rest.startsWith(">");
        buf = [];
      } else buf = [rest];
      continue;
    }
    if (key && (line.startsWith("  ") || line.startsWith("\t"))) {
      buf.push(line.trim());
      continue;
    }
    throw new Error("could not parse frontmatter line: " + line);
  }
  flush();
  if (!data.name || !data.description) throw new Error("frontmatter needs name and description");
  return data;
}

function draftPath() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "skillpress-draft.json");
}

async function readDraft() {
  try {
    return JSON.parse(await readFile(draftPath(), "utf8"));
  } catch {
    return { at: null, name: "", skillMd: "", files: {}, installed: false };
  }
}

function normalizeExtraFiles(files) {
  if (files == null) return {};
  const out = {};
  const put = (raw, content) => {
    if (isAnchor(raw)) return;
    const rel = safeRel(String(raw));
    if (typeof content !== "string") throw new Error(`${rel} content must be a utf-8 string`);
    out[rel] = content;
  };
  if (Array.isArray(files)) {
    for (const item of files) {
      if (!item || typeof item !== "object") continue;
      put(item.path, item.content);
    }
    return out;
  }
  if (typeof files !== "object") {
    throw new Error("files must be an array of {path, content}");
  }
  for (const [raw, content] of Object.entries(files)) put(raw, content);
  return out;
}

async function writeSkillDraft({ skill_md, files, install, kind: kindArg }) {
  const skillMd = String(skill_md ?? "").trim();
  if (!skillMd) throw new Error("skill_md required");
  if (skillMd.length > 80_000) throw new Error("card markdown is too long (80KB cap)");
  const meta = parseFrontmatter(skillMd);
  const name = safeName(String(meta.name).trim());
  const asked = String(kindArg || "").trim().toLowerCase();
  const fallback = asked === "soul" || asked === "persona" ? "persona" : asked === "role" ? "role" : "skill";
  const kind = kindFromMeta(meta, fallback);
  const fileName = kind === "persona" ? "SOUL.md" : "SKILL.md";
  const extras = normalizeExtraFiles(files);
  const extraKeys = Object.keys(extras);
  if (extraKeys.length > MAX_FILES) throw new Error("too many extra files");
  let bytes = Buffer.byteLength(skillMd);
  for (const content of Object.values(extras)) bytes += Buffer.byteLength(content);
  if (bytes > MAX_BYTES) throw new Error("card files exceed 2MB");

  if (install && kind !== "skill") {
    throw new Error("install:true is only for skills (slash catalog). Persona and role cards are worn from the Cards gallery.");
  }

  const draft = {
    at: new Date().toISOString(),
    name,
    kind,
    description: String(meta.description).trim(),
    skillMd,
    files: extras,
    installed: false,
  };

  if (install) {
    const fileMap = { [fileName]: { encoding: "utf-8", content: skillMd } };
    for (const [rel, content] of Object.entries(extras)) {
      fileMap[rel] = { encoding: "utf-8", content };
    }
    await installSkill(name, fileMap);
    draft.installed = true;
  }

  await writeFile(draftPath(), `${JSON.stringify(draft, null, 2)}\n`);
  return {
    name,
    kind,
    description: draft.description,
    files: [fileName, ...extraKeys],
    installed: draft.installed,
    at: draft.at,
  };
}

async function readSkillMarkdown(name) {
  if (!name) {
    const draft = await readDraft();
    if (!draft.at) throw new Error("no agent draft yet, and no card name given");
    return {
      source: "draft",
      name: draft.name,
      kind: draft.kind || "skill",
      description: draft.description ?? "",
      skillMd: draft.skillMd,
      files: Object.keys(draft.files ?? {}),
      installed: Boolean(draft.installed),
    };
  }
  const id = safeName(name);
  const card = unpackCard(await readFile(cardPath(id)));
  const anchor = pickAnchor(card.files);
  const entry = card.files[anchor];
  const skillMd = entry.encoding === "utf-8"
    ? String(entry.content)
    : Buffer.from(String(entry.content), "base64").toString("utf8");
  return {
    source: "card",
    name: String(card.name).trim(),
    kind: inferKind(card),
    description: String(card.description ?? ""),
    skillMd,
    files: Object.keys(card.files),
    installed: false,
  };
}

export const name = "plugin-skillpress";
export const inject = ["webServer", "tools", "systemPrompt"];

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillpress/save",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req, MAX_PNG_BYTES * 2);
        if (typeof body.png !== "string" || !body.png) throw new Error("png (base64) required");
        const result = await savePng(Buffer.from(body.png, "base64"));
        ctx.logger?.("plugin-skillpress")?.info(`[plugin-skillpress] saved ${result.name} -> ${result.card}`);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillpress/cards",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      try {
        sendJson(res, 200, await listCards());
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillpress/card",
    async handler(req, res) {
      try {
        const url = new URL(req.url, "http://127.0.0.1");
        const name = safeName(url.searchParams.get("name") ?? "");
        const file = cardPath(name);
        if (req.method === "DELETE") {
          await rm(file, { force: true });
          await rm(join(skillsRoot(), name), { recursive: true, force: true });
          sendJson(res, 200, { ok: true, name });
          return;
        }
        if (req.method === "GET") {
          const png = await readFile(file);
          res.writeHead(200, {
            "content-type": "image/png",
            "cache-control": "no-store",
            "content-length": png.length,
          });
          res.end(png);
          return;
        }
        sendJson(res, 405, { error: "GET or DELETE required" });
      } catch (error) {
        sendJson(res, 404, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillpress/card-data",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      try {
        const url = new URL(req.url, "http://127.0.0.1");
        const name = safeName(url.searchParams.get("name") ?? "");
        const card = unpackCard(await readFile(cardPath(name)));
        sendJson(res, 200, {
          name: String(card.name).trim(),
          description: String(card.description ?? ""),
          kind: inferKind(card),
          files: card.files,
        });
      } catch (error) {
        sendJson(res, 404, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillpress/draft",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      try {
        sendJson(res, 200, await readDraft());
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.systemPrompt.section({
    name: "tool:skillpress",
    order: 116,
    text:
      "When the user asks you to write, draft, or mint a card, call cards_write. Pass kind: skill, persona, or role. Do not paste the full markdown in chat unless they ask to see it. The Cards press picks up the draft; tell them to open Cards and click Press card to mint the PNG.\n" +
      "A skill is a move (cast from the hotbar). A persona is identity (SOUL.md, worn on the soul seat). A role is a job (SKILL.md with role: frontmatter, worn on the role seat). Do not put always-on identity or job policy in a skill.\n" +
      "skill_md must start with YAML frontmatter (name, description). For a persona add kind: persona. For a role add role: SC-ROLENAME (and kind: role if you want). Body for a skill: title + boundary, optional Modes, Rules, Safeguards, Self-Lint, Sources. Body for a persona: Voice, Values, Limits — it is who, not a job. Body for a role follows the SkyCastle role template: ownership sentence, Must Read (ROLES.md first), Always-On Rules, Route By Task, Companion Skills, Default Flow, Validate, Output. Keep Always-On Rules short; procedure belongs in workflows/ extra files, not the standing contract.\n" +
      "Pass install:true only for skills that should unpack into the slash catalog immediately. Persona and role cards are worn from the Cards gallery after pressing. Use cards_read to revise. Use cards_list before overwriting.",
  });

  ctx.tools.register(defineTool({
    name: "cards_write",
    description:
      "Write a skill, persona, or role into the Cards press. skill_md is the standing markdown (SKILL.md or SOUL.md) with YAML frontmatter. Does not mint the PNG; the user presses the card in the UI.",
    parameters: {
      skill_md: {
        type: "string",
        required: true,
        description: "Full card markdown including --- frontmatter ---. Persona uses kind: persona. Role uses role: SC-NAME.",
      },
      kind: {
        type: "string",
        description: "skill, persona, or role. Inferred from frontmatter when omitted.",
      },
      files: {
        type: "array",
        description: "Optional extra utf-8 files. Each item is {path, content}, e.g. path \"scripts/roll.py\" or \"ROLES.md\".",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            path: { type: "string", required: true, description: "Path inside the card, relative." },
            content: { type: "string", required: true, description: "Utf-8 file contents." },
          },
        },
      },
      install: {
        type: "boolean",
        description: "If true, unpack a skill into the harness skills folder now. Rejected for persona and role. Defaults to false.",
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", required: true },
          kind: { type: "string", required: true },
          description: { type: "string", required: true },
          files: { type: "array", required: true, items: { type: "string" } },
          installed: { type: "boolean", required: true },
          at: { type: "string", required: true },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text:
          `Drafted ${value.kind} ${value.name} into the Cards press (${value.files.length} file${value.files.length === 1 ? "" : "s"})` +
          `${value.installed ? " and unpacked it into skills" : ""}. Open Cards and press the card to mint the PNG.`,
      }],
    },
    timeoutMs: 15_000,
    isConcurrencySafe: () => false,
    async execute(args) {
      return writeSkillDraft({
        skill_md: args.skill_md,
        files: args.files,
        install: Boolean(args.install),
        kind: args.kind,
      });
    },
    presentCall: (args) => ({
      card: "generic",
      title: "Write card",
      kind: "write",
      rawInput: String(args.skill_md ?? "").slice(0, 80),
    }),
  }));

  ctx.tools.register(defineTool({
    name: "cards_read",
    description:
      "Read standing markdown for a gallery card by name, or the current agent draft if name is omitted. Use this before revising with cards_write.",
    parameters: {
      name: {
        type: "string",
        description: "Gallery card name. Omit to read the current press draft.",
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string", required: true },
          name: { type: "string", required: true },
          kind: { type: "string", required: true },
          description: { type: "string", required: true },
          skillMd: { type: "string", required: true },
          files: { type: "array", required: true, items: { type: "string" } },
          installed: { type: "boolean", required: true },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: `${value.source}: ${value.name}\n${value.skillMd}`,
      }],
    },
    timeoutMs: 10_000,
    isConcurrencySafe: () => true,
    async execute(args) {
      const name = String(args.name ?? "").trim();
      return readSkillMarkdown(name);
    },
    presentCall: (args) => ({
      card: "generic",
      title: args.name || "Press draft",
      kind: "read",
      rawInput: args.name,
    }),
  }));

  ctx.tools.register(defineTool({
    name: "cards_list",
    description: "List cards already in the harness gallery (name, kind, description). Use before overwriting.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          dir: { type: "string", required: true },
          truncated: { type: "boolean", required: true },
          cards: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string", required: true },
                kind: { type: "string", required: true },
                description: { type: "string", required: true },
                files: { type: "integer", required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: value.cards.length
          ? value.cards.map((c) => `· ${c.name} (${c.kind}) — ${c.description}`).join("\n")
          : "No cards in the gallery yet.",
      }],
    },
    timeoutMs: 10_000,
    isConcurrencySafe: () => true,
    async execute() {
      const listed = await listCards();
      return {
        dir: listed.dir,
        truncated: Boolean(listed.truncated),
        cards: listed.cards.map((c) => ({
          name: c.name,
          kind: c.kind || "skill",
          description: c.description,
          files: c.files,
        })),
      };
    },
    presentCall: () => ({
      card: "generic",
      title: "Cards",
      kind: "list",
    }),
  }));
}
