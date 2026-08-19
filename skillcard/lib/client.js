window.__ModuleLoader__.load({
  id: "dsh-plugin-skillcard",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    const { createPortal } = require("react-dom");

    const AGENTS_KEY = "dsh-plugin-skillcard:agents";

    function readWornJson(key) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        if (parsed && typeof parsed.name === "string" && parsed.name) return parsed;
      } catch { /* ignore */ }
      return null;
    }

    function layerSnapshot(row) {
      if (!row || typeof row.name !== "string" || !row.name) return null;
      return {
        name: row.name,
        description: typeof row.description === "string" ? row.description : "",
        thumb: row.thumb && String(row.thumb).startsWith("data:") ? row.thumb : null,
      };
    }

    function newAgentId() {
      return `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function makeAgent(soul, role) {
      return { id: newAgentId(), soul: layerSnapshot(soul), role: layerSnapshot(role) };
    }

    function saveAgentRoster(roster) {
      try {
        localStorage.setItem(AGENTS_KEY, JSON.stringify({
          activeId: roster.activeId,
          agents: roster.agents.map((row) => ({
            id: row.id,
            soul: layerSnapshot(row.soul),
            role: layerSnapshot(row.role),
          })),
        }));
      } catch { /* ignore */ }
    }

    function emitAgentRoster(roster) {
      saveAgentRoster(roster);
      window.dispatchEvent(new CustomEvent("dsh-agents-changed", {
        detail: { activeId: roster.activeId, agents: roster.agents },
      }));
    }

    function loadAgentRoster() {
      try {
        const parsed = JSON.parse(localStorage.getItem(AGENTS_KEY) || "null");
        if (parsed && Array.isArray(parsed.agents) && parsed.agents.length) {
          const agents = parsed.agents.map((row) => ({
            id: typeof row.id === "string" && row.id ? row.id : newAgentId(),
            soul: layerSnapshot(row.soul),
            role: layerSnapshot(row.role),
          }));
          const activeId = agents.some((row) => row.id === parsed.activeId)
            ? parsed.activeId
            : agents[0].id;
          return { agents, activeId };
        }
      } catch { /* migrate from the old single wear */ }
      const agent = makeAgent(
        readWornJson("dsh-plugin-persona:worn"),
        readWornJson("dsh-plugin-roles:worn"),
      );
      const roster = { agents: [agent], activeId: agent.id };
      saveAgentRoster(roster);
      return roster;
    }

    function activeAgentOf(roster) {
      return roster.agents.find((row) => row.id === roster.activeId) || roster.agents[0];
    }

    // Per-session wear memory: changing soul/role inside a session sticks to
    // that session. Switching back (or returning later) re-applies what was
    // worn there. Sessions without a record keep the current global wear.
    const WEAR_SESSIONS_KEY = "dsh-plugin-wear:sessions";
    const CURRENT_SESSION_KEY = "dsh.sessions.current";

    function currentSessionId() {
      try {
        return JSON.parse(localStorage.getItem(CURRENT_SESSION_KEY) || "null")?.sessionId ?? null;
      } catch {
        return null;
      }
    }

    function wearSessions() {
      try {
        return JSON.parse(localStorage.getItem(WEAR_SESSIONS_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function snapshotWearForSession() {
      const sid = currentSessionId();
      if (!sid) return;
      const map = wearSessions();
      map[sid] = {
        soul: readWornJson("dsh-plugin-persona:worn")?.name ?? null,
        role: readWornJson("dsh-plugin-roles:worn")?.name ?? null,
        at: Date.now(),
      };
      try {
        localStorage.setItem(WEAR_SESSIONS_KEY, JSON.stringify(map));
      } catch { /* storage full — wear memory just stops growing */ }
    }

    function restoreWearForSession(sid) {
      const entry = wearSessions()[sid];
      if (!entry) return;
      const soul = readWornJson("dsh-plugin-persona:worn")?.name ?? null;
      const role = readWornJson("dsh-plugin-roles:worn")?.name ?? null;
      const wear = (api, name) => {
        // Name-only re-wear: the host rebuilds from its stored folder, so this
        // works even when the card is not in the gallery.
        return fetch(`${api}/wear`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        }).then(async (res) => {
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `${res.status}`);
        });
      };
      if ((entry.soul ?? null) !== soul) {
        const apply = entry.soul
          ? wear("/dsh-plugin-persona", entry.soul)
          : fetch("/dsh-plugin-persona/unequip", { method: "POST" });
        void apply.then(() => {
          window.dispatchEvent(new CustomEvent("dsh-persona-changed", { detail: { name: entry.soul ?? null } }));
        }).catch(() => {});
      }
      if ((entry.role ?? null) !== role) {
        const apply = entry.role
          ? wear("/dsh-plugin-roles", entry.role)
          : fetch("/dsh-plugin-roles/unequip", { method: "POST" });
        void apply.then(() => {
          window.dispatchEvent(new CustomEvent("dsh-roles-changed", { detail: { name: entry.role ?? null } }));
        }).catch(() => {});
      }
    }

    if (typeof window !== "undefined" && !window.__dshWearSessionsInit) {
      window.__dshWearSessionsInit = true;
      window.addEventListener("dsh-persona-changed", snapshotWearForSession);
      window.addEventListener("dsh-roles-changed", snapshotWearForSession);
      let lastSid = currentSessionId();
      // Page reload: re-apply whatever the current session was wearing.
      if (lastSid) restoreWearForSession(lastSid);
      window.setInterval(() => {
        const sid = currentSessionId();
        if (!sid || sid === lastSid) return;
        lastSid = sid;
        restoreWearForSession(sid);
      }, 1000);
    }

    function typingAway(target) {
      if (!target || !(target instanceof Element)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return Boolean(target.closest("[contenteditable='true']"));
    }

    const { PersonaSeat } = (() => {
    const STORAGE_KEY = "dsh-plugin-persona:worn";
    const API = "/dsh-plugin-persona";
    const EMPTY = "Empty soul. Drop a persona PNG, or click to pick one.";

    const css = `
.dshwear-marker{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
.dshwear-host{box-sizing:border-box;flex:none;position:relative;min-width:0;margin:0 2px 8px}
.dshwear-seat{position:relative;width:100%;aspect-ratio:1;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);overflow:visible}
.dshwear-slot{box-sizing:border-box;display:block;width:100%;height:100%;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:50%;cursor:pointer;overflow:hidden;color:inherit;font:inherit;background:var(--dsw-alias-button-elevated-fill);transition:background-color .12s ease,box-shadow .12s ease,border-color .12s ease}
.dshwear-slot:hover{background:var(--dsw-alias-button-floating-hover);border-color:var(--dsw-alias-state-business-primary)}
.dshwear-slot:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshwear-slot[data-empty="1"]{cursor:copy;background:transparent}
.dshwear-slot[data-over="1"]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent)}
.dshwear-slot[data-busy="1"]{opacity:.7}
.dshwear-face{width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;pointer-events:none}
.dshwear-empty{position:absolute;inset:12%;border:1px dashed var(--dsw-alias-border-l2);border-radius:50%;pointer-events:none;box-sizing:border-box}
.dshwear-empty:after{content:"";position:absolute;left:50%;top:50%;width:18%;height:18%;margin:0;transform:translate(-50%,-50%);border-radius:50%;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent)}
.dshwear-unequip{position:absolute;top:-4px;right:-4px;z-index:1;width:20px;height:20px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:18px;cursor:pointer;opacity:0;transition:opacity .12s ease}
.dshwear-cycle{position:absolute;top:50%;transform:translateY(-50%);z-index:1;width:18px;height:18px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:16px;cursor:pointer;opacity:0;transition:opacity .12s ease}
.dshwear-cycle.prev{left:-8px}
.dshwear-cycle.next{right:-8px}
.dshwear-seat:hover .dshwear-cycle,.dshwear-cycle:focus-visible{opacity:1}
.dshwear-seat:hover .dshwear-unequip,.dshwear-slot:focus-visible + .dshwear-unequip,.dshwear-unequip:focus-visible{opacity:1}
.dshwear-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.dshwear-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.dshwear-host[data-wide="0"]{margin:0 0 12px;width:36px}
.dshwear-host[data-wide="0"] .dshwear-seat{width:36px;height:36px;aspect-ratio:auto}
.dshwear-host[data-wide="0"] .dshwear-slot{background:transparent;border-color:transparent}
.dshwear-host[data-wide="0"] .dshwear-slot[data-empty="1"]{border-color:var(--dsw-alias-border-l2)}
.dshwear-host[data-wide="0"] .dshwear-empty{inset:4px}
.dshwear-host[data-wide="0"] .dshwear-unequip{top:-6px;right:-6px;width:16px;height:16px;font-size:11px;line-height:14px}
.dshwear-host[data-wide="0"] [data-dsh-role-chip]{display:none}
.dshwear-loadout{position:fixed;inset:0;z-index:86;display:flex;justify-content:flex-start;align-items:stretch;padding:0;background:color-mix(in srgb,var(--dsw-alias-bg-base) 48%,transparent)}
.dshwear-sheet{box-sizing:border-box;width:min(560px,calc(100vw - 28px));height:100%;max-height:100%;margin:0;padding:20px 20px 28px;overflow:auto;overscroll-behavior:contain;border:0;border-right:1px solid var(--dsw-alias-border-l2);border-radius:0 16px 16px 0;background:var(--dsw-alias-bg-layer-2);box-shadow:16px 0 48px color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent);color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px;font-family:var(--dsw-font-family,inherit)}
.dshwear-sheet-head{display:flex;align-items:center;gap:8px;min-width:0;position:sticky;top:-20px;z-index:1;margin:-20px -20px 0;padding:16px 20px 12px;background:var(--dsw-alias-bg-layer-2)}
.dshwear-sheet-head h2{margin:0;flex:none;font:inherit;font-size:16px;font-weight:600}
.dshwear-pager{display:flex;align-items:center;gap:4px;min-width:0}
.dshwear-pager button,.dshwear-sheet-tools button{flex:none;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:inherit;border-radius:8px;font:inherit;font-size:13px;cursor:pointer}
.dshwear-pager button{width:32px;padding:0}
.dshwear-pager button:hover,.dshwear-sheet-tools button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshwear-pager button:disabled,.dshwear-sheet-tools button:disabled{opacity:.45;cursor:default}
.dshwear-pager-idx{min-width:3.2em;font-size:12px;color:var(--dsw-alias-label-secondary);text-align:center}
.dshwear-sheet-tools{display:flex;align-items:center;gap:6px;margin-left:auto;flex:none}
.dshwear-agent-name{margin:0;font-size:18px;font-weight:600;line-height:24px}
.dshwear-agent{display:flex;flex-direction:column;gap:16px;padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-3) 82%,transparent)}
.dshwear-agent .dshwear-kit{padding:0;border:0;border-radius:0;background:transparent;gap:10px}
.dshwear-agent .dshwear-kit + .dshwear-kit{padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2)}
.dshwear-sheet-kicker{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.dshwear-row{display:grid;grid-template-columns:88px minmax(0,1fr);gap:4px 14px;align-items:center;padding:0 0 12px}
.dshwear-sheet-portrait{position:relative;width:88px;height:88px}
.dshwear-sheet-soul{width:88px;height:88px;padding:0;border-radius:50%}
.dshwear-copy{min-width:0;display:flex;flex-direction:column;gap:4px}
.dshwear-copy-name{margin:0;font-size:15px;font-weight:600;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshwear-copy-def{margin:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dshwear-copy-desc{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.dshwear-sheet .dshr-host{margin:0;width:auto;display:grid;justify-content:stretch}
.dshwear-sheet .dshr-seat{width:88px;max-width:88px;aspect-ratio:1}
.dshwear-kit{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-3) 82%,transparent)}
.dshwear-kit .dshwear-copy-name{font-size:15px}
.dshwear-kit-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dshwear-kit-head .dshwear-sheet-kicker{margin:0}
.dshwear-kit-act{flex:none;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.dshwear-kit-act:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshwear-kit-act:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshwear-kit-act[disabled]{opacity:.55;cursor:default}
.dshwear-kit-act[data-kind="remove"]{font-weight:500;color:var(--dsw-alias-label-secondary)}
.dshwear-kit-empty{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshwear-addwrap{position:relative}
.dshwear-sheet .dshr-host:empty{display:none;margin:0;padding:0;min-height:0}
[data-dsh-loadout-skills]{min-height:72px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
[data-dsh-loadout-skills] .dshsb-slots{display:grid;grid-template-columns:repeat(8,48px);gap:10px 8px;justify-content:center;max-width:none;margin:8px 0 0}
@media (max-width:540px){
  .dshwear-sheet{width:100%;border-radius:0;border-right:0}
  [data-dsh-loadout-skills] .dshsb-slots{grid-template-columns:repeat(4,48px)}
}
@media (prefers-reduced-motion:reduce){
  .dshwear-slot,.dshwear-unequip{transition:none}
}
`;

    if (typeof document !== "undefined") {
      let tag = document.querySelector('style[data-plugin-css="dsh-plugin-persona"]');
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.pluginCss = "dsh-plugin-persona";
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    function loadLocal() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.name === "string") return parsed;
      } catch { /* ignore */ }
      return null;
    }

    function saveLocal(row) {
      try {
        if (!row) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          name: row.name,
          description: row.description || "",
          thumb: row.thumb && String(row.thumb).startsWith("data:") ? row.thumb : null,
        }));
      } catch { /* ignore */ }
    }

    function bytesToAscii(bytes) {
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return s;
    }

    function extractSkillPayload(png) {
      if (png.length < 24 || png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
        throw new Error("Not a PNG. Chat/Discord often convert cards to JPEG and strip the skill.");
      }
      const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
      let pos = 8;
      while (pos + 12 <= png.length) {
        const length = view.getUint32(pos);
        if (pos + 12 + length > png.length) break;
        const type = bytesToAscii(png.subarray(pos + 4, pos + 8));
        const data = png.subarray(pos + 8, pos + 8 + length);
        if (type === "tEXt") {
          const nul = data.indexOf(0);
          if (nul > 0 && bytesToAscii(data.subarray(0, nul)) === "skill") {
            return bytesToAscii(data.subarray(nul + 1));
          }
        }
        if (type === "IEND") break;
        pos += 12 + length;
      }
      throw new Error("This PNG has no skill chunk. Mint it with Skillcard Press.");
    }

    async function gunzipB64(b64) {
      let bin;
      try {
        bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        throw new Error("Skill chunk is not valid base64");
      }
      if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser cannot gunzip skill cards");
      }
      const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
      const text = await new Response(stream).text();
      return JSON.parse(text);
    }

    function pngBlobUrl(pngBytes) {
      return URL.createObjectURL(new Blob([pngBytes], { type: "image/png" }));
    }

    async function makeThumb(pngBytes) {
      const url = pngBlobUrl(pngBytes);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("cover would not decode"));
          image.src = url;
        });
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const size = Math.min(1024, Math.max(512, Math.round(420 * dpr)));
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        const src = Math.min(img.width, img.height);
        const sx = (img.width - src) / 2;
        const sy = (img.height - src) / 2;
        ctx.drawImage(img, sx, sy, src, src, 0, 0, size, size);
        return canvas.toDataURL("image/jpeg", 0.92);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    function fileNames(files) {
      return Object.keys(files || {});
    }

    async function parseCard(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const card = await gunzipB64(extractSkillPayload(bytes));
      if (card.spec !== "skill_card_v1") {
        throw new Error(`Unsupported spec ${card.spec ?? "?"}`);
      }
      if (!card.name || !card.files || typeof card.files !== "object") {
        throw new Error("Card is missing name or files");
      }
      const names = fileNames(card.files);
      if (!names.includes("SOUL.md") && !names.includes("SKILL.md") && !names.includes("ROLE.md")) {
        throw new Error("Persona card needs SOUL.md");
      }
      const thumb = await makeThumb(bytes);
      return {
        name: String(card.name).trim(),
        description: String(card.description ?? "").trim(),
        kind: String(card.kind ?? ""),
        thumb,
        face: pngBlobUrl(bytes),
        files: card.files,
      };
    }

    function findSidebarRoot(from) {
      if (!from) return null;
      const foot = from.closest("[class*='_footArea']");
      if (foot?.parentElement) return foot.parentElement;
      let node = from.parentElement;
      while (node && node !== document.body) {
        if (node.querySelector("[class*='_logoRow']") && node.querySelector("button[class*='_newSession']")) {
          return node;
        }
        node = node.parentElement;
      }
      return document.querySelector("[class*='_logoRow']")?.parentElement ?? null;
    }

    function insertSoulHost(sidebar, host) {
      const logo = sidebar.querySelector("[class*='_logoRow']");
      if (logo && logo.parentElement === sidebar) {
        if (host.previousElementSibling !== logo) sidebar.insertBefore(host, logo.nextSibling);
        return;
      }
      sidebar.insertBefore(host, sidebar.firstChild);
    }

    function SidebarSoulPortal({ wide, children }) {
      const markerRef = React.useRef(null);
      const hostRef = React.useRef(null);
      const [host, setHost] = React.useState(null);
      React.useLayoutEffect(() => {
        if (!hostRef.current) {
          const node = document.createElement("div");
          node.dataset.dshSoulHost = "1";
          node.className = "dshwear-host";
          hostRef.current = node;
        }
        const hostNode = hostRef.current;
        const sidebar = findSidebarRoot(markerRef.current);
        if (!sidebar) return undefined;
        insertSoulHost(sidebar, hostNode);
        setHost(hostNode);
        const observer = new MutationObserver(() => {
          insertSoulHost(sidebar, hostNode);
        });
        observer.observe(sidebar, { childList: true });
        return () => {
          observer.disconnect();
          hostNode.remove();
        };
      }, []);
      React.useLayoutEffect(() => {
        if (hostRef.current) hostRef.current.dataset.wide = wide ? "1" : "0";
      }, [wide]);
      return React.createElement(React.Fragment, null,
        React.createElement("span", { ref: markerRef, className: "dshwear-marker", "aria-hidden": "true" }),
        host ? createPortal(children, host) : null,
      );
    }

    function prettyName(name) {
      const raw = String(name || "").trim();
      if (!raw) return "";
      return raw.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
    }

    function loadRoleLocal() {
      try {
        const raw = localStorage.getItem("dsh-plugin-roles:worn");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.name === "string") return parsed;
      } catch { /* ignore */ }
      return null;
    }

    function GalleryPick({ kind, label, busy }) {
      const [open, setOpen] = React.useState(false);
      const [cards, setCards] = React.useState([]);
      const [menu, setMenu] = React.useState(null);
      const btnRef = React.useRef(null);

      const placeMenu = React.useCallback(() => {
        const node = btnRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setMenu({
          top: rect.bottom + 6,
          left: Math.min(window.innerWidth - 220, Math.max(8, rect.right - 200)),
        });
      }, []);

      React.useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        void fetch("/dsh-plugin-skillpress/cards").then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (cancelled) return;
          const list = Array.isArray(body.cards) ? body.cards : [];
          setCards(list.filter((card) => card.kind === kind));
        }).catch(() => {
          if (!cancelled) setCards([]);
        });
        placeMenu();
        const onDoc = (event) => {
          const node = event.target instanceof Element ? event.target : null;
          if (node?.closest("[data-dsh-wear-pick]") || btnRef.current?.contains(node)) return;
          setOpen(false);
        };
        const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
        const onScroll = () => placeMenu();
        window.addEventListener("mousedown", onDoc);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", onScroll);
        return () => {
          cancelled = true;
          window.removeEventListener("mousedown", onDoc);
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", onScroll);
        };
      }, [kind, open, placeMenu]);

      const eventName = kind === "role" ? "dsh-roles-wear" : "dsh-persona-wear";
      const empty = kind === "role" ? "No role cards in the gallery." : "No soul cards in the gallery.";

      return React.createElement(React.Fragment, null,
        React.createElement("button", {
          ref: btnRef,
          type: "button",
          className: "dshwear-kit-act",
          disabled: busy,
          "aria-haspopup": "listbox",
          "aria-expanded": open ? "true" : "false",
          onClick: () => setOpen((cur) => !cur),
        }, label),
        open && menu && typeof document !== "undefined"
          ? createPortal(
            React.createElement("div", {
              className: "dshr-chipmenu",
              "data-dsh-wear-pick": "1",
              role: "listbox",
              "aria-label": label,
              style: { top: `${menu.top}px`, left: `${menu.left}px` },
            },
              cards.length
                ? cards.map((card) => React.createElement("button", {
                    key: card.name,
                    type: "button",
                    className: "dshr-chipopt",
                    role: "option",
                    onClick: () => {
                      setOpen(false);
                      window.dispatchEvent(new CustomEvent(eventName, { detail: { name: card.name } }));
                    },
                  }, prettyName(card.name) || card.name))
                : React.createElement("div", {
                    className: "dshr-chipopt",
                    "data-muted": "1",
                  }, empty),
            ),
            document.body,
          )
          : null,
      );
    }

    function PersonaSeat({ wide }) {
      const [worn, setWorn] = React.useState(loadLocal);
      const [roleWorn, setRoleWorn] = React.useState(loadRoleLocal);
      const [roster, setRoster] = React.useState(loadAgentRoster);
      const [over, setOver] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [hint, setHint] = React.useState("");
      const [sheet, setSheet] = React.useState(false);
      const fileRef = React.useRef(null);
      const faceRef = React.useRef(null);
      const roleFaceRef = React.useRef(null);
      const rosterRef = React.useRef(roster);
      rosterRef.current = roster;
      const wornRef = React.useRef(worn);
      wornRef.current = worn;
      const roleWornRef = React.useRef(roleWorn);
      roleWornRef.current = roleWorn;

      const show = React.useCallback((text) => {
        setHint(text);
      }, []);

      const commitRoster = React.useCallback((next) => {
        rosterRef.current = next;
        setRoster(next);
        emitAgentRoster(next);
      }, []);

      const patchActive = React.useCallback((partial) => {
        const cur = rosterRef.current;
        const next = {
          ...cur,
          agents: cur.agents.map((row) => (
            row.id === cur.activeId ? { ...row, ...partial } : row
          )),
        };
        commitRoster(next);
      }, [commitRoster]);

      const adoptFace = React.useCallback((url) => {
        if (faceRef.current && faceRef.current !== url) URL.revokeObjectURL(faceRef.current);
        faceRef.current = url && String(url).startsWith("blob:") ? url : null;
      }, []);

      const adoptRoleFace = React.useCallback((url) => {
        if (roleFaceRef.current && roleFaceRef.current !== url) URL.revokeObjectURL(roleFaceRef.current);
        roleFaceRef.current = url && String(url).startsWith("blob:") ? url : null;
      }, []);

      React.useEffect(() => () => {
        if (faceRef.current) URL.revokeObjectURL(faceRef.current);
        if (roleFaceRef.current) URL.revokeObjectURL(roleFaceRef.current);
      }, []);

      React.useEffect(() => {
        let cancelled = false;
        const syncWorn = () => {
          void fetch(`${API}/worn`).then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (cancelled) return;
            const name = body.name || null;
            if (!name) {
              setWorn(null);
              saveLocal(null);
              return;
            }
            setWorn((cur) => {
              const next = cur && cur.name === name
                ? { ...cur, description: body.description || cur.description }
                : { name, description: body.description || "", thumb: cur?.name === name ? cur.thumb : null };
              saveLocal(next);
              return next;
            });
          }).catch(() => { /* host not ready */ });
        };
        syncWorn();
        window.addEventListener("dsh-persona-changed", syncWorn);
        return () => {
          cancelled = true;
          window.removeEventListener("dsh-persona-changed", syncWorn);
        };
      }, []);

      React.useEffect(() => {
        if (!worn?.name || worn.face) return undefined;
        let cancelled = false;
        void fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(worn.name)}`).then(async (res) => {
          if (!res.ok) return;
          const blob = await res.blob();
          if (cancelled || blob.size < 24) return;
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          adoptFace(url);
          setWorn((cur) => (cur && cur.name === worn.name ? { ...cur, face: url } : cur));
        }).catch(() => { /* card not in gallery */ });
        return () => { cancelled = true; };
      }, [adoptFace, worn?.face, worn?.name]);

      React.useEffect(() => {
        let cancelled = false;
        void fetch("/dsh-plugin-roles/worn").then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (cancelled) return;
          const name = body.name || null;
          if (!name) {
            setRoleWorn(null);
            return;
          }
          setRoleWorn((cur) => (cur && cur.name === name
            ? { ...cur, description: body.description || cur.description }
            : { name, description: body.description || "", thumb: cur?.name === name ? cur.thumb : null }));
        }).catch(() => { /* host not ready */ });
        const onRole = (event) => {
          const name = event.detail?.name || null;
          const record = event.detail?.record !== false;
          if (!name) {
            adoptRoleFace(null);
            setRoleWorn(null);
            if (record) patchActive({ role: null });
            return;
          }
          const local = loadRoleLocal();
          const next = local && local.name === name
            ? local
            : { name, description: "", thumb: null };
          setRoleWorn((cur) => (cur && cur.name === name ? { ...cur, ...next } : next));
          if (record) patchActive({ role: layerSnapshot(next) });
        };
        window.addEventListener("dsh-roles-changed", onRole);
        return () => {
          cancelled = true;
          window.removeEventListener("dsh-roles-changed", onRole);
        };
      }, [adoptRoleFace, patchActive]);

      React.useEffect(() => {
        if (!roleWorn?.name || roleWorn.face) return undefined;
        let cancelled = false;
        void fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(roleWorn.name)}`).then(async (res) => {
          if (!res.ok) return;
          const blob = await res.blob();
          if (cancelled || blob.size < 24) return;
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          adoptRoleFace(url);
          setRoleWorn((cur) => (cur && cur.name === roleWorn.name ? { ...cur, face: url } : cur));
        }).catch(() => { /* card not in gallery */ });
        return () => { cancelled = true; };
      }, [adoptRoleFace, roleWorn?.face, roleWorn?.name]);

      const wearFile = React.useCallback(async (file, record = true) => {
        setBusy(true);
        let face = null;
        try {
          const card = await parseCard(file);
          face = card.face;
          const res = await fetch(`${API}/wear`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: card.name,
              description: card.description,
              files: card.files,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `wear failed (${res.status})`);
          adoptFace(face);
          face = null;
          const next = { name: card.name, description: card.description, thumb: card.thumb, face: card.face };
          setWorn(next);
          saveLocal(next);
          if (record) setSheet(true);
          window.dispatchEvent(new CustomEvent("dsh-persona-changed", { detail: { name: card.name } }));
          if (record) patchActive({ soul: layerSnapshot(next) });
          show(`Wearing ${card.name}.`);
        } catch (error) {
          if (face) URL.revokeObjectURL(face);
          show(String(error?.message ?? error));
        } finally {
          setBusy(false);
          setOver(false);
        }
      }, [adoptFace, patchActive, show]);

      React.useEffect(() => {
        const onWear = async (event) => {
          const name = event.detail?.name;
          const file = event.detail?.file;
          try {
            let pngFile = file;
            if (!pngFile && name) {
              const res = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(name)}`);
              if (!res.ok) throw new Error("That card is not in the gallery.");
              pngFile = new File([await res.blob()], `${name}.png`, { type: "image/png" });
            }
            if (!pngFile) return;
            await wearFile(pngFile);
          } catch (error) {
            show(String(error?.message ?? error));
          }
        };
        window.addEventListener("dsh-persona-wear", onWear);
        return () => window.removeEventListener("dsh-persona-wear", onWear);
      }, [wearFile, show]);

      const unequip = React.useCallback(async (record = true) => {
        setBusy(true);
        try {
          const res = await fetch(`${API}/unequip`, { method: "POST" });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `unequip failed (${res.status})`);
          const prev = wornRef.current?.name;
          adoptFace(null);
          setWorn(null);
          saveLocal(null);
          window.dispatchEvent(new CustomEvent("dsh-persona-changed", { detail: { name: null } }));
          if (record) patchActive({ soul: null });
          show(prev ? `Unequipped ${prev}.` : "Empty soul.");
        } catch (error) {
          show(String(error?.message ?? error));
        } finally {
          setBusy(false);
        }
      }, [adoptFace, patchActive, show]);

      const unequipRole = React.useCallback((record = true) => {
        window.dispatchEvent(new CustomEvent("dsh-roles-unequip", { detail: { record } }));
      }, []);

      const applyActiveWear = React.useCallback(async () => {
        const agent = activeAgentOf(rosterRef.current);
        const soulName = agent?.soul?.name || null;
        const roleName = agent?.role?.name || null;
        if (soulName) {
          if (wornRef.current?.name !== soulName) {
            const res = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(soulName)}`);
            if (res.ok) {
              const pngFile = new File([await res.blob()], `${soulName}.png`, { type: "image/png" });
              await wearFile(pngFile, false);
            }
          }
        } else if (wornRef.current) {
          await unequip(false);
        }
        if (roleName) {
          if (roleWornRef.current?.name !== roleName) {
            window.dispatchEvent(new CustomEvent("dsh-roles-wear", { detail: { name: roleName, record: false } }));
          }
        } else if (roleWornRef.current) {
          unequipRole(false);
        }
      }, [unequip, unequipRole, wearFile]);

      const activate = React.useCallback(async (id) => {
        const cur = rosterRef.current;
        if (!id || id === cur.activeId) return;
        if (!cur.agents.some((row) => row.id === id)) return;
        commitRoster({ ...cur, activeId: id });
        await applyActiveWear();
      }, [applyActiveWear, commitRoster]);

      const addAgent = React.useCallback(async () => {
        const agent = makeAgent(null, null);
        commitRoster({
          agents: [...rosterRef.current.agents, agent],
          activeId: agent.id,
        });
        await applyActiveWear();
      }, [applyActiveWear, commitRoster]);

      const removeAgent = React.useCallback(async () => {
        const cur = rosterRef.current;
        if (cur.agents.length < 2) return;
        const idx = cur.agents.findIndex((row) => row.id === cur.activeId);
        const agents = cur.agents.filter((row) => row.id !== cur.activeId);
        const activeId = agents[Math.max(0, idx - 1)]?.id || agents[0].id;
        commitRoster({ agents, activeId });
        await applyActiveWear();
      }, [applyActiveWear, commitRoster]);

      const stepAgent = React.useCallback((delta) => {
        const cur = rosterRef.current;
        if (cur.agents.length < 2) return;
        const idx = cur.agents.findIndex((row) => row.id === cur.activeId);
        const next = cur.agents[(idx + delta + cur.agents.length) % cur.agents.length];
        void activate(next.id);
      }, [activate]);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape" && sheet) {
            setSheet(false);
            return;
          }
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          if (typingAway(event.target)) return;
          const delta = event.key === "ArrowLeft" ? -1 : 1;
          if (sheet) {
            event.preventDefault();
            stepAgent(delta);
            return;
          }
          if (event.altKey && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            stepAgent(delta);
          }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [sheet, stepAgent]);

      const onDrag = React.useCallback((event) => {
        event.stopPropagation();
        if (event.type === "dragenter" || event.type === "dragover" || event.type === "drop") {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        }
        setOver(event.type !== "dragleave" && event.type !== "drop");
      }, []);

      const dropSoul = React.useCallback((event) => {
        onDrag(event);
        const file = [...event.dataTransfer.files].find((f) =>
          f.type === "image/png" || f.name.toLowerCase().endsWith(".png"));
        if (!file) {
          show("Drop a persona PNG.");
          return;
        }
        void wearFile(file);
      }, [onDrag, show, wearFile]);

      const avatar = worn || roleWorn;
      const avatarSrc = worn?.face || worn?.thumb || roleWorn?.face || roleWorn?.thumb;
      const avatarTitle = worn
        ? `${worn.name}${worn.description ? ` — ${worn.description}` : ""}\nClick for loadout. Right-click or × to remove soul.`
        : roleWorn
          ? `${prettyName(roleWorn.name)}${roleWorn.description ? ` — ${roleWorn.description}` : ""}\nClick for loadout. Right-click or × to remove role.`
          : "Empty loadout. Click to add a soul or role.";

      // Cycle through registered cards of the worn kind with hover arrows.
      const cycleKind = worn ? "persona" : "role";
      const cycleName = worn?.name ?? roleWorn?.name ?? null;
      const [cycleNames, setCycleNames] = React.useState([]);
      React.useEffect(() => {
        if (!avatar) { setCycleNames([]); return undefined; }
        let cancelled = false;
        void fetch("/dsh-plugin-skillpress/cards").then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (cancelled) return;
          const list = Array.isArray(body.cards) ? body.cards : [];
          setCycleNames(list.filter((card) => card.kind === cycleKind).map((card) => card.name));
        }).catch(() => { if (!cancelled) setCycleNames([]); });
        return () => { cancelled = true; };
      }, [avatar, cycleKind, cycleName]);

      const swap = React.useCallback((dir) => {
        if (cycleNames.length < 2) return;
        const cur = cycleNames.indexOf(cycleName);
        const next = cycleNames[(cur < 0 ? 0 : cur + dir + cycleNames.length) % cycleNames.length];
        const eventName = cycleKind === "role" ? "dsh-roles-wear" : "dsh-persona-wear";
        window.dispatchEvent(new CustomEvent(eventName, { detail: { name: next } }));
      }, [cycleKind, cycleName, cycleNames]);

      return React.createElement(React.Fragment, null,
      React.createElement(SidebarSoulPortal, { wide },
        React.createElement("div", { className: "dshwear-seat" },
          React.createElement("button", {
            type: "button",
            className: "dshwear-slot",
            "data-empty": avatar ? "0" : "1",
            "data-over": over ? "1" : "0",
            "data-busy": busy ? "1" : "0",
            title: avatarTitle,
            "aria-label": worn
              ? `Wearing ${worn.name}. Open loadout.`
              : roleWorn
                ? `Wearing role ${prettyName(roleWorn.name)}. Open loadout.`
                : "Open loadout",
            "aria-expanded": sheet ? "true" : "false",
            onDragEnter: onDrag,
            onDragOver: onDrag,
            onDragLeave: onDrag,
            onDrop: dropSoul,
            onContextMenu: (event) => {
              if (!worn && !roleWorn) return;
              event.preventDefault();
              if (worn) void unequip();
              else unequipRole();
            },
            onClick: () => setSheet(true),
          },
            avatarSrc
              ? React.createElement("img", { className: "dshwear-face", src: avatarSrc, alt: "" })
              : React.createElement("span", { className: "dshwear-empty", "aria-hidden": "true" }),
          ),
          avatar
            ? React.createElement("button", {
                type: "button",
                className: "dshwear-unequip",
                "aria-label": worn ? `Remove soul ${worn.name}` : `Remove role ${prettyName(roleWorn.name)}`,
                title: worn ? "Remove soul" : "Remove role",
                onClick: (event) => {
                  event.stopPropagation();
                  if (worn) void unequip();
                  else unequipRole();
                },
              }, "×")
            : null,
          avatar && cycleNames.length > 1
            ? React.createElement(React.Fragment, null,
                React.createElement("button", {
                  type: "button",
                  className: "dshwear-cycle prev",
                  "aria-label": `Previous ${cycleKind === "role" ? "role" : "soul"}`,
                  title: `Previous ${cycleKind === "role" ? "role" : "soul"}`,
                  onClick: (event) => { event.stopPropagation(); swap(-1); },
                }, "‹"),
                React.createElement("button", {
                  type: "button",
                  className: "dshwear-cycle next",
                  "aria-label": `Next ${cycleKind === "role" ? "role" : "soul"} (${cycleNames.length} registered)`,
                  title: `Next ${cycleKind === "role" ? "role" : "soul"}`,
                  onClick: (event) => { event.stopPropagation(); swap(1); },
                }, "›"),
              )
            : null,
          React.createElement("input", {
            ref: fileRef,
            className: "dshwear-file",
            type: "file",
            accept: "image/png,.png",
            tabIndex: -1,
            "aria-hidden": "true",
            onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void wearFile(file);
            },
          }),
          React.createElement("div", { className: "dshwear-live", role: "status", "aria-live": "polite" }, hint),
          worn || roleWorn
            ? React.createElement("div", { "data-dsh-role-chip": "1" })
            : null,
        ),
      ),
        sheet && typeof document !== "undefined"
          ? createPortal(
            React.createElement("div", {
              className: "dshwear-loadout",
              role: "presentation",
              onClick: () => setSheet(false),
            },
              React.createElement("div", {
                className: "dshwear-sheet",
                role: "dialog",
                "aria-label": "Loadout",
                onClick: (event) => event.stopPropagation(),
              },
                React.createElement("div", { className: "dshwear-sheet-head" },
                  React.createElement("h2", null, "Loadout"),
                  React.createElement("div", { className: "dshwear-pager" },
                    React.createElement("button", {
                      type: "button",
                      disabled: busy || roster.agents.length < 2,
                      "aria-label": "Previous agent",
                      onClick: () => stepAgent(-1),
                    }, "‹"),
                    React.createElement("span", { className: "dshwear-pager-idx" },
                      `${Math.max(1, roster.agents.findIndex((row) => row.id === roster.activeId) + 1)} / ${roster.agents.length}`),
                    React.createElement("button", {
                      type: "button",
                      disabled: busy || roster.agents.length < 2,
                      "aria-label": "Next agent",
                      onClick: () => stepAgent(1),
                    }, "›"),
                  ),
                  React.createElement("div", { className: "dshwear-sheet-tools" },
                    React.createElement("button", {
                      type: "button",
                      disabled: busy,
                      onClick: () => void addAgent(),
                    }, "Add"),
                    roster.agents.length > 1
                      ? React.createElement("button", {
                          type: "button",
                          disabled: busy,
                          title: "Remove this agent card",
                          onClick: () => void removeAgent(),
                        }, "Remove agent")
                      : null,
                    React.createElement("button", { type: "button", onClick: () => setSheet(false) }, "Close"),
                  ),
                ),
                React.createElement("div", { className: "dshwear-agent" },
                React.createElement("p", { className: "dshwear-agent-name" },
                  prettyName(worn?.name) || prettyName(roleWorn?.name) || "New agent"),
                React.createElement("div", { className: "dshwear-kit" },
                  React.createElement("div", { className: "dshwear-kit-head" },
                    React.createElement("p", { className: "dshwear-sheet-kicker" }, "Soul"),
                    worn
                      ? React.createElement("button", {
                          type: "button",
                          className: "dshwear-kit-act",
                          "data-kind": "remove",
                          disabled: busy,
                          onClick: () => void unequip(true),
                        }, "Remove")
                      : React.createElement(GalleryPick, { kind: "persona", label: "Add", busy }),
                  ),
                  worn
                    ? React.createElement("div", { className: "dshwear-row", "data-dsh-persona-mount": "1" },
                        React.createElement("div", { className: "dshwear-sheet-portrait" },
                          React.createElement("button", {
                            type: "button",
                            className: "dshwear-slot dshwear-sheet-soul",
                            "data-empty": "0",
                            "data-over": over ? "1" : "0",
                            "data-busy": busy ? "1" : "0",
                            title: `${worn.name}\nDrop a persona PNG to swap.`,
                            "aria-label": `Swap persona ${worn.name}`,
                            onDragEnter: onDrag,
                            onDragOver: onDrag,
                            onDragLeave: onDrag,
                            onDrop: dropSoul,
                            onClick: () => fileRef.current?.click(),
                          },
                            (worn.face || worn.thumb)
                              ? React.createElement("img", { className: "dshwear-face", src: worn.face || worn.thumb, alt: "" })
                              : React.createElement("span", { className: "dshwear-empty", "aria-hidden": "true" }),
                          ),
                        ),
                        React.createElement("div", {
                          className: "dshwear-copy",
                          onDragEnter: onDrag,
                          onDragOver: onDrag,
                          onDragLeave: onDrag,
                          onDrop: dropSoul,
                        },
                          React.createElement("p", { className: "dshwear-copy-name" }, worn.name),
                          React.createElement("p", { className: "dshwear-copy-def" }, "Who you are. Voice and values stay on."),
                          React.createElement("p", { className: "dshwear-copy-desc" },
                            worn.description || "Drop a persona PNG, or click the portrait to swap."),
                        ),
                      )
                    : React.createElement("p", { className: "dshwear-kit-empty" },
                        "No soul. Add one from the gallery."),
                  worn
                    ? React.createElement("div", { "data-dsh-loadout-skills": "soul" })
                    : null,
                ),
                React.createElement("div", { className: "dshwear-kit" },
                  React.createElement("div", { className: "dshwear-kit-head" },
                    React.createElement("p", { className: "dshwear-sheet-kicker" }, "Role"),
                    roleWorn
                      ? React.createElement("button", {
                          type: "button",
                          className: "dshwear-kit-act",
                          "data-kind": "remove",
                          disabled: busy,
                          onClick: () => unequipRole(true),
                        }, "Remove")
                      : React.createElement(GalleryPick, { kind: "role", label: "Add", busy }),
                  ),
                  roleWorn
                    ? null
                    : React.createElement("p", { className: "dshwear-kit-empty" },
                        "No role. Add one from the gallery."),
                  React.createElement("div", {
                    className: "dshwear-row dshr-host",
                    "data-dsh-role-mount": "1",
                    "data-dsh-role-host": "1",
                    "data-wide": "1",
                  }),
                  roleWorn
                    ? React.createElement("div", { "data-dsh-loadout-skills": "role" })
                    : null,
                ),
                ),
              ),
            ),
            document.body,
          )
          : null,
      );
    }

      return { PersonaSeat };
    })();

    const { RoleSeat } = (() => {
    const STORAGE_KEY = "dsh-plugin-roles:worn";
    const API = "/dsh-plugin-roles";
    const EMPTY = "Empty role. Drop a class PNG, or click to pick one.";

    const css = `
.dshr-marker{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
.dshr-host{box-sizing:border-box;flex:none;position:relative;min-width:0;margin:0 2px 8px;display:flex;justify-content:center}
.dshr-seat{position:relative;width:min(112px,42%);aspect-ratio:1;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit)}
.dshr-slot{box-sizing:border-box;display:block;width:100%;height:100%;margin:0;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;cursor:pointer;overflow:hidden;color:inherit;font:inherit;background:var(--dsw-alias-button-elevated-fill);transition:background-color .12s ease,box-shadow .12s ease,border-color .12s ease}
.dshr-slot:hover{background:var(--dsw-alias-button-floating-hover);border-color:var(--dsw-alias-state-business-primary)}
.dshr-slot:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshr-slot[data-empty="1"]{cursor:copy;background:transparent}
.dshr-slot[data-over="1"]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent)}
.dshr-slot[data-busy="1"]{opacity:.7}
.dshr-face{width:100%;height:100%;object-fit:cover;display:block;border-radius:13px;pointer-events:none}
.dshr-empty{position:absolute;inset:12%;border:1px dashed var(--dsw-alias-border-l2);border-radius:6px;pointer-events:none;box-sizing:border-box}
.dshr-empty:after{content:"";position:absolute;left:50%;top:50%;width:18%;height:14%;margin:0;transform:translate(-50%,-50%);border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent);border-radius:2px}
.dshr-unequip{position:absolute;top:-6px;right:-6px;z-index:1;width:18px;height:18px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:16px;cursor:pointer;opacity:0;transition:opacity .12s ease}
.dshr-seat:hover .dshr-unequip,.dshr-slot:focus-visible + .dshr-unequip,.dshr-unequip:focus-visible{opacity:1}
.dshr-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.dshr-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.dshr-host[data-wide="0"]{margin:0 0 12px;width:36px;justify-content:flex-start}
.dshr-host[data-wide="0"] .dshr-seat{width:36px}
.dshr-host[data-wide="0"] .dshr-slot{background:transparent;border-color:transparent;border-radius:10px}
.dshr-host[data-wide="0"] .dshr-slot[data-empty="1"]{border-color:var(--dsw-alias-border-l2)}
.dshr-host[data-wide="0"] .dshr-face{border-radius:9px}
.dshr-host[data-wide="0"] .dshr-empty{inset:4px;border-radius:4px}
.dshr-host[data-wide="0"] .dshr-unequip{width:16px;height:16px;font-size:11px;line-height:14px}
.dshr-chipwrap{position:absolute;left:8%;right:8%;bottom:10px;z-index:2}
.dshr-chip{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:4px;width:100%;min-height:22px;margin:0;padding:3px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-3) 86%,transparent);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;font-weight:600;line-height:14px;cursor:pointer;box-shadow:0 6px 16px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent);backdrop-filter:blur(10px)}
.dshr-chip:hover{background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-state-business-primary)}
.dshr-chip:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshr-chip[data-empty="1"]{font-weight:500;color:var(--dsw-alias-label-secondary)}
.dshr-chip[data-busy="1"]{opacity:.7}
.dshr-chip-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshr-chip-caret{flex:none;font-size:9px;opacity:.55;transform:translateY(1px)}
.dshr-chipmenu{position:fixed;z-index:92;box-sizing:border-box;min-width:168px;max-width:240px;max-height:260px;overflow:auto;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:0 14px 36px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);font-family:var(--dsw-font-family,inherit)}
.dshr-chipopt{display:block;width:100%;margin:0;padding:7px 10px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:13px;line-height:18px;text-align:left;cursor:pointer}
.dshr-chipopt:hover,.dshr-chipopt:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}
.dshr-chipopt[data-on="1"]{color:var(--dsw-alias-state-business-primary);font-weight:600}
.dshr-chipopt[data-muted="1"]{color:var(--dsw-alias-label-tertiary);font-size:12px;cursor:default}
.dshr-chipopt[data-muted="1"]:hover{background:transparent}
@media (prefers-reduced-motion:reduce){
  .dshr-slot,.dshr-unequip{transition:none}
}
`;

    if (typeof document !== "undefined") {
      let tag = document.querySelector('style[data-plugin-css="dsh-plugin-roles"]');
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.pluginCss = "dsh-plugin-roles";
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    function loadLocal() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.name === "string") return parsed;
      } catch { /* ignore */ }
      return null;
    }

    function saveLocal(row) {
      try {
        if (!row) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          name: row.name,
          description: row.description || "",
          thumb: row.thumb && String(row.thumb).startsWith("data:") ? row.thumb : null,
        }));
      } catch { /* ignore */ }
    }

    function bytesToAscii(bytes) {
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return s;
    }

    function extractSkillPayload(png) {
      if (png.length < 24 || png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
        throw new Error("Not a PNG. Chat/Discord often convert cards to JPEG and strip the skill.");
      }
      const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
      let pos = 8;
      while (pos + 12 <= png.length) {
        const length = view.getUint32(pos);
        if (pos + 12 + length > png.length) break;
        const type = bytesToAscii(png.subarray(pos + 4, pos + 8));
        const data = png.subarray(pos + 8, pos + 8 + length);
        if (type === "tEXt") {
          const nul = data.indexOf(0);
          if (nul > 0 && bytesToAscii(data.subarray(0, nul)) === "skill") {
            return bytesToAscii(data.subarray(nul + 1));
          }
        }
        if (type === "IEND") break;
        pos += 12 + length;
      }
      throw new Error("This PNG has no skill chunk. Mint it with Skillcard Press.");
    }

    async function gunzipB64(b64) {
      let bin;
      try {
        bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        throw new Error("Skill chunk is not valid base64");
      }
      if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser cannot gunzip skill cards");
      }
      const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
      const text = await new Response(stream).text();
      return JSON.parse(text);
    }

    function pngBlobUrl(pngBytes) {
      return URL.createObjectURL(new Blob([pngBytes], { type: "image/png" }));
    }

    async function makeThumb(pngBytes) {
      const url = pngBlobUrl(pngBytes);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("cover would not decode"));
          image.src = url;
        });
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const size = Math.min(512, Math.max(256, Math.round(160 * dpr)));
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        const src = Math.min(img.width, img.height);
        const sx = (img.width - src) / 2;
        const sy = (img.height - src) / 2;
        ctx.drawImage(img, sx, sy, src, src, 0, 0, size, size);
        return canvas.toDataURL("image/jpeg", 0.92);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function parseCard(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const card = await gunzipB64(extractSkillPayload(bytes));
      if (card.spec !== "skill_card_v1") {
        throw new Error(`Unsupported spec ${card.spec ?? "?"}`);
      }
      if (!card.name || !card.files || typeof card.files !== "object") {
        throw new Error("Card is missing name or files");
      }
      const names = Object.keys(card.files);
      if (!names.includes("SKILL.md") && !names.includes("ROLE.md")) {
        throw new Error("Role card needs SKILL.md");
      }
      const thumb = await makeThumb(bytes);
      return {
        name: String(card.name).trim(),
        description: String(card.description ?? "").trim(),
        thumb,
        face: pngBlobUrl(bytes),
        files: card.files,
      };
    }

    function prettyRole(name) {
      const raw = String(name || "").trim();
      if (!raw) return "Role";
      return raw.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
    }

    function SidebarChipPortal({ children }) {
      const [host, setHost] = React.useState(null);
      React.useLayoutEffect(() => {
        const place = () => {
          const node = document.querySelector("[data-dsh-role-chip]");
          setHost((cur) => (cur === node ? cur : node));
        };
        place();
        const observer = new MutationObserver(place);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
      }, []);
      return host ? createPortal(children, host) : null;
    }

    function RoleChip({ worn, busy, onWear, onUnequip }) {
      const [open, setOpen] = React.useState(false);
      const [roles, setRoles] = React.useState([]);
      const [menu, setMenu] = React.useState(null);
      const btnRef = React.useRef(null);

      const placeMenu = React.useCallback(() => {
        const node = btnRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setMenu({
          top: rect.bottom + 6,
          left: Math.min(window.innerWidth - 180, Math.max(8, rect.left + rect.width / 2 - 84)),
        });
      }, []);

      React.useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        void fetch("/dsh-plugin-skillpress/cards").then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (cancelled) return;
          const cards = Array.isArray(body.cards) ? body.cards : [];
          setRoles(cards.filter((card) => card.kind === "role"));
        }).catch(() => {
          if (!cancelled) setRoles([]);
        });
        placeMenu();
        const onDoc = (event) => {
          const node = event.target instanceof Element ? event.target : null;
          if (node?.closest("[data-dsh-role-chip-menu]") || btnRef.current?.contains(node)) return;
          setOpen(false);
        };
        const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
        const onScroll = () => placeMenu();
        window.addEventListener("mousedown", onDoc);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", onScroll);
        return () => {
          cancelled = true;
          window.removeEventListener("mousedown", onDoc);
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", onScroll);
        };
      }, [open, placeMenu]);

      React.useEffect(() => {
        const host = document.querySelector("[data-dsh-soul-host]");
        if (!host) return undefined;
        const sync = () => {
          if (host.dataset.wide === "0") setOpen(false);
        };
        const observer = new MutationObserver(sync);
        observer.observe(host, { attributes: true, attributeFilter: ["data-wide"] });
        return () => observer.disconnect();
      }, []);

      return React.createElement(React.Fragment, null,
        React.createElement("div", { className: "dshr-chipwrap" },
          React.createElement("button", {
            ref: btnRef,
            type: "button",
            className: "dshr-chip",
            "data-empty": worn ? "0" : "1",
            "data-busy": busy ? "1" : "0",
            "aria-haspopup": "listbox",
            "aria-expanded": open ? "true" : "false",
            title: worn ? `Role: ${prettyRole(worn.name)}. Click to swap.` : "Pick a role",
            "aria-label": worn ? `Role ${prettyRole(worn.name)}` : "Pick a role",
            onClick: (event) => {
              event.stopPropagation();
              setOpen((cur) => !cur);
            },
          },
            React.createElement("span", { className: "dshr-chip-name" }, prettyRole(worn?.name)),
            React.createElement("span", { className: "dshr-chip-caret", "aria-hidden": "true" }, "▾"),
          ),
        ),
        open && menu && typeof document !== "undefined"
          ? createPortal(
            React.createElement("div", {
              className: "dshr-chipmenu",
              "data-dsh-role-chip-menu": "1",
              role: "listbox",
              "aria-label": "Roles",
              style: { top: `${menu.top}px`, left: `${menu.left}px` },
            },
              roles.length
                ? roles.map((card) => React.createElement("button", {
                    key: card.name,
                    type: "button",
                    className: "dshr-chipopt",
                    role: "option",
                    "aria-selected": worn?.name === card.name ? "true" : "false",
                    "data-on": worn?.name === card.name ? "1" : "0",
                    onClick: () => {
                      setOpen(false);
                      if (worn?.name === card.name) return;
                      onWear(card.name);
                    },
                  }, prettyRole(card.name)))
                : React.createElement("div", {
                    className: "dshr-chipopt",
                    "data-muted": "1",
                  }, "No role cards in the gallery."),
              worn
                ? React.createElement("button", {
                    type: "button",
                    className: "dshr-chipopt",
                    onClick: () => {
                      setOpen(false);
                      void onUnequip();
                    },
                  }, "Unequip")
                : null,
            ),
            document.body,
          )
          : null,
      );
    }

    function LoadoutRolePortal({ children }) {
      const markerRef = React.useRef(null);
      const [host, setHost] = React.useState(null);
      React.useLayoutEffect(() => {
        const place = () => {
          const node = document.querySelector("[data-dsh-role-mount]");
          setHost((cur) => (cur === node ? cur : node));
        };
        place();
        const observer = new MutationObserver(place);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
      }, []);
      return React.createElement(React.Fragment, null,
        React.createElement("span", { ref: markerRef, className: "dshr-marker", "aria-hidden": "true" }),
        host ? createPortal(children, host) : null,
      );
    }

    function RoleSeat() {
      const [worn, setWorn] = React.useState(loadLocal);
      const [over, setOver] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [hint, setHint] = React.useState("");
      const fileRef = React.useRef(null);
      const faceRef = React.useRef(null);

      const show = React.useCallback((text) => {
        setHint(text);
      }, []);

      const adoptFace = React.useCallback((url) => {
        if (faceRef.current && faceRef.current !== url) URL.revokeObjectURL(faceRef.current);
        faceRef.current = url && String(url).startsWith("blob:") ? url : null;
      }, []);

      React.useEffect(() => () => {
        if (faceRef.current) URL.revokeObjectURL(faceRef.current);
      }, []);

      React.useEffect(() => {
        let cancelled = false;
        const syncWorn = () => {
          void fetch(`${API}/worn`).then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (cancelled) return;
            const name = body.name || null;
            if (!name) {
              setWorn(null);
              saveLocal(null);
              return;
            }
            setWorn((cur) => {
              const next = cur && cur.name === name
                ? { ...cur, description: body.description || cur.description }
                : { name, description: body.description || "", thumb: cur?.name === name ? cur.thumb : null };
              saveLocal(next);
              return next;
            });
          }).catch(() => { /* host not ready */ });
        };
        syncWorn();
        window.addEventListener("dsh-roles-changed", syncWorn);
        return () => {
          cancelled = true;
          window.removeEventListener("dsh-roles-changed", syncWorn);
        };
      }, []);

      React.useEffect(() => {
        if (!worn?.name || worn.face) return undefined;
        let cancelled = false;
        void fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(worn.name)}`).then(async (res) => {
          if (!res.ok) return;
          const blob = await res.blob();
          if (cancelled || blob.size < 24) return;
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          adoptFace(url);
          setWorn((cur) => (cur && cur.name === worn.name ? { ...cur, face: url } : cur));
        }).catch(() => { /* card not in gallery */ });
        return () => { cancelled = true; };
      }, [adoptFace, worn?.face, worn?.name]);

      const wearFile = React.useCallback(async (file, record = true) => {
        setBusy(true);
        let face = null;
        try {
          const card = await parseCard(file);
          face = card.face;
          const res = await fetch(`${API}/wear`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: card.name,
              description: card.description,
              files: card.files,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `wear failed (${res.status})`);
          adoptFace(face);
          face = null;
          const next = { name: card.name, description: card.description, thumb: card.thumb, face: card.face };
          setWorn(next);
          saveLocal(next);
          window.dispatchEvent(new CustomEvent("dsh-roles-changed", { detail: { name: card.name, record } }));
          show(`Wearing ${card.name}.`);
        } catch (error) {
          if (face) URL.revokeObjectURL(face);
          show(String(error?.message ?? error));
        } finally {
          setBusy(false);
          setOver(false);
        }
      }, [adoptFace, show]);

      React.useEffect(() => {
        const onWear = async (event) => {
          const name = event.detail?.name;
          const file = event.detail?.file;
          const record = event.detail?.record !== false;
          try {
            let pngFile = file;
            if (!pngFile && name) {
              const res = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(name)}`);
              if (!res.ok) throw new Error("That card is not in the gallery.");
              pngFile = new File([await res.blob()], `${name}.png`, { type: "image/png" });
            }
            if (!pngFile) return;
            await wearFile(pngFile, record);
          } catch (error) {
            show(String(error?.message ?? error));
          }
        };
        window.addEventListener("dsh-roles-wear", onWear);
        return () => window.removeEventListener("dsh-roles-wear", onWear);
      }, [wearFile, show]);

      const unequip = React.useCallback(async (record = true) => {
        setBusy(true);
        try {
          const res = await fetch(`${API}/unequip`, { method: "POST" });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `unequip failed (${res.status})`);
          const prev = worn?.name;
          adoptFace(null);
          setWorn(null);
          saveLocal(null);
          window.dispatchEvent(new CustomEvent("dsh-roles-changed", { detail: { name: null, record } }));
          show(prev ? `Unequipped ${prev}.` : "Empty role.");
        } catch (error) {
          show(String(error?.message ?? error));
        } finally {
          setBusy(false);
        }
      }, [adoptFace, show, worn]);

      React.useEffect(() => {
        const onUnequip = (event) => { void unequip(event.detail?.record !== false); };
        window.addEventListener("dsh-roles-unequip", onUnequip);
        return () => window.removeEventListener("dsh-roles-unequip", onUnequip);
      }, [unequip]);

      const onDrag = React.useCallback((event) => {
        event.stopPropagation();
        if (event.type === "dragenter" || event.type === "dragover" || event.type === "drop") {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        }
        setOver(event.type !== "dragleave" && event.type !== "drop");
      }, []);

      return React.createElement(React.Fragment, null,
      React.createElement(LoadoutRolePortal, null,
        worn
          ? React.createElement(React.Fragment, null,
        React.createElement("div", { className: "dshr-seat" },
          React.createElement("button", {
            type: "button",
            className: "dshr-slot",
            "data-empty": "0",
            "data-over": over ? "1" : "0",
            "data-busy": busy ? "1" : "0",
            title: `${worn.name}${worn.description ? ` — ${worn.description}` : ""}\nDrop a role PNG to swap.`,
            "aria-label": `Wearing ${prettyRole(worn.name)}`,
            onDragEnter: onDrag,
            onDragOver: onDrag,
            onDragLeave: onDrag,
            onDrop: (event) => {
              onDrag(event);
              const file = [...event.dataTransfer.files].find((f) =>
                f.type === "image/png" || f.name.toLowerCase().endsWith(".png"));
              if (!file) {
                show("Drop a role PNG.");
                return;
              }
              void wearFile(file);
            },
            onClick: () => fileRef.current?.click(),
          },
            (worn.face || worn.thumb)
              ? React.createElement("img", { className: "dshr-face", src: worn.face || worn.thumb, alt: "" })
              : React.createElement("span", { className: "dshr-empty", "aria-hidden": "true" }),
          ),
          React.createElement("input", {
            ref: fileRef,
            className: "dshr-file",
            type: "file",
            accept: "image/png,.png",
            tabIndex: -1,
            "aria-hidden": "true",
            onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void wearFile(file);
            },
          }),
          React.createElement("div", { className: "dshr-live", role: "status", "aria-live": "polite" }, hint),
        ),
        React.createElement("div", {
          className: "dshwear-copy",
          onDragEnter: onDrag,
          onDragOver: onDrag,
          onDragLeave: onDrag,
          onDrop: (event) => {
            onDrag(event);
            const file = [...event.dataTransfer.files].find((f) =>
              f.type === "image/png" || f.name.toLowerCase().endsWith(".png"));
            if (!file) {
              show("Drop a role PNG.");
              return;
            }
            void wearFile(file);
          },
        },
          React.createElement("p", { className: "dshwear-copy-name" }, prettyRole(worn.name)),
          React.createElement("p", { className: "dshwear-copy-def" }, "The job. Standing instructions while worn."),
          React.createElement("p", { className: "dshwear-copy-desc" },
            worn.description || "Drop a role PNG, or click the square to swap."),
        ),
        )
          : null,
      ),
      worn
        ? React.createElement(SidebarChipPortal, null,
            React.createElement(RoleChip, {
              worn,
              busy,
              onWear: (name) => {
                window.dispatchEvent(new CustomEvent("dsh-roles-wear", { detail: { name } }));
              },
              onUnequip: unequip,
            }),
          )
        : null,
      );
    }

      return { RoleSeat };
    })();

    const { SkillBar, confinePageDrops } = (() => {
    const SLOT_COUNT = 8;
    const STORAGE_KEY = "dsh-plugin-skillbar:slots";
    const ROLE_WORN_KEY = "dsh-plugin-roles:worn";
    const SOUL_WORN_KEY = "dsh-plugin-persona:worn";
    const MIME_SLOT = "application/x-dsh-skillbar-slot";
    const CAST_MS = 780;
    const WATCH_MS = 380;

    const css = `
.dshsb-marker{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
.dshsb-dock{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:8px;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-dock-inset,8px) - var(--dsh-composer-dock-inset,8px));max-width:calc(var(--dsh-composer-card-max-width,720px) - 2 * var(--dsh-composer-dock-inset,8px));margin:0 auto;padding:8px var(--dsh-composer-dock-inset,8px) 12px;flex:none;position:relative;z-index:8;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit)}
.dshsb-wear{display:flex;gap:10px;justify-content:center;align-items:flex-end}
.dshsb-wear:not(:has([data-dsh-hud-slot]:not(:empty))){display:none}
.dshsb-wear-slot{display:flex;align-items:flex-end}
[data-phase=active] [data-composer-seat]{background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-bg-base) 0%,transparent) 0,color-mix(in srgb,var(--dsw-alias-bg-base) 42%,transparent) 36px,var(--dsw-alias-bg-base) 80px)!important}
[data-phase=settling]>.dshsb-dock{visibility:hidden}
.dshsb-plate{display:flex;flex-direction:column;align-items:center;gap:8px;padding:0;background:none;border:none;box-shadow:none}
.dshsb-kit{display:flex;flex-direction:column;align-items:center;gap:4px}
.dshsb-kit-label{margin:0;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.dshsb-slots{display:flex;gap:6px;justify-content:center}
.dshsb-slotwrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px}
.dshsb-slot{position:relative;width:48px;height:48px;padding:0;border-radius:8px;cursor:pointer;overflow:visible;color:var(--dsw-alias-label-secondary);font:inherit;background:var(--dsw-alias-button-tool-bar-fill);border:1px solid var(--dsw-alias-border-l2);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background-color .12s ease}
.dshsb-slot:hover{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-button-tool-bar-hover);transform:translateY(-1px)}
.dshsb-slot:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshsb-slot[data-empty="1"]{cursor:copy;background:transparent;box-shadow:none}
.dshsb-slot[data-empty="1"]:hover{background:transparent}
.dshsb-slot[data-over="1"]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent),inset 0 0 16px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}
.dshsb-slot[data-casting="1"]{border-color:var(--dsw-alias-state-business-primary);animation:dshsb-cast .78s ease-out}
.dshsb-slot[disabled]{opacity:.55;cursor:default;transform:none}
.dshsb-face{width:100%;height:100%;object-fit:cover;display:block;border-radius:7px;pointer-events:none}
.dshsb-empty{position:absolute;inset:7px;border:1px dashed var(--dsw-alias-border-l2);border-radius:4px;pointer-events:none}
.dshsb-empty:after{content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;box-sizing:border-box;margin:0;transform:translate(-50%,-50%) rotate(45deg);border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent)}
.dshsb-key{font:inherit;font-size:10px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);line-height:1;min-height:10px}
.dshsb-unequip{position:absolute;top:-6px;right:-6px;width:16px;height:16px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;line-height:14px;cursor:pointer;opacity:0;transition:opacity .12s ease}
.dshsb-slotwrap:hover .dshsb-unequip,.dshsb-slot:focus-visible + .dshsb-unequip,.dshsb-unequip:focus-visible{opacity:1}
.dshsb-halo{pointer-events:none;position:absolute;inset:-5px;border-radius:11px;opacity:0}
.dshsb-tip{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translate(-50%,4px);z-index:50;width:max-content;max-width:220px;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.24));pointer-events:none;opacity:0;transition:opacity .12s ease,transform .12s ease;display:flex;flex-direction:column;gap:3px;text-align:left}
.dshsb-slotwrap:hover .dshsb-tip,.dshsb-slot:focus-visible ~ .dshsb-tip{opacity:1;transform:translate(-50%,0)}
.dshsb-tip-name{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);line-height:16px}
.dshsb-tip-desc{font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dshsb-slot[data-casting="1"] .dshsb-halo{opacity:1;background:conic-gradient(from 0deg,var(--dsw-alias-state-business-primary),transparent 28%,var(--dsw-alias-state-business-primary) 52%,transparent 78%,var(--dsw-alias-state-business-primary));filter:blur(1px);animation:dshsb-spin .78s linear}
.dshsb-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.dshsb-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
[data-composer-card].dshsb-composer-drop{box-shadow:0 0 0 2px var(--dsw-alias-state-business-primary),var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.24))}
/* Attachment DropOverlay is a body portal meant to cover the viewport. Keep drops local. */
body>[role="status"]:has(svg[viewBox="0 0 115 84"]){display:none!important}
@keyframes dshsb-cast{
  0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--dsw-alias-state-business-primary) 0%,transparent)}
  30%{box-shadow:0 0 18px 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent),inset 0 0 18px color-mix(in srgb,var(--dsw-alias-state-business-primary) 22%,transparent)}
  100%{box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
}
@keyframes dshsb-spin{to{transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce){
  .dshsb-slot,.dshsb-unequip{transition:none}
  .dshsb-slot[data-casting="1"],.dshsb-slot[data-casting="1"] .dshsb-halo{animation:none}
}
.dshsb-pick{position:fixed;z-index:90;min-width:200px;max-width:260px;max-height:300px;overflow:auto;padding:6px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.24));display:flex;flex-direction:column;gap:2px}
.dshsb-pick-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;text-align:left;min-width:0}
.dshsb-pick-item:hover{background:var(--dsw-alias-bg-layer-1)}
.dshsb-pick-item:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshsb-pick-item img{width:24px;height:24px;border-radius:5px;object-fit:cover;flex:none}
.dshsb-pick-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshsb-pick-empty{margin:0;padding:10px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.dshsb-pick-file{margin-top:4px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}
`;

    if (typeof document !== "undefined") {
      let tag = document.querySelector('style[data-plugin-css="dsh-plugin-skillbar"]');
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.pluginCss = "dsh-plugin-skillbar";
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    function wornName(key) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed && typeof parsed.name === "string" && parsed.name ? parsed.name : null;
      } catch {
        return null;
      }
    }

    function wornRoleName() {
      return wornName(ROLE_WORN_KEY);
    }

    function wornSoulName() {
      return wornName(SOUL_WORN_KEY);
    }

    function slotsKey(kind, name) {
      if (kind === "soul") return name ? `${STORAGE_KEY}:soul:${name}` : `${STORAGE_KEY}:soul`;
      if (kind === "role" && name) return `${STORAGE_KEY}:${name}`;
      return STORAGE_KEY;
    }

    function emptySlots() {
      return Array.from({ length: SLOT_COUNT }, () => null);
    }

    function loadSlots(kind, name) {
      try {
        const raw = localStorage.getItem(slotsKey(kind, name));
        if (!raw) return emptySlots();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return emptySlots();
        const next = emptySlots();
        for (let i = 0; i < SLOT_COUNT; i += 1) {
          const row = parsed[i];
          if (row && typeof row.name === "string") next[i] = row;
        }
        return next;
      } catch {
        return emptySlots();
      }
    }

    function saveSlots(kind, name, slots) {
      const key = slotsKey(kind, name);
      try {
        localStorage.setItem(key, JSON.stringify(slots));
      } catch {
        try {
          localStorage.setItem(key, JSON.stringify(slots.map((s) => (
            s ? { name: s.name, description: s.description, thumb: s.thumb } : null
          ))));
        } catch { /* ignore */ }
      }
    }

    function bytesToAscii(bytes) {
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return s;
    }

    function extractSkillPayload(png) {
      if (png.length < 24 || png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
        throw new Error("Not a PNG. Chat/Discord often convert cards to JPEG and strip the skill.");
      }
      const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
      let pos = 8;
      while (pos + 12 <= png.length) {
        const length = view.getUint32(pos);
        if (pos + 12 + length > png.length) break;
        const type = bytesToAscii(png.subarray(pos + 4, pos + 8));
        const data = png.subarray(pos + 8, pos + 8 + length);
        if (type === "tEXt") {
          const nul = data.indexOf(0);
          if (nul > 0 && bytesToAscii(data.subarray(0, nul)) === "skill") {
            return bytesToAscii(data.subarray(nul + 1));
          }
        }
        if (type === "IEND") break;
        pos += 12 + length;
      }
      throw new Error("This PNG has no skill chunk. Mint it with Skillcard Press — screenshots will not work.");
    }

    async function gunzipB64(b64) {
      let bin;
      try {
        bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        throw new Error("Skill chunk is not valid base64");
      }
      if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser cannot gunzip skill cards");
      }
      const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
      const text = await new Response(stream).text();
      return JSON.parse(text);
    }

    async function makeThumb(pngBytes) {
      const url = URL.createObjectURL(new Blob([pngBytes], { type: "image/png" }));
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("cover would not decode"));
          image.src = url;
        });
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        return canvas.toDataURL("image/jpeg", 0.78);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function parseSkillCard(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const card = await gunzipB64(extractSkillPayload(bytes));
      if (card.spec !== "skill_card_v1") {
        throw new Error(`Unsupported spec ${card.spec ?? "?"}`);
      }
      if (!card.name || !card.files || typeof card.files !== "object") {
        throw new Error("Skill card is missing name or files");
      }
      const thumb = await makeThumb(bytes);
      return {
        name: String(card.name).trim(),
        description: String(card.description ?? "").trim(),
        thumb,
        files: card.files,
      };
    }

    function typingInField(target) {
      if (!target || !(target instanceof Element)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return Boolean(target.closest("[contenteditable='true']"));
    }

    function transferHasFiles(event) {
      return Boolean(event.dataTransfer?.types && [...event.dataTransfer.types].includes("Files"));
    }

    function dropZoneOf(event) {
      const node = event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null;
      if (!node) return null;
      if (node.closest("[data-dsh-loadout-skills]") || node.closest(".dshsb-dock") || node.closest("[data-dsh-hud-slot]")) return "skillbar";
      if (node.closest("[data-dsh-persona-mount]") || node.closest("[data-dsh-soul-host]") || node.closest(".dshwear-seat")) return "persona";
      if (node.closest("[data-dsh-role-mount]") || node.closest(".dshr-seat")) return "role";
      if (node.closest(".dshwear-loadout")) return "loadout";
      if (node.closest("[data-skillpress]")) return "skillpress";
      if (node.closest("[data-composer-card]")) return "composer";
      return null;
    }

    function setComposerDropHot(on) {
      for (const card of document.querySelectorAll("[data-composer-card]")) {
        card.classList.toggle("dshsb-composer-drop", on);
      }
    }

    function confinePageDrops(event) {
      if (!transferHasFiles(event)) return;
      const zone = dropZoneOf(event);
      if (zone === "composer") {
        if (event.type === "dragenter" || event.type === "dragover") setComposerDropHot(true);
        if (event.type === "drop") setComposerDropHot(false);
        if (event.type === "dragleave") {
          const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
          if (!next || !next.closest("[data-composer-card]")) setComposerDropHot(false);
        }
        return;
      }
      if (zone === "skillbar" || zone === "skillpress" || zone === "persona" || zone === "role" || zone === "loadout") {
        setComposerDropHot(false);
        return;
      }
      event.stopPropagation();
      if (event.type === "dragenter" || event.type === "dragover" || event.type === "drop") {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      setComposerDropHot(false);
    }

    function HudPortal({ children }) {
      const markerRef = React.useRef(null);
      const [host, setHost] = React.useState(null);
      React.useLayoutEffect(() => {
        setHost(markerRef.current?.closest("[data-phase]") ?? null);
      }, []);
      return React.createElement(React.Fragment, null,
        React.createElement("span", { ref: markerRef, className: "dshsb-marker", "aria-hidden": "true" }),
        host ? createPortal(children, host) : null,
      );
    }

    function LoadoutSkillsPortal({ kit, children }) {
      const [host, setHost] = React.useState(null);
      React.useLayoutEffect(() => {
        const place = () => {
          const node = document.querySelector(`[data-dsh-loadout-skills="${kit}"]`);
          setHost((cur) => (cur === node ? cur : node));
        };
        place();
        const observer = new MutationObserver(place);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
      }, [kit]);
      return host ? createPortal(children, host) : null;
    }

    function SkillBar({ inputActions }) {
      const [soulName, setSoulName] = React.useState(wornSoulName);
      const [roleName, setRoleName] = React.useState(wornRoleName);
      const [userSlots, setUserSlots] = React.useState(() => loadSlots("user"));
      const [soulSlots, setSoulSlots] = React.useState(() => loadSlots("soul", wornSoulName()));
      const [roleSlots, setRoleSlots] = React.useState(() => loadSlots("role", wornRoleName()));
      const [over, setOver] = React.useState(null);
      const [casting, setCasting] = React.useState(null);
      const [hint, setHint] = React.useState("");
      const [picker, setPicker] = React.useState(null);
      const [pickerCards, setPickerCards] = React.useState([]);
      const dragFrom = React.useRef(null);
      const ignoreClick = React.useRef(false);
      const fileRefs = React.useRef({});
      const soulRef = React.useRef(soulName);
      soulRef.current = soulName;
      const roleRef = React.useRef(roleName);
      roleRef.current = roleName;
      const userSlotsRef = React.useRef(userSlots);
      userSlotsRef.current = userSlots;
      const soulSlotsRef = React.useRef(soulSlots);
      soulSlotsRef.current = soulSlots;
      const roleSlotsRef = React.useRef(roleSlots);
      roleSlotsRef.current = roleSlots;

      const slotsOf = React.useCallback((kind) => {
        if (kind === "soul") return soulSlotsRef.current;
        if (kind === "role") return roleSlotsRef.current;
        return userSlotsRef.current;
      }, []);

      const commit = React.useCallback((kind, next) => {
        if (kind === "soul") {
          setSoulSlots(next);
          saveSlots("soul", soulRef.current, next);
        } else if (kind === "role") {
          setRoleSlots(next);
          saveSlots("role", roleRef.current, next);
        } else {
          setUserSlots(next);
          saveSlots("user", null, next);
        }
      }, []);

      React.useEffect(() => {
        const syncSoul = () => {
          const next = wornSoulName();
          setSoulName(next);
          setSoulSlots(loadSlots("soul", next));
        };
        const syncRole = () => {
          const next = wornRoleName();
          setRoleName(next);
          setRoleSlots(loadSlots("role", next));
        };
        const syncAgent = () => {
          syncSoul();
          syncRole();
        };
        window.addEventListener("dsh-persona-changed", syncSoul);
        window.addEventListener("dsh-roles-changed", syncRole);
        window.addEventListener("dsh-agents-changed", syncAgent);
        return () => {
          window.removeEventListener("dsh-persona-changed", syncSoul);
          window.removeEventListener("dsh-roles-changed", syncRole);
          window.removeEventListener("dsh-agents-changed", syncAgent);
        };
      }, []);

      const show = React.useCallback((text) => {
        setHint(text);
      }, []);

      const equipAt = React.useCallback(async (kind, index, file) => {
        try {
          const skill = await parseSkillCard(file);
          const next = slotsOf(kind).slice();
          next[index] = skill;
          commit(kind, next);
          show(`Loaded ${skill.name}${kind === "user" ? "" : ` on the ${kind} bar`}.`);
        } catch (error) {
          show(String(error?.message ?? error));
        }
      }, [commit, show, slotsOf]);

      // Empty-slot picker: choose a skill card from the skillpress gallery, or
      // fall back to the file picker for a PNG on disk. Equipped slots are
      // untouched — those still cast on click (see the slot onClick below).
      const openPicker = React.useCallback((kind, index, anchorEl) => {
        const rect = anchorEl?.getBoundingClientRect?.();
        const top = rect ? Math.max(8, rect.top - 8 - 240) : Math.max(8, window.innerHeight / 2 - 150);
        const left = rect
          ? Math.min(window.innerWidth - 272, Math.max(8, rect.left + rect.width / 2 - 130))
          : Math.max(8, window.innerWidth / 2 - 130);
        setPicker({ kind, index, top, left });
      }, []);

      React.useEffect(() => {
        if (!picker) return undefined;
        let cancelled = false;
        void fetch("/dsh-plugin-skillpress/cards").then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (cancelled) return;
          const list = Array.isArray(body.cards) ? body.cards : [];
          setPickerCards(list.filter((card) => !card.kind || card.kind === "skill"));
        }).catch(() => {
          if (!cancelled) setPickerCards([]);
        });
        const onDoc = (event) => {
          const node = event.target instanceof Element ? event.target : null;
          if (node?.closest("[data-dsh-skill-pick]")) return;
          setPicker(null);
        };
        const onKey = (event) => { if (event.key === "Escape") setPicker(null); };
        window.addEventListener("mousedown", onDoc);
        window.addEventListener("keydown", onKey);
        return () => {
          cancelled = true;
          window.removeEventListener("mousedown", onDoc);
          window.removeEventListener("keydown", onKey);
        };
      }, [picker?.kind, picker?.index]); // eslint-disable-line react-hooks/exhaustive-deps

      const pickFromGallery = React.useCallback(async (card) => {
        const target = picker;
        setPicker(null);
        if (!target) return;
        try {
          const res = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(card.name)}`);
          if (!res.ok) throw new Error("That card is not in the gallery.");
          const file = new File([await res.blob()], `${card.name}.png`, { type: "image/png" });
          await equipAt(target.kind, target.index, file);
        } catch (error) {
          show(String(error?.message ?? error));
        }
      }, [equipAt, picker, show]);

      const onPlateDrag = React.useCallback((event) => {
        event.stopPropagation();
        if (event.type === "dragenter" || event.type === "dragover" || event.type === "drop") {
          event.preventDefault();
          if (event.dataTransfer) {
            const types = [...event.dataTransfer.types];
            event.dataTransfer.dropEffect = types.includes(MIME_SLOT) ? "move" : types.includes("Files") ? "copy" : "none";
          }
        }
      }, []);

      const onPlateDrop = React.useCallback((kind) => (event) => {
        onPlateDrag(event);
        const fromRaw = event.dataTransfer.getData(MIME_SLOT);
        if (fromRaw !== "") return;
        const file = [...event.dataTransfer.files].find((f) =>
          f.type === "image/png" || f.name.toLowerCase().endsWith(".png"));
        if (!file) {
          show("Drop a skill card PNG.");
          return;
        }
        const empty = slotsOf(kind).findIndex((s) => !s);
        if (empty < 0) {
          show(kind === "user" ? "The bar is full. Unequip one first." : `The ${kind} bar is full. Unequip one first.`);
          return;
        }
        void equipAt(kind, empty, file);
      }, [equipAt, onPlateDrag, show, slotsOf]);

      const unequip = React.useCallback((kind, index) => {
        const current = slotsOf(kind)[index];
        const next = slotsOf(kind).slice();
        next[index] = null;
        commit(kind, next);
        show(current ? `Unequipped ${current.name}.` : "Empty slot.");
      }, [commit, show, slotsOf]);

      const primaryKind = "user";

      const cast = React.useCallback(async (kind, index) => {
        const skill = slotsOf(kind)[index];
        if (!skill) {
          // Keyboard path: no click anchor, so the picker opens centered.
          openPicker(kind, index, null);
          return;
        }
        if (!inputActions) {
          show("Open a conversation before casting.");
          return;
        }
        setCasting(`${kind}:${index}`);
        window.setTimeout(() => setCasting((cur) => (cur === `${kind}:${index}` ? null : cur)), CAST_MS);
        try {
          if (skill.files) {
            const res = await fetch("/dsh-plugin-skillbar/install", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name: skill.name, files: skill.files }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || `install failed (${res.status})`);
            await new Promise((resolve) => window.setTimeout(resolve, WATCH_MS));
          }
          inputActions.setDraft(`/${skill.name}`);
          // No auto-submit: the user reviews the loaded command and hits send.
          show(`Loaded ${skill.name} into the composer — hit send when ready.`);
        } catch (error) {
          show(String(error?.message ?? error));
        }
      }, [inputActions, show, slotsOf]);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          if (typingInField(event.target)) return;
          const n = /^[1-8]$/.test(event.key) ? Number(event.key) - 1 : -1;
          if (n < 0) return;
          event.preventDefault();
          void cast(primaryKind, n);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [cast, primaryKind]);

      React.useEffect(() => {
        const onEquip = async (event) => {
          const name = event.detail?.name;
          const file = event.detail?.file;
          const kind = event.detail?.kit === "soul" || event.detail?.kit === "role"
            ? event.detail.kit
            : "user";
          try {
            let pngFile = file;
            if (!pngFile && name) {
              const res = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(name)}`);
              if (!res.ok) throw new Error("That card is not in the gallery.");
              pngFile = new File([await res.blob()], `${name}.png`, { type: "image/png" });
            }
            if (!pngFile) return;
            const empty = slotsOf(kind).findIndex((s) => !s);
            if (empty < 0) {
              show(kind === "user" ? "The bar is full. Unequip one first." : `The ${kind} bar is full. Unequip one first.`);
              return;
            }
            await equipAt(kind, empty, pngFile);
          } catch (error) {
            show(String(error?.message ?? error));
          }
        };
        window.addEventListener("dsh-skillbar-equip", onEquip);
        return () => window.removeEventListener("dsh-skillbar-equip", onEquip);
      }, [equipAt, show, slotsOf]);

      const renderSlots = (kind, prefix, numbered) => {
        const slots = kind === "soul" ? soulSlots : kind === "role" ? roleSlots : userSlots;
        const label = kind === "soul" ? "Soul skill slots" : kind === "role" ? "Role skill slots" : "Skill slots";
        return React.createElement("div", {
          className: "dshsb-slots",
          role: "toolbar",
          "aria-label": label,
          onDragEnter: onPlateDrag,
          onDragOver: onPlateDrag,
          onDragLeave: onPlateDrag,
          onDrop: onPlateDrop(kind),
        },
          slots.map((skill, index) =>
            React.createElement("div", { key: `${prefix}-${kind}-${index}`, className: "dshsb-slotwrap" },
              React.createElement("button", {
                type: "button",
                className: "dshsb-slot",
                "data-empty": skill ? "0" : "1",
                "data-over": over === `${kind}:${index}` ? "1" : "0",
                "data-casting": casting === `${kind}:${index}` ? "1" : "0",
                disabled: Boolean(skill) && !inputActions,
                title: skill
                  ? undefined
                  : `Empty slot ${index + 1}. Drop a skill card PNG, or click to pick one from the gallery.`,
                "aria-label": skill ? `Cast ${skill.name}` : `Load skill on slot ${index + 1}`,
                draggable: Boolean(skill),
                onDragStart: (event) => {
                  dragFrom.current = { kind, index };
                  event.dataTransfer.setData(MIME_SLOT, `${kind}:${index}`);
                  event.dataTransfer.effectAllowed = "move";
                },
                onDragEnd: () => {
                  dragFrom.current = null;
                  ignoreClick.current = true;
                  setOver(null);
                },
                onDragOver: (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = [...event.dataTransfer.types].includes(MIME_SLOT) ? "move" : "copy";
                  setOver(`${kind}:${index}`);
                },
                onDragLeave: (event) => {
                  event.stopPropagation();
                  setOver((cur) => (cur === `${kind}:${index}` ? null : cur));
                },
                onDrop: (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOver(null);
                  const fromRaw = event.dataTransfer.getData(MIME_SLOT);
                  if (fromRaw !== "") {
                    const [fromKind, fromIdx] = fromRaw.split(":");
                    const from = Number(fromIdx);
                    if (fromKind === kind && Number.isInteger(from) && from !== index) {
                      const next = slotsOf(kind).slice();
                      const tmp = next[from];
                      next[from] = next[index];
                      next[index] = tmp;
                      commit(kind, next);
                    }
                    return;
                  }
                  const file = [...event.dataTransfer.files].find((f) =>
                    f.type === "image/png" || f.name.toLowerCase().endsWith(".png"));
                  if (!file) {
                    show("Drop a skill card PNG.");
                    return;
                  }
                  void equipAt(kind, index, file);
                },
                onContextMenu: (event) => {
                  if (!skill) return;
                  event.preventDefault();
                  unequip(kind, index);
                },
                onClick: (event) => {
                  if (ignoreClick.current) {
                    ignoreClick.current = false;
                    return;
                  }
                  if (!skill) {
                    openPicker(kind, index, event.currentTarget);
                    return;
                  }
                  void cast(kind, index);
                },
              },
                React.createElement("span", { className: "dshsb-halo", "aria-hidden": "true" }),
                skill
                  ? React.createElement("img", { className: "dshsb-face", src: skill.thumb, alt: "" })
                  : React.createElement("span", { className: "dshsb-empty", "aria-hidden": "true" }),
              ),
              skill
                ? React.createElement("span", { className: "dshsb-tip", role: "tooltip" },
                    React.createElement("span", { className: "dshsb-tip-name" }, skill.name),
                    skill.description
                      ? React.createElement("span", { className: "dshsb-tip-desc" },
                          skill.description.length > 120 ? `${skill.description.slice(0, 117)}…` : skill.description)
                      : null,
                  )
                : null,
              skill
                ? React.createElement("button", {
                    type: "button",
                    className: "dshsb-unequip",
                    "aria-label": `Unequip ${skill.name}`,
                    title: "Unequip",
                    onClick: (event) => {
                      event.stopPropagation();
                      unequip(kind, index);
                    },
                  }, "×")
                : null,
              numbered
                ? React.createElement("span", { className: "dshsb-key" }, String(index + 1))
                : React.createElement("span", { className: "dshsb-key" }, "\u00a0"),
              React.createElement("input", {
                ref: (node) => { fileRefs.current[`${prefix}-${kind}-${index}`] = node; },
                className: "dshsb-file",
                type: "file",
                accept: "image/png,.png",
                tabIndex: -1,
                "aria-hidden": "true",
                onChange: (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void equipAt(kind, index, file);
                },
              }),
            ),
          ),
        );
      };

      return React.createElement(React.Fragment, null,
        React.createElement(HudPortal, null,
          React.createElement("div", { className: "dshsb-dock" },
            React.createElement("div", { className: "dshsb-plate" },
              renderSlots("user", "hud", true),
            ),
            React.createElement("div", { className: "dshsb-live", role: "status", "aria-live": "polite" }, hint),
          ),
        ),
        React.createElement(LoadoutSkillsPortal, { kit: "soul" },
          renderSlots("soul", "sheet", false),
        ),
        React.createElement(LoadoutSkillsPortal, { kit: "role" },
          renderSlots("role", "sheet", false),
        ),
        picker && typeof document !== "undefined"
          ? createPortal(
              React.createElement("div", {
                className: "dshsb-pick",
                "data-dsh-skill-pick": "1",
                role: "listbox",
                "aria-label": "Pick a skill from the gallery",
                style: { top: `${picker.top}px`, left: `${picker.left}px` },
              },
                pickerCards.length
                  ? pickerCards.map((card) => React.createElement("button", {
                      key: card.name,
                      type: "button",
                      className: "dshsb-pick-item",
                      role: "option",
                      "aria-selected": "false",
                      onClick: () => void pickFromGallery(card),
                    },
                      card.url ? React.createElement("img", { src: card.url, alt: "" }) : null,
                      React.createElement("span", null, card.name),
                    ))
                  : React.createElement("p", { className: "dshsb-pick-empty" }, "No skill cards in the gallery."),
                React.createElement("button", {
                  type: "button",
                  className: "dshsb-pick-item dshsb-pick-file",
                  onClick: () => {
                    const target = picker;
                    setPicker(null);
                    (fileRefs.current[`hud-${target.kind}-${target.index}`] ||
                      fileRefs.current[`sheet-${target.kind}-${target.index}`])?.click();
                  },
                }, "From file…"),
              ),
              document.body,
            )
          : null,
      );
    }

      return { SkillBar, confinePageDrops };
    })();

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "persona",
        order: 1,
      }, PersonaSeat));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "roles",
        order: 2,
      }, RoleSeat));
      const dragEvents = ["dragenter", "dragover", "dragleave", "drop"];
      for (const type of dragEvents) {
        window.addEventListener(type, confinePageDrops, true);
      }
      window.addEventListener("dragend", () => setComposerDropHot(false));
      ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
        name: "conversation.input.dock",
        id: "skillbar",
        order: 30,
      }, SkillBar));
      ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
        name: "conversation.composer.dock",
        id: "stats",
        priority: -1,
      }, function NoStats() {
        return null;
      }));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
