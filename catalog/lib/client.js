window.__ModuleLoader__.load({
  id: "dsh-plugin-catalog",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const css = `
.dshpc-root{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px}
.dshpc-lead{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.dshpc-lead a{color:var(--dsw-alias-state-business-primary)}
.dshpc-search{display:flex;gap:8px}
.dshpc-search input{flex:1;height:36px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font:inherit;font-size:13px}
.dshpc-search button,.dshpc-actions button,.dshpc-toolbar button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;height:32px;padding:0 10px;font:inherit;font-size:12px;cursor:pointer}
.dshpc-search button{height:36px;font-size:13px}
.dshpc-search button:disabled,.dshpc-actions button:disabled,.dshpc-toolbar button:disabled{opacity:.55;cursor:default}
.dshpc-status{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px}
.dshpc-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:13px;white-space:pre-wrap}
.dshpc-cards{display:flex;flex-direction:column;gap:10px;list-style:none;margin:0;padding:0}
.dshpc-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:0;overflow:hidden;display:flex;flex-direction:column;position:relative;transition:border-color .12s ease}
.dshpc-card:hover{border-color:var(--dsw-alias-border-l1,var(--dsw-alias-state-business-primary))}
/* center, not "center top": these cards pad the top heavily, so a top-anchored
   crop shows nothing but empty margin. */
.dshpc-cover{width:100%;aspect-ratio:2.6/1;object-fit:cover;object-position:center;display:block;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshpc-coverfallback{width:100%;aspect-ratio:2.6/1;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dshpc-inner{padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.dshpc-mono{font-size:30px;font-weight:650;color:#fff;line-height:1;user-select:none;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.dshpc-badge{display:inline-block;margin-left:6px;font-size:10px;line-height:16px;padding:0 6px;border-radius:999px;vertical-align:middle;background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-bg-layer-1)}
.dshpc-badge-update{background:var(--dsw-alias-state-warning-primary,#c47d12);color:#fff}
.dshpc-badge-hub{background:var(--dsw-alias-state-success-primary,#2e7d4f);color:#fff}
.dshpc-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dshpc-note{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshpc-warn{color:var(--dsw-alias-state-warning-primary,#c47d12)}
@media (max-width:560px){
.dshpc-cover,.dshpc-coverfallback{aspect-ratio:3.2/1}
}
.dshpc-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.dshpc-title{margin:0;font-size:14px;font-weight:600}
.dshpc-meta{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.dshpc-desc{margin:0;font-size:13px;line-height:19px}
.dshpc-en{margin:0;font-size:13px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.dshpc-topics{display:flex;flex-wrap:wrap;gap:6px}
.dshpc-topic{font-size:11px;line-height:18px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary)}
.dshpc-actions{display:flex;gap:6px;align-items:center}
.dshpc-translate{opacity:0;transition:opacity .12s ease}
.dshpc-card:hover .dshpc-translate,.dshpc-card:focus-within .dshpc-translate{opacity:1}
.dshpc-btn{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.dshpc-danger{color:var(--dsw-alias-state-error-primary)}
.dshpc-danger:hover:not(:disabled){background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-state-error-primary)}
.dshpc-spinner{width:11px;height:11px;flex:none;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:dshpc-spin .6s linear infinite}
@keyframes dshpc-spin{to{transform:rotate(360deg)}}
.dshpc-card[data-busy="1"]{opacity:.75}
.dshpc-choices{display:flex;flex-wrap:wrap;gap:6px;padding-top:2px}
.dshpc-log{position:relative;margin:0;padding:10px 30px 10px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dshpc-logtext{margin:0;font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-word;font-family:inherit;max-height:40vh;overflow:auto}
.dshpc-log.dshpc-ok{color:var(--dsw-alias-label-secondary)}
.dshpc-log.dshpc-notice{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-state-business-primary)}
.dshpc-log.dshpc-error{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.dshpc-dismiss{position:absolute;top:6px;right:8px;border:0;background:none;color:inherit;font-size:15px;line-height:1;cursor:pointer;opacity:.6;padding:2px 4px}
.dshpc-dismiss:hover{opacity:1}
@media (prefers-reduced-motion:reduce){
.dshpc-spinner{animation-duration:2.4s}
}
`;

    if (typeof document !== "undefined" && !document.querySelector('style[data-plugin-css="dsh-plugin-catalog"]')) {
      const tag = document.createElement("style");
      tag.dataset.pluginCss = "dsh-plugin-catalog";
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    function looksNonEnglish(text) {
      return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/.test(text || "");
    }

    // Deterministic colour per repo, so the monogram fallback is stable across
    // reloads rather than flickering to a new shade each render.
    function hueFor(text) {
      let hash = 0;
      for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
      return hash;
    }

    function monogramFor(fullName) {
      const repo = fullName.split("/")[1] || fullName;
      const cleaned = repo.replace(/^(dsh|deepseek)[-_]?/i, "") || repo;
      return (cleaned.match(/[A-Za-z0-9]/)?.[0] ?? "?").toUpperCase();
    }

    // --- Demo curtain (instant, no restart) ------------------------------------
    // Demo mode is pure client-side visual suppression: it hides other plugins'
    // rendered roots and disables their injected CSS, so the bare default UI can
    // be compared against the dressed one WITHOUT restarting the GUI. It is not an
    // unload — plugin JS keeps running — but for a UI before/after that is fine.
    //
    // Two levers, both reversible by removing one style tag and one class:
    //  1. Plugin-injected <style> tags are attributable by data-dyn="<pluginId>"
    //     or data-plugin-css; we disable exactly the known community plugins'
    //     tags, never the harness's and never ours.
    //  2. A curtain stylesheet hides community plugin roots by class rule. The
    //     rule is dynamic: hide any "dsh"-containing token, keep the harness
    //     "dsh-" tokens and the catalog's "dshpc" tokens — so a new plugin prefix
    //     (e.g. dshrs-) is caught without editing a list.
    const CURTAIN_STYLE_ID = "dshpc-demo-curtain";
    const EXIT_PILL_ID = "dshpc-demo-exit";

    // Exact style-tag owners (data-dyn / data-plugin-css values) for the
    // community plugins in this deployment. Harness tags carry @deepseek-ai/*
    // ids and are never matched here; our own tag is data-plugin-css="dsh-plugin-catalog".
    const PLUGIN_STYLE_OWNERS = new Set([
      "dsh-plugin-board",
      "dsh-plugin-chat-density",
      "dsh-plugin-skillcard",
      "dsh-plugin-skillpress",
      "dsh-plugin-themes",
      "dsh-plugin-vault",
    ]);

    // Hide rule (dynamic, self-maintaining): community plugin classes are
    // "dsh<letters>-…" (dsh followed by a LETTER). Harness classes are
    // "dsh-<word>-…" (dsh followed by a DASH) and the catalog is "dshpc-…".
    // So the selector hides any token containing "dsh", then explicitly keeps
    // the harness "dsh-" tokens and the catalog's "dshpc" tokens visible. A new
    // plugin prefix is caught automatically — no per-plugin list to maintain.
    function curtainCss() {
      const hide = `[class*="dsh"]`;
      // Allow-list: anything where "dsh" is immediately followed by a dash is a
      // harness token (dsh-bash-, dsh-tool-, …). The catalog's own dshpc- tokens
      // are kept so the switch and its card stay reachable.
      const keepHarness = `[class*="dsh-"]`;
      const keepCatalog = `[class*="dshpc"]`;
      const selectors =
        `${hide}:not(${keepHarness}):not(${keepCatalog})`;
      return (
        `${selectors}{display:none !important;}` +
        `#${EXIT_PILL_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483646;` +
        `border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);` +
        `color:var(--dsw-alias-label-primary);border-radius:999px;padding:8px 14px;` +
        `font: inherit;font-size:12px;cursor:pointer;box-shadow:var(--dsw-shadow-lv1,0 2px 10px rgba(0,0,0,.25));}` +
        `#${EXIT_PILL_ID}:hover{background:var(--dsw-alias-interactive-bg-hover);}`
      );
    }

    // Attribution attributes community plugins use on their <style> tags.
    // data-dyn (board/vault/skillcard/etc.), data-plugin-css (catalog + others),
    // and data-dsh-style (themes). Only the catalog's own tag is protected.
    const STYLE_ATTRS = ["data-dyn", "data-plugin-css", "data-dsh-style"];

    function setPluginStylesDisabled(disabled) {
      const selector = STYLE_ATTRS.map((a) => `style[${a}]`).join(",");
      const tags = document.querySelectorAll(selector);
      for (const tag of tags) {
        // data-dsh-style is the themes plugin's attribution attribute (no harness
        // code uses it), so any tag carrying it is plugin-owned and safe to flip.
        let owner = tag.dataset.dshStyle;
        if (owner === undefined) {
          owner = tag.dataset.dyn ?? tag.dataset.pluginCss ?? "";
          // Harness tags carry @deepseek-ai/* ids; our own catalog tag carries
          // data-plugin-css="dsh-plugin-catalog". Those must survive demo mode.
          if (owner.startsWith("@deepseek-ai/") || owner === "dsh-plugin-catalog") continue;
        }
        if (disabled) {
          if (tag.dataset.dshpcWasMedia === undefined) tag.dataset.dshpcWasMedia = tag.media || "";
          tag.media = "none";
        } else if (tag.dataset.dshpcWasMedia !== undefined) {
          tag.media = tag.dataset.dshpcWasMedia;
          delete tag.dataset.dshpcWasMedia;
        }
      }
    }

    function removeExitPill() {
      document.getElementById(EXIT_PILL_ID)?.remove();
    }

    function showExitPill() {
      if (document.getElementById(EXIT_PILL_ID)) return;
      const pill = document.createElement("button");
      pill.id = EXIT_PILL_ID;
      pill.type = "button";
      pill.textContent = "Exit demo mode";
      pill.addEventListener("click", () => void setDemoMode(false));
      document.body.appendChild(pill);
    }

    // Single source of truth for the client side of a flip. Idempotent.
    function applyDemoCurtain(on) {
      let tag = document.getElementById(CURTAIN_STYLE_ID);
      if (on) {
        if (!tag) {
          tag = document.createElement("style");
          tag.id = CURTAIN_STYLE_ID;
          document.head.appendChild(tag);
        }
        tag.textContent = curtainCss();
        setPluginStylesDisabled(true);
        showExitPill();
      } else {
        tag?.remove();
        setPluginStylesDisabled(false);
        removeExitPill();
      }
    }

    // Flip both sides: persist the flag on the server, then apply the curtain
    // locally right away. The server flag only matters across a page refresh.
    async function setDemoMode(on) {
      applyDemoCurtain(on);
      try {
        const response = await fetch("/dsh-plugin-catalog/demo-mode", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ on }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        return result;
      } catch (error) {
        // The curtain is already applied; a persist failure only means the state
        // won't survive a refresh. Surface it but don't roll back the visual.
        return { error: String(error?.message ?? error) };
      }
    }

    // Demo mode lives in the main Settings → Plugins modal (the Configurable
    // tab) as a card, not buried in the Catalog tab — the whole point is a
    // before/after switch you can reach without first loading the catalog.
    function DemoModeCard() {
      const [demo, setDemo] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [note, setNote] = React.useState(null);

      const refresh = React.useCallback(async () => {
        try {
          const response = await fetch("/dsh-plugin-catalog/demo-mode");
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          setDemo(payload);
          // Re-assert the curtain on load: if the flag was persisted on, a page
          // refresh should come back up still suppressed.
          applyDemoCurtain(Boolean(payload.suppressed));
        } catch (error) {
          setNote({ kind: "error", text: String(error?.message ?? error) });
        }
      }, []);

      React.useEffect(() => {
        refresh();
      }, [refresh]);

      async function toggle(on) {
        setBusy(true);
        setNote(null);
        // Apply the visual change immediately — that is the whole point.
        applyDemoCurtain(on);
        setDemo((prev) => ({ ...(prev ?? {}), suppressed: on }));
        const result = await setDemoMode(on);
        setBusy(false);
        if (result?.error) {
          setNote({
            kind: "error",
            text: `Applied, but the state was not saved (it won't survive a refresh): ${result.error}`,
          });
          return;
        }
        const n = (on ? result?.hidden?.length : result?.restored?.length) ?? 0;
        setNote({
          kind: "notice",
          text: on
            ? `Demo mode on — ${n} plugin${n === 1 ? "" : "s"} hidden. Use the floating button (bottom-right) or this switch to exit.`
            : `Demo mode off — everything is back.`,
        });
      }

      return React.createElement("li", { className: "dshpc-card" },
        React.createElement("div", { className: "dshpc-inner" },
          React.createElement("div", { className: "dshpc-head" },
            React.createElement("div", { style: { minWidth: 0 } },
              React.createElement("h3", { className: "dshpc-title" }, "Demo mode"),
              React.createElement("p", { className: "dshpc-meta" },
                "Hide every non-default plugin for an instant before/after UI " +
                "comparison — no restart. A floating “Exit demo mode” button " +
                "appears at the bottom-right so there is always a way back."),
            ),
            React.createElement("div", { className: "dshpc-actions" },
              React.createElement("label", {
                className: "dshpc-note",
                style: { display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" },
              },
                React.createElement("input", {
                  type: "checkbox",
                  checked: Boolean(demo?.suppressed),
                  disabled: busy || demo === null,
                  onChange: (event) => void toggle(event.target.checked),
                }),
                demo?.suppressed ? "On" : "Off",
              ),
            ),
          ),
          demo?.suppressed
            ? React.createElement("p", { className: "dshpc-note" },
                `${demo.hidden?.length ?? 0} hidden. Flip off or use the floating button to bring everything back.`)
            : null,
          note
            ? React.createElement("p", {
                className: note.kind === "error" ? "dshpc-error" : "dshpc-note",
              }, note.text)
            : null,
        ),
      );
    }

    function CatalogTab() {
      const [query, setQuery] = React.useState("");
      const [state, setState] = React.useState({ status: "loading" });
      const [busy, setBusy] = React.useState(null);
      const [log, setLog] = React.useState(null);
      const [translations, setTranslations] = React.useState({});
      const [choices, setChoices] = React.useState(null);
      const [pending, setPending] = React.useState(null);
      const [badCovers, setBadCovers] = React.useState({});

      function cover(item) {
        // No cover (offline, or GitHub refused): a blank band reads as broken,
        // so fall back to a monogram on a hue hashed from the repo name.
        if (!item.coverUrl || badCovers[item.id]) {
          const hue = hueFor(item.name);
          return React.createElement("div", {
            className: "dshpc-coverfallback",
            style: {
              background: `linear-gradient(135deg,hsl(${hue} 52% 45%),hsl(${(hue + 45) % 360} 52% 32%))`,
            },
          }, React.createElement("span", { className: "dshpc-mono" }, monogramFor(item.name)));
        }
        return React.createElement("img", {
          className: "dshpc-cover",
          src: item.coverUrl,
          alt: "",
          loading: "lazy",
          decoding: "async",
          referrerPolicy: "no-referrer",
          onError: () => setBadCovers((prev) => ({ ...prev, [item.id]: true })),
        });
      }

      const load = React.useCallback(async (nextQuery) => {
        // Keep the previous rows on screen while refreshing. Dropping them
        // collapses the list, which yanks everything below it up and then back
        // down — the reason install results looked like they vanished.
        setState((prev) => ({ status: "loading", data: prev?.data }));
        try {
          const qs = nextQuery ? `?q=${encodeURIComponent(nextQuery)}` : "";
          const response = await fetch(`/dsh-plugin-catalog/list${qs}`);
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          setState({ status: "ready", data: payload });
        } catch (error) {
          setState({ status: "error", message: String(error?.message ?? error) });
        }
      }, []);

      React.useEffect(() => {
        load("");
      }, [load]);

      async function mutate(item, kind, chosenPackage, skills, force) {
        const labels = {
          install: { done: "Installed", fail: "Install", load: "load" },
          uninstall: { done: "Removed", fail: "Uninstall", load: "unload" },
          update: { done: "Updated", fail: "Update", load: "load" },
        };
        const copy = labels[kind] || labels.install;
        setBusy({ id: item.id, kind });
        setLog(null);
        setChoices(null);
        setPending(null);
        try {
          const response = await fetch(`/dsh-plugin-catalog/${kind}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ spec: item.spec, package: chosenPackage, skills, force: Boolean(force) }),
          });
          const result = await response.json();
          if (result.error && !result.stdout && !result.stderr && result.method !== "compat") {
            throw new Error(result.error);
          }

          // Multi-plugin repo: let the user say which one.
          if (result.method === "choices") {
            setChoices({ item, candidates: result.candidates || [] });
            setLog({ kind: "notice", text: result.stderr });
            return;
          }

          // Skills repo: bulk file copy, so confirm before writing anything.
          if (result.method === "skills-confirm") {
            setChoices({ item, skills: result.skills || [] });
            setLog({ kind: "notice", text: result.stderr });
            return;
          }

          if (result.method === "compat") {
            setPending({ item, kind, package: chosenPackage, skills, compat: result.compat });
            setLog({
              kind: "notice",
              text:
                `${result.compat === "block" ? "Blocked" : "Warning"}: ${result.compatNote || result.stderr}` +
                `\nThis host will not ${kind} automatically. Use ${kind === "install" ? "Install" : "Update"} anyway if you want to proceed.`,
            });
            return;
          }

          const named = result.packageName
            ? ` ${result.packageName}${result.version ? `@${result.version}` : ""}`
            : "";
          const rejected = result.method === "rejected";
          const noop = result.method === "noop";
          const header = result.ok
            ? `${noop ? "Already current" : copy.done}${named}${noop ? ".\n" : ` (${result.method || "ok"}). Restart the GUI to ${copy.load} it.\n`}`
            : rejected
              ? `Skipped ${item.name} — nothing was changed.\n`
              : `${copy.fail} failed.\n`;
          const body = [result.stdout, result.stderr, result.error].filter(Boolean).join("\n");
          setLog({ kind: result.ok ? "ok" : rejected ? "notice" : "error", text: header + body });
          await load(query);
        } catch (error) {
          setLog({ kind: "error", text: String(error?.message ?? error) });
        } finally {
          setBusy(null);
        }
      }

      async function mutateAll(force) {
        setBusy({ id: "*", kind: "update-all" });
        setLog(null);
        setPending(null);
        try {
          const response = await fetch("/dsh-plugin-catalog/update-all", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ force: Boolean(force) }),
          });
          const result = await response.json();
          if (result.error && !result.stdout) throw new Error(result.error);
          setLog({
            kind: result.ok ? "ok" : "error",
            text: [result.stdout, result.stderr, result.error].filter(Boolean).join("\n"),
          });
          await load(query);
        } catch (error) {
          setLog({ kind: "error", text: String(error?.message ?? error) });
        } finally {
          setBusy(null);
        }
      }

      function actionButton(item) {
        const active = busy?.id === item.id ? busy.kind : null;
        const anyBusy = Boolean(busy);

        if (active) {
          return React.createElement("button", {
            type: "button",
            className: "dshpc-btn",
            disabled: true,
          },
            React.createElement("span", { className: "dshpc-spinner", "aria-hidden": "true" }),
            active === "install" ? "Installing…" : active === "update" ? "Updating…" : "Removing…",
          );
        }

        if (item.installed) {
          const blocked = !item.removable;
          const buttons = [];
          if (item.updateAvailable) {
            buttons.push(React.createElement("button", {
              key: "update",
              type: "button",
              className: "dshpc-btn",
              disabled: anyBusy,
              title: item.compatNote || `Update ${item.packageName} to ${item.latestVersion}`,
              onClick: () => mutate(item, "update"),
            }, "Update"));
          }
          buttons.push(React.createElement("button", {
            key: "uninstall",
            type: "button",
            className: "dshpc-btn dshpc-danger",
            disabled: anyBusy || blocked,
            title: blocked
              ? "The catalog plugin can't remove itself"
              : `Remove ${item.packageName || item.name}`,
            onClick: () => mutate(item, "uninstall"),
          }, "Uninstall"));
          return buttons;
        }

        return React.createElement("button", {
          type: "button",
          className: "dshpc-btn",
          disabled: anyBusy,
          onClick: () => mutate(item, "install"),
        }, "Install");
      }

      async function translate(item) {
        const text = [item.name, item.description].filter(Boolean).join(" — ");
        setTranslations((prev) => ({ ...prev, [item.id]: { status: "loading" } }));
        try {
          const response = await fetch("/dsh-plugin-catalog/translate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          setTranslations((prev) => ({
            ...prev,
            [item.id]: { status: "ready", text: payload.translation },
          }));
        } catch (error) {
          setTranslations((prev) => ({
            ...prev,
            [item.id]: { status: "error", text: String(error?.message ?? error) },
          }));
        }
      }

      const items = state.data?.items ?? [];

      return React.createElement("section", { className: "dshpc-root" },
        React.createElement("p", { className: "dshpc-lead" },
          "Plugins from ",
          React.createElement("a", { href: state.data?.hub?.url || "https://plugin-hub-khaki.vercel.app/harness", target: "_blank", rel: "noreferrer" }, "your hub"),
          " first — checksummed and curated — then community plugins tagged ",
          React.createElement("a", { href: "https://github.com/topics/dsh-plugin", target: "_blank", rel: "noreferrer" }, "dsh-plugin"),
          " on GitHub. Updates are opt-in: nothing is upgraded until you click Update. After Install or Update, click the Dock icon to restart.",
        ),
        React.createElement("form", {
          className: "dshpc-search",
          onSubmit: (event) => {
            event.preventDefault();
            load(query);
          },
        },
          React.createElement("input", {
            value: query,
            placeholder: "Search the topic…",
            onChange: (event) => setQuery(event.target.value),
            // The harness swallows Enter before the form submit fires.
            onKeyDown: (event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.stopPropagation();
              load(query);
            },
          }),
          React.createElement("button", { type: "submit" }, "Search"),
        ),
        state.status === "ready" && (state.data.updates ?? 0) > 0
          ? React.createElement("div", { className: "dshpc-toolbar" },
              React.createElement("button", {
                type: "button",
                disabled: Boolean(busy),
                onClick: () => {
                  const n = state.data.updates;
                  if (!window.confirm(
                    `Update ${n} plugin${n === 1 ? "" : "s"} to the latest npm version?\n\n` +
                    "Only packages that look compatible with this harness will be updated. " +
                    "Incompatible ones are skipped unless you update them one by one.",
                  )) return;
                  mutateAll(false);
                },
              }, busy?.kind === "update-all" ? "Updating…" : `Update all (${state.data.updates})`),
              React.createElement("span", { className: "dshpc-note" },
                `Harness ${state.data.harness || "unknown"}. Skills and this catalog plugin are not updated.`),
            )
          : null,
        // Results sit ABOVE the list: below it they are 50 cards off-screen.
        log
          ? React.createElement("div", {
              className: `dshpc-log dshpc-${log.kind}`,
            },
              React.createElement("button", {
                type: "button",
                className: "dshpc-dismiss",
                title: "Dismiss",
                onClick: () => {
                  setLog(null);
                  setPending(null);
                },
              }, "×"),
              React.createElement("pre", { className: "dshpc-logtext" }, log.text),
              pending
                ? React.createElement("div", { className: "dshpc-choices" },
                    React.createElement("button", {
                      type: "button",
                      className: "dshpc-btn",
                      disabled: Boolean(busy),
                      onClick: () => mutate(pending.item, pending.kind, pending.package, pending.skills, true),
                    }, pending.kind === "install" ? "Install anyway" : "Update anyway"),
                  )
                : null,
            )
          : null,
        state.status === "loading" ? React.createElement("p", { className: "dshpc-status" }, "Loading GitHub topic…") : null,
        state.status === "error" ? React.createElement("p", { className: "dshpc-error" }, state.message) : null,
        state.status === "ready"
          ? React.createElement("p", { className: "dshpc-status" },
              state.data.hub?.ok
                ? `${state.data.hub.count} hub plugin${state.data.hub.count === 1 ? "" : "s"} · ${state.data.total} GitHub repositories`
                : `${state.data.total} GitHub repositories (hub unreachable)`)
          : null,
        React.createElement("ul", { className: "dshpc-cards" },
          items.map((item) => {
            const tr = translations[item.id];
            const showTranslate = looksNonEnglish(`${item.name} ${item.description}`) || Boolean(tr);
            const working = busy?.id === item.id;
            return React.createElement("li", {
              key: item.id,
              className: "dshpc-card",
              "data-busy": working ? "1" : "0",
              "aria-busy": working ? "true" : undefined,
            },
              cover(item),
              React.createElement("div", { className: "dshpc-inner" },
              React.createElement("div", { className: "dshpc-head" },
                React.createElement("div", { style: { minWidth: 0 } },
                  React.createElement("h3", { className: "dshpc-title" },
                    React.createElement("a", { href: item.htmlUrl, target: "_blank", rel: "noreferrer" }, item.name),
                    item.hub
                      ? React.createElement("span", { className: "dshpc-badge dshpc-badge-hub" }, "hub")
                      : null,
                    item.installed
                      ? React.createElement("span", { className: "dshpc-badge" },
                          item.skillCount ? `${item.skillCount} skills` : "installed")
                      : null,
                    item.updateAvailable
                      ? React.createElement("span", { className: "dshpc-badge dshpc-badge-update" }, "update")
                      : null,
                  ),
                  React.createElement("p", { className: "dshpc-meta" },
                    (item.hub
                      ? [
                          item.author ? `by ${item.author}` : null,
                          item.installedVersion
                            ? `v${item.installedVersion}${item.latestVersion && item.latestVersion !== item.installedVersion ? ` → ${item.latestVersion}` : ""}`
                            : item.latestVersion ? `v${item.latestVersion}` : null,
                          item.spec,
                        ]
                      : [
                          `★ ${item.stars.toLocaleString()}`,
                          item.language || "unknown",
                          item.spec,
                          item.installedVersion
                            ? `v${item.installedVersion}${item.latestVersion && item.latestVersion !== item.installedVersion ? ` → ${item.latestVersion}` : ""}`
                            : null,
                        ]
                    ).filter(Boolean).join(" · "),
                  ),
                ),
                React.createElement("div", { className: "dshpc-actions" },
                  showTranslate
                    ? React.createElement("button", {
                        type: "button",
                        className: "dshpc-translate",
                        disabled: tr?.status === "loading",
                        onClick: () => translate(item),
                      }, tr?.status === "loading" ? "Translating…" : tr?.status === "ready" ? "Translated" : "Translate")
                    : null,
                  actionButton(item),
                ),
              ),
              item.description ? React.createElement("p", { className: "dshpc-desc" }, item.description) : null,
              item.compatNote
                ? React.createElement("p", { className: `dshpc-note${item.compat === "block" ? " dshpc-warn" : ""}` }, item.compatNote)
                : null,
              tr?.status === "ready" ? React.createElement("p", { className: "dshpc-en" }, tr.text) : null,
              tr?.status === "error" ? React.createElement("p", { className: "dshpc-error" }, tr.text) : null,
              choices && choices.item.id === item.id && choices.candidates?.length
                ? React.createElement("div", { className: "dshpc-choices" },
                    choices.candidates.map((c) =>
                      React.createElement("button", {
                        key: c.name,
                        type: "button",
                        className: "dshpc-btn",
                        disabled: Boolean(busy),
                        onClick: () => mutate(item, "install", c.name),
                      }, `Install ${c.name}@${c.version}`)))
                : null,
              choices && choices.item.id === item.id && choices.skills?.length
                ? React.createElement("div", { className: "dshpc-choices" },
                    React.createElement("button", {
                      type: "button",
                      className: "dshpc-btn",
                      disabled: Boolean(busy),
                      onClick: () => mutate(item, "install", undefined, true),
                    }, `Install all ${choices.skills.length} skills`),
                    React.createElement("span", { className: "dshpc-meta" },
                      choices.skills.slice(0, 6).join(", ") +
                        (choices.skills.length > 6 ? `, +${choices.skills.length - 6} more` : "")))
                : null,
              item.topics?.length
                ? React.createElement("div", { className: "dshpc-topics" },
                    item.topics.map((topic) => React.createElement("span", { key: topic, className: "dshpc-topic" }, topic)))
                : null,
              ),
            );
          }),
        ),
        null,
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      // The toggle card goes first in the main (Configurable) tab — order -10
      // puts it above the built-in bash (0), agent-loop (10) and web-search
      // (20) cards.
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        id: "demo-mode",
        order: -10,
      }, DemoModeCard));
      ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
        name: "settings.plugins.tab",
        id: "catalog",
        order: 20,
        label: () => "Catalog",
      }, CatalogTab));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
