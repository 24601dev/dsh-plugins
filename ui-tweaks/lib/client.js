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
    // 3. A Settings cog joins it in the header utilities row, and the padded
    //    sidebar entry is hidden.
    // 4. Plugin list cards get an origin kicker (Shipped vs Added) and a
    //    one-line description. The inventory API only returns name + enabled,
    //    so we infer origin from the module id and look up copy here. React
    //    owns the card DOM; decoration uses data attributes + CSS so a
    //    re-render does not wipe the text. On All, CSS order puts Added
    //    first and a full-width divider above Shipped.

    const LOG_ICON =
      "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#9aa0ae" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/></svg>`,
      );
    const css = `
.dshv-foot,.dshp-foot{display:none !important}
.nL4_yW_sessionLogButton{width:32px !important;min-width:0 !important;max-width:32px !important;height:32px;padding:0 !important;gap:0 !important;font-size:0 !important;border-radius:8px;color:var(--dsw-alias-label-secondary) !important}
.nL4_yW_sessionLogButton:hover{color:var(--dsw-alias-label-primary) !important}
.nL4_yW_sessionLogButton svg{display:none}
.nL4_yW_sessionLogButton::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:url("${LOG_ICON}") center/contain no-repeat;mask:url("${LOG_ICON}") center/contain no-repeat}
.dshut-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.dshut-icon-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}

