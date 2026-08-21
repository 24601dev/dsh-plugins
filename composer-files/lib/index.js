import { decodePdfRequest, extractPdfText, readJsonBody } from "./pdf.js";

export const name = "plugin-composer-files";
export const inject = ["webServer"];

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/dsh-plugin-composer-files",
    async handler(req, res) {
      if (req.method !== "POST" || req.url?.split("?", 1)[0] !== "/dsh-plugin-composer-files/pdf") {
        sendJson(res, 404, { error: "unknown composer-files route" });
        return;
      }
      if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        sendJson(res, 415, { error: "content type must be application/json" });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const result = await extractPdfText(decodePdfRequest(body));
        sendJson(res, 200, result);
      } catch (error) {
        const status = Number.isInteger(error?.statusCode) ? error.statusCode : 422;
        sendJson(res, status, { error: String(error?.message ?? error) });
      }
    },
  }));
}
