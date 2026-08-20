import { createBrowserSession } from "./chrome.js";
import { registerHttp } from "./http.js";
import { registerTools } from "./tools.js";

export const name = "plugin-browser";
export const inject = ["webServer", "systemPrompt", "tools"];

const PROMPT = [
  "A shared Chrome tab is available in this session (the Browser view).",
  "The user watches the same page you control.",
  "Use browser_snapshot first — it lists visible controls with [ref=eN] handles.",
  "Then browser_click / browser_type / browser_press / browser_scroll using those refs.",
  "Use browser_navigate to open an http(s) URL.",
  "Use browser_screenshot only when layout or visual state matters; it requires an image-capable model.",
  "Prefer snapshot over screenshot.",
].join(" ");

export function apply(ctx) {
  const session = createBrowserSession();
  ctx.systemPrompt.section({ name: "tool:browser", order: 118, text: PROMPT });
  registerTools(ctx, session);
  ctx.effect(() => {
    const stopHttp = registerHttp(ctx, session);
    const stopWs = ctx.webServer.registerUpgrade({
      path: "/dsh-plugin-browser/frames",
      handler: (req, socket, head) => session.addSocket(req, socket, head),
    });
    return () => {
      stopHttp?.();
      stopWs?.();
      void session.close();
    };
  });
}