[data-plugin-entry]{display:flex;flex-direction:column;position:relative;cursor:pointer}
[data-plugin-entry]::before{content:attr(data-dshut-origin);order:0;padding:8px 14px 0;font-size:10px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;line-height:1}
[data-plugin-entry][data-dshut-kind="shipped"]::before{color:var(--dsw-alias-label-tertiary)}
[data-plugin-entry][data-dshut-kind="added"]::before{color:var(--dsw-alias-state-business-primary)}
[data-plugin-entry][data-dshut-kind="added"]{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%, var(--dsw-alias-border-l2))}
[data-plugin-entry][data-dshut-ready]>button:not(.dshut-plug-toggle){order:1;padding-top:8px !important;padding-bottom:6px !important;padding-right:56px !important;min-height:0 !important;align-items:flex-start !important}
[data-plugin-entry]::after{content:attr(data-dshut-desc);order:2;padding:0 14px 12px;font-size:12px;line-height:16px;font-weight:400;color:var(--dsw-alias-label-tertiary)}
[data-plugin-entry]>:not(button){order:3;cursor:auto}
[data-plugin-entry]:hover,
[data-plugin-entry][data-open="true"]{background:var(--dsw-alias-interactive-bg-hover)}
[data-plugin-entry]:hover>button:not(.dshut-plug-toggle),
[data-plugin-entry][data-open="true"]>button:not(.dshut-plug-toggle){background:transparent !important}
[data-plugin-entry] [data-enabled],
[data-plugin-entry]>button:not(.dshut-plug-toggle)>span,
[data-plugin-entry]>button:not(.dshut-plug-toggle) svg{display:none !important}
.dshut-plug-toggle{order:1;position:absolute;top:24px;right:14px;z-index:4;box-sizing:border-box;width:36px;height:20px;padding:2px;border:0;border-radius:999px !important;background:var(--dsw-alias-bg-layer-1);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);cursor:pointer}
.dshut-plug-toggle::after{content:"";display:block;width:16px;height:16px;border-radius:999px !important;background:var(--dsw-alias-label-tertiary);transform:translateX(0);transition:transform .14s var(--ds-ease-in-out,ease),background .14s var(--ds-ease-in-out,ease)}
.dshut-plug-toggle[aria-checked="true"]{background:var(--dsw-alias-state-success-primary);box-shadow:none}
.dshut-plug-toggle[aria-checked="true"]::after{background:#fff;transform:translateX(16px)}
.dshut-plug-toggle:hover:not(:disabled){box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}
.dshut-plug-toggle:disabled{opacity:.45;cursor:not-allowed}
@media (prefers-reduced-motion:reduce){.dshut-plug-toggle::after{transition:none}}
[data-dshut-plug-filter="shipped"] [data-plugin-entry][data-dshut-kind="added"],
[data-dshut-plug-filter="added"] [data-plugin-entry][data-dshut-kind="shipped"]{display:none !important}
[data-dshut-plug-filter="all"] [data-plugin-entry][data-dshut-kind="added"]{order:1}
[data-dshut-plug-filter="all"] .dshut-plug-split{order:2;grid-column:1/-1;list-style:none;display:flex;align-items:center;gap:10px;padding:8px 2px 2px;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;line-height:1}
[data-dshut-plug-filter="all"] .dshut-plug-split::after{content:"";flex:1;height:1px;background:var(--dsw-alias-border-l2)}
[data-dshut-plug-filter="all"] [data-plugin-entry][data-dshut-kind="shipped"]{order:3}
[data-dshut-plug-filter]:not([data-dshut-plug-filter="all"]) .dshut-plug-split{display:none}
.dshut-plug-filters{display:flex;flex-wrap:wrap;gap:6px;padding:0 2px}
.dshut-plug-filters button{font:inherit;font-size:12px;line-height:18px;padding:4px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer}
.dshut-plug-filters button:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
.dshut-plug-filters button[aria-checked="true"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%, transparent);border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}
.dshut-plug-filters button[data-kind="added"][aria-checked="true"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%, transparent)}
`;

    const COG_SVG =
      `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_2580_121189)"><path d="M12.1192 4.91016C11.9392 4.52714 11.7007 4.1292 11.4483 3.78809C11.385 3.70258 11.3517 3.68409 11.2462 3.67383C10.7419 3.6248 10.2318 3.69454 9.72662 3.64551C9.29108 3.60318 8.93739 3.40341 8.67682 3.05176C8.38762 2.66127 8.19217 2.20926 7.90338 1.81934C7.83985 1.73359 7.80848 1.71542 7.70221 1.70508C7.24758 1.6609 6.7511 1.66104 6.29791 1.70508C6.19164 1.71542 6.16027 1.73359 6.09674 1.81934C5.80775 2.20954 5.61248 2.66131 5.3233 3.05176C5.06273 3.40341 4.70904 3.60318 4.2735 3.64551C3.76831 3.69454 3.25825 3.6248 2.75397 3.67383C2.6484 3.68409 2.61509 3.70258 2.55182 3.78809C2.30019 4.12814 2.06125 4.52646 1.88092 4.91016C1.83256 5.01309 1.83242 5.04912 1.88092 5.15235C2.07954 5.57482 2.37449 5.94529 2.5733 6.36817C2.76971 6.78606 2.76964 7.21293 2.5733 7.63086C2.37462 8.05374 2.07947 8.42453 1.88092 8.84668C1.83235 8.95004 1.83257 8.98695 1.88092 9.08985C2.06098 9.47285 2.2994 9.87079 2.55182 10.2119C2.61509 10.2974 2.6484 10.3159 2.75397 10.3262C3.25879 10.3753 3.76834 10.3055 4.2735 10.3545C4.70904 10.3968 5.06273 10.5966 5.3233 10.9482C5.6125 11.3387 5.80795 11.7907 6.09674 12.1807C6.16027 12.2664 6.19164 12.2846 6.29791 12.2949C6.7511 12.339 7.24758 12.3391 7.70221 12.2949C7.80848 12.2846 7.83985 12.2664 7.90338 12.1807C8.19237 11.7905 8.38764 11.3387 8.67682 10.9482C8.93739 10.5966 9.29108 10.3968 9.72662 10.3545C10.2318 10.3055 10.7419 10.3752 11.2462 10.3262C11.3517 10.3159 11.385 10.2974 11.4483 10.2119C11.7007 9.87079 11.9391 9.47285 12.1192 9.08985C12.1675 8.98695 12.1678 8.95004 12.1192 8.84668C11.9205 8.42428 11.6255 8.05377 11.4268 7.63086C11.2305 7.21293 11.2304 6.78606 11.4268 6.36817C11.6256 5.94531 11.9207 5.5746 12.1192 5.15235C12.1677 5.04912 12.1676 5.01309 12.1192 4.91016ZM13.2051 5.66309C13.0064 6.08573 12.7114 6.45579 12.5128 6.87793C12.4642 6.98123 12.4645 7.01829 12.5128 7.1211C12.7112 7.54328 13.0064 7.91405 13.2051 8.33692C13.4015 8.75487 13.4015 9.18169 13.2051 9.59961C12.9911 10.0551 12.7109 10.5221 12.4122 10.9258C12.1522 11.277 11.7974 11.4782 11.3624 11.5205C10.8573 11.5696 10.3477 11.4999 9.84283 11.5488C9.73621 11.5592 9.70429 11.5772 9.64069 11.6631C9.35229 12.0526 9.15705 12.5044 8.86823 12.8945C8.60854 13.2452 8.25275 13.447 7.81842 13.4893C7.28749 13.5409 6.71096 13.5407 6.1817 13.4893C5.74737 13.447 5.39158 13.2452 5.1319 12.8945C4.84312 12.5045 4.64808 12.0529 4.35944 11.6631C4.29583 11.5772 4.26392 11.5592 4.15729 11.5488C3.65283 11.5 3.14295 11.5696 2.63776 11.5205C2.20274 11.4782 1.84796 11.277 1.58795 10.9258C1.28834 10.5209 1.00864 10.0543 0.794982 9.59961C0.598644 9.18169 0.598598 8.75487 0.794982 8.33692C0.993688 7.91405 1.28889 7.54328 1.48737 7.1211C1.53567 7.01829 1.53593 6.98123 1.48737 6.87793C1.28887 6.45603 0.993667 6.08569 0.794982 5.66309C0.598535 5.24516 0.59869 4.81829 0.794982 4.40039C1.00898 3.94492 1.28922 3.47791 1.58795 3.07422C1.84796 2.723 2.20274 2.5218 2.63776 2.47949C3.14295 2.43038 3.65283 2.50003 4.15729 2.45117C4.26391 2.44081 4.29583 2.4228 4.35944 2.33692C4.64783 1.94742 4.84308 1.49557 5.1319 1.10547C5.39158 0.754835 5.74737 0.553005 6.1817 0.510744C6.71263 0.459147 7.28917 0.459309 7.81842 0.510744C8.25275 0.553005 8.60854 0.754835 8.86823 1.10547C9.157 1.49551 9.35204 1.94708 9.64069 2.33692C9.70429 2.4228 9.73621 2.44081 9.84283 2.45117C10.3477 2.50007 10.8573 2.43039 11.3624 2.47949C11.7974 2.5218 12.1522 2.723 12.4122 3.07422C12.7118 3.47909 12.9915 3.94567 13.2051 4.40039C13.4014 4.81829 13.4016 5.24516 13.2051 5.66309Z" fill="currentColor"></path><path d="M7.9317 7C7.9317 6.48569 7.51438 6.06836 7.00006 6.06836C6.48575 6.06836 6.06842 6.48569 6.06842 7C6.06842 7.51432 6.48575 7.93164 7.00006 7.93164C7.51438 7.93164 7.9317 7.51432 7.9317 7ZM9.13092 7C9.13092 8.17706 8.17712 9.13086 7.00006 9.13086C5.823 9.13086 4.8692 8.17706 4.8692 7C4.8692 5.82294 5.823 4.86914 7.00006 4.86914C8.17712 4.86914 9.13092 5.82294 9.13092 7Z" fill="currentColor"></path></g><defs><clipPath id="clip0_2580_121189"><rect width="14" height="14" fill="currentColor"></rect></clipPath></defs></svg>`;

    if (typeof document !== "undefined") {
      let tag = document.querySelector('style[data-plugin-css="dsh-plugin-ui-tweaks"]');
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.pluginCss = "dsh-plugin-ui-tweaks";
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    // The utilities row exists per route and re-mounts on navigation, so watch
    // rather than install once. Clicks proxy to the real Settings trigger.
    // Install is idempotent; the observer stays alive because a remount drops
    // the injected button — disconnecting after the first success loses it.
    function install() {
      const utils = document.querySelector(".wSkVaW_headerUtilities");
      if (!utils) return;
      if (utils.querySelector("[data-dshut-settings]")) return;
      const cog = document.createElement("button");
      cog.type = "button";
      cog.className = "dshut-icon-btn";
      cog.dataset.dshutSettings = "1";
      cog.title = "Settings";
      cog.setAttribute("aria-label", "Settings");
      cog.innerHTML = COG_SVG;
      cog.addEventListener("click", () => {
        // Lift the settingsArea hide long enough for the modal to open, then
        // restore the rule only after the dialog actually closes. Restoring
        // on a timer would close it again.
        const tag = document.querySelector('style[data-plugin-css="dsh-plugin-ui-tweaks"]');
        const original = tag?.textContent ?? "";
        if (tag) tag.textContent = original.replace(".hHd-Xa_settingsArea{display:none !important}", "");
        let seenDialog = false;
        const observer = new MutationObserver(() => {
          const dialog = document.querySelector("[role='dialog']");
          if (dialog) seenDialog = true;
          else if (seenDialog) {
            if (tag) tag.textContent = original;
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelector(".VOzbGW_trigger")?.click();
        // Safety: if no dialog ever mounts, restore after 1s so the rule still works next time.
        window.setTimeout(() => {
          if (!seenDialog && tag) tag.textContent = original;
          observer.disconnect();
        }, 1000);
      });
      utils.appendChild(cog);
    }

    const BLURBS = {"byShort":{"cordis":"Meta-Framework for Modern JavaScript Applications","group":"Nests plugins into a cordis group","hmr":"Hot-reloads plugins while you develop","include":"Pull extra files into the cordis config","loader":"Loads and wires cordis plugins","timer":"Schedules timers in the plugin runtime","cosmokit":"A collection of common utilities","dsh":"dsh CLI: profile boot, plugin management, and the browser UI alias","agent":"Agent interface, registry, initiator scope, and event vocabulary","agent-default-model":"Default model selection shared by Agent entry points","agent-instructions":"Workspace context loader for AGENTS.md/CLAUDE.md instruction files","agent-loop":"The concrete agent loop plugin","agent-presets":"Per-session agent composition from preset cordis.yml files","agent-tool-presentation":"Agent-plane presentation selector: composes one agent's tools as Code Mode, native, or both","anonymous-user-id":"Shared anonymous user identity telemetry and feedback correlation","api-gateway":"HTTP/WebSocket gateway into the host","api-remotes":"Remote BFF assembly and Host Agent/Session lookup policy","app-boot":"Shared boot glue for the app bins: .env loading, fail-loud Loader guards, snapshot-aware…","atomic-write":"Zero-dependency atomic file replacement: exclusive-create random-suffix temp + rename…","attachment":"Durable immutable attachment storage","attachment-local":"Private content-addressed DSH_HOME attachment storage","base":"The shared dsh core as a profile bundle: every profile's first patch layer, inserting the…","bash-local":"Local-subprocess implementation of the DeepSeek Harness bash executor","bash-sandbox":"Sandbox-consuming implementation of the DeepSeek Harness bash executor","brand":"Type-only Branded<B> nominal-typing primitive","connection":"Wire consumer layer: HTTP-up/WebSocket-down client, ConnectionController dual streams with…","locale":"Locale plugin: Host-backed zh/en preference, browser-derived fallback, locale snapshots, and…","modules":"Client module system, dual-face: node half composes the __DSH_BOOT__ entry graph…","runtime":"Client core services: SlotRegistry, SessionRuntime (scope tree + object layer)","schema-form":"Schema/draft model layer for settings editors: rehydrates a serialized schemastery schema,…","ui-agent-preset":"Agent-preset surfaces: the default for later sessions, this session's seat, and the…","ui-attachment":"Pure React attachment atoms: draft-image rail, message image gallery, and original-image…","ui-commands":"Client command surface: global directory cache, '/' source, three command UI kinds,…","ui-conversation":"Chat transcript, composer, and message flow","ui-cordis":"Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch","ui-deliverables":"Produced-files turn tail and clickable final-response file references for Web","ui-directory-picker-browse":"In-app directory browsing surface: the workspace directory-flow owner rendering the host's…","ui-directory-picker-native":"Native directory-picker surface: the renderless workspace directory-flow occupant driving…","ui-goal":"Session goal surface: GoalBar docked above the composer, read from the goal session projection","ui-input-trigger":"Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered…","ui-jobs":"Session-header background-job list: live registry state mirrored from session/jobs frames","ui-layout":"Three-column app shell and panel layout","ui-message-feedback":"Per-message feedback controls contributed to the assistant-message action strip, backed by…","ui-model-selection":"Model selection: the /model popupSelect over session.models / session.selectModel","ui-permission-presets":"Permission surfaces: a new-session default in General settings and a current-session…","ui-plan":"Plan-mode composer control: the conversation.input.plan seat over the plan projection and…","ui-primitives":"Pure React atoms: controls, icons, markdown, and JSON inspectors (zero cordis)","ui-settings":"Settings domain base plugin: the settings-namespace scope service and the canonical settings…","ui-settings-general":"Settings ownerless-copy and product onboarding plugin: the General section, shell…","ui-settings-models":"Models settings and shared product-onboarding dialogs over existing settings and credential…","ui-settings-plugin-inventory":"This Plugin list tab","ui-settings-plugins":"Plugins settings section with feature-owned tabs and configurable host-plane plugin cards","ui-sidebar":"Session tree, search, and grouping","ui-skill":"Web skill references and the dedicated skill tool row","ui-slots":"Slot registry pure core: SlotMap declaration merging, single register composition API,…","ui-subagent":"Subagent conversation catalog, continuation routing UI, and '@' reference source","ui-theme":"Light, dark, and system appearance","ui-tool":"Client Tool call-tree renderer and keyed per-tool presentation slot","ui-trajectory":"Trajectory event ledger with an interactive timing overview: pure-consumer plugin…","ui-user-questions":"Web ask_user_question feature: host tool mount plus composer-takeover question UI","ui-workflow-run":"Durable workflow-run Conversation Node and nested member disclosure for dsh web","ui-workspace":"Workspace picker plugin: one WorkspacePicker registered into the sidebar and empty-state…","web":"Web search and fetch for the agent","web-react":"Shell-side React glue: createSlotRenderer, SessionProvider, bindSnapshotSelector (uSES…","cmdline":"Immutable command-line handoff from a dsh launcher to any app plugin that injects cmdlineArgs","code-runtime":"code-execution","code-runtime-worker-thread":"Worker-thread implementation of the DeepSeek Harness code-execution","command-compact":"Human-facing slash command for explicit session compaction","command-feedback":"Log-only session feedback producer and human-facing slash command","command-goal":"Human-facing slash command for persisted same-session goals","commands":"Plugin-owned human command registry UIs","compaction":"compaction service","compaction-basic":"Token-meter-driven compaction policy and LLM summarization backend","compaction-tool-result-pruner":"Replay-safe model-free head/middle/tail pruning for tool-result surface nodes","cordis-client-runner":"Browser half of dynamic dual-half plugin packages: event subscription, closure evaluation,…","cordis-host-runner":"Dynamic package definition registry, host-half sandbox lifecycle, and invoke handler table…","credentials":"credential settings carry references to secrets, providers own the values","credentials-local":"File-backed credentials provider ($DSH_HOME/.env under the live process environment)","fs":"filesystem capability — vocabulary types, the FileSystem service (text IO + optional…","fs-local":"Local-filesystem implementation of the DeepSeek Harness filesystem","fs-observation-policy":"File-context policy plugin — observed-state, read-before-edit, and version-guarded…","fs-sandbox":"Sandbox-enforcing implementation of the DeepSeek Harness filesystem fences write/edit by the…","goal":"Event-sourced same-session goal state and lifecycle service","goal-round-driver":"Race-fenced same-session goal-round driver","headless":"The dsh one-shot bundle: a direct core Agent/Session runner over dsh-base with no Host,…","home-paths":"Shared filesystem path helpers","apiproxy":"API gateway: the ApiProxy contract (api/), the fetch carrier pair (fetch/), and the…","directory-picker":"workspace-directory picking","directory-picker-auto":"Adaptive chooser of the directory-picker resolves the host situation at boot and mounts the…","directory-picker-browse":"In-app browsing backend of the directory-picker (listing/creation primitives over the host…","directory-picker-native":"Native-OS-chooser backend of the directory-picker","frontend-static":"SPA dist server for the Web shell: owns the webserver fallback seat, serving the built…","plugin-inventory":"Read-only Remote projection of current Cordis Loader plugin state","webserver":"Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static…","invariants":"Registry service for package-owned DeepSeek Harness runtime invariants","jobs":"Background job registry — shared ids, owner isolation, polling, cancellation, and completion…","jobs-local":"Process-local implementation of the DeepSeek Harness background job registry","launch-environment":"Immutable DeepSeek Harness launch environment that records which layer supplied each value","llm":"Provider-neutral language-model service","llm-deepseek":"DeepSeek chat-completions adapter LLM","llm-pi-ai":"pi-ai-backed DeepSeek adapter LLM (design-verification twin of dsh-llm-deepseek)","llm-retry":"Provider-routed LLM request retry policy","mcp-client":"MCP client bridge: connects to MCP servers and registers their tools on ctx.tools","message-feedback":"Lifecycle-bound per-message rating and note sidecar","native-command":"Zero-dependency no-shell execFile runner for host-native OS integrations: utf8 stdio…","output-retention":"Zero-dependency bounded-retention primitive: ItemRetainer/TextRetainer + neutral notice…","permission-presets":"User-facing permission presets: one product-level Permissions select bundling the…","persona":"Composition-authored deployment persona section","plan-mode":"Logged per-agent plan mode with deployment guidance, a direct slash command, and a…","pwsh-local":"Local PowerShell implementation of the DeepSeek Harness bash executor","pwsh-sandbox":"Sandbox-consuming implementation of the DeepSeek Harness PowerShell executor","repeat-tool-reminder":"Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls","sandbox":"process-sandbox same-world confinement vocabulary and the SandboxProvider contract","sandbox-local":"Local process-sandbox backends sandbox bwrap, the npm-distributed landlock-run launcher,…","sandbox-policy":"Per-call sandbox policy resolver and current model context: deployment fallbacks plus each…","sandbox-windows-acl":"Windows ACL write-restriction sandbox backend (restricted-token spawn with capability-SID…","schedule":"Agent-scoped durable after, at, and fixed-rate reminders over the session event log","scope":"Scoped-context registration primitive (scope tags, scope-filtered event dispatch)","session":"Event log that stores the conversation","session-checkpoint-policy":"Semantic session durability checkpoints before model requests and tool side effects","session-log-export":"Web Session-log export command and shared download dialog","session-persistence":"durable session persistence","session-persistence-jsonl":"JSONL durable session persistence backend","session-projection":"Session-projection the merge-extensible projection type table, the provider contract, and…","session-projection-cache":"Persisted projection cache: durable per-session projection checkpoints over the domain data…","session-query":"Combined session query service contract with concrete reads, traces, and filters","session-query-sqlite":"Concrete ctx.sessionQuery backend with SQLite FTS5 search","session-reference":"Cross-session snapshot references and durable untrusted model context","session-stats":"Whole-log conversation counts and wall times projection (sessionStats)","session-telemetry":"SessionTelemetryBackend session-event capture, projection, redaction, and handoff to a…","session-telemetry-otel":"OpenTelemetry backend telemetry hands captured session records to the OTel JS SDK's log pipeline","session-title":"Log-backed session title service and provider registry","session-title-first-prompt-llm":"First-message LLM provider plugin session titles","session-title-llm":"Shared LLM generation policy session-title providers","settings":"user-settings","settings-file":"File-backed settings provider (settings.yaml)","shell":"bash executor","shell-env":"Tool-independent managed DSH_* shell environment registry","skill":"Agent skill provider registry","skill-badge":"Bundled dsh badge skill provider","skill-filesystem":"Local filesystem skill provider","spill":"spill storage — save oversized tool text and return a retrieval locator","spill-local":"Local-filesystem implementation of the DeepSeek Harness spill storage (private…","spill-policy":"Tool-result spill policy — replaces oversized plain-text tool results with a retained…","storage":"Storage hub: named backend registry plus mounted data-form facilities","storage-domain":"Domain data form: schema-validated, event-emitting KV domains over storage backends","storage-json":"JSON file KV storage backend storage hub","subagent":"subagent named-provider registry for delegating to child agents","subagent-fork-in-process":"In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log","subagent-in-process-driver":"Shared in-process subagent run driver: drives a child agent on ctx.agents (used by the spawn…","subagent-spawn-in-process":"In-process spawn subagent backend: runs a fresh child agent on ctx.agents","subprocess":"Subprocess — managed process groups, bounded spill-backed output, and escalated kills behind…","subprocess-local":"Local-subprocess implementation of the DeepSeek Harness subprocess","system-prompt":"System prompt assembly registry","terminal":"Persistent PTY session — owner-scoped ids, backend registry, interactive sends, reads,…","terminal-bash":"Persistent shell PTY backend over the DeepSeek Harness subprocess terminal primitive","time-context":"Opt-in durable per-step context with the current time and elapsed time","timeout":"Zero-dependency timeout/deadline primitive: clampTimeout, deadline, timeoutOf, TimeoutReason…","tmux-context":"Opt-in durable per-step context with this agent's tmux pane and window location","token-meter":"Replay-aware token measurement service","tool-ask-user":"Model-facing ask_user_question tool over the ctx.userQuestions","tool-bash":"Model-facing bash tool with optional generic background-job and sandbox-escalation support","tool-bash-persistent":"Model-facing owner-scoped persistent Bash tool backed by the Harness PTY service","tool-call-timeout-policy":"Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on…","tool-cordis":"Self-referential cordis toolset: inspect the live runtime, mount and dispose model-written…","tool-fs":"Model-facing filesystem tools (read, write, edit) over the DeepSeek Harness filesystem","tool-fs-search":"Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary…","tool-goal":"Model-facing same-session goal tools with execution-time authority checks","tool-jobs":"Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs…","tool-pwsh":"Model-facing pwsh tool over the bash executor","tool-ralph":"Model-facing fresh-agent Ralph loop over the workflow and subagents","tool-skill":"Model-facing skill loading tool","tool-str-replace-editor":"Model-facing view, create, literal replace, and line insert tool over the Harness filesystem…","tool-subagent":"Model-facing subagent delegation tool over the ctx.subagents","tool-subagent-control":"Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents…","tool-subagent-report":"Child-scoped report tool over ctx.subagents continuations","tool-todo":"Model-facing todo_write tool over the DeepSeek Harness event-sourced session log","tool-web":"Model-facing web tools (web_search, web_fetch) over the DeepSeek Harness web capability","tool-workflow":"Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine","tools":"Tool registry and execution pipeline","typert-loader":"Loader integration for generated Typert package contributions","typert-protocol":"Compiler-independent Remote metadata and Typert provider protocols","typert-registry":"Runtime registry for generated schemas","user-approval":"User-approval one-shot permission decisions dispatched to composed answerers over the…","user-questions":"Lets the agent ask you questions mid-run","web-app":"The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue…","web-frontend":"Web application entry: vite build over the @deepseek-ai/dsh-client-web shell library; dist/…","web-search-deepseek":"DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) web…","workflow":"Workflow capability ctx.workflowEngine service, run vocabulary, and workflow/* events","workflow-worker-thread":"worker-thread workflow engine: executes model-written orchestration scripts off the host…","workspace":"Workspace entity registry: durable workspace records with validated session attachment over…","node-addon-landlock-run":"Landlock self-restrict-then-exec launcher for sandboxing subprocesses on Linux: per-platform…","schemastery":"Type driven schema validator","live-stats":"Live token estimates and generation speed","memos-local-plugin":"Layered memory that persists across sessions","plugin-skillcard":"Wears skill, soul, and role cards in the session","plugin-skillpress":"Author and stamp skill, persona, and role cards","plugin-themes":"Extra colour themes in General settings","plugin-vault":"Search, read, and list an Obsidian vault","plugin-board":"A board the agent can read and post to","plugin-catalog":"Browse and install plugins from the hub","plugin-chat-density":"Makes chat text one size smaller","plugin-resend":"Resend a turn or regenerate from that point","plugin-ui-tweaks":"Header settings cog and small chrome cleanups"},"byModule":{"@deepseek-ai/dsh-client-hmr":"Dev-only hot reload for the web client","@deepseek-ai/dsh-web":"Web search and fetch for the agent","@deepseek-ai/cordis-plugin-hmr":"Hot-reloads cordis plugins while you develop","@deepseek-ai/dsh-client-web":"Boots the web shell and app root"}};

    function shortName(moduleName) {
      return (moduleName.startsWith("@") ? moduleName.slice(moduleName.indexOf("/") + 1) : moduleName)
        .replace(/^cordis:/, "")
        .replace(/^cordis-plugin-/, "")
        .replace(/^dsh-(?:host-|client-)?/, "");
    }

    function kindOf(moduleName) {
      if (
        moduleName.startsWith("@deepseek-ai/") ||
        moduleName.startsWith("cordis:") ||
        moduleName.startsWith("cordis-plugin-")
      ) return "shipped";
      return "added";
    }

    function humanize(id) {
      return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function describe(moduleName) {
      if (BLURBS.byModule[moduleName]) return BLURBS.byModule[moduleName];
      const short = shortName(moduleName);
      if (BLURBS.byShort[short]) return BLURBS.byShort[short];
      const label = humanize(short);
      if (moduleName.includes("dsh-client-ui-")) return "Web UI: " + label;
      if (moduleName.includes("dsh-host-")) return "Host service: " + label;
      if (moduleName.includes("dsh-command-")) return "Slash command: " + label;
      if (moduleName.startsWith("dsh-plugin-")) return "Profile plugin: " + label;
      if (moduleName.startsWith("@") && !moduleName.startsWith("@deepseek-ai/")) {
        return "Installed package: " + label;
      }
      return "Harness module: " + label;
    }

    let plugFilter = "all";
    const enabledLocal = new Map();
    const pendingToggle = new Set();
    const PROTECTED_IDS = new Set([
      "include", "webserver", "web-startup", "web-runtime", "api-gateway", "typert-gateway",
      "typert", "typert-loader", "modules", "client-runtime", "connection",
      "api-remotes", "ui-layout", "ui-settings", "ui-settings-plugins",
      "ui-settings-plugin-inventory", "plugin-inventory", "plugin-ui-tweaks",
      "timer", "settings",
    ]);

    function isProtected(entryId) {
      const id = String(entryId);
      const row = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
      return PROTECTED_IDS.has(id) || PROTECTED_IDS.has(row);
    }

    function paintToggle(btn, enabled, locked, name) {
      btn.setAttribute("role", "switch");
      btn.setAttribute("aria-checked", enabled ? "true" : "false");
      btn.setAttribute("aria-label", (enabled ? "Disable " : "Enable ") + name);
      if (btn.textContent) btn.textContent = "";
      btn.disabled = locked || pendingToggle.has(btn.dataset.entryId);
      if (locked) {
        btn.title = "Required to keep the GUI and Plugin list working";
      } else {
        btn.title = enabled ? "Disable this plugin" : "Enable this plugin";
      }
    }

    async function togglePlugin(entryId, enabled) {
      pendingToggle.add(entryId);
      decoratePlugins();
      try {
        const response = await fetch("/dsh-plugin-ui-tweaks/set-enabled", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entryId, enabled }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || response.statusText);
        enabledLocal.set(entryId, enabled);
      } catch (error) {
        enabledLocal.delete(entryId);
        window.alert(String(error?.message ?? error));
      } finally {
        pendingToggle.delete(entryId);
        decoratePlugins();
      }
    }

    function syncToggle(card) {
      const entryId = card.getAttribute("data-plugin-entry") || "";
      if (!entryId) return;
      const tag = card.querySelector("[data-enabled]");
      const fromTag = tag?.getAttribute("data-enabled") === "true";
      const enabled = enabledLocal.has(entryId) ? enabledLocal.get(entryId) : fromTag;
      const locked = isProtected(entryId);
      let btn = card.querySelector(":scope > .dshut-plug-toggle");
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dshut-plug-toggle";
        btn.dataset.entryId = entryId;
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (btn.disabled) return;
          void togglePlugin(entryId, btn.getAttribute("aria-checked") !== "true");
        });
        const expand = card.querySelector(":scope > button:not(.dshut-plug-toggle)");
        card.insertBefore(btn, expand ? expand.nextSibling : null);
      }
      const name = card.querySelector("strong")?.textContent?.trim() || "plugin";
      paintToggle(btn, enabled, locked, name);
    }

    function bindCardExpand(card) {
      if (card.dataset.dshutExpand === "1") return;
      card.dataset.dshutExpand = "1";
      card.addEventListener("click", (event) => {
        if (event.target.closest(".dshut-plug-toggle")) return;
        const expand = card.querySelector(":scope > button:not(.dshut-plug-toggle)");
        if (!expand) return;
        if (expand === event.target || expand.contains(event.target)) return;
        if (event.target.closest("[data-plugin-entry] > :not(button)")) return;
        expand.click();
      });
    }

    function decoratePlugins() {
      const cards = document.querySelectorAll("[data-plugin-entry]");
      if (cards.length === 0) return;
      for (const card of cards) {
        const moduleName = card.querySelector("[title]")?.getAttribute("title") || "";
        if (moduleName) {
          const kind = kindOf(moduleName);
          const origin = kind === "shipped" ? "Shipped" : "Added";
          const desc = describe(moduleName);
          card.dataset.dshutKind = kind;
          card.dataset.dshutOrigin = origin;
          card.dataset.dshutDesc = desc;
          card.dataset.dshutReady = "1";
        }
        syncToggle(card);
        bindCardExpand(card);
      }
      const ul = cards[0].closest("ul");
      const catalog = ul?.parentElement;
      if (!catalog) return;
      catalog.dataset.dshutPlugFilter = plugFilter;
      let bar = catalog.querySelector("[data-dshut-plug-filters]");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "dshut-plug-filters";
        bar.dataset.dshutPlugFilters = "1";
        bar.setAttribute("role", "radiogroup");
        bar.setAttribute("aria-label", "Plugin origin");
        catalog.insertBefore(bar, ul);
      }
      let shipped = 0;
      let added = 0;
      for (const card of catalog.querySelectorAll("[data-plugin-entry]")) {
        if (card.dataset.dshutKind === "added") added += 1;
        else shipped += 1;
      }
      const total = shipped + added;
      const items = [
        ["all", "All", total],
        ["shipped", "Shipped", shipped],
        ["added", "Added", added],
      ];
      if (bar.childElementCount !== items.length) {
        bar.replaceChildren();
        for (const [id, label] of items) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.kind = id;
          btn.setAttribute("role", "radio");
          btn.addEventListener("click", () => {
            plugFilter = id;
            decoratePlugins();
          });
          bar.appendChild(btn);
        }
      }
      for (const [id, label, count] of items) {
        const btn = bar.querySelector(`[data-kind="${id}"]`);
        if (!btn) continue;
        const next = label + " " + count;
        if (btn.textContent !== next) btn.textContent = next;
        const checked = plugFilter === id ? "true" : "false";
        if (btn.getAttribute("aria-checked") !== checked) {
          btn.setAttribute("aria-checked", checked);
        }
      }
      let split = ul.querySelector(":scope > .dshut-plug-split");
      const showSplit = plugFilter === "all" && added > 0 && shipped > 0;
      if (!showSplit) {
        split?.remove();
      } else {
        if (!split) {
          split = document.createElement("li");
          split.className = "dshut-plug-split";
          split.setAttribute("role", "presentation");
          ul.appendChild(split);
        }
        const label = "Shipped " + shipped;
        if (split.textContent !== label) split.textContent = label;
      }
    }

    if (typeof document !== "undefined") {
      let scheduled = false;
      const kick = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          install();
          decoratePlugins();
        });
      };
      const observer = new MutationObserver(() => kick());
      observer.observe(document.body, { childList: true, subtree: true });
      kick();
    }

    function apply() {}
    module.exports.apply = apply;
    module.exports.inject = [];
    return module.exports;
  },
});
