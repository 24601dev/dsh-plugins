/**
 * Serve original skin assets. The look itself is client CSS.
 */
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "plugin-p5";
export const inject = ["webServer"];

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const TYPES = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".css": "text/css; charset=utf-8",
};

function send(res, status, body, type) {
  res.writeHead(status, {
    "content-type": type || "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function safeRel(pathname) {
  const rel = decodeURIComponent(pathname.replace(/^\/dsh-plugin-p5\/?/, ""));
  const parts = rel.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) return null;
  return parts;
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/dsh-plugin-p5",
    async handler(req, res) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        send(res, 405, "GET required");
        return;
      }
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const parts = safeRel(url.pathname);
      if (!parts) {
        send(res, 404, "not found");
        return;
      }
      const dest = join(ASSETS, ...parts);
      try {
        const body = await readFile(dest);
        const type = TYPES[extname(dest).toLowerCase()] || "application/octet-stream";
        send(res, 200, req.method === "HEAD" ? undefined : body, type);
      } catch {
        send(res, 404, "not found");
      }
    },
  }));
}
