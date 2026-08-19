window.__ModuleLoader__.load({
  id: "dsh-plugin-chat-density",
  factory: (require) => {
    const module = { exports: {} };
    const TAG_ID = "dsh-plugin-chat-density";

    /*
     * Chat body text rides the four --dsw-font-markdown-base* tokens, which the
     * harness sets at 16px/28px. This override moves them to 14px/24px — the
     * design system's own small markdown scale (--dsw-font-markdown-small), so
     * weight, family, and rhythm stay on-system. Headings, code, tables, and
     * UI chrome keep their own scales; nothing else is touched.
     */
    const CSS = `body{
--dsw-font-markdown-base:14px/24px var(--dsw-font-family);
--dsw-font-markdown-base-font-size:14px;
--dsw-font-markdown-base-line-height:24px;
--dsw-font-markdown-base-strong:600 14px/24px var(--dsw-font-family);
--dsw-font-markdown-base-strong-font-size:14px;
--dsw-font-markdown-base-strong-line-height:24px;
--dsw-font-markdown-base-italic:italic 14px/24px var(--dsw-font-family);
--dsw-font-markdown-base-italic-font-size:14px;
--dsw-font-markdown-base-italic-line-height:24px;
--dsw-font-markdown-base-strong-italic:italic 600 14px/24px var(--dsw-font-family);
--dsw-font-markdown-base-strong-italic-font-size:14px;
--dsw-font-markdown-base-strong-italic-line-height:24px;
}`;

    function apply() {
      if (typeof document === "undefined") return;
      if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`)) return;
      const tag = document.createElement("style");
      tag.dataset.pluginCss = TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    module.exports.apply = apply;
    return module.exports;
  },
});
