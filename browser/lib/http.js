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

function subpath(req, prefix) {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  return {
    url,
    sub: url.pathname.replace(new RegExp(`^${prefix}/?`), ""),
  };
}

export function registerHttp(ctx, session) {
  return ctx.webServer.register({
    kind: "prefix",
    path: "/dsh-plugin-browser",
    async handler(req, res) {
      try {
        const { url, sub } = subpath(req, "/dsh-plugin-browser");
        if (req.method === "GET" && (sub === "" || sub === "status")) {
          try {
            if (url.searchParams.get("start") === "1") await session.ensure();
            sendJson(res, 200, await session.status());
          } catch (error) {
            sendJson(res, 200, { ready: false, url: "", title: "", error: String(error?.message ?? error) });
          }
          return;
        }
        if (req.method === "GET" && sub === "stream") {
          session.addStream(res);
          return;
        }
        if (req.method === "POST" && sub === "navigate") {
          const body = await readJson(req);
          sendJson(res, 200, await session.run(() => session.navigate(body.url)));
          return;
        }
        if (req.method === "POST" && sub === "viewport") {
          const body = await readJson(req);
          sendJson(res, 200, await session.setViewport(body.width, body.height, body.dpr));
          return;
        }
        if (req.method === "POST" && sub === "input") {
          const body = await readJson(req);
          if (body.type === "click") {
            sendJson(res, 200, await session.run(() => session.clickAt(body.x, body.y)));
            return;
          }
          if (body.type === "key") {
            sendJson(res, 200, await session.run(() => session.key(body.key, body.text)));
            return;
          }
          sendJson(res, 400, { error: "unknown input" });
          return;
        }
        if (req.method === "POST" && sub === "back") {
          sendJson(res, 200, await session.run(() => session.back()));
          return;
        }
        if (req.method === "POST" && sub === "forward") {
          sendJson(res, 200, await session.run(() => session.forward()));
          return;
        }
        if (req.method === "POST" && sub === "reload") {
          sendJson(res, 200, await session.run(() => session.reload()));
          return;
        }
        sendJson(res, 404, { error: `unknown browser route: ${sub || url.pathname}` });
      } catch (error) {
        sendJson(res, 502, { error: String(error?.message ?? error) });
      }
    },
  });
}
