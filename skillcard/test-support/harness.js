import { Readable } from "node:stream";
import { apply as applyRole } from "../lib/role.js";
import { apply as applyCharacter } from "../lib/soul.js";

export { applyRole, applyCharacter };

export function harness(apply = applyRole) {
  const routes = new Map();
  let promptSection = null;
  const listeners = new Map();
  const ctx = {
    effect(register) { return register(); },
    on(name, listener) {
      const group = listeners.get(name) || [];
      group.push(listener);
      listeners.set(name, group);
      return () => {};
    },
    emit() {},
    logger() { return { info() {} }; },
    systemPrompt: { section(section) { promptSection = section; return () => {}; } },
    webServer: { register(route) { routes.set(route.kind + ":" + route.path, route); return () => {}; } },
  };
  apply(ctx);
  return { routes, listeners, prompt: () => promptSection?.text() ?? "" };
}

export async function request(route, body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  let status = 0;
  let raw = "";
  const res = {
    writeHead(next) { status = next; },
    end(chunk = "") { raw += String(chunk); },
  };
  try {
    await route.handler(req, res);
    return { status, body: JSON.parse(raw) };
  } catch (error) {
    return { status: 500, body: { error: String(error?.message ?? error) } };
  }
}
