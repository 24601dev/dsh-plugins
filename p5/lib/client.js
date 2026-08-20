window.__ModuleLoader__.load({
  id: "dsh-plugin-p5",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const STORAGE_KEY = "dsh-plugin-p5:on";
    const ATTR = "data-dsh-p5";
    const MARK = "/dsh-plugin-p5/mark.svg";
    const SEAL = "/dsh-plugin-p5/seal.svg";
    const DOTS = "/dsh-plugin-p5/halftone.svg";

    const UI_TAIL =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', " +
      "'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif";

    const TOKENS = [
      "bg-base",
      "bg-layer-1",
      "bg-layer-2",
      "bg-layer-3",
      "bg-overlay",
      "bg-module-platform",
      "border-l1",
      "border-l2",
      "label-primary",
      "label-secondary",
      "label-tertiary",
      "brand-primary",
      "state-business-primary",
      "interactive-bg-hover",
    ];
    const CHROME = [
      ["sidebar-fill", "bg-base"],
      ["input-major", "bg-layer-1"],
      ["tip", "bg-layer-1"],
      ["sidebar-nav-item-active", "bg-layer-2"],
      ["sidebar-nav-item-hover", "interactive-bg-hover"],
      ["sidebar-nav-item-active-accent", "state-business-primary"],
      ["selector", "bg-module-platform"],
      ["bubble", "bg-layer-2"],
      ["menu", "bg-layer-3"],
    ];
    const EXTRA = [
      ["button-info-fill", "state-business-primary"],
      ["button-info-hover", "state-business-primary"],
      ["button-contrast-fill", "state-business-primary"],
      ["button-elevated-fill", "bg-layer-2"],
      ["button-floating-fill", "bg-layer-1"],
      ["button-floating-hover", "bg-layer-2"],
      ["button-ghost-active-border", "border-l2"],
      ["button-ghost-active-fill", "bg-layer-2"],
      ["button-ghost-active-hover", "bg-layer-3"],
      ["button-primary-dimmed", "bg-layer-2"],
      ["button-primary-fill", "brand-primary"],
      ["button-primary-hover", "state-business-primary"],
      ["button-tool-bar-fill", "bg-layer-2"],
      ["button-tool-bar-hover", "bg-layer-3"],
      ["button-tool-bar-fill-invisible", "bg-overlay"],
      ["interactive-bg-hover-solid", "bg-layer-2"],
    ];

    // Same AA-safe reds as Phantom. Light is calling-card paper; dark is the menu.
    const LIGHT = {
      "bg-base": "rgb(247, 244, 240)",
      "bg-layer-1": "rgb(247, 244, 240)",
      "bg-layer-2": "rgb(236, 232, 226)",
      "bg-layer-3": "rgb(222, 216, 208)",
      "bg-overlay": "rgb(255, 253, 250)",
      "bg-module-platform": "rgb(236, 232, 226)",
      "border-l1": "rgba(12, 12, 12, 0.1)",
      "border-l2": "rgba(186, 12, 28, 0.45)",
      "label-primary": "rgb(12, 12, 12)",
      "label-secondary": "rgb(58, 58, 58)",
      "label-tertiary": "rgb(110, 110, 110)",
      "brand-primary": "rgb(12, 12, 12)",
      "state-business-primary": "rgb(186, 12, 28)",
      "interactive-bg-hover": "rgba(186, 12, 28, 0.08)",
      "sidebar-fill": "rgb(12, 12, 12)",
      "input-major": "rgb(255, 253, 250)",
      "tip": "rgb(255, 253, 250)",
      "button-info-fill": "rgb(186, 12, 28)",
      "button-info-hover": "rgb(210, 24, 40)",
      "button-contrast-fill": "rgb(186, 12, 28)",
      "button-elevated-fill": "rgba(186, 12, 28, 0.1)",
      "button-floating-fill": "rgb(12, 12, 12)",
      "button-floating-hover": "rgb(186, 12, 28)",
      "button-ghost-active-border": "rgb(186, 12, 28)",
      "button-ghost-active-fill": "rgba(186, 12, 28, 0.12)",
      "button-ghost-active-hover": "rgba(186, 12, 28, 0.2)",
      "button-primary-dimmed": "rgba(186, 12, 28, 0.12)",
      "button-primary-fill": "rgb(186, 12, 28)",
      "button-primary-hover": "rgb(210, 24, 40)",
      "button-tool-bar-fill": "rgba(186, 12, 28, 0.12)",
      "button-tool-bar-hover": "rgba(186, 12, 28, 0.22)",
      "button-tool-bar-fill-invisible": "rgba(12, 12, 12, 0.06)",
      "interactive-bg-hover-solid": "rgba(186, 12, 28, 0.1)",
      "selector": "rgba(186, 12, 28, 0.1)",
      "bubble": "rgb(236, 232, 226)",
      "menu": "rgb(247, 244, 240)",
    };
    const DARK = {
      "bg-base": "rgb(0, 0, 0)",
      "bg-layer-1": "rgb(8, 8, 8)",
      "bg-layer-2": "rgb(16, 16, 16)",
      "bg-layer-3": "rgb(28, 28, 28)",
      "bg-overlay": "rgb(0, 0, 0)",
      "bg-module-platform": "rgb(16, 16, 16)",
      "border-l1": "rgba(255, 255, 255, 0.12)",
      "border-l2": "rgba(228, 34, 44, 0.7)",
      "label-primary": "rgb(255, 255, 255)",
      "label-secondary": "rgb(210, 210, 210)",
      "label-tertiary": "rgb(150, 150, 150)",
      "brand-primary": "rgb(255, 255, 255)",
      "state-business-primary": "rgb(228, 34, 44)",
      "interactive-bg-hover": "rgba(228, 34, 44, 0.16)",
      "sidebar-fill": "rgb(0, 0, 0)",
      "input-major": "rgb(10, 10, 10)",
      "tip": "rgb(10, 10, 10)",
      "button-info-fill": "rgb(228, 34, 44)",
      "button-info-hover": "rgb(245, 56, 64)",
      "button-contrast-fill": "rgb(228, 34, 44)",
      "button-elevated-fill": "rgba(228, 34, 44, 0.16)",
      "button-floating-fill": "rgb(0, 0, 0)",
      "button-floating-hover": "rgb(228, 34, 44)",
      "button-ghost-active-border": "rgb(255, 255, 255)",
      "button-ghost-active-fill": "rgb(228, 34, 44)",
      "button-ghost-active-hover": "rgb(245, 56, 64)",
      "button-primary-dimmed": "rgba(228, 34, 44, 0.18)",
      "button-primary-fill": "rgb(228, 34, 44)",
      "button-primary-hover": "rgb(245, 56, 64)",
      "button-tool-bar-fill": "rgb(18, 18, 18)",
      "button-tool-bar-hover": "rgb(228, 34, 44)",
      "button-tool-bar-fill-invisible": "rgba(0, 0, 0, 0.2)",
      "interactive-bg-hover-solid": "rgba(228, 34, 44, 0.2)",
      "selector": "rgba(228, 34, 44, 0.18)",
      "bubble": "rgb(18, 18, 18)",
      "menu": "rgb(10, 10, 10)",
    };

    function block(selector, palette) {
      const alias = TOKENS.map((token) => `--dsw-alias-${token}:${palette[token]};`).join("");
      const extra = EXTRA.map(([key, fallback]) =>
        `--dsw-alias-${key}:${palette[key] || palette[fallback]};`).join("");
      const chrome = CHROME.map(([key, fallback]) =>
        `--dsw-specific-${key}:${palette[key] || palette[fallback]};`).join("");
      const accent = palette["state-business-primary"];
      const brand =
        `--dsw-static-deepseek-200:color-mix(in srgb,${accent} 42%,#fff);` +
        `--dsw-static-deepseek-300:color-mix(in srgb,${accent} 58%,#fff);` +
        `--dsw-static-deepseek-400:${accent};` +
        `--dsw-static-deepseek-450:${accent};` +
        `--dsw-static-deepseek-500:${accent};`;
      return `${selector}{${alias}${extra}${chrome}${brand}}`;
    }

    function atmosphere() {
      const sel = `body[${ATTR}="on"]`;
      const dark = `${sel}[data-ds-dark-theme]`;
      const red = "var(--dsw-alias-state-business-primary)";
      const slab = "polygon(16px 0,100% 0,calc(100% - 16px) 100%,0 100%)";
      const slabSm = "polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)";
      const slash =
        "linear-gradient(108deg,transparent 46.8%,#fff 46.8%,#fff 53.2%,transparent 53.2%)";
      const cutWhite = "drop-shadow(5px 5px 0 #fff)";
      const cutBlack = "drop-shadow(5px 5px 0 #000)";
      const cutRed = `drop-shadow(6px 6px 0 ${red})`;
      return `
${sel}{
--dsw-font-family:Oswald, ${UI_TAIL};
--dsw-font-markdown-base:14px/24px var(--dsw-font-family);
--dsw-font-markdown-base-font-size:14px;
--dsw-font-markdown-base-line-height:24px;
--dsw-shadow-lv2:none;
}
${sel} [class*="sidebarCol"],${sel} [class*="detailsCol"],${sel} [class*="header"],${sel} button{letter-spacing:.04em;font-weight:600}
${sel} [class*="sidebarCol"]{font-size:12px;font-style:italic;color:#fff;box-shadow:inset 10px 0 0 ${red};border-right:2px solid #fff;background:#000!important}
${sel} *,${sel} *::before,${sel} *::after{border-radius:0!important}
${sel} [class*="spinner" i],${sel} [class*="Spinner"]{border-radius:50%!important}
${sel} ::selection{background:${red};color:#fff}
${sel} textarea,${sel} [class$="_input"],${sel} [class$="_mirror"],${sel} [class$="_backdrop"]{letter-spacing:0!important;font-style:normal;font-weight:400}
${sel} [data-ref-chip],${sel} [data-composer-card] [class$="_chip"]{background:${red}!important;color:#fff;box-shadow:none;clip-path:${slabSm}}
${sel} .hHd-Xa_brand{position:relative;min-width:120px;min-height:24px}
${sel} .hHd-Xa_brand>svg{position:absolute;inset:0;width:0!important;height:0!important;opacity:0;overflow:hidden}
${sel} .hHd-Xa_brand::after{content:"";display:block;width:120px;height:24px;pointer-events:none;background:#fff;-webkit-mask:url("${MARK}") center/contain no-repeat;mask:url("${MARK}") center/contain no-repeat}
${sel} .hHd-Xa_railFish{width:24px!important;height:24px!important;background:#fff!important;-webkit-mask:url("${SEAL}") center/contain no-repeat;mask:url("${SEAL}") center/contain no-repeat}
${sel} .hHd-Xa_railFish path{opacity:0}
${sel} .pXSMma_headline{grid-template-columns:auto auto!important}
${sel} .pXSMma_fishHitbox{display:none!important}
${sel} .pXSMma_headlineText{grid-area:1/1!important;font-size:0;line-height:0;width:160px;height:28px;background:#fff;-webkit-mask:url("${MARK}") center/contain no-repeat;mask:url("${MARK}") center/contain no-repeat}
${sel} .pXSMma_previewBadge{grid-area:1/2!important}
${sel} .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_newSession{background:${red}!important;border:2px solid #000!important;color:#fff!important;clip-path:${slab};text-transform:uppercase;letter-spacing:.14em;font-style:italic;filter:${cutWhite}}
${sel} .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_newSession:hover{filter:${cutWhite} brightness(1.08)}
${sel} [data-composer-card]{box-shadow:none!important;border:2px solid #000!important;clip-path:${slab};filter:${cutRed}}
${sel} [data-composer-card] button[aria-label="Send message"],${sel} [data-composer-card] button[aria-label="发送消息"]{clip-path:${slabSm};box-shadow:none;filter:${cutBlack};text-transform:uppercase;letter-spacing:.08em}
${sel} .dshp5-card{clip-path:${slabSm};border:2px solid #000;background:#000;color:#fff;filter:${cutRed}}
${sel} .dshp5-card[aria-pressed="true"]{background:${red};filter:${cutWhite}}
${dark}{background-color:#000!important}
${dark} [class*="centerCol"]{background-color:#000!important;position:relative;isolation:isolate}
${dark} [class*="centerCol"]::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.28;background-image:${slash},url("${DOTS}");background-size:100% 100%,18px 18px;background-repeat:no-repeat,repeat}
${dark} [data-phase],${dark} .hHd-Xa_root{background:transparent!important}
${dark} [class*="detailsCol"]{background:#000!important;border-left:2px solid ${red}}
${dark} .wSkVaW_header{background:#000!important;border-bottom:2px solid ${red}}
${dark} [data-composer-card]{background:#000!important;border:2px solid #fff!important;filter:${cutRed}}
${dark} [data-composer-card] button[aria-label="Send message"],${dark} [data-composer-card] button[aria-label="发送消息"]{filter:${cutWhite}}
${dark} .hHd-Xa_brand::after,${dark} .pXSMma_headlineText{background:#fff}
@media (prefers-reduced-motion:reduce){
${sel} .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_newSession:hover{filter:${cutWhite}}
}
`;
    }

    const uiCss = `
.dshp5-root{display:flex;flex-direction:column;gap:8px;width:100%;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2);box-sizing:border-box}
.dshp5-head{display:flex;flex-direction:column;gap:2px}
.dshp5-title{margin:0;font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dshp5-sub{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshp5-card{display:flex;flex-direction:column;gap:6px;padding:10px;border:2px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;font:inherit;text-align:left;max-width:220px;box-sizing:border-box}
.dshp5-swatch{display:flex;height:32px;overflow:hidden;border:1px solid #000;flex:none}
.dshp5-half{flex:1;position:relative}
.dshp5-dot{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;background:#e4222c}
.dshp5-name{font-family:Oswald,sans-serif;font-size:13px;font-weight:700;font-style:italic;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-primary)}
.dshp5-blurb{font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary)}
.dshp5-state{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-state-business-primary)}
`;

    function stylesheet() {
      const sel = `body[${ATTR}="on"]`;
      return block(sel, LIGHT) +
        block(`${sel}[data-ds-dark-theme]`, DARK) +
        atmosphere();
    }

    function ensureStyle(id, css) {
      if (typeof document === "undefined") return;
      let tag = document.querySelector(`style[data-dsh-style="${id}"]`);
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.dshStyle = id;
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    function ensureFont(id, href) {
      if (typeof document === "undefined") return;
      if (document.querySelector(`link[data-dsh-font="${id}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.dshFont = id;
      document.head.appendChild(link);
    }

    function readOn() {
      try {
        return localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    }

    function applySkin(on) {
      if (typeof document === "undefined") return;
      if (on) document.body.setAttribute(ATTR, "on");
      else document.body.removeAttribute(ATTR);
      try {
        localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
      } catch { /* private mode */ }
    }

    ensureFont(
      "oswald",
      "https://fonts.googleapis.com/css2?family=Oswald:ital,wght@0,400;0,600;0,700;1,700&display=swap",
    );
    ensureStyle("p5-skin", stylesheet());
    ensureStyle("p5-ui", uiCss);
    applySkin(readOn());

    function SkinRow() {
      const [on, setOn] = React.useState(readOn);

      function toggle() {
        const next = !on;
        setOn(next);
        applySkin(next);
      }

      return React.createElement("section", { className: "dshp5-root" },
        React.createElement("div", { className: "dshp5-head" },
          React.createElement("h3", { className: "dshp5-title" }, "Persona 5"),
          React.createElement("p", { className: "dshp5-sub" },
            "A standalone print skin. While it is on, it overrides the Theme picker. " +
            "Appearance still chooses light or dark."),
        ),
        React.createElement("button", {
          type: "button",
          className: "dshp5-card",
          "aria-pressed": on ? "true" : "false",
          onClick: toggle,
        },
          React.createElement("span", { className: "dshp5-swatch" },
            React.createElement("span", { className: "dshp5-half", style: { background: "#f7f4f0" } },
              React.createElement("span", { className: "dshp5-dot" })),
            React.createElement("span", { className: "dshp5-half", style: { background: "#000" } },
              React.createElement("span", { className: "dshp5-dot" })),
          ),
          React.createElement("span", { className: "dshp5-name" }, "Persona 5"),
          React.createElement("span", { className: "dshp5-blurb" },
            "Sheared slabs, one red, original marks. Drop more files in assets/."),
          React.createElement("span", { className: "dshp5-state" }, on ? "On" : "Off"),
        ),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "persona-5-skin",
        order: 16,
      }, SkinRow));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
