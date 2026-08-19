window.__ModuleLoader__.load({
  id: "dsh-plugin-ui-tweaks",
  factory: () => {
    const module = { exports: {} };

    // Small UI cleanups.
    // 1. Hide the redundant sidebar footer links for Vault and Cards — both
    //    open a dialog that is also reachable from a tab, so the footer entry
    //    is noise. Classes are the plugins' own public hooks (.dshv-foot /
    //    .dshp-foot), not a hashed module name, so this stays correct across
    //    their rebuilds.
    // 2. Session log becomes an icon-only square button (document glyph).
    // 3. A Settings cog joins it in the header utilities row (the sidebar
    //    entry stays too).
    const LOG_ICON =
      "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#9aa0ae" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/></svg>`,
      );
    const css = `
.dshv-foot,.dshp-foot{display:none !important}
.nL4_yW_sessionLogButton{width:32px !important;min-width:0 !important;max-width:32px !important;height:32px;padding:0 !important;gap:0 !important;font-size:0 !important;border-radius:8px}
.nL4_yW_sessionLogButton svg{display:none}
.nL4_yW_sessionLogButton::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:url("${LOG_ICON}") center/contain no-repeat;mask:url("${LOG_ICON}") center/contain no-repeat}
.dshut-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.dshut-icon-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
`;

    const COG_SVG =
      `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-2 2l-.62.22a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 2-2l.74-.27a2 2 0 0 0 .74-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

    if (typeof document !== "undefined" && !document.querySelector('style[data-plugin-css="dsh-plugin-ui-tweaks"]')) {
      const tag = document.createElement("style");
      tag.dataset.pluginCss = "dsh-plugin-ui-tweaks";
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // The utilities row exists per route and re-mounts on navigation, so watch
    // rather than install once. Clicks proxy to the real Settings trigger.
    function install() {
      const utils = document.querySelector(".wSkVaW_headerUtilities");
      if (!utils) return false;
      if (!utils.querySelector("[data-dshut-settings]")) {
        const cog = document.createElement("button");
        cog.type = "button";
        cog.className = "dshut-icon-btn";
        cog.dataset.dshutSettings = "1";
        cog.title = "Settings";
        cog.setAttribute("aria-label", "Settings");
        cog.innerHTML = COG_SVG;
        cog.addEventListener("click", () => {
          document.querySelector(".VOzbGW_trigger")?.click();
        });
        utils.appendChild(cog);
      }
      return true;
    }

    if (typeof document !== "undefined") {
      let observer = new MutationObserver(() => {
        if (install()) {
          observer.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      install();
    }

    function apply() {}
    module.exports.apply = apply;
    module.exports.inject = [];
    return module.exports;
  },
});
