/**
 * Persist which skillcard surfaces are visible. Wear/install APIs stay up
 * even when a surface is hidden — this only gates the dock and sidebar UI.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULTS = { dock: true, sidebar: true };

function configPath() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "plugin-skillcard.json");
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

function normalize(raw) {
  return {
    dock: raw?.dock !== false,
    sidebar: raw?.sidebar !== false,
  };
}

async function loadConfig() {
  try {
    return normalize(JSON.parse(await readFile(configPath(), "utf8")));
  } catch {
    return { ...DEFAULTS };
  }
}

async function saveConfig(next) {
  const config = normalize(next);
  await mkdir(dirname(configPath()), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(config, null, 2)}\n`);
  return config;
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-skillcard/config",
    async handler(req, res) {
      try {
        if (req.method === "GET") {
          sendJson(res, 200, await loadConfig());
          return;
        }
        if (req.method === "POST") {
          const body = await readJson(req);
          const current = await loadConfig();
          sendJson(res, 200, await saveConfig({ ...current, ...body }));
          return;
        }
        sendJson(res, 405, { error: "GET or POST required" });
      } catch (error) {
        sendJson(res, 400, { error: String(error?.message ?? error) });
      }
    },
  }));
}
