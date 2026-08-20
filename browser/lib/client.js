window.__ModuleLoader__.load({
  id: "dsh-plugin-browser",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const css = `
.dshbr-root{display:flex;flex-direction:column;gap:0;width:100%;height:100%;min-height:min(68vh,640px);box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden}
.dshbr-bar{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);flex-shrink:0}
.dshbr-bar button{height:30px;min-width:30px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:13px;cursor:pointer}
.dshbr-bar button:hover{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dshbr-bar button:disabled{opacity:.45;cursor:default}
.dshbr-url{flex:1;min-width:0;height:30px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 10px;font:inherit;font-size:13px}
.dshbr-url:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}
.dshbr-stage{position:relative;flex:1;min-height:280px;background:#0e0e10;cursor:default;overflow:hidden}
.dshbr-stage:focus{outline:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent);outline-offset:-1px}
.dshbr-stage canvas,.dshbr-stage img{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;-webkit-user-drag:none}
.dshbr-stage canvas{image-rendering:auto}
.dshbr-note,.dshbr-error{margin:0;padding:10px 12px;font-size:12px;line-height:18px}
.dshbr-note{color:var(--dsw-alias-label-tertiary)}
.dshbr-error{color:var(--dsw-alias-state-error-primary)}
.dshbr-settings{display:flex;flex-direction:column;gap:8px;width:100%;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2);box-sizing:border-box}
.dshbr-settings h3{margin:0;font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dshbr-settings p{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.wSkVaW_viewArea:has(.dshbr-root),[class*="viewArea"]:has(.dshbr-root){display:flex;flex-direction:column;min-height:0}
.wSkVaW_viewArea:has(.dshbr-root)>.dshbr-root,[class*="viewArea"]:has(.dshbr-root)>.dshbr-root{flex:1}
`;

    if (typeof document !== "undefined" && !document.querySelector('style[data-plugin-css="dsh-plugin-browser"]')) {
      const tag = document.createElement("style");
      tag.dataset.pluginCss = "dsh-plugin-browser";
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    async function json(path, options) {
      const res = await fetch(path, options);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    }

    function namedKey(event) {
      if (event.key === " ") return "Space";
      if (event.key.length === 1) return "";
      return event.key;
    }

    function BrowserTab() {
      const [url, setUrl] = React.useState("");
      const [draft, setDraft] = React.useState("");
      const [error, setError] = React.useState("");
      const [ready, setReady] = React.useState(false);
      const stageRef = React.useRef(null);
      const canvasRef = React.useRef(null);
      const editingRef = React.useRef(false);

      const refresh = React.useCallback(async (start) => {
        try {
          const info = await json(`/dsh-plugin-browser/status${start ? "?start=1" : ""}`);
          setReady(Boolean(info.ready));
          setUrl(info.url || "");
          if (!editingRef.current) setDraft(info.url || "");
          setError(info.error || "");
        } catch (err) {
          setReady(false);
          setError(String(err?.message ?? err));
        }
      }, []);

      React.useEffect(() => {
        void refresh(true);
        const timer = setInterval(() => void refresh(false), 2500);
        return () => clearInterval(timer);
      }, [refresh]);

      React.useEffect(() => {
        const node = stageRef.current;
        if (!node) return undefined;
        let timer = 0;
        const send = (immediate) => {
          const rect = node.getBoundingClientRect();
          if (rect.width < 40 || rect.height < 40) return;
          const body = JSON.stringify({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            dpr: Math.min(2, window.devicePixelRatio || 1),
          });
          const post = () => {
            void json("/dsh-plugin-browser/viewport", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body,
            }).catch(() => {});
          };
          if (immediate) post();
          else {
            window.clearTimeout(timer);
            timer = window.setTimeout(post, 80);
          }
        };
        send(true);
        const observer = new ResizeObserver(() => send(false));
        observer.observe(node);
        return () => {
          window.clearTimeout(timer);
          observer.disconnect();
        };
      }, [ready]);

      React.useEffect(() => {
        if (!ready) return undefined;
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
            const gfx = canvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!gfx) return undefined;
        gfx.imageSmoothingEnabled = false;
        const proto = location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${proto}//${location.host}/dsh-plugin-browser/frames`);
        ws.binaryType = "blob";
        let latest = null;
        let drawing = false;
        async function blit() {
          drawing = true;
          while (latest) {
            const frame = latest;
            latest = null;
            try {
              const bmp = await createImageBitmap(frame);
              if (canvas.width !== bmp.width) canvas.width = bmp.width;
              if (canvas.height !== bmp.height) canvas.height = bmp.height;
              gfx.drawImage(bmp, 0, 0);
              bmp.close();
            } catch { /* skip a bad frame */ }
          }
          drawing = false;
        }
        ws.onmessage = (event) => {
          latest = event.data;
          if (!drawing) void blit();
        };
        return () => {
          ws.close();
          latest = null;
        };
      }, [ready]);

      async function go(target) {
        const next = (target ?? draft).trim();
        if (!next) return;
        try {
          const info = await json("/dsh-plugin-browser/navigate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: next }),
          });
          setUrl(info.url || next);
          setDraft(info.url || next);
          setError("");
        } catch (err) {
          setError(String(err?.message ?? err));
        }
      }

      async function command(path) {
        try {
          const info = await json(`/dsh-plugin-browser/${path}`, { method: "POST" });
          setUrl(info.url || url);
          setDraft(info.url || url);
          setError("");
        } catch (err) {
          setError(String(err?.message ?? err));
        }
      }

      function onStageClick(event) {
        const node = stageRef.current;
        if (!node) return;
        node.focus();
        const rect = node.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        void json("/dsh-plugin-browser/input", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "click", x, y }),
        }).catch((err) => setError(String(err?.message ?? err)));
      }

      function onStageKey(event) {
        if (event.metaKey && event.key.toLowerCase() === "l") return;
        event.preventDefault();
        const key = namedKey(event);
        const body = key
          ? { type: "key", key }
          : { type: "key", text: event.key };
        void json("/dsh-plugin-browser/input", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).catch((err) => setError(String(err?.message ?? err)));
      }

      return React.createElement("section", { className: "dshbr-root" },
        React.createElement("div", { className: "dshbr-bar" },
          React.createElement("button", { type: "button", title: "Back", onClick: () => void command("back") }, "←"),
          React.createElement("button", { type: "button", title: "Forward", onClick: () => void command("forward") }, "→"),
          React.createElement("button", { type: "button", title: "Reload", onClick: () => void command("reload") }, "↻"),
          React.createElement("input", {
            className: "dshbr-url",
            value: draft,
            spellCheck: false,
            placeholder: "https://",
            onChange: (event) => setDraft(event.target.value),
            onFocus: (event) => { editingRef.current = true; event.target.select(); },
            onBlur: () => { editingRef.current = false; },
            onKeyDown: (event) => { if (event.key === "Enter") void go(); },
          }),
          React.createElement("button", { type: "button", onClick: () => void go() }, "Go"),
        ),
        error ? React.createElement("p", { className: "dshbr-error" }, error) : null,
        ready
          ? React.createElement("div", {
            className: "dshbr-stage",
            ref: stageRef,
            tabIndex: 0,
            onClick: onStageClick,
            onKeyDown: onStageKey,
          },
            React.createElement("canvas", { ref: canvasRef }),
          )
          : React.createElement("p", { className: "dshbr-note" },
            error
              ? "Chrome did not start. Check DSH_BROWSER_CHROME, then press Go or reopen this tab."
              : "Starting Chrome… You and the agent share this one page.",
          ),
      );
    }

    function SettingsRow() {
      return React.createElement("section", { className: "dshbr-settings" },
        React.createElement("h3", null, "Chrome browser"),
        React.createElement("p", null,
          "Adds a Browser tab to the session. You and the agent share one headless Chrome — live picture in the tab, browser_snapshot / browser_click / browser_type tools on the agent side. Isolated profile (not your everyday Chrome). Override the binary with DSH_BROWSER_CHROME.",
        ),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "browser",
        order: 30,
        label: () => "Browser",
      }, BrowserTab));
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "chrome-browser",
        order: 22,
      }, SettingsRow));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
