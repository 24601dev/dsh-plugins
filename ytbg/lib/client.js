window.__ModuleLoader__.load({
  id: "dsh-plugin-ytbg",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const STORAGE_KEY = "dsh-plugin-ytbg:v1";
    const EVENT = "dsh-ytbg-changed";
    const ATTR = "data-dsh-yt";
    const BOOT = 11;
    const DEFAULTS = {
      on: false,
      url: "",
      dim: 0.42,
      volume: 35,
      muted: true,
      hud: true,
      collapsed: true,
      x: null,
      y: null,
    };

    const ICON = {
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 4.5v15l12-7.5z"/></svg>',
      pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
      stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>',
      replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 6V2L7 7l5 5V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
      expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.4 14.6 12 10l4.6 4.6 1.4-1.4L12 7.2 6 13.2z"/></svg>',
      collapse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.4 9.4 12 14l4.6-4.6 1.4 1.4L12 16.8 6 10.8z"/></svg>',
    };

    function parseId(input) {
      const text = String(input || "").trim();
      if (!text) return "";
      if (/^[\w-]{11}$/.test(text)) return text;
      try {
        const url = new URL(text);
        if (url.searchParams.get("v")) return url.searchParams.get("v").slice(0, 11);
        const host = url.hostname.replace(/^www\./, "");
        if (host === "youtu.be") return (url.pathname.split("/").filter(Boolean)[0] || "").slice(0, 11);
        const parts = url.pathname.split("/").filter(Boolean);
        const key = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live" || p === "v");
        if (key >= 0 && parts[key + 1]) return parts[key + 1].slice(0, 11);
      } catch { /* not a URL */ }
      const match = text.match(/[\w-]{11}/);
      return match ? match[0] : "";
    }

    function readConfig() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (parsed && typeof parsed === "object") return { ...DEFAULTS, ...parsed };
      } catch { /* ignore */ }
      return { ...DEFAULTS };
    }

    function writeConfig(next) {
      const config = { ...DEFAULTS, ...readConfig(), ...next };
      delete config.loop;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* private mode */ }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: config }));
      return config;
    }

    function ensureStyle(id, css) {
      if (typeof document === "undefined") return;
      let tag = document.querySelector(`style[data-dsh-style="${id}"]`);
      if (!tag) {
        tag = document.createElement("style");
        tag.setAttribute("data-dsh-style", id);
        tag.setAttribute("data-plugin", "dsh-plugin-ytbg");
        (document.head || document.documentElement).appendChild(tag);
      }
      tag.textContent = css;
    }

    const on = `html[${ATTR}="on"] body[${ATTR}="on"]`;
    const css = `
html[${ATTR}="on"]{background:#000!important}
body[${ATTR}="on"]{background:transparent!important}
${on} #root,
${on} [class*="_frame"],
${on} [class*="centerCol"],
${on} [class*="centerCol"]::before,
${on} [class*="centerCol"]::after,
${on}[data-ds-dark-theme] [class*="centerCol"],
${on}[data-dsh-theme] [class*="centerCol"],
${on}[data-dsh-p5] [class*="centerCol"],
${on} .wSkVaW_root,
${on} .wSkVaW_root[data-phase],
${on} .wSkVaW_scrollBody,
${on} [class*="scrollBody"],
${on} [data-conversation-scroll],
${on} .wSkVaW_viewArea,
${on} .pXSMma_root,
${on} .wSkVaW_composerSeat,
${on} .wSkVaW_root[data-phase] .wSkVaW_composerSeat,
${on} [data-composer-seat]{
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
  isolation:auto!important;
}
${on} [class*="centerCol"]::before,
${on} [class*="centerCol"]::after,
${on}[data-ds-dark-theme] [class*="centerCol"]::before,
${on}[data-dsh-theme] [class*="centerCol"]::before,
${on}[data-dsh-p5] [class*="centerCol"]::before{
  content:none!important;display:none!important;background:none!important
}
${on} [class*="sidebarCol"]{
  background:color-mix(in srgb,var(--dsw-alias-bg-base) 78%,transparent)!important;
}
${on} [class*="detailsCol"],
${on} .wSkVaW_header{
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent)!important;
}
${on} [data-composer-card]{
  background:color-mix(in srgb,var(--dsw-specific-input-major,var(--dsw-alias-bg-layer-1)) 88%,transparent)!important;
}
${on} .wSkVaW_root{
  --dshyt-ink:0 1px 1px rgba(0,0,0,.92),0 0 6px rgba(0,0,0,.78),0 0 14px rgba(0,0,0,.42);
  text-shadow:var(--dshyt-ink);
}
${on} .wSkVaW_root :is(h1,h2,h3,h4,p,span,li,a,label,button,code,pre,blockquote,td,th,small,strong,em,cite){
  text-shadow:var(--dshyt-ink);
}
${on} .pXSMma_fish{
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.9)) drop-shadow(0 0 8px rgba(0,0,0,.5));
}
${on} [data-composer-card],
${on} [data-composer-card] *,
${on} .dshsb-dock,
${on} .dshsb-dock *,
${on} .Md3f7G_turnStatus{
  text-shadow:none!important;
  filter:none;
}
${on} #root{position:relative;z-index:1}

.dshyt-stage,.dshyt-dim{
  position:fixed!important;
  top:var(--dshyt-t,0px)!important;
  right:var(--dshyt-r,0px)!important;
  bottom:var(--dshyt-b,0px)!important;
  left:var(--dshyt-l,0px)!important;
  z-index:0!important;overflow:hidden!important;pointer-events:none!important
}
.dshyt-stage{background:#000;container-type:size}
.dshyt-stage iframe,.dshyt-stage > div,#dshyt-player{
  position:absolute!important;inset:auto!important;top:0!important;left:50%!important;
  width:min(100cqw,calc(100cqh * 16 / 9))!important;
  height:min(100cqh,calc(100cqw * 9 / 16))!important;
  max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;
  transform:translate(-50%,0)!important;border:0!important;display:block!important;
  -webkit-mask-image:linear-gradient(180deg,#000 0 58%,transparent 100%);
  mask-image:linear-gradient(180deg,#000 0 58%,transparent 100%);
  -webkit-mask-size:100% 100%;mask-size:100% 100%;
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat
}
.dshyt-stage iframe,#dshyt-player{opacity:.8}
.dshyt-cover{
  z-index:1!important;pointer-events:none!important;
  background-color:#000;background-position:center!important;background-size:cover!important;background-repeat:no-repeat!important;
  opacity:0
}
.dshyt-stage:not([data-playing="1"]) .dshyt-cover{opacity:.8}
.dshyt-dim{background:#000}
.dshyt-stage[hidden],.dshyt-dim[hidden],.dshyt-hud[hidden]{display:none!important}
.dshyt-hud{
  position:fixed;z-index:12;display:flex;flex-wrap:wrap;align-items:center;gap:2px;padding:4px;
  color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);
  background:var(--dsw-alias-button-floating-fill);
  border:1px solid var(--dsw-alias-border-l2);border-radius:14px;
  box-shadow:var(--dsw-shadow-lv2);user-select:none;max-width:min(320px,calc(100vw - 16px))
}
.dshyt-grip{flex:none;width:12px;height:28px;padding:0;border:0;color:var(--dsw-alias-label-tertiary);background:radial-gradient(circle,currentColor 1px,transparent 1.2px) 50% 50%/6px 6px;opacity:.7;cursor:grab}
.dshyt-grip:active{cursor:grabbing}
.dshyt-hud button[data-act]{appearance:none;box-sizing:border-box;width:32px;height:32px;padding:0;display:grid;place-items:center;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.dshyt-hud button[data-act]:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshyt-hud button[data-act] svg{width:16px;height:16px;display:block}
.dshyt-extra{display:flex;flex-direction:column;gap:6px;flex:1 1 100%;width:260px;padding:2px 8px 6px}
.dshyt-hud[data-collapsed="1"] .dshyt-extra{display:none}
.dshyt-extra label{display:flex;align-items:center;gap:8px;margin:0;font-size:0}
.dshyt-extra input[type="range"]{flex:1;width:100%;margin:0;accent-color:var(--dsw-alias-state-business-primary);height:14px}
.dshyt-extra input[type="url"],.dshyt-extra input[data-act="url"]{
  width:100%;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
  font:var(--dsw-font-xxs-12,12px/18px var(--dsw-font-family,inherit));box-sizing:border-box
}
.dshyt-extra input[data-act="url"]::placeholder{color:var(--dsw-alias-label-caption)}
.dshyt-settings{display:flex;flex-direction:column;gap:8px;width:100%;max-width:100%;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2);box-sizing:border-box}
.dshyt-settings h3{margin:0;font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dshyt-settings p{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshyt-settings label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-primary)}
.dshyt-settings input[type="text"]{width:100%;max-width:100%;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;box-sizing:border-box}
`;

    function loadApi() {
      if (window.YT && typeof window.YT.Player === "function") return Promise.resolve();
      return new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        const timer = window.setTimeout(() => reject(new Error("YouTube API timed out")), 12000);
        window.onYouTubeIframeAPIReady = () => {
          window.clearTimeout(timer);
          if (typeof prev === "function") prev();
          resolve();
        };
        if (!document.querySelector('script[data-dsh-ytapi]')) {
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          script.async = true;
          script.dataset.dshYtapi = "1";
          script.onerror = () => reject(new Error("Could not load YouTube API"));
          document.head.appendChild(script);
        }
      });
    }

    function boot() {
      if (typeof document === "undefined") return;
      if (window.__dshYtbgBoot === BOOT) return;
      document.querySelectorAll(".dshyt-stage, .dshyt-dim, .dshyt-hud").forEach((el) => el.remove());
      window.__dshYtbgBoot = BOOT;
      ensureStyle("ytbg", css);

      const stage = document.createElement("div");
      stage.className = "dshyt-stage";
      stage.hidden = true;
      const mount = document.createElement("div");
      mount.id = "dshyt-player";
      const cover = document.createElement("div");
      cover.className = "dshyt-cover";
      stage.append(mount, cover);

      const dim = document.createElement("div");
      dim.className = "dshyt-dim";
      dim.hidden = true;

      const hud = document.createElement("div");
      hud.className = "dshyt-hud";
      hud.hidden = true;
      hud.innerHTML = `
        <button type="button" class="dshyt-grip" aria-label="Move"></button>
        <button type="button" data-act="play" aria-label="Play">${ICON.play}</button>
        <button type="button" data-act="stop" aria-label="Stop">${ICON.stop}</button>
        <button type="button" data-act="replay" aria-label="Replay">${ICON.replay}</button>
        <button type="button" data-act="fold" aria-label="Show volume and progress">${ICON.expand}</button>
        <div class="dshyt-extra">
          <input type="url" data-act="url" spellcheck="false" autocomplete="off" aria-label="YouTube URL" placeholder="youtube.com/watch?v=">
          <label><input type="range" data-act="vol" min="0" max="100" aria-label="Volume"></label>
          <label><input type="range" data-act="seek" min="0" max="1000" value="0" aria-label="Playback position"></label>
        </div>
      `;

      document.body.prepend(stage);
      document.body.append(dim, hud);

      const playBtn = hud.querySelector("[data-act=play]");
      const foldBtn = hud.querySelector("[data-act=fold]");
      const volEl = hud.querySelector("[data-act=vol]");
      const seekEl = hud.querySelector("[data-act=seek]");
      const urlEl = hud.querySelector("[data-act=url]");
      let player = null;
      let wantedId = "";
      let dragging = null;
      let playing = false;
      let seeking = false;
      let seatWatch = null;

      function visibleBottom(el) {
        if (!el) return 0;
        const box = el.getBoundingClientRect();
        if (box.height < 2 || box.width < 2) return 0;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return 0;
        return box.bottom;
      }

      function syncSeat() {
        const col = document.querySelector('[class*="centerCol"]');
        const root = document.documentElement;
        if (!col) {
          root.style.setProperty("--dshyt-t", "0px");
          root.style.setProperty("--dshyt-r", "0px");
          root.style.setProperty("--dshyt-b", "0px");
          root.style.setProperty("--dshyt-l", "0px");
          return;
        }
        const r = col.getBoundingClientRect();
        const navBottom = Math.max(
          r.top,
          visibleBottom(document.querySelector(".wSkVaW_header")),
          visibleBottom(document.querySelector(".wSkVaW_tabs")),
          visibleBottom(document.querySelector(".wSkVaW_titleRow")),
        );
        root.style.setProperty("--dshyt-t", `${Math.round(navBottom)}px`);
        root.style.setProperty("--dshyt-r", `${Math.round(Math.max(0, window.innerWidth - r.right))}px`);
        root.style.setProperty("--dshyt-b", `${Math.round(Math.max(0, window.innerHeight - r.bottom))}px`);
        root.style.setProperty("--dshyt-l", `${Math.round(Math.max(0, r.left))}px`);
      }

      function watchSeat() {
        if (!seatWatch) seatWatch = new ResizeObserver(() => syncSeat());
        const col = document.querySelector('[class*="centerCol"]');
        if (col && seatWatch.col !== col) {
          if (seatWatch.col) seatWatch.unobserve(seatWatch.col);
          seatWatch.observe(col);
          seatWatch.col = col;
        }
        const header = document.querySelector(".wSkVaW_header");
        if (header && seatWatch.header !== header) {
          if (seatWatch.header) seatWatch.unobserve(seatWatch.header);
          seatWatch.observe(header);
          seatWatch.header = header;
        }
        const frame = document.querySelector('[class*="_frame"]');
        if (frame && seatWatch.frame !== frame) {
          if (seatWatch.frame) seatWatch.unobserve(seatWatch.frame);
          seatWatch.observe(frame);
          seatWatch.frame = frame;
        }
        syncSeat();
      }

      function place(config) {
        const fallbackX = window.innerWidth - (config.collapsed ? 160 : 280);
        const x = Number.isFinite(config.x) ? config.x : fallbackX;
        const y = Number.isFinite(config.y) ? config.y : window.innerHeight - 56;
        hud.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 48))}px`;
        hud.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 40))}px`;
      }

      function setPoster(id) {
        cover.style.backgroundImage = id
          ? `url("https://i.ytimg.com/vi/${id}/maxresdefault.jpg")`
          : "none";
      }

      function setPlaying(onPlay) {
        playing = onPlay;
        stage.dataset.playing = onPlay ? "1" : "0";
        playBtn.innerHTML = onPlay ? ICON.pause : ICON.play;
        playBtn.setAttribute("aria-label", onPlay ? "Pause" : "Play");
      }

      function setCollapsed(collapsed) {
        hud.dataset.collapsed = collapsed ? "1" : "0";
        foldBtn.innerHTML = collapsed ? ICON.expand : ICON.collapse;
        foldBtn.setAttribute("aria-label", collapsed ? "Show volume and progress" : "Hide volume and progress");
      }

      function applyVolume(config) {
        volEl.value = String(config.volume);
        if (!player || typeof player.setVolume !== "function") return;
        player.setVolume(config.volume);
        if (config.muted) player.mute();
        else player.unMute();
      }

      function syncSeek() {
        if (seeking || !player || typeof player.getDuration !== "function") return;
        const duration = player.getDuration();
        if (!duration) return;
        seekEl.value = String(Math.round((player.getCurrentTime() / duration) * 1000));
      }

      function muteCaptions(target) {
        const yt = target || player;
        if (!yt || typeof yt.unloadModule !== "function") return;
        try { yt.unloadModule("captions"); } catch { /* module not loaded yet */ }
        try { yt.unloadModule("cc"); } catch { /* same */ }
      }

      function apply(config) {
        ensureStyle("ytbg", css);
        const id = parseId(config.url);
        const enabled = config.on && Boolean(id);
        document.documentElement.setAttribute(ATTR, enabled ? "on" : "off");
        document.body.setAttribute(ATTR, enabled ? "on" : "off");
        stage.hidden = !enabled;
        dim.hidden = !enabled;
        hud.hidden = !(config.on && config.hud);
        dim.style.opacity = String(config.dim);
        setCollapsed(Boolean(config.collapsed));
        applyVolume(config);
        if (urlEl && document.activeElement !== urlEl) urlEl.value = config.url || "";
        setPoster(id);
        place(config);
        if (enabled) {
          watchSeat();
          requestAnimationFrame(() => watchSeat());
        }
        else syncSeat();
        if (!config.on) {
          if (player && typeof player.pauseVideo === "function") player.pauseVideo();
          setPlaying(false);
          return;
        }
        if (!id) return;
        void ensurePlayer(id).catch(() => {});
      }

      async function ensurePlayer(id) {
        if (!id) return null;
        await loadApi();
        if (player && wantedId === id) return player;
        wantedId = id;
        if (player && typeof player.loadVideoById === "function") {
          player.loadVideoById(id);
          muteCaptions(player);
          return player;
        }
        player = new window.YT.Player(mount, {
          width: "100%",
          height: "100%",
          videoId: id,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            origin: window.location.origin,
          },
          events: {
            onReady(event) {
              muteCaptions(event.target);
              applyVolume(readConfig());
              event.target.playVideo();
            },
            onApiChange(event) {
              muteCaptions(event.target);
            },
            onStateChange(event) {
              const state = event.data;
              const YT = window.YT.PlayerState;
              if (state === YT.ENDED) {
                event.target.seekTo(0, true);
                event.target.pauseVideo();
                setPlaying(false);
                return;
              }
              setPlaying(state === YT.PLAYING);
              if (state === YT.PLAYING) muteCaptions(event.target);
            },
          },
        });
        return player;
      }

      hud.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-act]");
        if (!btn) return;
        const act = btn.getAttribute("data-act");
        if (act === "fold") {
          writeConfig({ collapsed: !readConfig().collapsed });
          return;
        }
        if (!player) return;
        if (act === "play") {
          if (playing) player.pauseVideo();
          else player.playVideo();
        } else if (act === "stop") {
          player.pauseVideo();
          player.seekTo(0, true);
          setPlaying(false);
        } else if (act === "replay") {
          player.seekTo(0, true);
          player.playVideo();
        }
      });

      hud.addEventListener("input", (event) => {
        const el = event.target;
        if (!(el instanceof HTMLInputElement)) return;
        const act = el.getAttribute("data-act");
        if (act === "vol") {
          const volume = Number(el.value);
          writeConfig({ volume });
          if (player && typeof player.setVolume === "function") player.setVolume(volume);
        } else if (act === "seek" && player && typeof player.getDuration === "function") {
          const duration = player.getDuration();
          if (duration) player.seekTo(duration * Number(el.value) / 1000, true);
        }
      });
      urlEl.addEventListener("change", () => writeConfig({ url: urlEl.value, on: true }));
      urlEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          writeConfig({ url: urlEl.value, on: true });
          urlEl.blur();
        }
      });
      seekEl.addEventListener("pointerdown", () => { seeking = true; });
      seekEl.addEventListener("pointerup", () => { seeking = false; });
      seekEl.addEventListener("pointercancel", () => { seeking = false; });

      hud.querySelector(".dshyt-grip").addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const rect = hud.getBoundingClientRect();
        dragging = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
        hud.setPointerCapture(event.pointerId);
      });
      hud.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        hud.style.left = `${event.clientX - dragging.dx}px`;
        hud.style.top = `${event.clientY - dragging.dy}px`;
      });
      hud.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = null;
        writeConfig({
          x: parseFloat(hud.style.left),
          y: parseFloat(hud.style.top),
        });
      });

      window.addEventListener(EVENT, (event) => apply(event.detail || readConfig()));
      window.addEventListener("resize", () => {
        place(readConfig());
        syncSeat();
      });
      window.setInterval(syncSeek, 400);
      apply(readConfig());
    }

    if (typeof document !== "undefined") {
      ensureStyle("ytbg", css);
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
      } else {
        boot();
      }
    }

    function SettingsRow() {
      const [config, setConfig] = React.useState(readConfig);

      React.useEffect(() => {
        function onChange(event) {
          setConfig(event.detail || readConfig());
        }
        window.addEventListener(EVENT, onChange);
        return () => window.removeEventListener(EVENT, onChange);
      }, []);

      return React.createElement("section", { className: "dshyt-settings" },
        React.createElement("h3", null, "YouTube backdrop"),
        React.createElement("p", null,
          "Video behind the chat. The corner deck is play, stop, and replay — expand it for volume and scrub. Drag the dotted strip to move it."),
        React.createElement("label", null,
          React.createElement("input", {
            type: "checkbox",
            checked: config.on,
            onChange: (event) => writeConfig({ on: event.target.checked }),
          }),
          " Enable backdrop",
        ),
        React.createElement("label", null,
          React.createElement("input", {
            type: "checkbox",
            checked: config.hud,
            onChange: (event) => writeConfig({ hud: event.target.checked }),
          }),
          " Show deck",
        ),
        React.createElement("label", null,
          React.createElement("input", {
            type: "checkbox",
            checked: !config.muted,
            onChange: (event) => {
              const muted = !event.target.checked;
              writeConfig({ muted });
            },
          }),
          " Sound",
        ),
        React.createElement("input", {
          type: "text",
          value: config.url,
          placeholder: "https://www.youtube.com/watch?v=…",
          spellCheck: false,
          onChange: (event) => setConfig({ ...config, url: event.target.value }),
          onBlur: (event) => writeConfig({ url: event.target.value }),
          onKeyDown: (event) => {
            if (event.key === "Enter") writeConfig({ url: event.target.value, on: true });
          },
        }),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "youtube-backdrop",
        order: 18,
      }, SettingsRow));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
