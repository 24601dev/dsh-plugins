import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Host half for Plugin list toggles. The inventory Remote is read-only, so
// this writes the profile's cordis.patch.yml (the supported user layer).
// HMR watches that file and recomposes the loader tree. We also call
// entry.update so the change lands before the watcher runs.
//
// Do not use loader.update(): it writes the composed tree back to cordis.yml.

export const name = "plugin-ui-tweaks";
export const inject = ["webServer", "loader"];

const START = "# --- dsh-plugin-ui-tweaks toggles ---";
const END = "# --- end dsh-plugin-ui-tweaks toggles ---";

// Rows whose disable would take down the GUI, settings, or this toggle.
export const PROTECTED_IDS = new Set([
  "include",
  "webserver",
  "web-startup",
  "web-runtime",
  "api-gateway",
  "typert-gateway",
  "typert",
  "typert-loader",
  "modules",
  "client-runtime",
  "connection",
  "api-remotes",
  "ui-layout",
  "ui-settings",
  "ui-settings-plugins",
  "ui-settings-plugin-inventory",
  "plugin-inventory",
  "plugin-ui-tweaks",
  "timer",
  "settings",
]);

function patchPath() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "profiles", "web", "cordis.patch.yml");
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
  return raw ? JSON.parse(raw) : {};
}

function parseManaged(text) {
  const i = text.indexOf(START);
  const j = text.indexOf(END);
  if (i < 0 || j < 0 || j < i) return [];
  const body = text.slice(i + START.length, j);
  const rows = [];
  const re = /- id: ([^\s\n]+)\n  disabled: (true|false)/g;
  let match;
  while ((match = re.exec(body))) {
    rows.push({ id: match[1], disabled: match[2] === "true" });
  }
  return rows;
}

function dumpManaged(rows) {
  if (!rows.length) return `${START}\n${END}`;
  const body = rows
    .map((row) => `- id: ${row.id}\n  disabled: ${row.disabled}`)
    .join("\n");
  return `${START}\n${body}\n${END}`;
}

function hasOtherEntries(text) {
  const i = text.indexOf(START);
  const j = text.indexOf(END);
  let rest = text;
  if (i >= 0 && j > i) rest = text.slice(0, i) + text.slice(j + END.length);
  const stripped = rest.replace(/^\s*#.*$/gm, "").replace(/^\s*\[\]\s*$/gm, "").trim();
  return stripped.length > 0;
}

function upsertFile(text, rows) {
  const block = dumpManaged(rows);
  if (text.includes(START) && text.includes(END)) {
    const next = text.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
    if (!rows.length && !hasOtherEntries(next)) {
      const comments = next
        .split("\n")
        .filter((line) => line.trim().startsWith("#") || line.trim() === "")
        .join("\n")
        .trimEnd();
      return `${comments}\n[]\n`;
    }
    return next.endsWith("\n") ? next : `${next}\n`;
  }
  const stripped = text.replace(/^\s*#.*$/gm, "").trim();
  if (!stripped || stripped === "[]") {
    const comments = text
      .split("\n")
      .filter((line) => line.trim().startsWith("#") || line.trim() === "")
      .join("\n")
      .trimEnd();
    if (!rows.length) return `${comments}\n[]\n`;
    return `${comments}\n\n${block}\n`;
  }
  return `${text.trimEnd()}\n\n${block}\n`;
}

function rowId(entryId) {
  const index = String(entryId).lastIndexOf(":");
  return index >= 0 ? String(entryId).slice(index + 1) : String(entryId);
}

function isProtected(entryId) {
  const id = String(entryId);
  return PROTECTED_IDS.has(id) || PROTECTED_IDS.has(rowId(id));
}

function findEntry(loader, entryId) {
  for (const entry of loader.entries()) {
    if (String(entry.id) === entryId) return entry;
  }
  return null;
}

let writeQueue = Promise.resolve();

function enqueue(work) {
  const run = writeQueue.then(work, work);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

function listEntries(loader) {
  const entries = [];
  try {
    for (const entry of loader.entries()) {
      const options = entry.options ?? {};
      if (options.group) continue;
      const entryId = String(entry.id ?? "");
      entries.push({
        entryId,
        moduleName: String(options.name ?? ""),
        enabled: !entry.disabled,
        protected: isProtected(entryId),
      });
    }
  } catch (error) {
    console.error("[dsh-plugin-ui-tweaks] listEntries failed", error);
  }
  return entries;
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-ui-tweaks/entries",
    async handler(req, res) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "GET required" });
        return;
      }
      try {
        sendJson(res, 200, { entries: listEntries(ctx.loader) });
      } catch (error) {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-ui-tweaks/set-enabled",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const entryId = String(body.entryId ?? "").trim();
        const enabled = body.enabled === true;
        if (!entryId) {
          sendJson(res, 400, { error: "entryId is required" });
          return;
        }
        if (isProtected(entryId)) {
          sendJson(res, 403, {
            error: "This plugin is required to keep the GUI and Plugin list working.",
            protected: true,
            entryId,
          });
          return;
        }

        const result = await enqueue(async () => {
          const entry = findEntry(ctx.loader, entryId);
          if (!entry) {
            const error = new Error(`No loader entry ${entryId}`);
            error.status = 404;
            throw error;
          }
          await entry.update({ disabled: !enabled });

          const path = patchPath();
          let text = "";
          try {
            text = await readFile(path, "utf8");
          } catch (error) {
            if (error?.code !== "ENOENT") throw error;
          }
          const rows = parseManaged(text).filter((row) => row.id !== rowId(entryId));
          // Only persist disables. A `disabled: false` patch remounts the
          // entry and can race its service providers on the next boot.
          if (!enabled) rows.push({ id: rowId(entryId), disabled: true });
          await writeFile(path, upsertFile(text, rows));
          return {
            ok: true,
            entryId,
            enabled,
            persisted: true,
          };
        });
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, error?.status || 500, {
          error: String(error?.message ?? error),
        });
      }
    },
  }));
}
