window.__ModuleLoader__.load({
  id: "dsh-plugin-subagent-relay",
  factory: (require) => {
    const module = { exports: {} };
    const { indexSubagentDescendants } = require("@deepseek-ai/dsh-client-runtime/client");
    const STYLE_ID = "dsh-plugin-subagent-relay";
    const PICKER_TRIGGER = 'button[aria-haspopup="tree"][aria-label*="subagent" i]';
    const PICKER = `${PICKER_TRIGGER}:has(+ [role="tree"])`;
    const CSS = `
      div:has(> ${PICKER_TRIGGER} + [role="tree"]),
      ${PICKER_TRIGGER} + [role="tree"] {
        z-index: 10000 !important;
      }
      ${PICKER_TRIGGER} + [role="tree"] [role="treeitem"]:has([data-state="done"]) {
        display: none !important;
      }
      ${PICKER_TRIGGER}[data-subagent-relay-empty]:has(+ [role="tree"]) {
        display: none !important;
      }
    `;

    function visibleCount(text, count) {
      if (!/\d/u.test(text)) return text;
      let next = text.replace(/\d+/u, String(count));
      if (count === 1) next = next.replace(/\bsubagents\b/iu, "subagent");
      else next = next.replace(/\bsubagent\b(?!s)/iu, "subagents");
      return next;
    }

    function apply(ctx) {
      if (typeof document === "undefined") return;
      if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return;
      const tag = document.createElement("style");
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);

      const project = () => {
        const state = ctx.sessions.list.getSnapshot();
        const summary = state.current === undefined
          ? undefined
          : indexSubagentDescendants(state.byId).get(state.current);
        const activeCount = summary?.runningCount ?? 0;
        for (const trigger of document.querySelectorAll(PICKER)) {
          const count = trigger.querySelectorAll(":scope > span")[1];
          if (count?.textContent) count.textContent = visibleCount(count.textContent, activeCount);
          if (activeCount === 0) trigger.setAttribute("data-subagent-relay-empty", "");
          else trigger.removeAttribute("data-subagent-relay-empty");
        }
      };

      project();
      const unsubscribe = ctx.sessions.list.subscribe(project);
      const observer = new MutationObserver(project);
      observer.observe(document.body, { childList: true, subtree: true });
      ctx.effect(() => () => {
        observer.disconnect();
        unsubscribe();
        tag.remove?.();
      });
    }

    module.exports.apply = apply;
    return module.exports;
  },
});
