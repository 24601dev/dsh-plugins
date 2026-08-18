import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";

// Message board for agents working across machines: codex/claude on the SSH
// server post over plain HTTPS, harness agents use the board_* tools, and the
// user watches in Settings → Plugins → Board. One append-only log per channel;
// agents poll with a `since` cursor — no websockets, no missed messages.

const DEFAULT_URL = "https://agent-board-one.vercel.app";

function boardUrl() {
  return (process.env.DSH_BOARD_URL || DEFAULT_URL).replace(/\/+$/, "");
}

// The token never ships in the package (this gets published): env first, then
// a 0600 file in DSH_HOME. `dsh board token <value>` can write it.
async function boardToken() {
  if (process.env.DSH_BOARD_TOKEN) return process.env.DSH_BOARD_TOKEN;
  const home = process.env.DSH_HOME;
  if (!home) return "";
  try {
    return (await readFile(join(home, "board-token"), "utf8")).trim();
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const token = await boardToken();
  const response = await fetch(`${boardUrl()}/api/v1${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Board returned HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(body.message || `Board HTTP ${response.status}`);
  }
  return body;
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

export const name = "plugin-board";
export const inject = ["webServer"];

export function apply(ctx) {
  ctx.systemPrompt.section({
    name: "tool:board",
    order: 116,
    text: "A shared message board connects you to other AI agents (codex, claude) working on the same project from other machines. Use board_read to check for messages (pass the `since` cursor from the last read to get only new ones), board_post to leave one. Use the project name as the channel unless told otherwise. Always identify yourself accurately as the author. If a message is addressed to you, acknowledge it before doing unrelated work.",
  });

  ctx.tools.register(defineTool({
    name: "board_read",
    description: "Read messages from the shared agent board. Pass the `latest` value from the previous read as `since` to get only new messages. Omit `since` on first read for the backlog.",
    parameters: {
      channel: {
        type: "string",
        required: true,
        description: "Board channel, e.g. the project name. Lowercase letters, digits, dashes.",
      },
      since: {
        type: "integer",
        description: "Only messages after this timestamp cursor. Use the previous read's `latest`.",
      },
      limit: { type: "integer", description: "Max messages (1–200). Defaults to 50." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          channel: { type: "string", required: true },
          count: { type: "integer", required: true },
          latest: { type: "integer", required: true },
          messages: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", required: true },
                ts: { type: "integer", required: true },
                author: { type: "string", required: true },
                body: { type: "string", required: true },
                tags: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: value.messages.length
          ? value.messages.map((m) => `[${new Date(m.ts).toISOString()}] ${m.author}: ${m.body}`).join("\n\n")
          : "No new messages.",
      }],
    },
    timeoutMs: 20_000,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const params = new URLSearchParams();
      if (args.since) params.set("since", String(args.since));
      if (args.limit) params.set("limit", String(args.limit));
      const data = await api(`/board/${encodeURIComponent(args.channel)}/messages?${params}`);
      return { ...data, count: data.messages.length };
    },
  }));

  ctx.tools.register(defineTool({
    name: "board_post",
    description: "Post a message to the shared agent board so agents on other machines (codex, claude) can read it. Identify yourself accurately as author.",
    parameters: {
      channel: { type: "string", required: true, description: "Board channel, e.g. the project name." },
      author: {
        type: "string",
        required: true,
        description: "Your agent identity, e.g. \"dsh-kimi\". Never impersonate another agent.",
      },
      body: { type: "string", required: true, description: "Message text, max 8000 chars. Markdown fine." },
      tags: { type: "array", items: { type: "string" }, description: "Optional tags, max 8." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          posted: { type: "boolean", required: true },
          id: { type: "string", required: true },
          ts: { type: "integer", required: true },
        },
      },
      render: (_args, value) => [{ type: "text", text: `Posted to the board (${value.id}).` }],
    },
    timeoutMs: 20_000,
    isConcurrencySafe: () => false,
    execute: async (args) => {
      const data = await api(`/board/${encodeURIComponent(args.channel)}/messages`, {
        method: "POST",
        body: JSON.stringify({ author: args.author, body: args.body, tags: args.tags }),
      });
      return { posted: true, id: data.message.id, ts: data.message.ts };
    },
  }));

  ctx.tools.register(defineTool({
    name: "board_channels",
    description: "List board channels with message counts and last-activity timestamps.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          channels: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                channel: { type: "string", required: true },
                messages: { type: "integer", required: true },
                latest: { type: "integer", required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: value.channels.length
          ? value.channels.map((c) => `#${c.channel} — ${c.messages} messages, last ${new Date(c.latest).toISOString()}`).join("\n")
          : "No channels yet.",
      }],
    },
    timeoutMs: 20_000,
    isConcurrencySafe: () => true,
    execute: async () => {
      const data = await api("/board");
      return { channels: data.channels };
    },
  }));

  // Local proxy for the Board panel: the browser calls these, the token stays
  // server-side, and there is no cross-origin request from the GUI.
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/dsh-plugin-board/",
    async handler(req, res) {
      try {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        const sub = url.pathname.replace(/^\/dsh-plugin-board\//, "");
        if (req.method === "GET" && sub === "messages") {
          const channel = url.searchParams.get("channel") ?? "general";
          const since = url.searchParams.get("since") ?? "";
          const data = await api(
            `/board/${encodeURIComponent(channel)}/messages${since ? `?since=${encodeURIComponent(since)}` : "?limit=200"}`,
          );
          sendJson(res, 200, data);
          return;
        }
        if (req.method === "POST" && sub === "messages") {
          const body = await readJson(req);
          const data = await api(`/board/${encodeURIComponent(body.channel ?? "general")}/messages`, {
            method: "POST",
            body: JSON.stringify({ author: body.author, body: body.body, tags: body.tags }),
          });
          sendJson(res, 201, data);
          return;
        }
        if (req.method === "GET" && sub === "channels") {
          sendJson(res, 200, await api("/board"));
          return;
        }
        sendJson(res, 404, { error: "unknown board route" });
      } catch (error) {
        sendJson(res, 502, { error: String(error?.message ?? error) });
      }
    },
  }));
}
