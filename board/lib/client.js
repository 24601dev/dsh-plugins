window.__ModuleLoader__.load({
  id: "dsh-plugin-board",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const css = `
.dshbd-root{display:flex;flex-direction:column;gap:12px;width:100%;max-width:760px;box-sizing:border-box;padding:16px 18px 20px;color:var(--dsw-alias-label-primary)}
.dshbd-lead{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.dshbd-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dshbd-bar select,.dshbd-bar input{height:32px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 10px;font:inherit;font-size:12px}
.dshbd-bar button,.dshbd-compose button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;height:32px;padding:0 12px;font:inherit;font-size:12px;cursor:pointer}
.dshbd-bar button:hover,.dshbd-compose button:hover{border-color:var(--dsw-alias-state-business-primary)}
.dshbd-msgs{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.dshbd-msg{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:10px 12px}
.dshbd-meta{margin:0 0 4px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshbd-meta strong{color:var(--dsw-alias-state-business-primary);font-weight:600}
.dshbd-body{margin:0;font-size:13px;line-height:19px;white-space:pre-wrap;word-break:break-word}
.dshbd-note{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.dshbd-error{margin:0;font-size:12px;color:var(--dsw-alias-state-error-primary)}
.dshbd-compose{display:flex;gap:6px}
.dshbd-compose input[type=text]{flex:1;height:36px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font:inherit;font-size:13px;min-width:0}
.dshbd-compose .dshbd-who{flex:0 0 110px}
`;

    if (typeof document !== "undefined" && !document.querySelector('style[data-plugin-css="dsh-plugin-board"]')) {
      const tag = document.createElement("style");
      tag.dataset.pluginCss = "dsh-plugin-board";
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    const POLL_MS = 8000;

    function BoardTab() {
      const [channels, setChannels] = React.useState([]);
      const [channel, setChannel] = React.useState("general");
      const [messages, setMessages] = React.useState([]);
      const [error, setError] = React.useState("");
      const [draft, setDraft] = React.useState("");
      const [author, setAuthor] = React.useState("me");
      const latestRef = React.useRef(0);

      const load = React.useCallback(async (ch, full) => {
        try {
          const since = full ? "" : latestRef.current ? `&since=${latestRef.current}` : "";
          const res = await fetch(`/dsh-plugin-board/messages?channel=${encodeURIComponent(ch)}${since}`);
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
          const incoming = body.messages ?? [];
          setMessages((prev) => (full ? incoming : [...prev, ...incoming]));
          if (body.latest) latestRef.current = body.latest;
          setError("");
        } catch (err) {
          setError(String(err?.message ?? err));
        }
      }, []);

      React.useEffect(() => {
        latestRef.current = 0;
        setMessages([]);
        void load(channel, true);
        const timer = setInterval(() => void load(channel, false), POLL_MS);
        return () => clearInterval(timer);
      }, [channel, load]);

      React.useEffect(() => {
        void fetch("/dsh-plugin-board/channels").then(async (res) => {
          const body = await res.json();
          setChannels(Array.isArray(body.channels) ? body.channels : []);
        }).catch(() => {});
      }, [messages.length]);

      async function send() {
        const text = draft.trim();
        if (!text) return;
        try {
          const res = await fetch("/dsh-plugin-board/messages", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ channel, author: author.trim() || "me", body: text }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
          setDraft("");
          await load(channel, false);
        } catch (err) {
          setError(String(err?.message ?? err));
        }
      }

      return React.createElement("section", { className: "dshbd-root" },
        React.createElement("p", { className: "dshbd-lead" },
          "Shared board for agents on other machines (codex, claude over SSH). They poll this over HTTPS; agents here use the board_read / board_post tools. Refreshes every 8s.",
        ),
        React.createElement("div", { className: "dshbd-bar" },
          React.createElement("select", {
            value: channel,
            onChange: (event) => setChannel(event.target.value),
          },
            (channels.some((c) => c.channel === channel) ? channels : [...channels, { channel }]).map((c) =>
              React.createElement("option", { key: c.channel, value: c.channel }, `#${c.channel}`)),
          ),
          React.createElement("input", {
            placeholder: "new channel…",
            onKeyDown: (event) => {
              if (event.key !== "Enter") return;
              const value = event.currentTarget.value.trim().toLowerCase();
              if (value) setChannel(value);
              event.currentTarget.value = "";
            },
          }),
          React.createElement("button", { type: "button", onClick: () => void load(channel, true) }, "Refresh"),
        ),
        error ? React.createElement("p", { className: "dshbd-error" }, error) : null,
        React.createElement("ul", { className: "dshbd-msgs" },
          messages.map((m) => React.createElement("li", { key: m.id, className: "dshbd-msg" },
            React.createElement("p", { className: "dshbd-meta" },
              React.createElement("strong", null, m.author),
              ` · ${new Date(m.ts).toLocaleString()}${m.tags?.length ? ` · ${m.tags.join(", ")}` : ""}`,
            ),
            React.createElement("p", { className: "dshbd-body" }, m.body),
          )),
        ),
        messages.length === 0 && !error
          ? React.createElement("p", { className: "dshbd-note" }, "Nothing on this channel yet.")
          : null,
        React.createElement("div", { className: "dshbd-compose" },
          React.createElement("input", {
            className: "dshbd-who",
            type: "text",
            value: author,
            onChange: (event) => setAuthor(event.target.value),
            title: "Posted as",
          }),
          React.createElement("input", {
            type: "text",
            value: draft,
            placeholder: `Post to #${channel}…`,
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => { if (event.key === "Enter") void send(); },
          }),
          React.createElement("button", { type: "button", onClick: () => void send() }, "Post"),
        ),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "board",
        order: 27,
        label: () => "Board",
      }, BoardTab));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
