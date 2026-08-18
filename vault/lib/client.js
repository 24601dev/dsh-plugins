window.__ModuleLoader__.load({
  id: "dsh-plugin-vault",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const css = `
.dshv-row{display:flex;flex-direction:column;gap:8px;max-width:760px}
.dshv-label{margin:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshv-help{margin:0;font-size:13px;line-height:19px;color:var(--dsw-alias-label-tertiary)}
.dshv-form{display:flex;gap:8px}
.dshv-form input{flex:1;height:36px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font:inherit;font-size:13px}
.dshv-form button,.dshv-modalhead button{height:36px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:13px;cursor:pointer}
.dshv-form button:hover,.dshv-modalhead button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshv-err{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px}
.dshv-view{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:420px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);overflow:hidden}
.dshv-stage{position:relative;flex:1;min-width:0}
.dshv-canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none;overscroll-behavior:none;--dshv-edge:var(--dsw-alias-border-l2);--dshv-node:var(--dsw-alias-state-business-primary);--dshv-node-hot:var(--dsw-alias-label-primary);--dshv-ghost:var(--dsw-alias-label-tertiary);--dshv-label:var(--dsw-alias-label-primary)}
.dshv-canvas:active{cursor:grabbing}
.dshv-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center}
.dshv-empty h2{margin:0;font:inherit;font-size:18px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshv-empty p{margin:0;max-width:420px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.dshv-meta{position:absolute;left:12px;top:12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);pointer-events:none}
.dshv-drawer{box-sizing:border-box;width:340px;flex:none;border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);padding:16px 16px 20px;overflow:auto}
.dshv-drawer h3{margin:0 0 8px;font:inherit;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshv-kicker{margin:0 0 10px;font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all}
.dshv-body{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:13px;line-height:1.55;color:var(--dsw-alias-label-secondary)}
.dshv-links{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.dshv-chip{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-state-business-primary);border-radius:999px;padding:2px 8px;font:inherit;font-size:11px;cursor:pointer}
.dshv-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshv-open{display:inline-block;margin-top:12px;color:var(--dsw-alias-state-business-primary);font-size:12px}
.dshv-foot{box-sizing:border-box;cursor:pointer;width:calc(100% + 8px);height:34px;color:var(--dsw-alias-label-primary);background:transparent;border:none;border-radius:12px;flex:none;align-items:center;gap:8px;margin:4px -4px;padding:6px 2px 6px 10px;font:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}
.dshv-foot:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshv-foot[data-wide="0"]{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;margin:4px 0;padding:0}
.dshv-foot-label{white-space:nowrap;overflow:hidden}
.dshv-glyph{flex:none;display:block}
.hHd-Xa_footerActions{flex-direction:column;align-items:stretch;width:100%}
.hHd-Xa_collapsed .hHd-Xa_footerActions{flex-direction:column;align-items:center;width:auto}
.dshv-modal{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;gap:12px;padding:18px 20px 20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.dshv-modalhead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dshv-modalhead h2{margin:0;font:inherit;font-size:18px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshv-modalhead button{height:32px}
.dshv-modal .dshv-row{max-width:none}
.dshv-modalgraph{flex:1;min-height:0;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.dshv-tabbar{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;background:var(--dsw-alias-bg-base)}
.dshv-tab{border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:8px;padding:4px 12px;font:inherit;font-size:12px;cursor:pointer}
.dshv-tab:hover{color:var(--dsw-alias-label-primary)}
.dshv-tab[data-on="1"]{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3)}
.dshv-main{flex:1;min-height:0;display:flex;overflow:hidden}
.dshv-files{box-sizing:border-box;width:230px;flex:none;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);overflow:auto;padding:8px 6px}
.dshv-frow{display:flex;align-items:center;gap:6px;box-sizing:border-box;width:100%;border:0;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:4px 8px;border-radius:6px;cursor:pointer;text-align:left}
.dshv-frow span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dshv-frow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshv-frow[data-on="1"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}
.dshv-fcaret{flex:none;width:10px;color:var(--dsw-alias-label-tertiary);font-size:10px}
.dshv-editor{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.dshv-edhead{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}
.dshv-edtitle{flex:1;min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshv-edstate{font-size:11px;color:var(--dsw-alias-label-tertiary);flex:none}
.dshv-edsave{height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:12px;cursor:pointer;flex:none}
.dshv-edsave:disabled{opacity:.5;cursor:default}
.dshv-edsave:not(:disabled):hover{border-color:var(--dsw-alias-state-business-primary)}
.dshv-edarea{flex:1;min-height:0;border:0;outline:none;resize:none;background:transparent;color:var(--dsw-alias-label-primary);padding:12px 14px;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
.dshv-edempty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:13px;padding:24px;text-align:center}
`;

    if (typeof document !== "undefined") {
      let tag = document.querySelector('style[data-plugin-css="dsh-plugin-vault"]');
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.pluginCss = "dsh-plugin-vault";
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    async function api(path, options) {
      let res;
      try {
        res = await fetch(path, options);
      } catch {
        throw new Error("Harness is not reachable. Restart dsh web and hard-refresh.");
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `${res.status}`);
      return body;
    }

    function VaultSettings() {
      const [path, setPath] = React.useState("");
      const [draft, setDraft] = React.useState("");
      const [error, setError] = React.useState("");
      const [busy, setBusy] = React.useState(false);

      React.useEffect(() => {
        api("/dsh-plugin-vault/status").then((body) => {
          setPath(body.path || "");
          setDraft(body.path || "");
        }).catch((err) => setError(String(err.message)));
      }, []);

      async function save(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          const body = await api("/dsh-plugin-vault/path", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ path: draft.trim() }),
          });
          setPath(body.path || "");
          setDraft(body.path || "");
        } catch (err) {
          setError(String(err.message));
        } finally {
          setBusy(false);
        }
      }

      return React.createElement("section", { className: "dshv-row" },
        React.createElement("h3", { className: "dshv-label" }, "Vault"),
        React.createElement("p", { className: "dshv-help" },
          "Point at an Obsidian vault folder (the directory that contains your .md notes). The Vault tab in a session draws [[wikilinks]] as a graph. Obsidian does not need to be running."),
        React.createElement("form", { className: "dshv-form", onSubmit: save },
          React.createElement("input", {
            value: draft,
            onChange: (event) => setDraft(event.target.value),
            placeholder: "/Users/you/Documents/Vault",
            spellCheck: false,
            "aria-label": "Obsidian vault path",
          }),
          React.createElement("button", { type: "submit", disabled: busy }, busy ? "Saving…" : "Use vault"),
        ),
        error ? React.createElement("p", { className: "dshv-err" }, error) : null,
        path ? React.createElement("p", { className: "dshv-help" }, `Linked: ${path}`) : null,
      );
    }

    function folderOf(node) {
      const path = String(node.rel || node.id || "").replace(/\.md$/i, "");
      const slash = path.indexOf("/");
      return slash > 0 ? path.slice(0, slash) : "(root)";
    }

    function hashHue(str) {
      let h = 0;
      for (let i = 0; i < str.length; i += 1) h = (h * 33 + str.charCodeAt(i)) | 0;
      return Math.abs(h) % 360;
    }

    function fitCam(bodies, width, height) {
      if (!bodies.length) return { x: 0, y: 0, k: 1 };
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const body of bodies) {
        minX = Math.min(minX, body.x);
        minY = Math.min(minY, body.y);
        maxX = Math.max(maxX, body.x);
        maxY = Math.max(maxY, body.y);
      }
      const gw = Math.max(120, maxX - minX);
      const gh = Math.max(120, maxY - minY);
      const k = Math.min(1.8, Math.max(0.28, 0.82 * Math.min(width / gw, height / gh)));
      return {
        x: width / 2 - ((minX + maxX) / 2) * k,
        y: height / 2 - ((minY + maxY) / 2) * k,
        k,
      };
    }

    function simulate(nodes, edges, width, height) {
      const n = nodes.length;
      if (!n) return [];
      const groups = new Map();
      for (const node of nodes) {
        const folder = folderOf(node);
        const list = groups.get(folder);
        if (list) list.push(node);
        else groups.set(folder, [node]);
      }
      const folders = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length);
      const cx = width / 2;
      const cy = height / 2;
      const ring = Math.min(width, height) * (folders.length > 1 ? 0.34 : 0.08);
      const bodies = [];
      const byId = new Map();
      folders.forEach((folder, fi) => {
        const members = groups.get(folder);
        const ang = (fi / folders.length) * Math.PI * 2 - Math.PI / 2;
        const gx = folders.length === 1 ? cx : cx + Math.cos(ang) * ring;
        const gy = folders.length === 1 ? cy : cy + Math.sin(ang) * ring;
        const localR = Math.max(36, Math.sqrt(members.length) * 12);
        const hue = hashHue(folder);
        members.forEach((node, i) => {
          const a = (i / Math.max(members.length, 1)) * Math.PI * 2 + ang;
          const rad = localR * (0.42 + (i % 7) * 0.08);
          const body = {
            ...node,
            title: String(node.title ?? node.id ?? ""),
            folder,
            hue,
            gx,
            gy,
            hub: false,
            x: gx + Math.cos(a) * rad,
            y: gy + Math.sin(a) * rad,
            vx: 0,
            vy: 0,
          };
          bodies.push(body);
          byId.set(body.id, body);
        });
      });
      const ranked = bodies.slice().sort((a, b) => (b.degree || 0) - (a.degree || 0));
      for (let i = 0; i < Math.min(14, ranked.length); i += 1) {
        if ((ranked[i].degree || 0) >= 6) ranked[i].hub = true;
      }

      const rest = 32;
      const cell = 40;
      const ticks = Math.min(70, 28 + Math.floor(6000 / Math.max(n, 1)));
      const keyOf = (x, y) => `${x}:${y}`;
      for (let tick = 0; tick < ticks; tick += 1) {
        for (const edge of edges) {
          const a = byId.get(edge.from);
          const b = byId.get(edge.to);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const pull = ((dist - rest) / dist) * (a.folder === b.folder ? 0.045 : 0.012);
          const fx = Math.max(-4, Math.min(4, dx * pull));
          const fy = Math.max(-4, Math.min(4, dy * pull));
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        const grid = new Map();
        for (let i = 0; i < bodies.length; i += 1) {
          const body = bodies[i];
          const gx = Math.floor(body.x / cell);
          const gy = Math.floor(body.y / cell);
          const key = keyOf(gx, gy);
          const bucket = grid.get(key);
          if (bucket) bucket.push(i);
          else grid.set(key, [i]);
        }
        for (let i = 0; i < bodies.length; i += 1) {
          const a = bodies[i];
          const gx = Math.floor(a.x / cell);
          const gy = Math.floor(a.y / cell);
          for (let ox = -1; ox <= 1; ox += 1) {
            for (let oy = -1; oy <= 1; oy += 1) {
              const bucket = grid.get(keyOf(gx + ox, gy + oy));
              if (!bucket) continue;
              for (const j of bucket) {
                if (j <= i) continue;
                const b = bodies[j];
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist2 = dx * dx + dy * dy;
                if (dist2 > cell * cell) continue;
                if (dist2 < 0.25) {
                  dx = 0.6;
                  dy = 0.4;
                  dist2 = 0.52;
                }
                const dist = Math.sqrt(dist2);
                const push = Math.min(3.2, 160 / dist2);
                const fx = (dx / dist) * push;
                const fy = (dy / dist) * push;
                a.vx -= fx;
                a.vy -= fy;
                b.vx += fx;
                b.vy += fy;
              }
            }
          }
        }

        for (const body of bodies) {
          body.vx += (body.gx - body.x) * 0.014;
          body.vy += (body.gy - body.y) * 0.014;
          body.vx += (cx - body.x) * 0.0012;
          body.vy += (cy - body.y) * 0.0012;
          body.vx *= 0.74;
          body.vy *= 0.74;
          const speed = Math.hypot(body.vx, body.vy);
          if (speed > 7) {
            body.vx *= 7 / speed;
            body.vy *= 7 / speed;
          }
          body.x += body.vx;
          body.y += body.vy;
          if (!Number.isFinite(body.x) || !Number.isFinite(body.y)) {
            body.x = body.gx;
            body.y = body.gy;
            body.vx = 0;
            body.vy = 0;
          }
        }
      }
      return bodies;
    }

    function canvasTheme(canvas) {
      const styles = getComputedStyle(canvas);
      const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
      return {
        edge: read("--dshv-edge", "rgba(127,127,127,0.35)"),
        node: read("--dshv-node", "#888"),
        hot: read("--dshv-node-hot", "#fff"),
        ghost: read("--dshv-ghost", "rgba(127,127,127,0.55)"),
        label: read("--dshv-label", "#fff"),
        font: styles.fontFamily || "sans-serif",
      };
    }

    function GraphCanvas({ graph, selected, onSelect }) {
      const canvasRef = React.useRef(null);
      const bodiesRef = React.useRef([]);
      const camRef = React.useRef({ x: 0, y: 0, k: 1 });
      const dragRef = React.useRef(null);
      const selectedRef = React.useRef(selected);
      selectedRef.current = selected;
      const graphRef = React.useRef(graph);
      graphRef.current = graph;

      const sizeRef = React.useRef({ w: 0, h: 0 });

      const draw = React.useCallback(() => {
        const canvas = canvasRef.current;
        const data = graphRef.current;
        if (!canvas || !data) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const cam = camRef.current;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr * cam.k, 0, 0, dpr * cam.k, dpr * cam.x, dpr * cam.y);
        const theme = canvasTheme(canvas);
        const byId = new Map(bodiesRef.current.map((b) => [b.id, b]));
        ctx.lineWidth = 1 / cam.k;
        for (const edge of data.edges) {
          const a = byId.get(edge.from);
          const b = byId.get(edge.to);
          if (!a || !b) continue;
          if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) continue;
          ctx.globalAlpha = a.folder === b.folder ? 0.28 : 0.1;
          ctx.strokeStyle = theme.edge;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const hotId = selectedRef.current;
        for (const body of bodiesRef.current) {
          if (!Number.isFinite(body.x) || !Number.isFinite(body.y)) continue;
          const hot = hotId === body.id;
          const r = Math.min(11, 3.2 + Math.sqrt(body.degree || 0) * 1.15);
          ctx.beginPath();
          ctx.fillStyle = body.ghost
            ? theme.ghost
            : hot
              ? theme.hot
              : `color-mix(in srgb, hsl(${body.hue} 58% 56%) 72%, ${theme.node})`;
          ctx.arc(body.x, body.y, r, 0, Math.PI * 2);
          ctx.fill();
          if (hot || body.hub) {
            ctx.fillStyle = theme.label;
            ctx.globalAlpha = hot ? 1 : Math.min(1, 0.35 + cam.k * 0.4);
            ctx.font = `${(hot ? 12 : 10) / cam.k}px ${theme.font}`;
            ctx.fillText(String(body.title || body.id), body.x + r + 4, body.y + 3);
            ctx.globalAlpha = 1;
          }
        }
      }, []);

      const paintBuffer = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) return null;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        return rect;
      }, []);

      const relayout = React.useCallback((force) => {
        const canvas = canvasRef.current;
        const data = graphRef.current;
        if (!canvas || !data) return;
        const rect = paintBuffer();
        if (!rect) return;
        const prev = sizeRef.current;
        const grew = rect.width > prev.w * 1.35 || rect.height > prev.h * 1.35;
        const needSim = force || !bodiesRef.current.length || prev.w < 40 || prev.h < 40 || grew;
        if (needSim) {
          bodiesRef.current = simulate(data.nodes, data.edges, rect.width, rect.height);
          camRef.current = fitCam(bodiesRef.current, rect.width, rect.height);
          sizeRef.current = { w: rect.width, h: rect.height };
        }
        draw();
      }, [draw, paintBuffer]);

      React.useEffect(() => {
        sizeRef.current = { w: 0, h: 0 };
        bodiesRef.current = [];
        let timer = 0;
        const schedule = (force) => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => relayout(force), force ? 0 : 90);
        };
        const onResize = () => schedule(false);
        schedule(true);
        const canvas = canvasRef.current;
        const ro = typeof ResizeObserver !== "undefined" && canvas
          ? new ResizeObserver(onResize)
          : null;
        if (canvas && ro) ro.observe(canvas);
        window.addEventListener("resize", onResize);
        const mo = typeof MutationObserver !== "undefined"
          ? new MutationObserver(() => draw())
          : null;
        if (mo) mo.observe(document.body, { attributes: true, attributeFilter: ["data-dsh-theme", "data-ds-dark-theme"] });
        return () => {
          window.clearTimeout(timer);
          window.removeEventListener("resize", onResize);
          ro?.disconnect();
          mo?.disconnect();
        };
      }, [draw, graph, relayout]);

      React.useEffect(() => { draw(); }, [selected, draw]);

      function worldFromEvent(event) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const cam = camRef.current;
        return {
          x: (event.clientX - rect.left - cam.x) / cam.k,
          y: (event.clientY - rect.top - cam.y) / cam.k,
        };
      }

      function hit(event) {
        const pt = worldFromEvent(event);
        let best = null;
        let bestD = 14 / camRef.current.k;
        for (const body of bodiesRef.current) {
          const d = Math.hypot(body.x - pt.x, body.y - pt.y);
          if (d < bestD) {
            best = body;
            bestD = d;
          }
        }
        return best;
      }

      return React.createElement("canvas", {
        ref: canvasRef,
        className: "dshv-canvas",
        onPointerDown: (event) => {
          const body = hit(event);
          dragRef.current = {
            kind: body ? "node" : "pan",
            id: body?.id,
            lx: event.clientX,
            ly: event.clientY,
          };
          if (body) onSelect(body.id);
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* ignore */ }
        },
        onPointerMove: (event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const dx = event.clientX - drag.lx;
          const dy = event.clientY - drag.ly;
          drag.lx = event.clientX;
          drag.ly = event.clientY;
          if (drag.kind === "pan") {
            camRef.current.x += dx;
            camRef.current.y += dy;
          } else {
            const body = bodiesRef.current.find((b) => b.id === drag.id);
            if (body) {
              const pt = worldFromEvent(event);
              body.x = pt.x;
              body.y = pt.y;
            }
          }
          draw();
        },
        onPointerUp: () => { dragRef.current = null; },
        onWheel: (event) => {
          event.preventDefault();
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const cam = camRef.current;
          const mx = event.clientX - rect.left;
          const my = event.clientY - rect.top;
          const next = Math.min(4, Math.max(0.25, cam.k * (event.deltaY < 0 ? 1.08 : 0.92)));
          const wx = (mx - cam.x) / cam.k;
          const wy = (my - cam.y) / cam.k;
          cam.k = next;
          cam.x = mx - wx * next;
          cam.y = my - wy * next;
          draw();
        },
      });
    }

    // Folder/file tree from note rel paths: folders first, then files, both
    // alphabetical. Root files live in the "" folder.
    function buildTree(nodes) {
      const root = { name: "", children: new Map(), notes: [] };
      for (const node of nodes) {
        const parts = String(node.rel || node.id).split("/").filter(Boolean);
        let dir = root;
        for (let i = 0; i < parts.length - 1; i += 1) {
          const part = parts[i];
          if (!dir.children.has(part)) dir.children.set(part, { name: part, children: new Map(), notes: [] });
          dir = dir.children.get(part);
        }
        dir.notes.push(node);
      }
      return root;
    }

    function TreeRows({ dir, depth, open, onToggle, selected, onPick }) {
      const folders = [...dir.children.values()].sort((a, b) => a.name.localeCompare(b.name));
      const notes = dir.notes.slice().sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id));
      const rows = [];
      for (const folder of folders) {
        const key = folder.name;
        const path = `${depth}-${key}`;
        const isOpen = open.has(path);
        rows.push(React.createElement("button", {
          key: `d-${path}`,
          type: "button",
          className: "dshv-frow",
          style: { paddingLeft: 8 + depth * 14 },
          onClick: () => onToggle(path),
        },
          React.createElement("span", { className: "dshv-fcaret" }, isOpen ? "▾" : "▸"),
          React.createElement("span", null, `📁 ${folder.name}`),
        ));
        if (isOpen) {
          rows.push(React.createElement(TreeRows, {
            key: `c-${path}`,
            dir: folder, depth: depth + 1, open, onToggle, selected, onPick,
          }));
        }
      }
      for (const note of notes) {
        rows.push(React.createElement("button", {
          key: `f-${note.id}`,
          type: "button",
          className: "dshv-frow",
          "data-on": selected === note.id ? "1" : "0",
          style: { paddingLeft: 8 + depth * 14 + 10 },
          title: note.rel,
          onClick: () => onPick(note),
        }, React.createElement("span", null, note.title || note.id)));
      }
      return React.createElement(React.Fragment, null, ...rows);
    }

    function FilesView({ graph, error }) {
      const [openNote, setOpenNote] = React.useState(null);
      const [text, setText] = React.useState("");
      const [dirty, setDirty] = React.useState(false);
      const [status, setStatus] = React.useState("");
      const [saving, setSaving] = React.useState(false);
      const [open, setOpen] = React.useState(() => new Set());

      const onToggle = React.useCallback((path) => {
        setOpen((cur) => {
          const next = new Set(cur);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      }, []);

      const pick = React.useCallback((node) => {
        setStatus("");
        setDirty(false);
        api(`/dsh-plugin-vault/note?id=${encodeURIComponent(node.id)}`).then((body) => {
          setOpenNote(body);
          setText(body.text || "");
        }).catch((err) => setStatus(String(err.message)));
      }, []);

      async function save() {
        if (!openNote || saving) return;
        setSaving(true);
        setStatus("");
        try {
          await api("/dsh-plugin-vault/save", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: openNote.id, text }),
          });
          setDirty(false);
          setStatus("Saved.");
        } catch (err) {
          setStatus(String(err.message));
        } finally {
          setSaving(false);
        }
      }

      if (!graph || !graph.nodes?.length) {
        return React.createElement("div", { className: "dshv-edempty" },
          error || "Set a vault folder in Settings → Vault, then open this tab again.");
      }

      return React.createElement(React.Fragment, null,
        React.createElement("div", { className: "dshv-files" },
          React.createElement(TreeRows, {
            dir: buildTree(graph.nodes),
            depth: 0, open, onToggle, selected: openNote?.id, onPick: pick,
          }),
        ),
        React.createElement("div", { className: "dshv-editor" },
          openNote
            ? React.createElement(React.Fragment, null,
                React.createElement("div", { className: "dshv-edhead" },
                  React.createElement("span", { className: "dshv-edtitle" }, openNote.rel || openNote.id),
                  React.createElement("span", { className: "dshv-edstate" }, status || (dirty ? "Unsaved changes" : "")),
                  React.createElement("button", {
                    type: "button",
                    className: "dshv-edsave",
                    disabled: !dirty || saving,
                    onClick: () => void save(),
                  }, saving ? "Saving…" : "Save"),
                ),
                React.createElement("textarea", {
                  className: "dshv-edarea",
                  value: text,
                  spellCheck: false,
                  "aria-label": `Edit ${openNote.id}`,
                  onChange: (event) => { setText(event.target.value); setDirty(true); setStatus(""); },
                  onKeyDown: (event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                      event.preventDefault();
                      void save();
                    }
                  },
                }),
              )
            : React.createElement("div", { className: "dshv-edempty" }, "Pick a note on the left to edit it."),
        ),
      );
    }

    function VaultView() {
      const [graph, setGraph] = React.useState(null);
      const [error, setError] = React.useState("");
      const [selected, setSelected] = React.useState(null);
      const [note, setNote] = React.useState(null);
      const [view, setView] = React.useState("graph");

      const load = React.useCallback(() => {
        setError("");
        api("/dsh-plugin-vault/graph").then(setGraph).catch((err) => {
          setGraph(null);
          setError(String(err.message));
        });
      }, []);

      function pickNode(link) {
        const nodes = graph?.nodes ?? [];
        const key = String(link).replace(/\.md$/i, "").toLowerCase();
        return nodes.find((n) => n.id.toLowerCase() === key)
          || nodes.find((n) => n.id.toLowerCase().endsWith(`/${key}`))
          || nodes.find((n) => n.title.toLowerCase() === key)
          || { id: link };
      }

      React.useEffect(() => {
        if (!selected) {
          setNote(null);
          return;
        }
        api(`/dsh-plugin-vault/note?id=${encodeURIComponent(selected)}`).then(setNote).catch(() => {
          setNote({ id: selected, title: selected, text: "", ghost: true, links: [], backlinks: [] });
        });
      }, [selected]);

      React.useEffect(() => { load(); }, [load]);

      return React.createElement("div", { className: "dshv-view" },
        React.createElement("div", { className: "dshv-tabbar" },
          React.createElement("button", {
            type: "button",
            className: "dshv-tab",
            "data-on": view === "graph" ? "1" : "0",
            onClick: () => setView("graph"),
          }, "Graph"),
          React.createElement("button", {
            type: "button",
            className: "dshv-tab",
            "data-on": view === "files" ? "1" : "0",
            onClick: () => setView("files"),
          }, "Files"),
        ),
        view === "files"
          ? React.createElement("div", { className: "dshv-main" },
              React.createElement(FilesView, { graph, error }),
            )
          : React.createElement("div", { className: "dshv-main" },
        React.createElement("div", { className: "dshv-stage" },
          graph && graph.nodes.length
            ? React.createElement(GraphCanvas, { graph, selected, onSelect: setSelected })
            : React.createElement("div", { className: "dshv-empty" },
                React.createElement("h2", null, "Vault"),
                React.createElement("p", null, error || "Set a vault folder in Settings → Vault, then open this tab again."),
              ),
          graph ? React.createElement("div", { className: "dshv-meta" },
            `${graph.vault || "vault"} · ${graph.count} notes${graph.truncated ? " (truncated)" : ""}`,
          ) : null,
        ),
        note ? React.createElement("aside", { className: "dshv-drawer" },
          React.createElement("h3", null, note.title || note.id),
          React.createElement("p", { className: "dshv-kicker" }, note.rel || "unresolved wikilink"),
          note.links?.length ? React.createElement("div", { className: "dshv-links" },
            note.links.map((link) => React.createElement("button", {
              key: `l-${link}`,
              type: "button",
              className: "dshv-chip",
              onClick: () => setSelected(pickNode(link).id),
            }, `[[${link}]]`)),
          ) : null,
          note.backlinks?.length ? React.createElement("div", { className: "dshv-links" },
            note.backlinks.map((link) => React.createElement("button", {
              key: `b-${link}`,
              type: "button",
              className: "dshv-chip",
              onClick: () => setSelected(pickNode(link).id),
            }, `← ${link}`)),
          ) : null,
          React.createElement("pre", { className: "dshv-body" }, (note.text || "").slice(0, 4000)),
          note.obsidian ? React.createElement("a", {
            className: "dshv-open",
            href: note.obsidian,
          }, "Open in Obsidian") : null,
        ) : null,
          ),
      );
    }

    function VaultFooter({ wide }) {
      const [open, setOpen] = React.useState(false);
      React.useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
          if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [open]);
      return React.createElement(React.Fragment, null,
        React.createElement("button", {
          type: "button",
          className: "dshv-foot",
          "data-wide": wide ? "1" : "0",
          "aria-label": "Vault",
          onClick: () => setOpen(true),
        },
          React.createElement("svg", {
            className: "dshv-glyph",
            viewBox: "0 0 16 16",
            width: wide ? 16 : 18,
            height: wide ? 16 : 18,
            fill: "none",
            "aria-hidden": "true",
          },
            React.createElement("path", {
              d: "M3 2.5h8.2A1.3 1.3 0 0 1 12.5 3.8v9.7H4.3A1.3 1.3 0 0 1 3 12.2V2.5z",
              stroke: "currentColor",
              strokeWidth: "1.3",
            }),
            React.createElement("path", {
              d: "M3 12.2c0-.7.6-1.3 1.3-1.3H12.5",
              stroke: "currentColor",
              strokeWidth: "1.3",
            }),
          ),
          wide ? React.createElement("span", { className: "dshv-foot-label" }, "Vault") : null,
        ),
        open ? React.createElement("div", { className: "dshv-modal", role: "dialog", "aria-label": "Vault" },
          React.createElement("div", { className: "dshv-modalhead" },
            React.createElement("h2", null, "Vault"),
            React.createElement("button", { type: "button", onClick: () => setOpen(false) }, "Close"),
          ),
          React.createElement(VaultSettings),
          React.createElement("div", { className: "dshv-modalgraph" }, React.createElement(VaultView)),
        ) : null,
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "obsidian-vault",
        order: 40,
      }, VaultSettings));
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "vault",
        order: 25,
        label: () => "Vault",
      }, VaultView));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "vault",
        order: 5,
      }, VaultFooter));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
