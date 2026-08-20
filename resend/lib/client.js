window.__ModuleLoader__.load({
  id: "dsh-plugin-resend",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    // Icons, Tooltip, MessageText and JsonBlock come from the shared primitives
    // package (the same import the message-feedback plugin uses), so the action
    // row and the bubble match the native look. ImageGallery renders attachments.
    const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
    const attachment = require("@deepseek-ai/dsh-client-ui-attachment");

    const css = `
/* Action buttons match the native MessageIconActions spec exactly:
   28x28, padding 6, fully round, 10px row gap, tertiary->secondary on hover. */
.dshrs-actions{display:inline-flex;gap:10px;align-items:center;height:28px}
.dshrs-btn{border:0;background:none;color:var(--dsw-alias-label-tertiary);border-radius:28px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:6px}
.dshrs-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshrs-btn:disabled{opacity:.55;cursor:default}
.dshrs-err{color:var(--dsw-alias-state-error-primary);font-size:11px;white-space:pre-wrap;align-self:center}

/* Hide the message-feedback thumbs (like/dislike) in the assistant action row.
   They are the only buttons carrying aria-pressed, so that attribute is a
   stable, build-independent discriminator (their row and button classes are
   hashed CSS-module names). Scoped to the turn-tail root via its data attr. */
[data-turn-tail] button[aria-pressed]{display:none !important}

/* User bubble — a faithful recreation of the harness's UserStyleBubble using
   the same design tokens, so replacing the built-in renderer does not drift.
   Class names mirror the package's MessageItem module (userRow/userStack/bubble). */
.dshrs-userRow{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.dshrs-userStack{display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:0;max-width:min(525px,82%)}
.dshrs-bubble{background:var(--dsw-specific-bubble);max-width:100%;color:var(--dsw-alias-label-primary);border-radius:22px;padding:10px 16px;font-size:16px;line-height:24px;overflow-wrap:anywhere}
.dshrs-iconrow{display:inline-flex;gap:10px;align-items:center;height:28px}
.dshrs-refChip{color:var(--dsw-alias-label-primary);white-space:nowrap;vertical-align:baseline;background:#6187d838;border-radius:6px;margin:0 2px;padding:0 8px;font-size:.85em;line-height:1.6;display:inline-block}
`;

    if (typeof document !== "undefined" && !document.querySelector('style[data-plugin-css="dsh-plugin-resend"]')) {
      const tag = document.createElement("style");
      tag.dataset.pluginCss = "dsh-plugin-resend";
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    const P = primitives;
    const IconRefresh = P.IconRefreshOutline16;
    const IconLoading = P.IconLoadingOutline16;
    const IconTrash = P.IconTrashOutline16;
    const IconCopy = P.IconCopyOutline16;
    const IconCheck = P.IconCheckOutline16;
    const Tooltip = P.Tooltip;
    const MessageText = P.MessageText;
    const JsonBlock = P.JsonBlock;
    const ImageGallery = attachment.ImageGallery;

    function iconBtn(Icon, label, busy, disabled, onClick) {
      const glyph = busy
        ? React.createElement(IconLoading, {})
        : Icon ? React.createElement(Icon, {}) : label;
      const btn = React.createElement("button", {
        type: "button",
        className: "dshrs-btn",
        disabled,
        "aria-label": label,
        onClick,
      }, glyph);
      return Tooltip
        ? React.createElement(Tooltip, { key: label, label, side: "bottom" }, btn)
        : React.createElement("span", { key: label, title: label }, btn);
    }

    // ---- shared content helpers (mirror the harness's contentParts/projectUserText)
    function contentParts(content) {
      const texts = [];
      const images = [];
      const rest = [];
      for (const block of content ?? []) {
        const b = block;
        if (b?.type === "text" && typeof b.text === "string") texts.push(b.text);
        else if (b?.type === "image" && b.attachment !== undefined) images.push({ attachment: b.attachment });
        else rest.push(block);
      }
      return { text: texts.join(""), images, rest };
    }

    function textOf(node) {
      const blocks = node?.content ?? node?.blocks ?? [];
      return blocks.map((b) => (typeof b?.text === "string" ? b.text : "")).join("").trim();
    }

    function hasImages(node) {
      const blocks = node?.content ?? node?.blocks ?? [];
      return blocks.some((b) => b?.kind === "image" || b?.type === "image");
    }

    // Render user text, highlighting @subagent and /skill mentions as chips —
    // the same projection the built-in bubble applies.
    function projectUserText(text) {
      if (!MessageText) return text;
      const re = /(^|\s)([/@][\w-]+)(?=\s|$)/g;
      const parts = [];
      let cursor = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const tokenStart = m.index + (m[1]?.length ?? 0);
        const label = m[2] ?? "";
        if (tokenStart > cursor) {
          parts.push(React.createElement(MessageText, { key: cursor, text: text.slice(cursor, tokenStart) }));
        }
        parts.push(React.createElement("span", {
          key: tokenStart,
          className: "dshrs-refChip",
          "data-ref-chip": label.startsWith("@") ? "subagent" : "skill",
        }, label));
        cursor = tokenStart + label.length;
      }
      if (parts.length === 0) return React.createElement(MessageText, { text });
      if (cursor < text.length) parts.push(React.createElement(MessageText, { key: cursor, text: text.slice(cursor) }));
      return React.createElement(React.Fragment, null, ...parts);
    }

    // ---- Regenerate (assistant messages) -------------------------------------
    function RegenerateAction(props) {
      const { messageId, sessionId, useSession, regenerate } = props;
      const snapshot = useSession((s) => s);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);

      const derived = React.useMemo(() => {
        const nodes = snapshot?.nodes ?? [];
        const aiIndex = nodes.findIndex(
          (n) => n.kind === "assistant" && n.messageId && n.messageId === messageId,
        );
        if (aiIndex === -1) return null;
        const ai = nodes[aiIndex];
        let user = null;
        for (let i = aiIndex - 1; i >= 0; i -= 1) {
          const n = nodes[i];
          if (n.kind === "user" || n.kind === "steering") { user = n; break; }
        }
        return {
          aiSeq: ai.seq,
          userText: user ? textOf(user) : "",
          userHasImages: user ? hasImages(user) : false,
        };
      }, [snapshot, messageId]);

      async function run() {
        setBusy(true);
        setError(null);
        try {
          await regenerate(derived);
        } catch (e) {
          setError(String(e?.message ?? e));
        } finally {
          setBusy(false);
        }
      }

      if (!derived) return null;
      const title = derived.userHasImages
        ? "Regenerate this reply (images not re-attached)"
        : "Regenerate this reply";
      return React.createElement("span", { className: "dshrs-actions" },
        iconBtn(IconRefresh, title, busy, busy, () => void run()),
        error ? React.createElement("span", { className: "dshrs-err" }, error) : null,
      );
    }

    // ---- User message view (replaces the built-in 'user' renderer) ------------
    // Faithful bubble + an icon row that adds Delete next to Copy. Delete forks
    // the session just before this message, dropping it and everything after.
    function UserMessageView(props) {
      const { node, loadImage, useSession, sessionId, deleteFrom } = props;
      const data = node?.data ?? node;
      const snapshot = useSession ? useSession((s) => s) : null;
      const [copied, setCopied] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const { text, images, rest } = contentParts(data?.content);
      const showBubble = text !== "" || rest.length > 0;

      async function copy() {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch { /* clipboard unavailable */ }
      }

      async function onDelete() {
        setBusy(true);
        setError(null);
        try {
          await deleteFrom(data, snapshot);
        } catch (e) {
          setError(String(e?.message ?? e));
        } finally {
          setBusy(false);
        }
      }

      return React.createElement("div", { className: "dshrs-userRow", "data-time-hover-root": true },
        React.createElement("div", { className: "dshrs-userStack" },
          images.length > 0 && ImageGallery
            ? React.createElement(ImageGallery, { images, load: loadImage, align: "end" })
            : null,
          showBubble
            ? React.createElement("div", { className: "dshrs-bubble" },
                projectUserText(text),
                rest.map((block, i) =>
                  JsonBlock
                    ? React.createElement(JsonBlock, { key: i, label: "Extra content", payload: block })
                    : null,
                ),
              )
            : null,
        ),
        React.createElement("span", { className: "dshrs-iconrow" },
          iconBtn(copied ? IconCheck : IconCopy, copied ? "Copied" : "Copy", false, false, () => void copy()),
          iconBtn(IconTrash, "Delete this message and everything after", busy, busy, () => void onDelete()),
          error ? React.createElement("span", { className: "dshrs-err" }, error) : null,
        ),
      );
    }

    const inject = ["slots", "sessions", "locale"];
    function apply(ctx) {
      const sessions = ctx.get("sessions");

      async function promptChild(childId, text) {
        sessions.open(childId);
        const scoped = sessions.scope(childId);
        if (!scoped) throw new Error("fork created no addressable child session");
        const face = sessions.sessionOf(scoped);
        if (!face || typeof face.prompt !== "function") {
          throw new Error("could not resolve the child session to send into");
        }
        await face.prompt([{ kind: "text", text }], "queue");
      }

      // Regenerate: fork AT the assistant turn (keeps the prompt, drops the
      // answer onward), then re-prompt the same user text in the child.
      async function regenerate(derived, sessionId) {
        if (!derived) return;
        if (derived.aiSeq == null) throw new Error("no message to regenerate from");
        const childId = await sessions.fork({ sessionId, atSeq: derived.aiSeq });
        await promptChild(childId, derived.userText);
      }

      // Delete: fork just BEFORE this user message's turn, so the child keeps
      // everything before it and drops the message onward. The anchor is the
      // previous flow node's seq (the prior turn's end); for a first message
      // there is none, so fork at seq 0 for an empty prefix.
      async function deleteFrom(data, sessionId, snapshot) {
        const nodes = snapshot?.nodes ?? [];
        const index = nodes.findIndex((n) => n.seq === data?.seq && (n.kind === "user" || n.kind === "steering"));
        let atSeq = 0;
        if (index > 0) atSeq = nodes[index - 1].seq;
        else if (index === -1 && data?.seq != null) atSeq = data.seq; // fallback: best effort
        const childId = await sessions.fork({ sessionId, atSeq, increaseTitle: true });
        sessions.open(childId);
      }

      // Assistant message action: Regenerate.
      ctx.slots.inject("conversation.chat.assistant-actions", () =>
        ctx.slots.register(
          {
            name: "conversation.chat.assistant-actions",
            id: "regenerate",
            order: 100,
            label: () => "Regenerate",
          },
          (ownerProps) =>
            React.createElement(RegenerateAction, {
              ...ownerProps,
              regenerate: (derived) => regenerate(derived, ownerProps.sessionId),
            }),
        ),
      );

      // User message renderer: faithful bubble + Copy/Delete. Registering key
      // 'user' replaces the built-in user view (intentional — the only way to
      // put an action on the user's own message).
      ctx.slots.inject("conversation.chat.node", () =>
        ctx.slots.register(
          {
            name: "conversation.chat.node",
            key: "user",
            // Lower priority shadows the built-in "user" renderer (lowest
            // renders), which is the whole point — putting actions on the
            // user's own message. Core registers this key at priority 0.
            priority: -10,
            label: () => "User message",
          },
          (ownerProps) =>
            React.createElement(UserMessageView, {
              ...ownerProps,
              deleteFrom: (data, snapshot) => deleteFrom(data, ownerProps.sessionId, snapshot),
            }),
        ),
      );
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
