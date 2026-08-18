window.__ModuleLoader__.load({
  id: "dsh-plugin-skillpress",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");

    const ANCHORS = ["SKILL.md", "SOUL.md", "ROLE.md"];
    const TEMPLATES = {
      skill: `---
name: skill-name
description: What the skill does, then when to use it. Include the literal invocation, /skill-name, and the phrases a user would actually say. End by naming what it must NOT be used for.
---

# Skill Name

One or two sentences: the method this skill applies, and the boundary where it stops. Name what it does not touch.

## Modes

- **Mode name:** when it applies, and what changes under it.

Delete this section when the skill has one mode.

## Rules

Group rules by subject. Write each as an instruction. Where the wording is what matters, show the replacement rather than describing it.

- Prefer a short concrete example over an explanation of the rule.

## Safeguards

- Name what must be preserved exactly: code, identifiers, commands, paths, quoted text, citations, provenance.
- Name what this skill may not change.

## Self-Lint

Before returning, ask:

1. A specific, checkable question.
2. Another one.

Then state plainly what this list cannot catch. A checklist fixes form, not truth.

## Sources

Link the external standard or method, and record its date. Do not paste copyrighted text.
`,
      persona: `---
name: persona-name
description: Who this is. Worn as the soul seat, not slash-invoked. Name the voice in a sentence, and what it is not (not a job title).
kind: persona
---

# Persona Name

You are [name]. This file is identity, not a job. A role card may sit on top of you; it changes what you are hired to do, not who you are.

## Voice

- How you speak. Prefer a named person, file, or decision over a category.

## Values

- What you will not trade away.

## Limits

- You still have your tools. Wearing this persona does not make you stop writing code, reading files, or running commands.
- You are not the role. If no role is worn, do not invent a job title.
- Drop this overlay when the user unequips it.
`,
      role: `---
name: sc-rolename
description: One line naming what this role owns and when to use it. Include the literal invocation, /sc-rolename, and the phrases a user would actually say. Name what it must NOT be used for.
role: SC-ROLENAME
kind: role
---

# SC-ROLENAME

> One-sentence ownership statement. Name what this role owns and the explicit boundaries it does not cross.

This file is both the standing contract for the role and its executable entry.

## Must Read

Read this before starting. It ships with the role, so it is always present:

- \`ROLES.md\` — universal rules and role boundaries.

Add only role-specific always-needed owners here. Keep the list short. Drop ROLES.md onto the plate if this role belongs to a packet.

## Always-On Rules

These hold even if you skip a workflow. The workflows carry the procedure; do not restate it here.

- State the role's permanent contract in short bullets.
- Include hard prohibitions and escalation boundaries.
- Include a rule only when it is always true for this role.
- Never edit a vault file without explicit approval from the user.

## Route By Task

- Any new request → \`workflows/INTAKE_AND_ROUTING.md\`

Each named workflow is an extra file on the plate, not text in this contract.

## Companion Skills

- \`sc-skill-name\` — use for a concrete trigger.

Skills are executable modes. Do not put always-on policy here.

## Default Flow

1. Classify scope, owner, and source authority.
2. Execute in the selected mode.
3. Validate before the final report.
4. Name the next required owner.

## Validate

- State the standard validation for this role.

## Output

- State the role's expected final report shape: outcome, evidence, changed files, validation, blockers, and next required owner.
`,
    };
    const TEMPLATE = TEMPLATES.skill;

    function isAnchor(name) {
      return ANCHORS.includes(String(name).split("/").pop());
    }
    function kindFromMeta(meta, fallback) {
      const raw = String(meta?.kind || "").trim().toLowerCase();
      if (raw === "soul" || raw === "persona") return "persona";
      if (raw === "role") return "role";
      if (raw === "skill") return "skill";
      if (String(meta?.role || "").trim()) return "role";
      return fallback || "skill";
    }
    function kindFromFiles(files) {
      if (files["SOUL.md"]) return "persona";
      if (files["ROLE.md"]) return "role";
      return "skill";
    }
    function anchorFor(kind) {
      return kind === "persona" ? "SOUL.md" : "SKILL.md";
    }

    const css = `
.dshp-root,.dshp-root *,.dshp-modal,.dshp-modal *{box-sizing:border-box}
.dshp-root{display:flex;flex-direction:column;gap:12px;width:100%;max-width:100%;min-width:0;min-height:0;height:100%;padding:16px 18px 20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);overflow:hidden}
.dshp-lead{margin:0;max-width:100%;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);flex:none}
.dshp-scroll{flex:1 1 auto;min-height:0;min-width:0;overflow:auto;display:flex;flex-direction:column;gap:12px}
.dshp-bed{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:14px;min-width:0;width:100%}
.dshp-platen{display:flex;flex-direction:column;gap:8px;min-width:0;max-width:100%;overflow:hidden;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.dshp-platen h2{margin:0;font:inherit;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dshp-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.dshp-well{width:min(100%,280px);max-width:100%;aspect-ratio:1;border:1px dashed var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);display:grid;place-items:center;cursor:pointer;overflow:hidden;position:relative;flex:none}
.dshp-well.over,.dshp-files.over,.dshp-platen.over .dshp-files{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshp-well img{width:100%;height:100%;object-fit:cover;display:none}
.dshp-well.has-image img{display:block}
.dshp-well.has-image .dshp-drop{display:none}
.dshp-drop{text-align:center;color:var(--dsw-alias-label-tertiary);padding:12px;pointer-events:none;font-size:12px;line-height:18px}
.dshp-drop strong{display:block;color:var(--dsw-alias-state-business-primary);font-size:14px;font-weight:600;margin-bottom:4px}
.dshp-controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dshp-controls select,.dshp-controls input[type="number"]{height:32px;max-width:100%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 8px;font:inherit}
.dshp-files{min-height:88px;max-height:140px;overflow:auto;border:1px dashed var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1);min-width:0}
.dshp-files ul{list-style:none;margin:0;padding:0}
.dshp-files li{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;min-width:0}
.dshp-files li > span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dshp-files li.skill{color:var(--dsw-alias-state-business-primary)}
.dshp-size{color:var(--dsw-alias-label-tertiary);flex:none;white-space:nowrap}
.dshp-link{background:none;border:0;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;white-space:nowrap}
.dshp-link:hover{color:var(--dsw-alias-label-primary)}
.dshp-row{display:flex;gap:8px;flex-wrap:wrap;min-width:0}
.dshp-btn{height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:12px;cursor:pointer;max-width:100%}
.dshp-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dshp-btn:disabled{opacity:.55;cursor:default}
.dshp-btn-primary{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-state-business-primary);font-size:13px;font-weight:600;height:36px;padding:0 16px}
.dshp-md{flex:1 1 auto;min-height:160px;max-height:min(42vh,380px);width:100%;max-width:100%;resize:none;overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:10px 12px;font:inherit;font-size:12px;line-height:18px}
.dshp-press{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;min-width:0;flex:none}
.dshp-status{margin:0;font-size:13px;color:var(--dsw-alias-label-tertiary);min-height:1.4em;min-width:0;flex:1 1 12rem;overflow-wrap:anywhere}
.dshp-status.err{color:var(--dsw-alias-state-error-primary)}
.dshp-ticket{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:12px 14px;min-width:0;overflow:hidden}
.dshp-ticket h3{margin:0 0 6px;font:inherit;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-ticket p{margin:0 0 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;word-break:break-word}
.dshp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px;min-width:0}
.dshp-gallery-empty{margin:0;padding:18px 8px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:19px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.dshp-gallery-empty.over,.dshp-gallery.over{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshp-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;min-width:0;max-width:100%}
.dshp-card[data-on="1"]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}
.dshp-card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:var(--dsw-alias-bg-layer-1)}
.dshp-cardbody{padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px;min-width:0}
.dshp-cardname{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-carddesc{margin:0;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dshp-cardacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.dshp-cardacts .dshp-btn{width:100%;min-width:0;height:26px;padding:0 4px;font-size:11px}
.dshp-kinds{display:flex;gap:6px;flex-wrap:wrap}
.dshp-kinds .dshp-btn[data-on="1"]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.dshp-kind{margin:0;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.dshp-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.dshp-foot{box-sizing:border-box;cursor:pointer;width:calc(100% + 8px);height:34px;color:var(--dsw-alias-label-primary);background:transparent;border:none;border-radius:12px;flex:none;align-items:center;gap:8px;margin:4px -4px;padding:6px 2px 6px 10px;font:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}
.dshp-foot:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshp-foot[data-wide="0"]{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;margin:4px 0;padding:0}
.dshp-foot-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshp-glyph{flex:none;display:block}
.hHd-Xa_footerActions{flex-direction:column;align-items:stretch;width:100%}
.hHd-Xa_collapsed .hHd-Xa_footerActions{flex-direction:column;align-items:center;width:auto}
.dshp-modal{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;gap:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);overflow:hidden;min-width:0}
.dshp-modalhead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px 0;flex:none;min-width:0}
.dshp-modalhead h2{margin:0;font:inherit;font-size:18px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-modal .dshp-root{flex:1;min-height:0;max-height:100%}
@media (max-width:860px){.dshp-bed{grid-template-columns:minmax(0,1fr)}.dshp-well{width:min(100%,220px)}.dshp-md{max-height:min(36vh,280px)}}
`;

    if (typeof document !== "undefined") {
      let tag = document.querySelector('style[data-plugin-css="dsh-plugin-skillpress"]');
      if (!tag) {
        tag = document.createElement("style");
        tag.dataset.pluginCss = "dsh-plugin-skillpress";
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    }

    const BINARY_SUFFIXES = {
      ".png": 1, ".jpg": 1, ".jpeg": 1, ".gif": 1, ".webp": 1, ".ico": 1, ".bmp": 1,
      ".pdf": 1, ".zip": 1, ".gz": 1, ".woff": 1, ".woff2": 1, ".ttf": 1, ".otf": 1,
      ".pyc": 1, ".so": 1, ".dylib": 1, ".bin": 1,
    };

    function concatBytes(parts) {
      const total = parts.reduce((n, p) => n + p.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const p of parts) { out.set(p, off); off += p.length; }
      return out;
    }
    function asciiBytes(s) {
      const out = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
      return out;
    }
    function b64encode(bytes) {
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }
    const CRC_TABLE = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })();
    function crc32(bytes) {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
      return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function pngChunk(type, data) {
      const typeBytes = asciiBytes(type);
      const len = new Uint8Array(4);
      new DataView(len.buffer).setUint32(0, data.length);
      const crcSrc = concatBytes([typeBytes, data]);
      const crc = new Uint8Array(4);
      new DataView(crc.buffer).setUint32(0, crc32(crcSrc));
      return concatBytes([len, typeBytes, data, crc]);
    }
    function upsertSkillChunk(png, payload) {
      if (png[0] !== 0x89 || png[1] !== 0x50) throw new Error("cover is not a PNG");
      const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
      const parts = [png.subarray(0, 8)];
      let pos = 8;
      const text = concatBytes([asciiBytes("skill"), new Uint8Array([0]), asciiBytes(payload)]);
      while (pos + 12 <= png.length) {
        const length = view.getUint32(pos);
        const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
        const data = png.subarray(pos + 8, pos + 8 + length);
        pos += 12 + length;
        if (type === "tEXt") {
          const nul = data.indexOf(0);
          const key = String.fromCharCode.apply(null, data.subarray(0, nul < 0 ? data.length : nul));
          if (key === "skill") continue;
        }
        if (type === "IEND") {
          parts.push(pngChunk("tEXt", text));
          parts.push(pngChunk("IEND", new Uint8Array()));
          break;
        }
        parts.push(pngChunk(type, data));
      }
      return concatBytes(parts);
    }
    function canonicalJson(value) {
      if (value === null) return "null";
      const t = typeof value;
      if (t === "string" || t === "number" || t === "boolean") return JSON.stringify(value);
      if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
      const keys = Object.keys(value).sort();
      return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
    }
    async function sha256Hex(text) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    async function gzipBytes(bytes) {
      if (typeof CompressionStream === "undefined") throw new Error("This browser cannot gzip (Safari 16.4+, Chrome 80+, Firefox 133+)");
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    function encodeFile(rel, bytes) {
      const base = rel.split("/").pop();
      const suffix = base.includes(".") ? "." + base.split(".").pop().toLowerCase() : "";
      if (BINARY_SUFFIXES[suffix] || bytes.indexOf(0) !== -1) return { encoding: "base64", content: b64encode(bytes) };
      try { return { encoding: "utf-8", content: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }; }
      catch { return { encoding: "base64", content: b64encode(bytes) }; }
    }
    function unquote(value) {
      if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[0] === value[value.length - 1]) {
        const q = value[0];
        return value.slice(1, -1).split("\\" + q).join(q).split("\\\\").join("\\");
      }
      return value;
    }
    function parseFrontmatter(skillMd) {
      const text = skillMd.replace(/^\uFEFF/, "");
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!match) throw new Error("card markdown must start with YAML frontmatter delimited by ---");
      const data = {};
      let key = null, folded = false, buf = [];
      const flush = () => {
        if (!key) return;
        data[key] = folded ? buf.filter(Boolean).join(" ").trim() : unquote(buf.join("\n").trim());
        key = null; folded = false; buf = [];
      };
      for (const line of match[1].split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith("#")) continue;
        const start = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (start) {
          flush();
          key = start[1];
          const rest = start[2];
          if (rest === ">" || rest === ">-" || rest === "|" || rest === "|-") { folded = rest.startsWith(">"); buf = []; }
          else buf = [rest];
          continue;
        }
        if (key && (line.startsWith("  ") || line.startsWith("\t"))) { buf.push(line.trim()); continue; }
        throw new Error("could not parse frontmatter line: " + line);
      }
      flush();
      if (!data.name || !data.description) throw new Error("frontmatter needs name and description");
      return data;
    }
    function stripCommonSkillRoot(files) {
      const names = Object.keys(files);
      if (names.some((n) => ANCHORS.includes(n))) return files;
      const nested = names.filter(isAnchor);
      if (nested.length !== 1) throw new Error("need exactly one SKILL.md, SOUL.md, or ROLE.md (file or folder)");
      const base = nested[0].split("/").pop();
      const prefix = nested[0].slice(0, -base.length);
      if (!names.every((n) => n.startsWith(prefix))) throw new Error("card markdown is nested; extra files are outside that folder");
      const out = {};
      for (const [n, v] of Object.entries(files)) out[n.slice(prefix.length)] = v;
      return out;
    }
    function loadImage(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("could not read image")); };
        img.src = url;
      });
    }
    function themeColor(el, name, fallback) {
      const value = getComputedStyle(el || document.body).getPropertyValue(name).trim();
      return value || fallback;
    }
    async function squarePng(file, fit, size, host) {
      const img = await loadImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (fit === "pad") {
        ctx.fillStyle = themeColor(host, "--dsw-alias-bg-layer-1", "#F4EFE6");
        ctx.fillRect(0, 0, size, size);
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      } else {
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("could not write PNG face");
      return new Uint8Array(await blob.arrayBuffer());
    }
    async function generatedCover(name, size, host) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const styles = getComputedStyle(host || document.body);
      ctx.fillStyle = themeColor(host, "--dsw-alias-bg-layer-3", "#222");
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = themeColor(host, "--dsw-alias-state-business-primary", "#888");
      ctx.fillRect(0, size - Math.max(8, size / 48), size, Math.max(8, size / 48));
      ctx.fillStyle = themeColor(host, "--dsw-alias-label-primary", "#fff");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.floor(size / 9)}px ${styles.fontFamily || "sans-serif"}`;
      const label = String(name || "skill").slice(0, 18);
      ctx.fillText(label, size / 2, size / 2);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("could not write generated cover");
      return new Uint8Array(await blob.arrayBuffer());
    }

    function withTimeout(promise, ms, message) {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
      ]);
    }
    function readAllEntries(reader) {
      return new Promise((resolve, reject) => {
        const out = [];
        const batch = () => {
          reader.readEntries((entries) => {
            if (!entries.length) return resolve(out);
            out.push(...entries);
            batch();
          }, reject);
        };
        batch();
      });
    }

    function PressView() {
      const rootRef = React.useRef(null);
      const imgPick = React.useRef(null);
      const mdPick = React.useRef(null);
      const filePick = React.useRef(null);
      const folderPick = React.useRef(null);
      const [imageFile, setImageFile] = React.useState(null);
      const [imageUrl, setImageUrl] = React.useState("");
      const [fit, setFit] = React.useState("crop");
      const [size, setSize] = React.useState(1024);
      const [skillMd, setSkillMd] = React.useState(TEMPLATE);
      const [kind, setKind] = React.useState("skill");
      const [plate, setPlate] = React.useState({});
      const [over, setOver] = React.useState(null);
      const [status, setStatus] = React.useState("Write a skill, persona, or role, optionally drop a face and extra files, then press.");
      const [err, setErr] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [ticket, setTicket] = React.useState(null);
      const [cards, setCards] = React.useState([]);
      const [picked, setPicked] = React.useState("");
      const plateRef = React.useRef(plate);
      plateRef.current = plate;

      const note = (msg, isErr) => {
        setStatus(msg);
        setErr(Boolean(isErr));
      };

      const loadCards = React.useCallback(async () => {
        try {
          const res = await fetch("/dsh-plugin-skillpress/cards");
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `${res.status}`);
          setCards(body.cards || []);
        } catch (error) {
          note(String(error.message || error), true);
        }
      }, []);

      React.useEffect(() => { void loadCards(); }, [loadCards]);

      const draftAt = React.useRef(null);
      React.useEffect(() => {
        let stop = false;
        async function tick() {
          try {
            const res = await fetch("/dsh-plugin-skillpress/draft");
            if (!res.ok || stop) return;
            const body = await res.json();
            if (!body?.at || body.at === draftAt.current) return;
            draftAt.current = body.at;
            if (body.skillMd) setSkillMd(body.skillMd);
            if (body.kind === "persona" || body.kind === "role" || body.kind === "skill") setKind(body.kind);
            else {
              try { setKind(kindFromMeta(parseFrontmatter(body.skillMd || ""), "skill")); } catch { /* keep */ }
            }
            const next = {};
            for (const [rel, content] of Object.entries(body.files || {})) {
              const base = rel.split("/").pop() || rel;
              next[rel] = new File([String(content)], base, { type: "text/plain" });
            }
            setPlate(next);
            setPicked("");
            note(
              body.installed
                ? `Agent wrote ${body.name} into the press and unpacked it. Press card to mint the PNG.`
                : `Agent wrote ${body.name} into the press. Press card to mint it.`,
            );
          } catch {
            /* draft endpoint missing until host restart */
          }
        }
        void tick();
        const id = setInterval(tick, 1500);
        return () => { stop = true; clearInterval(id); };
      }, []);

      React.useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

      function setImage(file) {
        if (!file || !String(file.type || "").startsWith("image/")) return;
        setImageFile(file);
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
      }

      async function absorbFile(file, rel) {
        const name = (rel || file.webkitRelativePath || file.name).replace(/\\/g, "/");
        if (!name || name.endsWith("/")) return false;
        if (/\.zip$/i.test(name) || (file.name && /\.zip$/i.test(file.name))) {
          note("Unzip first, or add the folder. Zip files are not unpacked here.", true);
          return false;
        }
        const base = name.split("/").pop();
        if (!base.includes(".") && !file.type) return false;
        const buf = await file.arrayBuffer();
        const next = new File([buf], base, { type: file.type || "application/octet-stream" });
        if (isAnchor(name)) {
          const text = await next.text();
          setSkillMd(text);
          try {
            setKind(kindFromMeta(parseFrontmatter(text), kindFromFiles({ [name.split("/").pop()]: true })));
          } catch { /* keep current kind */ }
        }
        setPlate((cur) => ({ ...cur, [name]: next }));
        return true;
      }

      async function addFileList(list) {
        for (const file of list || []) await absorbFile(file);
      }

      async function walkEntry(entry, prefix) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isFile) {
          const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
          await absorbFile(file, path);
          return;
        }
        if (entry.isDirectory) {
          const children = await readAllEntries(entry.createReader());
          for (const child of children) await walkEntry(child, path);
        }
      }

      async function addDroppedItems(dataTransfer) {
        const files = [...(dataTransfer.files || [])];
        const items = [...(dataTransfer.items || [])];
        const before = Object.keys(plateRef.current).length;
        try {
          for (const item of items) {
            if (item.kind !== "file") continue;
            let entry = null;
            try { entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null; } catch { entry = null; }
            if (entry && entry.isDirectory) {
              await withTimeout(walkEntry(entry, ""), 4000, "Folder drop timed out. Use Add folder on the card directory.");
              continue;
            }
            const file = item.getAsFile();
            if (file && file.type.startsWith("image/") && files.length === 1 && items.length === 1) {
              setImage(file);
              return;
            }
            if (file) await absorbFile(file);
          }
        } catch (error) {
          note(String(error.message || error), true);
        }
        if (Object.keys(plateRef.current).length === before && files.length) {
          for (const file of files) {
            if (file.type.startsWith("image/") && files.length === 1) setImage(file);
            else await absorbFile(file);
          }
        }
      }

      function bindOver(key) {
        return {
          onDragOver: (event) => {
            event.preventDefault();
            event.stopPropagation();
            setOver(key);
          },
          onDragLeave: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOver((cur) => (cur === key ? null : cur));
          },
        };
      }

      async function pressCard() {
        const faceSize = Number(size);
        if (faceSize < 64 || faceSize > 4096) throw new Error("face size must be between 64 and 4096");
        const meta = parseFrontmatter(skillMd);
        const pressedKind = kindFromMeta(meta, kind);
        const anchor = anchorFor(pressedKind);
        const rawFiles = {};
        rawFiles[anchor] = encodeFile(anchor, new TextEncoder().encode(skillMd));
        for (const [name, file] of Object.entries(plate)) {
          if (isAnchor(name)) continue;
          const bytes = new Uint8Array(await file.arrayBuffer());
          rawFiles[name] = encodeFile(name, bytes);
        }
        const files = stripCommonSkillRoot(rawFiles);
        if (!files[anchor]) throw new Error(`need a ${anchor}`);
        const skillText = files[anchor].encoding === "utf-8"
          ? files[anchor].content
          : new TextDecoder("utf-8").decode(Uint8Array.from(atob(files[anchor].content), (c) => c.charCodeAt(0)));
        files[anchor] = encodeFile(anchor, new TextEncoder().encode(skillText));
        const sha = await sha256Hex(canonicalJson(files));
        const card = {
          spec: "skill_card_v1",
          spec_version: "1.0",
          name: String(meta.name).trim(),
          version: String(meta.version || "0.0.0").trim() || "0.0.0",
          description: String(meta.description).trim(),
          kind: pressedKind,
          canonical_url: null,
          sha256: sha,
          files,
        };
        const payload = b64encode(await gzipBytes(new TextEncoder().encode(canonicalJson(card))));
        const host = rootRef.current;
        const face = imageFile
          ? await squarePng(imageFile, fit, faceSize, host)
          : await generatedCover(card.name, faceSize, host);
        const png = upsertSkillChunk(face, payload);
        return { png, name: card.name, kind: pressedKind, sha256: sha, fileCount: Object.keys(files).length, files };
      }

      async function onPress() {
        setBusy(true);
        setTicket(null);
        note("Pressing…");
        try {
          const result = await pressCard();
          const res = await fetch("/dsh-plugin-skillpress/save", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ png: b64encode(result.png) }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `${res.status}`);
          setTicket({
            name: body.name || result.name,
            fileCount: result.fileCount,
            bytes: result.png.length,
            sha256: result.sha256,
            card: body.card,
          });
          setPicked(body.name || result.name);
          await loadCards();
          note(`Saved ${body.name || result.name} to the card gallery.`);
        } catch (error) {
          note(String(error.message || error), true);
        } finally {
          setBusy(false);
        }
      }

      async function importPng(file) {
        if (!file) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const res = await fetch("/dsh-plugin-skillpress/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ png: b64encode(bytes) }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `${res.status}`);
        setPicked(body.name);
        await loadCards();
        note(`Imported ${body.name}.`);
      }

      async function editCard(name) {
        const res = await fetch(`/dsh-plugin-skillpress/card-data?name=${encodeURIComponent(name)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `${res.status}`);
        const files = body.files || {};
        const anchor = ANCHORS.find((n) => files[n]) || Object.keys(files).find(isAnchor);
        const skill = anchor ? files[anchor] : null;
        if (skill?.encoding === "utf-8") setSkillMd(skill.content);
        else if (skill?.content) {
          setSkillMd(new TextDecoder().decode(Uint8Array.from(atob(skill.content), (c) => c.charCodeAt(0))));
        }
        setKind(body.kind || kindFromFiles(files));
        const next = {};
        for (const [rel, entry] of Object.entries(files)) {
          if (isAnchor(rel)) continue;
          const base = rel.split("/").pop();
          if (entry.encoding === "utf-8") next[rel] = new File([entry.content], base, { type: "text/plain" });
          else next[rel] = new File([Uint8Array.from(atob(entry.content), (c) => c.charCodeAt(0))], base);
        }
        setPlate(next);
        const pngRes = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(name)}`);
        if (pngRes.ok) {
          const blob = await pngRes.blob();
          setImage(new File([blob], `${name}.png`, { type: "image/png" }));
        }
        setPicked(name);
        note(`Loaded ${name} into the press. Press again to overwrite.`);
      }

      function equipCard(card) {
        const cardKind = card.kind || "skill";
        if (cardKind === "persona") {
          window.dispatchEvent(new CustomEvent("dsh-persona-wear", { detail: { name: card.name } }));
          note(`Wearing ${card.name} as persona.`);
          return;
        }
        if (cardKind === "role") {
          window.dispatchEvent(new CustomEvent("dsh-roles-wear", { detail: { name: card.name } }));
          note(`Wearing ${card.name} as role.`);
          return;
        }
        window.dispatchEvent(new CustomEvent("dsh-skillbar-equip", { detail: { name: card.name } }));
        note(`Loading ${card.name} onto the hotbar.`);
      }

      async function deleteCard(name) {
        const res = await fetch(`/dsh-plugin-skillpress/card?name=${encodeURIComponent(name)}`, { method: "DELETE" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `${res.status}`);
        if (picked === name) setPicked("");
        await loadCards();
        note(`Removed ${name} from the gallery.`);
      }

      const extras = Object.keys(plate).filter((n) => !isAnchor(n)).sort();

      function chooseKind(next) {
        setKind(next);
        setSkillMd((md) => {
          if (Object.values(TEMPLATES).includes(md) || !String(md).trim()) return TEMPLATES[next];
          return md;
        });
      }

      return React.createElement("div", {
        className: "dshp-root",
        "data-skillpress": "1",
        ref: rootRef,
        onDragOver: (event) => { event.preventDefault(); event.stopPropagation(); },
        onDrop: (event) => { event.preventDefault(); event.stopPropagation(); },
      },
        React.createElement("p", { className: "dshp-lead" },
          "Ask the chat to write a skill, persona, or role — it lands in this press. Press a card to mint the PNG. Load wears a persona or role, or puts a skill on the soul bar (or the role bar if a job is worn).",
        ),
        React.createElement("div", { className: "dshp-scroll" },
        React.createElement("section", {
          className: "dshp-platen",
          onDragOver: (event) => {
            event.preventDefault();
            event.stopPropagation();
            setOver("gallery");
          },
          onDragLeave: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOver((cur) => (cur === "gallery" ? null : cur));
          },
          onDrop: async (event) => {
            event.preventDefault();
            event.stopPropagation();
            setOver(null);
            const file = [...event.dataTransfer.files].find((f) =>
              f.type === "image/png" || f.name.toLowerCase().endsWith(".png"));
            if (!file) {
              note("Drop a skill card PNG to import it.", true);
              return;
            }
            try { await importPng(file); } catch (error) { note(String(error.message || error), true); }
          },
        },
          React.createElement("h2", null, "Gallery"),
          React.createElement("p", { className: "dshp-hint" },
            cards.length ? `${cards.length} card${cards.length === 1 ? "" : "s"} in the harness.` : "Drop a pressed PNG here, or mint one below.",
          ),
          cards.length
            ? React.createElement("div", { className: `dshp-gallery${over === "gallery" ? " over" : ""}` },
                cards.map((card) => React.createElement("article", {
                  key: card.name,
                  className: "dshp-card",
                  "data-on": picked === card.name ? "1" : "0",
                },
                  React.createElement("img", { src: card.url, alt: "" }),
                  React.createElement("div", { className: "dshp-cardbody" },
                    React.createElement("p", { className: "dshp-cardname", title: card.name }, card.name),
                    React.createElement("p", { className: "dshp-kind" }, card.kind || "skill"),
                    card.description ? React.createElement("p", { className: "dshp-carddesc" }, card.description) : null,
                    React.createElement("div", { className: "dshp-cardacts" },
                      React.createElement("button", {
                        type: "button",
                        className: "dshp-btn",
                        onClick: () => equipCard(card),
                      }, "Load"),
                      React.createElement("button", {
                        type: "button",
                        className: "dshp-btn",
                        onClick: () => void editCard(card.name).catch((error) => note(String(error.message || error), true)),
                      }, "Edit"),
                      React.createElement("button", {
                        type: "button",
                        className: "dshp-btn",
                        onClick: () => void deleteCard(card.name).catch((error) => note(String(error.message || error), true)),
                      }, "Remove"),
                    ),
                  ),
                )),
              )
            : React.createElement("p", { className: `dshp-gallery-empty${over === "gallery" ? " over" : ""}` },
                "No cards yet.",
              ),
        ),
        React.createElement("div", { className: "dshp-bed" },
          React.createElement("section", { className: "dshp-platen" },
            React.createElement("h2", null, "Face"),
            React.createElement("p", { className: "dshp-hint" }, "Optional. No picture → a typed cover from the card name."),
            React.createElement("div", {
              className: `dshp-well${imageFile ? " has-image" : ""}${over === "well" ? " over" : ""}`,
              tabIndex: 0,
              ...bindOver("well"),
              onClick: () => imgPick.current?.click(),
              onDrop: (event) => {
                event.preventDefault();
                event.stopPropagation();
                setOver(null);
                const file = event.dataTransfer.files[0];
                if (file) setImage(file);
              },
            },
              React.createElement("div", { className: "dshp-drop" },
                React.createElement("strong", null, "Drop a picture"),
                "or click · PNG / JPEG / WebP",
              ),
              React.createElement("img", { src: imageUrl, alt: "Cover preview", style: { objectFit: fit === "pad" ? "contain" : "cover" } }),
            ),
            React.createElement("div", { className: "dshp-controls" },
              React.createElement("label", null, "Fit ",
                React.createElement("select", { value: fit, onChange: (e) => setFit(e.target.value) },
                  React.createElement("option", { value: "crop" }, "crop"),
                  React.createElement("option", { value: "pad" }, "pad"),
                ),
              ),
              React.createElement("label", null, "Size ",
                React.createElement("input", {
                  type: "number", min: 64, max: 4096, value: size,
                  onChange: (e) => setSize(Number(e.target.value)),
                }),
              ),
            ),
          ),
          React.createElement("section", { className: "dshp-platen" },
            React.createElement("h2", null, kind === "persona" ? "SOUL.md" : kind === "role" ? "Role (SKILL.md)" : "SKILL.md"),
            React.createElement("p", { className: "dshp-hint" },
              kind === "persona"
                ? "Identity, not a job. Frontmatter needs name, description, and kind: persona."
                : kind === "role"
                  ? "Standing job contract. Frontmatter needs name, description, and role:. Add ROLES.md on the plate for a packet."
                  : "A castable move. Frontmatter needs name and description. Extra files (scripts, references) go on the plate.",
            ),
            React.createElement("div", { className: "dshp-kinds" },
              ["skill", "persona", "role"].map((id) => React.createElement("button", {
                key: id,
                type: "button",
                className: "dshp-btn",
                "data-on": kind === id ? "1" : "0",
                onClick: () => chooseKind(id),
              }, id === "persona" ? "Persona" : id === "role" ? "Role" : "Skill")),
            ),
            React.createElement("textarea", {
              className: "dshp-md",
              value: skillMd,
              spellCheck: false,
              onChange: (e) => setSkillMd(e.target.value),
            }),
            React.createElement("div", {
              className: `dshp-files${over === "plate" ? " over" : ""}`,
              ...bindOver("plate"),
              onDrop: async (event) => {
                event.preventDefault();
                event.stopPropagation();
                setOver(null);
                await addDroppedItems(event.dataTransfer);
              },
            },
              React.createElement("ul", null,
                extras.map((name) => React.createElement("li", { key: name },
                  React.createElement("span", null, name),
                  React.createElement("span", { className: "dshp-size" }, `${plate[name].size.toLocaleString()} B`),
                  React.createElement("button", {
                    type: "button",
                    className: "dshp-link",
                    onClick: () => setPlate((cur) => {
                      const next = { ...cur };
                      delete next[name];
                      return next;
                    }),
                  }, "remove"),
                )),
              ),
            ),
            React.createElement("div", { className: "dshp-row" },
              React.createElement("button", { type: "button", className: "dshp-btn", onClick: () => mdPick.current?.click() }, "Load markdown"),
              React.createElement("button", { type: "button", className: "dshp-btn", onClick: () => filePick.current?.click() }, "Add files"),
              React.createElement("button", { type: "button", className: "dshp-btn", onClick: () => folderPick.current?.click() }, "Add folder"),
              React.createElement("button", { type: "button", className: "dshp-btn", onClick: () => { setPlate({}); setSkillMd(TEMPLATES[kind]); } }, "Clear extras"),
            ),
          ),
        ),
        React.createElement("div", { className: "dshp-press" },
          React.createElement("button", {
            type: "button",
            className: "dshp-btn dshp-btn-primary",
            disabled: busy,
            onClick: () => void onPress(),
          }, busy ? "Pressing…" : "Press card"),
          React.createElement("p", { className: `dshp-status${err ? " err" : ""}` }, status),
        ),
        ticket ? React.createElement("div", { className: "dshp-ticket" },
          React.createElement("h3", null, ticket.name),
          React.createElement("p", null, `${ticket.fileCount} files · ${ticket.bytes.toLocaleString()} byte PNG · sha256 ${ticket.sha256}`),
          ticket.card ? React.createElement("p", null, `Stored in the gallery.`) : null,
        ) : null,
        React.createElement("input", {
          ref: imgPick, className: "dshp-file", type: "file",
          accept: "image/png,image/jpeg,image/webp,image/gif",
          onChange: (e) => setImage(e.target.files[0]),
        }),
        React.createElement("input", {
          ref: mdPick, className: "dshp-file", type: "file", accept: ".md,text/markdown",
          onChange: async (e) => {
            const f = e.target.files[0];
            if (f) await absorbFile(f, ANCHORS.includes(f.name) ? f.name : anchorFor(kind));
          },
        }),
        React.createElement("input", {
          ref: filePick, className: "dshp-file", type: "file", multiple: true,
          onChange: (e) => addFileList(e.target.files),
        }),
        React.createElement("input", {
          ref: folderPick, className: "dshp-file", type: "file",
          webkitdirectory: "", directory: "", multiple: true,
          onChange: (e) => addFileList(e.target.files),
        }),
        ),
      );
    }

    function PressFooter({ wide }) {
      const [open, setOpen] = React.useState(false);
      React.useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [open]);
      return React.createElement(React.Fragment, null,
        React.createElement("button", {
          type: "button",
          className: "dshp-foot",
          "data-wide": wide ? "1" : "0",
          "aria-label": "Cards",
          onClick: () => setOpen(true),
        },
          React.createElement("svg", {
            className: "dshp-glyph",
            viewBox: "0 0 16 16",
            width: wide ? 16 : 18,
            height: wide ? 16 : 18,
            fill: "none",
            "aria-hidden": "true",
          },
            React.createElement("rect", {
              x: "2.5", y: "2.5", width: "11", height: "11", rx: "2",
              stroke: "currentColor",
              strokeWidth: "1.3",
            }),
            React.createElement("path", {
              d: "M5 6.5h6M5 9.5h4",
              stroke: "currentColor",
              strokeWidth: "1.3",
              strokeLinecap: "round",
            }),
          ),
          wide ? React.createElement("span", { className: "dshp-foot-label" }, "Cards") : null,
        ),
        open ? React.createElement("div", { className: "dshp-modal", role: "dialog", "aria-label": "Cards" },
          React.createElement("div", { className: "dshp-modalhead" },
            React.createElement("h2", null, "Cards"),
            React.createElement("button", { type: "button", className: "dshp-btn", onClick: () => setOpen(false) }, "Close"),
          ),
          React.createElement(PressView),
        ) : null,
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "skillpress",
        order: 26,
        label: () => "Cards",
      }, PressView));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "skillpress",
        order: 6,
      }, PressFooter));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    return module.exports;
  },
});
