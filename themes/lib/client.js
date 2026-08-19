window.__ModuleLoader__.load({
  id: "dsh-plugin-themes",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const STORAGE_KEY = "dsh-plugin-themes:selected";
    const THEME_ATTR = "data-dsh-theme";

    // Every theme must define exactly these, in both palettes. The stylesheet is
    // generated from this list so a token can never be set for light but left
    // unset for dark (which would leak the light value through the cascade).
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

    // Sidebar, composer, and tip panels paint from --dsw-specific-*, not the
    // alias map. Each chrome token falls back to an alias so a theme that only
    // restyles surfaces still recolours those regions. Explicit keys on a
    // palette win (Arasaka uses that to sink the rail and composer below base).
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

    // The send button (and a few other primary actions) use these aliases,
    // which stock maps to --dsw-static-deepseek-* or --dsw-static-neutral-bluish-*.
    // Fall back to a themed surface so grey/blue stock fills cannot leak.
    const EXTRA_ALIASES = [
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

    /*
     * Typography is a single seam: every composite --dsw-font-*-font-family token
     * resolves to var(--dsw-font-family), and code text to --ds-font-family-code.
     * Overriding those two re-fonts the whole UI.
     *
     * A theme supplies only the display face; these tails are always appended.
     * Dropping them would strip the CJK fallbacks ('PingFang SC' and friends) and
     * leave Chinese text to whatever the browser guesses. The code tail
     * deliberately ends without a bare `monospace`, matching the harness's own
     * base.css — on Windows that tail resolves CJK to SimSun.
     */
    const UI_TAIL =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', " +
      "'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    const CODE_TAIL =
      "'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', " +
      "Menlo, Courier, 'PingFang SC', 'Microsoft YaHei'";

    const stack = (face, tail) => (face ? `${face}, ${tail}` : null);

    const THEMES = [
      {
        id: "default",
        label: "DeepSeek",
        blurb: "The harness default.",
        face: null,
        codeFace: null,
        faceLabel: "System default",
        swatch: { light: "#ffffff", dark: "#1b1f27" },
        accent: { light: "#4176e6", dark: "#679efe" },
        // No overrides — removing the attribute restores the built-in palette.
        light: null,
        dark: null,
      },
      {
        id: "ember",
        label: "Ember",
        blurb: "Warm amber over roasted brown.",
        face: "'Iowan Old Style'",
        codeFace: null,
        faceLabel: "Iowan Old Style",
        swatch: { light: "#fffaf3", dark: "#1e1710" },
        accent: { light: "#c2620f", dark: "#f0a24a" },
        light: {
          "bg-base": "rgb(255, 250, 243)",
          "bg-layer-1": "rgb(255, 250, 243)",
          "bg-layer-2": "rgb(253, 243, 230)",
          "bg-layer-3": "rgb(251, 236, 217)",
          "bg-overlay": "rgb(255, 252, 247)",
          "bg-module-platform": "rgb(253, 243, 230)",
          "border-l1": "rgba(120, 72, 20, 0.06)",
          "border-l2": "rgba(120, 72, 20, 0.16)",
          "label-primary": "rgb(43, 28, 12)",
          "label-secondary": "rgb(92, 66, 42)",
          "label-tertiary": "rgb(138, 106, 74)",
          "brand-primary": "rgb(43, 28, 12)",
          "state-business-primary": "rgb(194, 98, 15)",
          "interactive-bg-hover": "rgba(120, 72, 20, 0.08)",
        },
        dark: {
          "bg-base": "rgb(23, 17, 11)",
          "bg-layer-1": "rgb(30, 23, 16)",
          "bg-layer-2": "rgb(37, 29, 20)",
          "bg-layer-3": "rgb(46, 36, 25)",
          "bg-overlay": "rgb(33, 25, 17)",
          "bg-module-platform": "rgb(37, 29, 20)",
          "border-l1": "rgba(255, 200, 140, 0.07)",
          "border-l2": "rgba(255, 200, 140, 0.16)",
          "label-primary": "rgb(246, 234, 217)",
          "label-secondary": "rgb(216, 195, 166)",
          "label-tertiary": "rgb(171, 146, 118)",
          "brand-primary": "rgb(246, 234, 217)",
          "state-business-primary": "rgb(240, 162, 74)",
          "interactive-bg-hover": "rgba(255, 200, 140, 0.1)",
        },
      },
      {
        id: "forest",
        label: "Forest",
        blurb: "Muted greens, low glare.",
        face: "Optima",
        codeFace: null,
        faceLabel: "Optima",
        swatch: { light: "#f6fbf7", dark: "#121b17" },
        accent: { light: "#16794a", dark: "#4ec98a" },
        light: {
          "bg-base": "rgb(246, 251, 247)",
          "bg-layer-1": "rgb(246, 251, 247)",
          "bg-layer-2": "rgb(234, 245, 237)",
          "bg-layer-3": "rgb(221, 238, 226)",
          "bg-overlay": "rgb(250, 253, 251)",
          "bg-module-platform": "rgb(234, 245, 237)",
          "border-l1": "rgba(20, 80, 45, 0.06)",
          "border-l2": "rgba(20, 80, 45, 0.16)",
          "label-primary": "rgb(16, 38, 27)",
          "label-secondary": "rgb(48, 82, 63)",
          "label-tertiary": "rgb(90, 124, 104)",
          "brand-primary": "rgb(16, 38, 27)",
          "state-business-primary": "rgb(22, 121, 74)",
          "interactive-bg-hover": "rgba(20, 80, 45, 0.08)",
        },
        dark: {
          "bg-base": "rgb(13, 21, 18)",
          "bg-layer-1": "rgb(18, 27, 23)",
          "bg-layer-2": "rgb(23, 35, 29)",
          "bg-layer-3": "rgb(29, 44, 36)",
          "bg-overlay": "rgb(16, 25, 21)",
          "bg-module-platform": "rgb(23, 35, 29)",
          "border-l1": "rgba(150, 255, 200, 0.07)",
          "border-l2": "rgba(150, 255, 200, 0.15)",
          "label-primary": "rgb(226, 241, 232)",
          "label-secondary": "rgb(184, 210, 195)",
          "label-tertiary": "rgb(136, 165, 149)",
          "brand-primary": "rgb(226, 241, 232)",
          "state-business-primary": "rgb(78, 201, 138)",
          "interactive-bg-hover": "rgba(150, 255, 200, 0.1)",
        },
      },
      {
        id: "nord",
        label: "Nord",
        blurb: "Cool slate and arctic blue.",
        face: "'Helvetica Neue'",
        codeFace: null,
        faceLabel: "Helvetica Neue",
        swatch: { light: "#f7f9fc", dark: "#2e3440" },
        accent: { light: "#5e81ac", dark: "#88c0d0" },
        light: {
          "bg-base": "rgb(247, 249, 252)",
          "bg-layer-1": "rgb(247, 249, 252)",
          "bg-layer-2": "rgb(238, 242, 248)",
          "bg-layer-3": "rgb(227, 234, 243)",
          "bg-overlay": "rgb(251, 252, 254)",
          "bg-module-platform": "rgb(238, 242, 248)",
          "border-l1": "rgba(46, 52, 64, 0.06)",
          "border-l2": "rgba(46, 52, 64, 0.15)",
          "label-primary": "rgb(46, 52, 64)",
          "label-secondary": "rgb(76, 86, 106)",
          "label-tertiary": "rgb(110, 122, 145)",
          "brand-primary": "rgb(46, 52, 64)",
          "state-business-primary": "rgb(94, 129, 172)",
          "interactive-bg-hover": "rgba(46, 52, 64, 0.07)",
        },
        dark: {
          "bg-base": "rgb(33, 37, 46)",
          "bg-layer-1": "rgb(38, 43, 54)",
          "bg-layer-2": "rgb(46, 52, 64)",
          "bg-layer-3": "rgb(59, 66, 82)",
          "bg-overlay": "rgb(36, 41, 51)",
          "bg-module-platform": "rgb(46, 52, 64)",
          "border-l1": "rgba(216, 222, 233, 0.07)",
          "border-l2": "rgba(216, 222, 233, 0.16)",
          "label-primary": "rgb(236, 239, 244)",
          "label-secondary": "rgb(216, 222, 233)",
          "label-tertiary": "rgb(169, 177, 192)",
          "brand-primary": "rgb(236, 239, 244)",
          "state-business-primary": "rgb(136, 192, 208)",
          "interactive-bg-hover": "rgba(216, 222, 233, 0.09)",
        },
      },
      {
        id: "rose",
        label: "Rose",
        blurb: "Soft magenta on deep plum.",
        face: "Baskerville",
        codeFace: null,
        faceLabel: "Baskerville",
        swatch: { light: "#fff8fb", dark: "#1d1319" },
        accent: { light: "#c2185b", dark: "#f472a6" },
        light: {
          "bg-base": "rgb(255, 248, 251)",
          "bg-layer-1": "rgb(255, 248, 251)",
          "bg-layer-2": "rgb(253, 238, 245)",
          "bg-layer-3": "rgb(251, 226, 238)",
          "bg-overlay": "rgb(255, 251, 253)",
          "bg-module-platform": "rgb(253, 238, 245)",
          "border-l1": "rgba(120, 20, 62, 0.06)",
          "border-l2": "rgba(120, 20, 62, 0.15)",
          "label-primary": "rgb(58, 19, 39)",
          "label-secondary": "rgb(100, 48, 74)",
          "label-tertiary": "rgb(145, 94, 119)",
          "brand-primary": "rgb(58, 19, 39)",
          "state-business-primary": "rgb(194, 24, 91)",
          "interactive-bg-hover": "rgba(120, 20, 62, 0.07)",
        },
        dark: {
          "bg-base": "rgb(22, 14, 19)",
          "bg-layer-1": "rgb(29, 19, 25)",
          "bg-layer-2": "rgb(37, 25, 32)",
          "bg-layer-3": "rgb(47, 32, 41)",
          "bg-overlay": "rgb(25, 16, 22)",
          "bg-module-platform": "rgb(37, 25, 32)",
          "border-l1": "rgba(255, 180, 215, 0.07)",
          "border-l2": "rgba(255, 180, 215, 0.16)",
          "label-primary": "rgb(248, 230, 239)",
          "label-secondary": "rgb(226, 194, 211)",
          "label-tertiary": "rgb(176, 140, 158)",
          "brand-primary": "rgb(248, 230, 239)",
          "state-business-primary": "rgb(244, 114, 166)",
          "interactive-bg-hover": "rgba(255, 180, 215, 0.1)",
        },
      },
      {
        id: "arasaka",
        label: "Arasaka",
        blurb: "Night City megacorp. Blood-black gradient, neon crimson.",
        face: "'Chakra Petch'",
        codeFace: "Menlo",
        faceLabel: "Chakra Petch / Menlo",
        swatch: { light: "#e8eaee", dark: "#140308" },
        accent: { light: "#c41028", dark: "#ff2e46" },
        // Light: fluorescent lobby. Dark is not flat black — a red-black
        // gradient, same as Arasaka interiors. Solids keep a red cast so
        // plugins that only read tokens still match.
        light: {
          "bg-base": "rgb(232, 234, 238)",
          "bg-layer-1": "rgb(226, 228, 234)",
          "bg-layer-2": "rgb(214, 216, 224)",
          "bg-layer-3": "rgb(200, 202, 212)",
          "bg-overlay": "rgb(240, 242, 246)",
          "bg-module-platform": "rgb(214, 216, 224)",
          "border-l1": "rgba(180, 12, 36, 0.12)",
          "border-l2": "rgba(180, 12, 36, 0.32)",
          "label-primary": "rgb(12, 14, 20)",
          "label-secondary": "rgb(58, 62, 74)",
          "label-tertiary": "rgb(102, 108, 122)",
          "brand-primary": "rgb(12, 14, 20)",
          "state-business-primary": "rgb(196, 16, 40)",
          "interactive-bg-hover": "rgba(196, 16, 40, 0.1)",
          "sidebar-fill": "rgb(214, 216, 224)",
          "input-major": "rgb(220, 222, 230)",
          "tip": "rgb(220, 222, 230)",
          "button-info-fill": "rgb(196, 16, 40)",
          "button-info-hover": "rgb(224, 36, 58)",
          "button-contrast-fill": "rgb(196, 16, 40)",
          "button-elevated-fill": "rgba(196, 16, 40, 0.1)",
          "button-floating-fill": "rgba(196, 16, 40, 0.08)",
          "button-floating-hover": "rgba(196, 16, 40, 0.16)",
          "button-ghost-active-border": "rgba(180, 12, 36, 0.32)",
          "button-ghost-active-fill": "rgba(196, 16, 40, 0.12)",
          "button-ghost-active-hover": "rgba(196, 16, 40, 0.2)",
          "button-primary-dimmed": "rgba(196, 16, 40, 0.1)",
          "button-primary-fill": "rgb(196, 16, 40)",
          "button-primary-hover": "rgb(224, 36, 58)",
          "button-tool-bar-fill": "rgba(196, 16, 40, 0.12)",
          "button-tool-bar-hover": "rgba(196, 16, 40, 0.22)",
          "button-tool-bar-fill-invisible": "rgba(12, 14, 20, 0.08)",
          "interactive-bg-hover-solid": "rgba(196, 16, 40, 0.1)",
          "selector": "rgba(196, 16, 40, 0.1)",
          "bubble": "rgba(196, 16, 40, 0.1)",
          "menu": "rgb(226, 228, 234)",
        },
        dark: {
          "bg-base": "rgb(10, 2, 4)",
          "bg-layer-1": "rgb(16, 4, 7)",
          "bg-layer-2": "rgb(24, 6, 10)",
          "bg-layer-3": "rgb(34, 8, 12)",
          "bg-overlay": "rgb(12, 3, 5)",
          "bg-module-platform": "rgb(20, 5, 8)",
          "border-l1": "rgba(255, 46, 70, 0.18)",
          "border-l2": "rgba(255, 46, 70, 0.46)",
          "label-primary": "rgb(228, 238, 244)",
          "label-secondary": "rgb(156, 176, 188)",
          "label-tertiary": "rgb(104, 120, 132)",
          "brand-primary": "rgb(228, 238, 244)",
          "state-business-primary": "rgb(255, 46, 70)",
          "interactive-bg-hover": "rgba(255, 46, 70, 0.16)",
          "sidebar-fill": "rgb(8, 1, 2)",
          "input-major": "rgb(14, 3, 6)",
          "tip": "rgb(14, 3, 6)",
          "button-info-fill": "rgb(255, 46, 70)",
          "button-info-hover": "rgb(255, 92, 108)",
          "button-contrast-fill": "rgb(255, 46, 70)",
          "button-elevated-fill": "rgba(255, 46, 70, 0.14)",
          "button-floating-fill": "rgba(8, 1, 2, 0.55)",
          "button-floating-hover": "rgba(255, 46, 70, 0.2)",
          "button-ghost-active-border": "rgba(255, 46, 70, 0.46)",
          "button-ghost-active-fill": "rgba(255, 46, 70, 0.16)",
          "button-ghost-active-hover": "rgba(255, 46, 70, 0.26)",
          "button-primary-dimmed": "rgba(255, 46, 70, 0.14)",
          "button-primary-fill": "rgb(255, 46, 70)",
          "button-primary-hover": "rgb(255, 92, 108)",
          "button-tool-bar-fill": "rgba(255, 46, 70, 0.16)",
          "button-tool-bar-hover": "rgba(255, 46, 70, 0.28)",
          "button-tool-bar-fill-invisible": "rgba(4, 0, 2, 0.2)",
          "interactive-bg-hover-solid": "rgba(255, 46, 70, 0.16)",
          "selector": "rgba(255, 46, 70, 0.12)",
          "bubble": "rgba(255, 46, 70, 0.16)",
          "menu": "rgb(24, 6, 10)",
        },
      },
      {
        id: "militech",
        label: "Militech",
        blurb: "Military-industrial steel. Gunmetal navy, stencil blue.",
        face: "'Avenir Next Condensed'",
        codeFace: "Menlo",
        faceLabel: "Avenir Next Condensed / Menlo",
        swatch: { light: "#eef1f5", dark: "#0a0f16" },
        accent: { light: "#2f5d8a", dark: "#6ea8dc" },
        light: {
          "bg-base": "rgb(238, 241, 245)",
          "bg-layer-1": "rgb(232, 236, 241)",
          "bg-layer-2": "rgb(220, 226, 233)",
          "bg-layer-3": "rgb(206, 214, 224)",
          "bg-overlay": "rgb(244, 247, 250)",
          "bg-module-platform": "rgb(220, 226, 233)",
          "border-l1": "rgba(31, 58, 92, 0.08)",
          "border-l2": "rgba(31, 58, 92, 0.22)",
          "label-primary": "rgb(18, 30, 46)",
          "label-secondary": "rgb(52, 68, 88)",
          "label-tertiary": "rgb(96, 110, 128)",
          "brand-primary": "rgb(18, 30, 46)",
          "state-business-primary": "rgb(47, 93, 138)",
          "interactive-bg-hover": "rgba(31, 58, 92, 0.08)",
          "sidebar-fill": "rgb(220, 226, 233)",
          "input-major": "rgb(226, 231, 237)",
          "tip": "rgb(226, 231, 237)",
        },
        dark: {
          "bg-base": "rgb(7, 11, 17)",
          "bg-layer-1": "rgb(12, 17, 25)",
          "bg-layer-2": "rgb(18, 25, 36)",
          "bg-layer-3": "rgb(26, 35, 49)",
          "bg-overlay": "rgb(10, 14, 21)",
          "bg-module-platform": "rgb(16, 22, 32)",
          "border-l1": "rgba(110, 168, 220, 0.1)",
          "border-l2": "rgba(110, 168, 220, 0.3)",
          "label-primary": "rgb(222, 231, 240)",
          "label-secondary": "rgb(168, 182, 198)",
          "label-tertiary": "rgb(116, 130, 146)",
          "brand-primary": "rgb(222, 231, 240)",
          "state-business-primary": "rgb(110, 168, 220)",
          "interactive-bg-hover": "rgba(110, 168, 220, 0.12)",
          "sidebar-fill": "rgb(5, 8, 13)",
          "input-major": "rgb(10, 14, 21)",
          "tip": "rgb(10, 14, 21)",
        },
      },
    ];

    function block(selector, palette) {
      if (!palette) return "";
      const alias = TOKENS.map((token) => {
        const value = palette[token];
        return value ? `--dsw-alias-${token}:${value};` : "";
      }).join("");
      const extra = EXTRA_ALIASES.map(([key, fallback]) => {
        const value = palette[key] || palette[fallback];
        return value ? `--dsw-alias-${key}:${value};` : "";
      }).join("");
      const chrome = CHROME.map(([key, fallback]) => {
        const value = palette[key] || palette[fallback];
        return value ? `--dsw-specific-${key}:${value};` : "";
      }).join("");
      // A few surfaces skip the alias map and paint from the DeepSeek brand
      // primitives: the "Deep diving..." shimmer (--dsw-static-deepseek-500/200)
      // and the running-session status matrix (--dsh-state-ongoing ← 450).
      const accent = palette["state-business-primary"];
      const brand = accent
        ? `--dsw-static-deepseek-200:color-mix(in srgb,${accent} 42%,#fff);` +
          `--dsw-static-deepseek-300:color-mix(in srgb,${accent} 58%,#fff);` +
          `--dsw-static-deepseek-400:${accent};` +
          `--dsw-static-deepseek-450:${accent};` +
          `--dsw-static-deepseek-500:${accent};`
        : "";
      return `${selector}{${alias}${extra}${chrome}${brand}}`;
    }

    /*
     * The harness defines aliases on `body` (light) and `body[data-ds-dark-theme]`
     * (dark). Adding our own attribute raises specificity without taking over the
     * light/dark switch — Appearance still owns that, and each theme simply
     * supplies both palettes.
     */
    // Typography does not change between light and dark, so it is emitted once on
    // the base selector rather than duplicated into both palettes.
    function fontBlock(theme) {
      const ui = stack(theme.face, UI_TAIL);
      const code = stack(theme.codeFace, CODE_TAIL);
      if (!ui && !code) return "";
      return `body[${THEME_ATTR}="${theme.id}"]{` +
        (ui ? `--dsw-font-family:${ui};` : "") +
        (code ? `--ds-font-family-code:${code};` : "") +
        `}`;
    }

    function stylesheet() {
      return THEMES.filter((theme) => theme.light && theme.dark)
        .map((theme) =>
          block(`body[${THEME_ATTR}="${theme.id}"]`, theme.light) +
          block(`body[${THEME_ATTR}="${theme.id}"][data-ds-dark-theme]`, theme.dark) +
          fontBlock(theme))
        .join("\n") +
        arasakaAtmosphere() +
        militechAtmosphere();
    }

    // Chamfers and corner ticks are Arasaka-only atmosphere.
    // Colour tokens come from TOKENS / CHROME / EXTRA_ALIASES in block().
    // Radii are hardcoded on harness components, so they have to be forced off.
    //
    // The construction language is Cyberpunk 2077 neomilitarism (red as the
    // default, clipped opposite corners, incomplete frames). The sidebar
    // wordmark is a fan-traced Arasaka logotype used only for this local theme.
    // White silhouette of the Arasaka wordmark. CSS masks tint it with the
    // theme accent so light/dark both pick up crimson. Source: lib/arasaka-mark.svg
    const ARASAKA_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 463"><g fill="#fff"><path d="M338.08 135.85c14.97-.88 29.99-.6 44.98-.4 3.67-.18 6.98 1.66 9.93 3.63 22.8 15.17 45.48 30.53 68.26 45.73 3.33 2.15 7.61 4.59 7.68 9.11.19 16.34-.01 32.69.09 49.03-.09 2.03.14 4.3-.98 6.11-1.07 1.63-3.23 1.59-4.87 2.24-3.4-.1-6.81-.04-10.2.27-.34.58-1.03 1.74-1.37 2.31 3.29 6.59 11.57 8.01 15.88 13.66 1.57 2.14 1.52 4.91 1.54 7.45-.08 22.01.04 44.03-.05 66.04.09 2.41-1.15 5.78-4.07 5.55-16.78.14-33.58.19-50.37-.05-3.36-2.46-2.83-6.89-3.02-10.56-.02-25.99-.01-51.99-.01-77.98-.05-11.37.28-22.77-.85-34.09-.49-3.92-3.33-7.01-6.59-8.99-12.29-8.44-24.78-16.58-37.23-24.77-1.78-1.13-3.78-1.77-5.75-2.44-6.07-.34-12.15-.47-18.21.05-5.81 1.1-11.56 2.61-17 4.97-13.01 5.9-24.15 16.36-29.55 29.72-6.26 14.75-4.42 32.43 4.47 45.72 5.76 9.21 14.74 15.85 24.33 20.68 1.64.7 3.31 1.37 4.97 2.08 1.23.47 2.46.91 3.7 1.38 2.7.59 5.38 1.31 8.07 1.97 9.74.87 19.72.73 29.1-2.37 1-.3 2-.61 3-.92.98-.44 1.96-.89 2.93-1.36 2.89-.32 6.64-1.06 8.32 2.02 7.36 11.07 14.52 22.28 21.84 33.39 1.34 2.11 3.01 4.44 2.35 7.11-1.69 2.6-4.86 3.45-7.5 4.73-1.68.64-3.37 1.27-5.03 1.96-.98.37-1.96.73-2.95 1.08-3.28 1.16-6.63 2.1-9.97 3.04-5.33 1.24-10.7 2.41-16.16 2.88-6.85 1.21-13.86.75-20.78.8-5.7.08-11.35-.79-16.95-1.74-4.19-.55-8.24-1.71-12.34-2.65-4.01-1.22-7.99-2.51-11.91-3.99-1.6-.64-3.2-1.3-4.78-1.98-24.09-10.39-44.77-29.11-56.36-52.77-9.07-18.31-12.06-39.55-8.34-59.65 4.29-23.86 17.81-45.7 36.6-60.9 9.05-7.45 19.22-13.49 29.98-18.13 1.39-.52 2.77-1.05 4.16-1.59 7.65-3.05 15.71-4.85 23.76-6.44 2.43-.14 4.86-.41 7.25-.94ZM488.2 135.51c25.57-.52 51.16-.08 76.74-.23h98.09c6.06.05 12.14-.2 18.19.35 2.19 1.12 4.46 2.19 6.27 3.91 14.44 13.56 26.03 30.82 30.32 50.37 3.07 12.84 2.35 26.12 2.1 39.18-.06 1.59-1 2.94-1.67 4.32-1.74.4-3.47.9-5.26.88-16.04.02-32.08-.08-48.12.04-2.74-.88-4.74-3.21-4.22-6.24.89-12.56-3.5-25.39-12-34.69-2.21-2.5-5.27-4.37-8.71-4.15-29.32.06-58.66.03-87.98.02-2.09 0-4.17.12-6.24.28-1.93 2.76-2.11 6.19-1.93 9.44.49 9.35.12 18.7-.02 28.05-.09 5.33 3.85 9.5 8.06 12.2 51.16 33.4 101.98 67.34 153 100.95 1.88 1.11 3.16 2.86 4.19 4.75l-2.98 1.55c-23.67.41-47.35.06-71.02.18-6.73 0-13.46.07-20.18-.3-3.88-1.69-7.49-3.89-11-6.24-18.61-11.74-36.96-23.88-55.62-35.55-.97-.06-1.93-.12-2.89-.17-2.43 4.23-.25 9.77-3.39 13.64-2.24.7-4.64.46-6.95.53-15.03-.12-30.07.14-45.09-.12-2.78.01-4.19-3.06-4.09-5.48-.14-12.33.02-24.66-.07-36.98-.22-3.31.22-7.2 3.83-8.43 4.87-.11 10.32 1.11 14.36-2.38-2.44-5.83-8.86-7.89-13.63-11.32-3.04-1.81-4.65-5.4-4.54-8.86-.01-34.34 0-68.67 0-103-.22-2.47.7-4.77 2.45-6.5ZM1081.54 135.51c23.83-.52 47.68-.12 71.52-.08 4.84-.21 9.17 2.56 12.41 5.93 12.61 11.33 21.6 26.4 26.37 42.61.72 1.74.2 3.56-.25 5.29-.63.28-1.87.85-2.5 1.14-30.04.05-60.08.01-90.12.02-6.18-.31-12.51.77-18.56-.8-.62-1.8-1.25-3.63-1.17-5.56.03-14.37-.04-28.73.03-43.09-.16-2.12 1.06-3.86 2.27-5.46ZM1491.7 135.54c17.86-.44 35.75-.38 53.61-.04 1.13 1.49 2.31 3.07 2.34 5.05.44 12.46-.34 24.98.37 37.42-.01 3.21 3.41 3.57 5.59 2.1 22.11-14.1 44.02-28.52 66.31-42.32 2.94-1.07 5.91-2.35 9.12-2.3 26.19-.23 52.37-.2 78.56-.13-.86 6.05-3.5 11.97-8.24 15.96-4.69 3.79-9.96 6.77-14.92 10.17-34.96 23.11-69.92 46.22-104.87 69.34-4.54 3.34-10 5.61-13.47 10.22 1.88 2.46 4.34 4.35 7 5.93 35.3 23.34 70.61 46.67 105.92 69.99 6.93 4.75 14.29 8.93 20.85 14.18 3.84 4.06 8.1 9.5 6.7 15.44-25.86.23-51.72.14-77.58.04-2.02.06-3.99-.22-5.96-.44-24.25-14.71-47.65-30.8-71.86-45.58-.39-.01-1.16-.04-1.55-.05-3.48 5.05-.61 11.48-3.06 16.9-1.46.55-2.91 1.26-4.49 1.14-15.39.01-30.78-.02-46.16.01-1.53-.14-3.33.23-4.49-.99-1.89-1.57-1.84-4.31-1.93-6.54.01-12.02.01-24.04 0-36.05-.07-2.17.6-4.24 1.21-6.28 5.51-2.74 12.56 1.13 17.25-3.59-3.3-7.03-12.26-8.26-16.88-14.09-1.45-2.03-1.58-4.63-1.59-7.03.05-33.98-.01-67.97.03-101.95-.17-2.42.69-4.65 2.19-6.51ZM89.03 138.09c5.57-1.32 11.21-2.39 16.93-2.75 5.29-.5 10.67-1.25 15.96-.23 6.47.19 12.83 1.36 19.15 2.71 2.65.73 5.25 1.6 7.9 2.31 2.4.87 4.79 1.79 7.19 2.68 24.15 10.07 44.35 29.29 55.29 53.09 9.86 21.14 12.34 45.59 7.11 68.31-7.1 32.09-30.35 59.93-60.42 73.04-1.65.69-3.31 1.35-4.95 2.04-7.48 2.76-15.22 4.72-23.1 5.95-3.34.3-6.71.3-10.01.92-3.05.17-6.11.18-9.16 0-5.62-.75-11.32-.85-16.87-2.19-2.4-.54-4.78-1.16-7.17-1.7-5.03-1.52-9.98-3.32-14.81-5.39a50.52 50.52 0 0 0-4.05-1.98c-23.06-11.55-41.61-31.86-50.95-55.92-8.89-22.73-9.53-48.55-1.92-71.73 9.26-28.5 31.34-52.36 58.9-64.06 1.68-.69 3.4-1.3 5.09-1.95 1.26-.47 2.53-.9 3.78-1.37 2.05-.57 4.08-1.17 6.11-1.78m11.04 12.04c-1.38.25-2.76.47-4.14.69-1.32.37-2.64.73-3.96 1.06-3.07.89-6.12 1.84-9.14 2.88-2.33 1.04-4.66 2.07-7.02 3.04-22.87 11.04-40.83 31.84-48 56.24-6.42 21.12-4.8 44.56 4.54 64.56 9 19.53 25.12 35.54 44.55 44.69 2.09.8 4.13 1.71 6.2 2.57 2 .7 4.02 1.36 6.03 2.02 5.13 1.63 10.45 2.45 15.75 3.36 11.06.94 22.26.43 33.06-2.26 2.32-.7 4.63-1.41 6.93-2.14 3.39-1.18 6.71-2.55 9.97-4.06 25.01-11.86 43.88-35.63 49.8-62.66 4.96-22.1 1.38-46.04-10.11-65.58-10.92-18.88-28.78-33.55-49.37-40.73-1.01-.32-2.01-.65-3-.99-2.09-.53-4.17-1.1-6.25-1.64-9.41-1.86-19.19-3.47-28.75-1.91-2.38.14-4.75.41-7.09.86ZM840.87 135.78c15.7-.68 31.46-.79 47.17-.08.99.39 2 .76 3.02 1.13 24.71 15.91 48.87 32.67 73.37 48.93 2.47 1.66 5.31 3.48 6.05 6.59.61 2.83.22 5.75.28 8.62-.02 14.36-.01 28.73.01 43.09-.08 1.63-.01 3.39-.86 4.85-.89 1.83-3.21 1.69-4.85 2.36-3.7.13-7.57-.5-11.11.76-.8 1.41.16 2.96.8 4.23 3.84 3.98 9.13 6.13 13.28 9.73 3.69 3.67 2.85 9.3 2.74 14.02-.04 20.01-.02 40.02-.01 60.03-.03 2.24-.15 5.15-2.45 6.31-2.42.46-4.91.3-7.34.34-14.85-.1-29.71.12-44.55-.13-1.52-1.5-3.12-3.25-2.88-5.57-.1-18.32 0-36.65-.04-54.97-.05-2.7-.78-5.34-.77-8.05.04-17.68.01-35.36.02-53.05.21-3.59-1.93-6.87-4.88-8.76-12.57-8.45-25.27-16.7-37.87-25.11-7.24-5.34-16.78-3.4-25.14-3.3-5.11.98-10.18 2.18-15.04 4.04-15.03 6.09-27.83 18.39-32.95 33.96-4.3 12.46-2.95 26.57 3.18 38.19 6.13 11.84 17.05 20.5 29.04 25.91 2.93 1.19 5.9 2.28 8.96 3.13 8.43 2.22 17.33 2.13 25.93 1.02 1.63-.4 3.3-.73 4.97-1 4.74-.99 9.09-3.82 14.02-3.68 2.59 0 4.14 2.38 5.43 4.29 5.99 9.33 12.1 18.59 18.14 27.88 1.71 2.77 3.84 5.37 4.8 8.53.55 4.21-4.55 5.27-7.45 6.76-9.24 3.91-18.92 6.62-28.77 8.44-2.36.17-4.7.5-7 .96-9.39.7-18.85.7-28.23-.01-12.27-1.52-24.36-4.56-35.78-9.32-31.98-13.26-58.29-41.66-65.42-75.97-4.64-21.4-1.57-44.33 8.4-63.81 10.63-21.28 29.06-37.98 50.03-48.82 2.96-1.42 5.95-2.79 9.01-4.01 4.16-1.75 8.48-3.08 12.8-4.37 7.2-1.95 14.55-3.16 21.94-4.09ZM1341.13 136.14c9.55-1.32 19.27-.67 28.9-.86 6 0 12-.04 18.01.23 4.31.18 7.78 3.11 11.29 5.31 23.35 15.58 46.68 31.21 69.93 46.96 4.96 3.42 3.56 10.03 3.74 15.18-.33 13.37.11 26.74-.02 40.12-.22 2.37.03 5.27-2 6.96-4.83 2.26-10.51.17-15.25 2.85 2.13 9.58 17.15 9.35 17.22 20.04.07 21.71-.08 43.4.05 65.11-.07 3.03-.02 8.33-4.14 8.52-16.8.2-33.62.17-50.42 0-2.39-1.77-3.28-4.61-3.17-7.49-.05-16.69-.03-33.38 0-50.07-1.08-21.61-.22-43.27-.57-64.89-.1-3.05-1.81-5.85-4.32-7.52-13.2-8.84-26.45-17.6-39.7-26.36-4.89-3.38-11.07-2.72-16.68-2.83-4.7-.12-9.33.71-13.89 1.74-2.78.79-5.53 1.64-8.24 2.61-16.07 6.51-29.68 20.13-33.96 37.19-4.52 16.81 1.19 35.54 13.51 47.65 5.17 5.46 11.58 9.63 18.43 12.69 1.69.67 3.38 1.31 5.09 2.01l2.09.6c12.21 3.94 25.72 3.84 37.94-.03.52-.15 1.55-.44 2.07-.59 3.08-1.66 6.54-2.32 10.02-1.77 5.34 6.33 9.22 13.71 13.91 20.51 3.79 6.05 7.98 11.87 11.53 18.07 1.39 2.05.77 4.92-1.43 6.11-4.14 2.43-8.74 3.94-13.21 5.62-1.32.44-2.59.88-3.87 1.35-5.54 1.68-11.2 2.93-16.88 4.06-2.36.16-4.7.5-6.99.96-9.39.7-18.85.7-28.23-.01-9.15-1.14-18.17-3.14-26.95-5.93-2.97-1.07-5.88-2.27-8.82-3.38-30.43-12.63-55.67-38.8-64.31-70.93-6.31-23.06-3.39-48.36 7.63-69.53 12.21-23.9 34.02-42.05 58.66-52.14 1.25-.49 2.48-1 3.75-1.51 3.01-1.01 6.04-1.96 9.08-2.93 4.61-1.14 9.27-2.07 13.93-3.05 2.08-.18 4.17-.37 6.27-.63Z"/><path d="M1778.13 136.14c11.2-1.41 22.57-.63 33.85-.86 6.03.26 12.3-.63 18.12 1.44 25.25 16.4 50.03 33.52 75.12 50.17 2.8 1.65 4.83 4.68 4.76 8.01.07 16.05-.03 32.11.04 48.16-.05 2.4.09 5.35-2.02 6.99-1.31.53-2.65.82-3.96 1.21-3.72.44-8.43-1.23-11.32 1.74-.6 3.42 3.34 5.07 5.57 6.86 4.38 3.31 11.19 5.68 11.64 12.04.17 22.7.01 45.42.07 68.13.19 2.28-.78 4.35-1.83 6.3-10.68.74-21.41.15-32.1.34-6.38-.1-12.76.19-19.12-.13-3.38.02-4.48-3.9-4.43-6.65-.06-13.97 0-27.93-.02-41.9-.08-6.33.36-12.7-.69-18.98-.12-18.37-.1-36.75.03-55.11-.1-3.55-2.64-6.37-5.51-8.14-13.74-9-27.25-18.36-41.17-27.06-1.08-.33-2.15-.63-3.2-.91-8-.64-16.11-.73-23.96 1.07-3.09.85-6.12 1.87-9.12 2.95-15.62 6.3-28.83 19.38-33.49 35.78-4.78 15.74-.35 33.41 10.18 45.84 5.53 6.64 12.68 11.82 20.5 15.46 11.75 5.4 25.06 7.17 37.8 4.98 2.74-.4 5.44-1.16 8.1-2 .52-.14 1.57-.44 2.09-.59 3.1-1.64 6.57-2.26 10.07-1.84 4.98 5.7 8.41 12.52 12.73 18.71 3.93 6.08 7.92 12.12 11.82 18.23 1.05 1.9 2.61 4.4 1.01 6.46-1.37 1.74-3.64 2.43-5.52 3.45-3.41 1.32-6.8 2.69-10.2 4.01-.51.11-1.53.35-2.04.46-5.77 2.11-11.83 3.19-17.81 4.46-1.8.19-3.57.39-5.32.6-12.25 1.49-24.76 1.15-36.96-.63-3.6-.71-7.16-1.5-10.72-2.27-6.12-1.69-12.17-3.61-18-6.07-17.45-7.5-33.38-18.94-45.17-33.91-10.87-13.49-18.44-29.75-21.11-46.9-3.33-20.92.49-42.88 10.69-61.45 12.07-22.64 32.89-39.81 56.32-49.77 5.89-2.36 11.92-4.43 18.1-5.95 5.33-1.21 10.69-2.36 16.18-2.73ZM109.01 172.74c6.03-.71 12.32-1.04 18.16.94 10.08 3.87 17.7 13.43 18.78 24.23 1.83 13.18-6.81 26.81-19.44 30.9-1.29 3.63-.56 7.49-.52 11.24.07 7.64-.08 15.29.09 22.93 5.16-5.48 10.79-10.52 15.83-16.11-.91-5.16-2.43-10.38-1.27-15.66 1.56-10.54 9.39-19.53 19.37-23.08 4.29-1.19 8.71-1.87 13.17-1.45 1.9.57 3.84.99 5.77 1.47 6.83 2.44 12.83 7.23 16.38 13.59 5.49 9.75 4.65 22.63-2.03 31.61-4.73 6.57-12.26 10.62-20.16 11.93-2.4.12-4.81.12-7.21-.02-4.6-.94-9.09-2.45-13.05-5.01-7.1 7.09-14.15 14.24-21.38 21.22-1.77 1.87-3.88 3.49-5.27 5.69-1.04 3.53-.15 7.26-.24 10.87-.01 7.81.11 15.62-.09 23.43-5.71-.07-11.42-.03-17.14-.04-.04-10.49.03-20.97-.02-31.45.19-2.09-.95-3.91-2.41-5.28-8.17-8.18-16.41-16.29-24.5-24.56-.94.34-1.86.69-2.79 1.06-2.05.93-4.09 1.91-6.17 2.76-1.92.42-3.83.82-5.73 1.32-3.77.41-7.53-.12-11.19-1.03-1.27-.47-2.56-.92-3.84-1.36-7.72-3.57-14.07-10.42-16.34-18.69-2.42-8.49-.95-18.08 4.29-25.24 3.11-4.62 7.83-7.78 12.73-10.25 2.66-.66 5.31-1.38 7.98-2.03 2.4-.03 4.8-.02 7.21.04 2.4.67 4.81 1.33 7.21 1.98 7.71 3.56 14.22 10.02 16.76 18.25 2.18 6.1 1.27 12.63.16 18.84 5.01 6.2 11.36 11.26 16.56 17.35.19-11.13.02-22.27.09-33.41-6.58-2.59-13.02-6.42-16.71-12.67-6.01-9.24-6.15-21.93-.27-31.26 3.14-5.07 7.87-9.05 13.28-11.5 1.32-.51 2.64-1.01 3.95-1.55ZM991.76 190.36c20.75-.06 41.52-.11 62.28-.08 8.71.25 17.48-.5 26.16.39 15.22 9.38 30 19.54 45.03 29.25 30.95 20.22 61.56 40.98 92.21 61.66 3.07 2.1 4.76 5.74 4.76 9.43-.42 16.7-.08 33.41-.22 50.11.09 1.93-1 3.59-1.83 5.24-10.72.66-21.47.15-32.2.31-52.64-.01-105.28.01-157.92-.01-5.46.3-10.03-3.39-13.53-7.16-11.35-10.97-21.57-23.92-25.94-39.33-4.1-14.73-2.76-30.19-2.76-45.29-.15-2.5 2.19-3.88 3.79-5.36 16.7-.11 33.42-.19 50.12-.01 2.83-.16 4.1 3.12 3.88 5.49-.63 10.02 3.29 19.62 8.43 28.01 2.84 5.09 7.69 9.31 13.67 9.94 6.39.68 12.88.31 19.3.18 3.02-.67 6.14-.53 9.22-.34 6.52 1.07 13.18.22 19.77.5 3.87-.23 8.04.75 11.66-1.09.96-2.54-1.65-4.2-3.43-5.36-43.3-28.33-86.6-56.67-129.9-85-2.84-1.82-5.85-4.21-6.31-7.79.4-1.88 2.44-2.54 3.76-3.69Z"/></g></svg>';
    const ARASAKA_MARK_URL = "data:image/svg+xml," + encodeURIComponent(ARASAKA_SVG);
    // Square corporate mark for the collapsed rail. The wordmark SVG has no
    // isolated glyph; this PNG is the Arasaka seal (white silhouette, CSS-masked).
    const ARASAKA_ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAC/klEQVR42u1d2Y4DMQgbrP3/X559aaXVaKvmgOAE89xmiA05CAnXJZFIJJKqYszK3fd9u3TSzETAQsB3IsMqgM5MhlUEnokMqw58NhEm4HOJsB3AHwUj67s0BIwCENVxNn3CCOjtaEsHe9r0bi+SCMsEv7VD0ZYboXMKAa0diQY++nueJOB08Nl1s1Ud7LGaqCUroydYFfCjdJklAUzg77gZmzUYCPxcEkJ2mFk71+yd9Ui7YAH/BG8YMSBchQ5jGAUVrX9qzHb2Apx61LdLqBoeVlMJ/JY+93gBBH4uCbgk3JPwKutf6Umr9G7xAmjSzSUUWpvnLnmH1rQek8+nNrKioR4h6BG84GX990uifh9pob16e3oBPCxoBsgnAKEZCH/anjEAT+MBSwxnpTdE6ewWDW1V0Bu0d3sh6R+vNqN0Hv0dWC3WXuLZTpTOM+2CwYq+ufUIEV4ERnsvdlk7twL66Xesexr0Ksq8OcvenY9ghwqhB2ajgUDL9USFo+UBIkCZC7sQoDMADUEiQFKEgCrDHXRmKwJKEw3Ky8uB5wFHeEB0ZyL2G0xXn7bIC8q4JUmXF3QCCczgu0zCzCSw5xhtk57unYvDNKn/ZGUdPHN0WgD1vGj9bGvF5ez//mteKXaz4HlYrJmZ1/XZHsJn8APLBsXDpT3vLq+6aosTx9WdNmNgUzTq29ngf/o+KgTPjgrGsT8nkAm+6015ildlJ3VgsfyhCxosh/OjIK4GfxQT7G5B7GP+N12wS+Za9PqdNj3d60r+qauZ2RgZdPa7wTKUyQtOsn43D6hIwvJbkkpLjHm4Chlv5FxKTYmZhCuQ4N1HMLwcWHHoCc0LOpGEqAcLwfSGJivwka9FIvoh052JoH+8e9UD16eC77YKaiVhByJa9fTaF4G1OALzEpOyhEkvCUxE9OjjHRFAdoWKTCJ6v79FGavoWl2zEUiW+mHLShlmlxNkL2eoYp4VinmqnK0KOqugMysR6TmjFR9posobuoocfOhIVSKRSCRs8gtjf7ytiw4EsAAAAABJRU5ErkJggg==';

    // Militech marks, white silhouettes for CSS masks (fan asset pack,
    // non-commercial). Wordmark for the sidebar brand, square mark for
    // the collapsed rail.
    const MILITECH_MARK_URL = 'data:image/png;base64,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';
    const MILITECH_WORDMARK_URL = 'data:image/png;base64,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';

    function arasakaAtmosphere() {
      const sel = `body[${THEME_ATTR}="arasaka"]`;
      const dark = `${sel}[data-ds-dark-theme]`;
      const cutSm = "polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)";
      const red = "var(--dsw-alias-state-business-primary)";
      // Chat/page field: deep maroon at the top, falling to black. Dots sit
      // on a ::before so they can be masked independently of the wash.
      // Do not put this gradient in --dsw-alias-bg-base (reasoning shimmer
      // color-mixes it).
      const dots =
        "radial-gradient(circle, rgba(160,22,38,.5) .8px, transparent 1px)";
      const wash =
        "linear-gradient(180deg, rgb(36,5,10) 0%, rgb(12,2,4) 48%, rgb(2,0,0) 100%)";
      const washCss =
        `background-color:rgb(2,0,0)!important;background-image:${wash}!important;` +
        "background-repeat:no-repeat!important;background-attachment:fixed!important";
      // 45deg: 0% is bottom-left, 100% is top-right. Center stays a whisper.
      const dotFade =
        "linear-gradient(45deg,rgba(0,0,0,.95) 0%,rgba(0,0,0,.25) 34%,rgba(0,0,0,.05) 50%,rgba(0,0,0,.25) 66%,rgba(0,0,0,.95) 100%)";
      const glassFill = "rgba(4, 0, 2, 0.42)";
      const glass =
        `background:${glassFill}!important;` +
        "backdrop-filter:blur(22px) saturate(1.2);" +
        "-webkit-backdrop-filter:blur(22px) saturate(1.2)";
      const ticks = (fill) =>
        `linear-gradient(${red},${red}) right top/16px 2px no-repeat,` +
        `linear-gradient(${red},${red}) right top/2px 16px no-repeat,` +
        `linear-gradient(${red},${red}) left bottom/16px 2px no-repeat,` +
        `linear-gradient(${red},${red}) left bottom/2px 16px no-repeat,` +
        fill;
      return `
${sel} [class*="sidebarCol"],${sel} [class*="detailsCol"],${sel} [class*="header"],${sel} button{letter-spacing:.06em}
${sel} [class*="sidebarCol"]{font-size:12px}
${sel} *,${sel} *::before,${sel} *::after{border-radius:0!important}
${sel} [class*="spinner" i],${sel} [class*="Spinner"]{border-radius:50%!important}
${sel} ::selection{background:rgba(196,16,40,.42);color:#fff}
${sel} .dshth-name{text-transform:uppercase;letter-spacing:.16em;font-weight:600}
${sel} .dshth-card{clip-path:${cutSm}}
${sel} textarea,${sel} [class$="_input"],${sel} [class$="_mirror"],${sel} [class$="_backdrop"]{letter-spacing:0!important}
${sel} [data-ref-chip],${sel} [data-composer-card] [class$="_chip"]{background:transparent!important;color:${red};box-shadow:none}
${sel} [class*="sidebarCol"]{box-shadow:inset 3px 0 0 ${red}}
${sel} .hHd-Xa_brand{position:relative;min-width:108px;min-height:24px}
${sel} .hHd-Xa_brand>svg{position:absolute;inset:0;width:0!important;height:0!important;opacity:0;overflow:hidden}
${sel} .hHd-Xa_brand::after{content:"";display:block;width:108px;height:26px;pointer-events:none;background:${red};-webkit-mask:url("${ARASAKA_MARK_URL}") center/contain no-repeat;mask:url("${ARASAKA_MARK_URL}") center/contain no-repeat}
${sel} .hHd-Xa_railFish{width:24px!important;height:24px!important;background:${red}!important;-webkit-mask:url("${ARASAKA_ICON_URL}") center/contain no-repeat;mask:url("${ARASAKA_ICON_URL}") center/contain no-repeat}
${sel} .hHd-Xa_railFish path{opacity:0}
${sel} .pXSMma_headline{grid-template-columns:auto auto!important}
${sel} .pXSMma_fishHitbox{display:none!important}
${sel} .pXSMma_headlineText{grid-area:1/1!important;font-size:0;line-height:0;width:180px;height:32px;background:${red};-webkit-mask:url("${ARASAKA_MARK_URL}") center/contain no-repeat;mask:url("${ARASAKA_MARK_URL}") center/contain no-repeat}
${sel} .pXSMma_previewBadge{grid-area:1/2!important}
${sel} .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_newSession{background:color-mix(in srgb,${red} 14%,transparent)!important;border-color:${red}!important;color:${red}!important}
${sel} .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_newSession:hover{background:color-mix(in srgb,${red} 26%,transparent)!important}
${sel} [data-composer-card]{box-shadow:none!important;background:${ticks("var(--dsw-specific-input-major)")}!important}
${sel} [data-composer-card] button[aria-label="Send message"],${sel} [data-composer-card] button[aria-label="发送消息"]{clip-path:${cutSm};box-shadow:0 0 14px color-mix(in srgb,${red} 55%,transparent)}
${sel} [data-composer-card] button[aria-label="Send message"]:hover:not(:disabled),${sel} [data-composer-card] button[aria-label="发送消息"]:hover:not(:disabled){filter:drop-shadow(1px 0 0 #3cf) drop-shadow(-1px 0 0 ${red})}
${dark}{--dsw-shadow-lv2:none;--dsw-specific-sidebar-fill:transparent;box-shadow:inset 0 1px 0 ${red};${washCss}}
${dark} [class*="centerCol"]{${washCss};position:relative;isolation:isolate}
${dark} [class*="centerCol"]::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;background-image:${dots};background-size:28px 28px;background-repeat:repeat;background-attachment:fixed;-webkit-mask-image:${dotFade};mask-image:${dotFade};-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
${dark} [data-phase],${dark} .hHd-Xa_root{background:transparent!important}
${dark} .wSkVaW_composerSeat{background:linear-gradient(180deg,transparent 0,rgba(2,0,0,.35) 32px,rgb(2,0,0) 72px)!important}
${dark} [class*="detailsCol"],${dark} .wSkVaW_header{${glass}}
${dark} [class*="sidebarCol"]{background:${glassFill}!important;border-right:1px solid rgba(255,46,70,.16)}
${dark} [class*="detailsCol"]{border-left:1px solid rgba(255,46,70,.16)}
${dark} [data-composer-card]{background:${ticks(glassFill)}!important;backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2);border:1px solid rgba(255,46,70,.22)!important}
${dark} ::selection{background:rgba(255,46,70,.5);color:#fff}
@media (prefers-reduced-motion:reduce){
${sel} [data-composer-card] button[aria-label="Send message"]:hover:not(:disabled),${sel} [data-composer-card] button[aria-label="发送消息"]:hover:not(:disabled){filter:none}
}
@media (prefers-reduced-transparency:reduce){
${dark} [class*="sidebarCol"],${dark} [class*="detailsCol"],${dark} .wSkVaW_header,${dark} [data-composer-card]{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(10,2,4,.92)!important}
}
`;
    }

    function militechAtmosphere() {
      const sel = `body[${THEME_ATTR}="militech"]`;
      const dark = `${sel}[data-ds-dark-theme]`;
      const blue = "var(--dsw-alias-state-business-primary)";
      // Faint engineering grid on the chat field, fading in from the top.
      const grid =
        "repeating-linear-gradient(0deg,rgba(110,168,220,.05) 0 1px,transparent 1px 28px)," +
        "repeating-linear-gradient(90deg,rgba(110,168,220,.05) 0 1px,transparent 1px 28px)";
      return `
${sel} [class*="sidebarCol"],${sel} [class*="header"],${sel} button{letter-spacing:.08em}
${sel} .dshth-name{text-transform:uppercase;letter-spacing:.14em}
${sel} .hHd-Xa_brand{position:relative;min-width:118px;min-height:22px}
${sel} .hHd-Xa_brand>svg{position:absolute;inset:0;width:0!important;height:0!important;opacity:0;overflow:hidden}
${sel} .hHd-Xa_brand::after{content:"";display:block;width:118px;height:22px;pointer-events:none;background:${blue};-webkit-mask:url("${MILITECH_WORDMARK_URL}") center/contain no-repeat;mask:url("${MILITECH_WORDMARK_URL}") center/contain no-repeat}
${sel} .hHd-Xa_railFish{width:24px!important;height:24px!important;background:${blue}!important;-webkit-mask:url("${MILITECH_MARK_URL}") center/contain no-repeat;mask:url("${MILITECH_MARK_URL}") center/contain no-repeat}
${sel} .hHd-Xa_railFish path{opacity:0}
${sel} [class*="sidebarCol"]{box-shadow:inset 3px 0 0 ${blue}}
${dark} [data-phase],${dark} .hHd-Xa_root{background:transparent!important}
${dark} [class*="centerCol"]{position:relative;isolation:isolate}
${dark} [class*="centerCol"]::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;background-image:${grid};-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 140px);mask-image:linear-gradient(180deg,transparent 0,#000 140px)}
`;
    }

    const uiCss = `
.VOzbGW_panel{width:min(1120px,calc(100vw - 48px))!important}
.dshth-root{display:flex;flex-direction:column;gap:8px;width:100%;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2);box-sizing:border-box}
.dshth-head{display:flex;flex-direction:column;gap:2px}
.dshth-title{margin:0;font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dshth-sub{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshth-grid{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;width:100%}
.dshth-card{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;font:inherit;text-align:left;flex:1 1 160px;min-width:0;box-sizing:border-box;transition:border-color .12s ease}
.dshth-card:hover{border-color:var(--dsw-alias-state-business-primary)}
.dshth-card[aria-pressed="true"]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}
.dshth-swatch{display:flex;height:30px;border-radius:6px;overflow:hidden;border:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.dshth-half{flex:1;position:relative}
.dshth-dot{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%}
.dshth-name{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshth-blurb{font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.dshth-face{font-size:10px;line-height:14px;letter-spacing:.02em;color:var(--dsw-alias-state-business-primary);opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;

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

    function readSaved() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return THEMES.some((theme) => theme.id === saved) ? saved : "default";
      } catch {
        return "default";
      }
    }

    function applyTheme(id) {
      if (typeof document === "undefined") return;
      if (id && id !== "default") document.body.setAttribute(THEME_ATTR, id);
      else document.body.removeAttribute(THEME_ATTR);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* private mode — selection just will not persist */
      }
    }

    // Apply before React mounts so a saved theme does not flash the default.
    ensureFont(
      "chakra-petch",
      "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap",
    );
    ensureStyle("themes", stylesheet());
    ensureStyle("themes-ui", uiCss);
    applyTheme(readSaved());

    function ThemeRow() {
      const [selected, setSelected] = React.useState(readSaved);

      function choose(id) {
        setSelected(id);
        applyTheme(id);
      }

      return React.createElement("section", { className: "dshth-root" },
        React.createElement("div", { className: "dshth-head" },
          React.createElement("h3", { className: "dshth-title" }, "Theme"),
          React.createElement("p", { className: "dshth-sub" },
            "Recolours the interface. Each theme ships a light and a dark palette — " +
            "Appearance above still decides which one is showing."),
        ),
        React.createElement("div", { className: "dshth-grid" },
          THEMES.map((theme) =>
            React.createElement("button", {
              key: theme.id,
              type: "button",
              className: "dshth-card",
              "aria-pressed": selected === theme.id ? "true" : "false",
              onClick: () => choose(theme.id),
              title: theme.blurb,
            },
              React.createElement("span", { className: "dshth-swatch" },
                React.createElement("span", {
                  className: "dshth-half",
                  style: { background: theme.swatch.light },
                }, React.createElement("span", {
                  className: "dshth-dot",
                  style: { background: theme.accent.light },
                })),
                React.createElement("span", {
                  className: "dshth-half",
                  style: { background: theme.swatch.dark },
                }, React.createElement("span", {
                  className: "dshth-dot",
                  style: { background: theme.accent.dark },
                })),
              ),
              // Set in the theme's own face, so the card doubles as a specimen.
              // A theme with no face previews the system stack explicitly — left
              // to inherit, it would render in whichever theme is currently on.
              React.createElement("span", {
                className: "dshth-name",
                style: { fontFamily: theme.face ? stack(theme.face, UI_TAIL) : UI_TAIL },
              }, theme.label),
              React.createElement("span", { className: "dshth-blurb" }, theme.blurb),
              React.createElement("span", { className: "dshth-face" }, theme.faceLabel),
            )),
        ),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "custom-themes",
        // Appearance (light/dark) is order 10; sit directly beneath it.
        order: 15,
      }, ThemeRow));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
