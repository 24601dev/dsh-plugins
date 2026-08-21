window.__ModuleLoader__.load({
  id: "dsh-plugin-composer-files",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    const { createPortal } = require("react-dom");

    const STYLE_ID = "dsh-plugin-composer-files";
    const MAX_FILES_PER_BATCH = 8;
    const MAX_TEXT_BYTES = 2 * 1024 * 1024;
    const MAX_PDF_BYTES = 12 * 1024 * 1024;
    const MAX_FILE_CHARS = 180_000;
    const MAX_SESSION_CHARS = 240_000;
    const REFERENCE_SOURCE = "composer-file";
    const REFERENCE_LABEL = "dsh-composer-file:";
    const ACCEPT = [
      ".txt", ".md", ".markdown", ".mdx", ".json", ".jsonl", ".ndjson",
      ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".properties",
      ".csv", ".tsv", ".xml", ".html", ".htm", ".css", ".scss", ".less",
      ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".rb", ".go",
      ".rs", ".java", ".kt", ".swift", ".c", ".h", ".cpp", ".hpp", ".cs",
      ".sh", ".bash", ".zsh", ".fish", ".ps1", ".sql", ".graphql", ".gql",
      ".log", ".tex", ".rst", ".adoc", ".svg", ".env", ".gitignore", ".pdf",
    ];
    const ACCEPT_ATTR = [...ACCEPT, "text/*", "application/json", "application/pdf"].join(",");
    const TEXT_EXTENSIONS = new Set(ACCEPT.filter((extension) => extension !== ".pdf"));
    const sessions = new Map();
    const recordsByRef = new Map();
    const cleanupBound = new Set();
    const migratedSessions = new Set();
    const stabilizingSessions = new Set();

    const CSS = `
[data-composer-card].dsh-file-drop-hot{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:3px}
.dsh-files-button{width:28px;height:28px;border:0;border-radius:999px;display:grid;place-items:center;flex:none;cursor:pointer;color:var(--dsw-alias-label-secondary);background:transparent}
.dsh-files-button:hover:not(:disabled),.dsh-files-button[data-busy="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-files-button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-files-button:disabled{opacity:.45;cursor:default}
.dsh-files-input{display:none}
.dsh-files-marker{display:none}
.dsh-files-attachments{min-width:0;padding:4px 12px 0}
.dsh-files-rail{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.dsh-files-rail::-webkit-scrollbar{display:none}
.dsh-files-portal-host{display:flex;gap:10px;flex:none}
.dsh-files-item{position:relative;flex:0 0 64px;width:64px;height:64px}
.dsh-files-tile{box-sizing:border-box;width:64px;height:64px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:16px;display:grid;place-items:center;color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-files-chip-icon{width:32px;height:36px;display:block}
.dsh-files-chip-kind{fill:currentColor;font-family:var(--dsw-font-family);font-size:5px;font-weight:600;letter-spacing:.25px;text-anchor:middle}
.dsh-files-chip-remove{position:absolute;top:4px;right:4px;z-index:1;width:18px;height:18px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;cursor:pointer;color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-button-contrast-fill);font:12px/1 var(--dsw-font-family);opacity:0;transition:opacity .2s ease-in-out}
.dsh-files-item:hover .dsh-files-chip-remove,.dsh-files-chip-remove:focus-visible{opacity:1}
.dsh-files-status{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width);margin:0 auto 6px;padding:6px 10px;border-radius:8px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover);font-size:12px;line-height:18px}
.dsh-files-status[data-error="true"]{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}
[data-decoration="chip"][title^="${REFERENCE_LABEL}"]{display:none!important}
[data-composer-card][data-dsh-files-only] [data-input-scroll]{position:relative}
[data-composer-card][data-dsh-files-only] [data-input-scroll]::before{content:attr(data-dsh-file-placeholder);box-sizing:border-box;position:absolute;z-index:1;inset:0;padding:4px 12px 0 16px;color:var(--dsw-alias-label-caption);font:inherit;line-height:inherit;pointer-events:none}
[data-composer-card][data-dsh-files-only] textarea{caret-color:transparent!important}
@media (pointer:coarse){.dsh-files-chip-remove{opacity:1}}
@media (prefers-reduced-motion:reduce){.dsh-files-chip-remove{transition:none}}
`;

    function installCss() {
      if (typeof document === "undefined" || document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return;
      const tag = document.createElement("style");
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function extensionOf(name) {
      const lower = String(name ?? "").toLowerCase();
      if (lower === ".env" || lower === ".gitignore") return lower;
      const dot = lower.lastIndexOf(".");
      return dot >= 0 ? lower.slice(dot) : "";
    }

    function isPdf(file) {
      return file?.type === "application/pdf" || extensionOf(file?.name) === ".pdf";
    }

    function isSupportedFile(file) {
      if (!file || typeof file.name !== "string") return false;
      if (isPdf(file)) return true;
      if (String(file.type ?? "").toLowerCase().startsWith("text/")) return true;
      const type = String(file.type ?? "").toLowerCase();
      if (type === "application/json" || type.endsWith("+json")) return true;
      return TEXT_EXTENSIONS.has(extensionOf(file.name));
    }

    function escapeAttribute(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }

    function unescapeAttribute(value) {
      return String(value)
        .replaceAll("&quot;", '"')
        .replaceAll("&gt;", ">")
        .replaceAll("&lt;", "<")
        .replaceAll("&amp;", "&");
    }

    function makePromptBlock(record) {
      const note = record.truncated ? " (content truncated by upload limits)" : "";
      return [
        `<attached_file name="${escapeAttribute(record.name)}"${note ? ` note="${note.trim()}"` : ""}>`,
        record.text,
        "</attached_file>",
      ].join("\n");
    }

    function parseLegacyBlocks(draft) {
      const blocks = [];
      const pattern = /<!-- dsh-composer-file:([^:\s]+):begin -->\n([\s\S]*?)\n<!-- dsh-composer-file:\1:end -->/g;
      for (const match of String(draft ?? "").matchAll(pattern)) {
        const body = match[2];
        const opening = body.match(/^<attached_file name="([^"]*)"(?: note="([^"]*)")?>\n/);
        if (!opening || !body.endsWith("\n</attached_file>")) continue;
        blocks.push({
          start: match.index,
          end: match.index + match[0].length,
          record: {
            id: match[1],
            name: unescapeAttribute(opening[1]),
            text: body.slice(opening[0].length, -"\n</attached_file>".length),
            truncated: Boolean(opening[2]),
          },
        });
      }
      return blocks;
    }

    function recordRef(sessionId, id) {
      return `${sessionId}:${id}`;
    }

    function recordOccurrence(input, ref) {
      return (input.occurrences ?? []).find((occurrence) =>
        occurrence.source === REFERENCE_SOURCE && occurrence.ref === ref);
    }

    function onlyFileReferences(input) {
      let visible = String(input?.draft ?? "");
      const occurrences = (input?.occurrences ?? [])
        .filter((occurrence) => occurrence.source === REFERENCE_SOURCE)
        .sort((a, b) => b.offset - a.offset);
      for (const occurrence of occurrences) {
        visible = `${visible.slice(0, occurrence.offset)}${visible.slice(occurrence.offset + 1)}`;
      }
      return occurrences.length > 0 && visible.trim() === "";
    }

    function fileReferencesNeedTail(input) {
      const occurrences = (input?.occurrences ?? [])
        .filter((occurrence) => occurrence.source === REFERENCE_SOURCE);
      if (occurrences.length === 0) return false;
      const offsets = new Set(occurrences.map((occurrence) => occurrence.offset));
      let lastContent = -1;
      const draft = String(input?.draft ?? "");
      for (let index = 0; index < draft.length; index += 1) {
        if (!offsets.has(index) && !/\s/.test(draft[index])) lastContent = index;
      }
      return occurrences.some((occurrence) => occurrence.offset < lastContent);
    }

    function fileReferenceTailStart(input) {
      const occurrences = (input?.occurrences ?? [])
        .filter((occurrence) => occurrence.source === REFERENCE_SOURCE)
        .sort((a, b) => a.offset - b.offset);
      if (occurrences.length === 0) return null;
      const offsets = new Set(occurrences.map((occurrence) => occurrence.offset));
      const start = occurrences[0].offset;
      const draft = String(input?.draft ?? "");
      for (let index = start; index < draft.length; index += 1) {
        if (!offsets.has(index) && !/\s/.test(draft[index])) return null;
      }
      return start;
    }

    function clampFileCaret(textarea, tailStart) {
      // The native textarea renders U+FFFC with its wide DshChipCell glyph even
      // when our matching backdrop chip is hidden, so keep selection before it.
      if (!textarea || tailStart === null || tailStart === undefined) return false;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (typeof start !== "number" || typeof end !== "number" || (start <= tailStart && end <= tailStart)) return false;
      textarea.setSelectionRange(Math.min(start, tailStart), Math.min(end, tailStart), textarea.selectionDirection ?? "none");
      return true;
    }

    function removeOccurrenceDraft(draft, occurrence) {
      const start = occurrence.offset;
      let end = start + 1;
      const after = draft[end];
      const before = start > 0 ? draft[start - 1] : "";
      if (after === " " && (start === 0 || end + 1 === draft.length || /\s/.test(before))) end += 1;
      return {
        draft: `${draft.slice(0, start)}${draft.slice(end)}`,
        editRange: { start, end, insertedLength: 0 },
      };
    }

    function humanBytes(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KiB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
    }

    function fileKind(name) {
      const extension = extensionOf(name).replace(/^\./, "");
      return (extension || "TXT").slice(0, 4).toUpperCase();
    }

    function stateOf(sessionId) {
      let state = sessions.get(sessionId);
      if (!state) {
        state = { records: [], status: null, listeners: new Set(), snapshot: null };
        state.snapshot = { records: state.records, status: state.status };
        sessions.set(sessionId, state);
      }
      return state;
    }

    function refresh(state) {
      state.snapshot = { records: state.records, status: state.status };
    }

    function publish(sessionId) {
      for (const listener of stateOf(sessionId).listeners) listener();
    }

    function setStatus(sessionId, status) {
      const state = stateOf(sessionId);
      state.status = status;
      refresh(state);
      publish(sessionId);
    }

    function addRecord(sessionId, record) {
      const state = stateOf(sessionId);
      recordsByRef.set(record.ref, record);
      state.records = [...state.records, record];
      refresh(state);
      publish(sessionId);
    }

    function deleteRecord(sessionId, id) {
      const state = stateOf(sessionId);
      const removed = state.records.find((record) => record.id === id);
      if (removed) recordsByRef.delete(removed.ref);
      state.records = state.records.filter((record) => record.id !== id);
      refresh(state);
      publish(sessionId);
    }

    function pruneRecords(sessionId, input) {
      const state = stateOf(sessionId);
      const next = state.records.filter((record) => recordOccurrence(input, record.ref) !== undefined);
      if (next.length === state.records.length) return;
      const keep = new Set(next.map((record) => record.ref));
      for (const record of state.records) if (!keep.has(record.ref)) recordsByRef.delete(record.ref);
      state.records = next;
      refresh(state);
      publish(sessionId);
    }

    function subscribe(sessionId, listener) {
      const state = stateOf(sessionId);
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    }

    function useFiles(sessionId) {
      return React.useSyncExternalStore(
        React.useCallback((listener) => subscribe(sessionId, listener), [sessionId]),
        React.useCallback(() => stateOf(sessionId).snapshot, [sessionId]),
        React.useCallback(() => stateOf(sessionId).snapshot, [sessionId]),
      );
    }

    async function pdfText(file) {
      if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name} exceeds the 12 MiB PDF limit`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      const stride = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += stride) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
      }
      const response = await fetch("/dsh-plugin-composer-files/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, data: btoa(binary) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not read ${file.name}`);
      return { text: result.text, truncated: Boolean(result.truncated), pages: result.pages };
    }

    async function textFile(file) {
      if (file.size > MAX_TEXT_BYTES) throw new Error(`${file.name} exceeds the 2 MiB text-file limit`);
      const text = await file.text();
      if (text.includes("\0")) throw new Error(`${file.name} appears to be a binary file`);
      if (text.length > MAX_FILE_CHARS) return { text: text.slice(0, MAX_FILE_CHARS), truncated: true };
      return { text, truncated: false };
    }

    async function readFile(file) {
      return isPdf(file) ? pdfText(file) : textFile(file);
    }

    function freshId() {
      if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    function isFileDrag(event) {
      return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    function FilesButton({ sessionId, input, insertFileReference, migrateLegacyDraft }) {
      const inputRef = React.useRef(null);
      const buttonRef = React.useRef(null);
      const [busy, setBusy] = React.useState(false);

      React.useEffect(() => migrateLegacyDraft(), [migrateLegacyDraft]);

      const processFiles = React.useCallback(async (incoming) => {
        const all = Array.from(incoming ?? []);
        const files = all.filter(isSupportedFile);
        if (files.length === 0) {
          setStatus(sessionId, { error: true, text: "Choose a text-like file or PDF. Images use the native image attachment control." });
          return;
        }
        if (all.some((file) => !isSupportedFile(file))) {
          setStatus(sessionId, { error: true, text: "Some files were skipped because their formats are not supported." });
        } else {
          setStatus(sessionId, { error: false, text: `Reading ${Math.min(files.length, MAX_FILES_PER_BATCH)} file${files.length === 1 ? "" : "s"}…` });
        }
        setBusy(true);
        let attached = 0;
        let typingCaret = null;
        try {
          for (const file of files.slice(0, MAX_FILES_PER_BATCH)) {
            try {
              const result = await readFile(file);
              const currentTotal = stateOf(sessionId).records.reduce((sum, record) => sum + record.text.length, 0);
              if (currentTotal + result.text.length > MAX_SESSION_CHARS) {
                throw new Error(`${file.name} would exceed the 240,000-character session attachment limit`);
              }
              const record = {
                id: freshId(),
                name: file.name,
                size: file.size,
                text: result.text || "(no extractable text)",
                truncated: Boolean(result.truncated),
                pages: result.pages,
              };
              record.ref = recordRef(sessionId, record.id);
              const insertion = insertFileReference(record);
              if (!insertion) throw new Error(`Could not attach ${file.name} to the current draft`);
              typingCaret ??= insertion.caret;
              addRecord(sessionId, record);
              attached += 1;
            } catch (error) {
              setStatus(sessionId, { error: true, text: String(error?.message ?? error) });
            }
          }
          if (files.length > MAX_FILES_PER_BATCH) {
            setStatus(sessionId, { error: true, text: `Attached the first ${MAX_FILES_PER_BATCH} files; the rest were skipped.` });
          } else if (attached > 0) {
            setStatus(sessionId, { error: false, text: `Attached ${attached} file${attached === 1 ? "" : "s"} to the draft.` });
          }
          if (typingCaret !== null) {
            window.requestAnimationFrame(() => {
              const textarea = buttonRef.current?.closest("[data-composer-card]")?.querySelector("textarea");
              if (!textarea) return;
              textarea.focus({ preventScroll: true });
              textarea.setSelectionRange(typingCaret, typingCaret);
            });
          }
        } finally {
          setBusy(false);
          window.setTimeout(() => {
            if (!stateOf(sessionId).status?.error) setStatus(sessionId, null);
          }, 2400);
        }
      }, [insertFileReference, sessionId]);

      React.useEffect(() => {
        const card = buttonRef.current?.closest("[data-composer-card]");
        if (!card) return undefined;
        const seat = card.closest("[data-composer-seat]") ?? card;
        let depth = 0;
        const hot = (value) => card.classList.toggle("dsh-file-drop-hot", value);
        const onEnter = (event) => {
          if (!isFileDrag(event)) return;
          const hasSupported = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
          if (!hasSupported) return;
          event.preventDefault();
          depth += 1;
          hot(true);
        };
        const onOver = (event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        };
        const onLeave = (event) => {
          if (!isFileDrag(event)) return;
          depth = Math.max(0, depth - 1);
          if (depth === 0) hot(false);
        };
        const onDrop = (event) => {
          depth = 0;
          hot(false);
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (!files.some(isSupportedFile)) return;
          event.preventDefault();
          event.stopPropagation();
          window.dispatchEvent(new Event("dragend"));
          void processFiles(files);
        };
        seat.addEventListener("dragenter", onEnter);
        seat.addEventListener("dragover", onOver);
        seat.addEventListener("dragleave", onLeave);
        seat.addEventListener("drop", onDrop);
        return () => {
          hot(false);
          seat.removeEventListener("dragenter", onEnter);
          seat.removeEventListener("dragover", onOver);
          seat.removeEventListener("dragleave", onLeave);
          seat.removeEventListener("drop", onDrop);
        };
      }, [processFiles]);

      const locked = busy || input.phase === "adjudicating" || input.phase === "submitting";
      return React.createElement(React.Fragment, null,
        React.createElement("button", {
          ref: buttonRef,
          type: "button",
          className: "dsh-files-button",
          disabled: locked,
          "data-busy": busy || undefined,
          "aria-label": busy ? "Reading files" : "Attach text or PDF files",
          title: "Attach text or PDF files",
          onMouseDown: (event) => event.preventDefault(),
          onClick: () => inputRef.current?.click(),
        }, React.createElement("svg", {
          viewBox: "0 0 20 20", width: 16, height: 16, fill: "none", "aria-hidden": true,
        }, React.createElement("path", {
          d: "M6.5 10.7 11.9 5.3a2.5 2.5 0 0 1 3.6 3.5l-6.7 6.7a4 4 0 0 1-5.7-5.7l6.2-6.2",
          stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
        }))),
        React.createElement("input", {
          ref: inputRef,
          className: "dsh-files-input",
          type: "file",
          multiple: true,
          accept: ACCEPT_ATTR,
          onChange: (event) => {
            void processFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          },
        }),
      );
    }

    function FileIcon({ kind }) {
      return React.createElement("svg", {
        className: "dsh-files-chip-icon",
        viewBox: "0 0 32 36",
        fill: "none",
        "aria-hidden": true,
      },
      React.createElement("path", {
        d: "M6 2.5h13l7 7v24H6z",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinejoin: "round",
      }),
      React.createElement("path", {
        d: "M19 2.5v7h7",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      React.createElement("text", {
        x: 16,
        y: 24,
        className: "dsh-files-chip-kind",
      }, kind));
    }

    function placeRailHost(marker, host) {
      const seat = marker?.closest?.("[data-composer-seat]");
      const card = seat?.querySelector?.("[data-composer-card]");
      const scroll = card?.querySelector?.("[data-input-scroll]");
      if (!card || !scroll) return null;
      const previous = scroll.previousElementSibling;
      const nativeRoot = previous?.matches?.("[data-dsh-file-attachments]")
        ? null
        : previous?.firstElementChild;
      const nativeRail = Array.from(nativeRoot?.children ?? [])
        .find((child) => child.getAttribute?.("role") === "group") ?? null;
      const owned = card.querySelector('[data-dsh-file-attachments="1"]');
      if (nativeRail) {
        if (host.parentElement !== nativeRail) nativeRail.appendChild(host);
        owned?.remove();
        return card;
      }
      let attachmentArea = owned;
      if (!attachmentArea) {
        attachmentArea = document.createElement("div");
        attachmentArea.dataset.dshFileAttachments = "1";
        attachmentArea.className = "dsh-files-attachments";
        const rail = document.createElement("div");
        rail.className = "dsh-files-rail";
        rail.setAttribute("role", "group");
        rail.setAttribute("aria-label", "Files attached to this draft");
        attachmentArea.appendChild(rail);
        card.insertBefore(attachmentArea, scroll);
      }
      const rail = attachmentArea.querySelector('[role="group"]');
      if (rail && host.parentElement !== rail) rail.appendChild(host);
      return card;
    }

    function FilesRailPortal({ children, filesOnly, stabilizeFileReferences }) {
      const markerRef = React.useRef(null);
      const hostRef = React.useRef(null);
      const cardRef = React.useRef(null);
      const [host, setHost] = React.useState(null);
      React.useLayoutEffect(() => {
        if (!hostRef.current) {
          const node = document.createElement("div");
          node.className = "dsh-files-portal-host";
          node.dataset.dshFileRailHost = "1";
          node.setAttribute("role", "group");
          node.setAttribute("aria-label", "Document attachments");
          hostRef.current = node;
        }
        const hostNode = hostRef.current;
        const card = placeRailHost(markerRef.current, hostNode);
        if (!card) return undefined;
        cardRef.current = card;
        setHost(hostNode);
        const observer = new MutationObserver(() => placeRailHost(markerRef.current, hostNode));
        observer.observe(card, { childList: true, subtree: true });
        return () => {
          observer.disconnect();
          const owned = card.querySelector('[data-dsh-file-attachments="1"]');
          card.removeAttribute("data-dsh-files-only");
          const scroll = card.querySelector("[data-input-scroll]");
          scroll?.removeAttribute("data-dsh-file-placeholder");
          hostNode.remove();
          if (owned && !owned.querySelector(".dsh-files-item")) owned.remove();
        };
      }, []);
      React.useLayoutEffect(() => {
        const card = cardRef.current;
        if (!card) return;
        const scroll = card.querySelector("[data-input-scroll]");
        const textarea = card.querySelector("textarea");
        card.toggleAttribute("data-dsh-files-only", filesOnly);
        if (scroll) {
          if (filesOnly) scroll.dataset.dshFilePlaceholder = textarea?.placeholder ?? "";
          else scroll.removeAttribute("data-dsh-file-placeholder");
        }
        const boundary = stabilizeFileReferences();
        if (!boundary || !textarea) return;
        const applyBoundary = () => {
          const current = cardRef.current?.querySelector("textarea");
          clampFileCaret(current, boundary.tailStart);
        };
        if (!boundary.moved) applyBoundary();
        const frame = window.requestAnimationFrame(applyBoundary);
        return () => window.cancelAnimationFrame(frame);
      });
      return React.createElement(React.Fragment, null,
        React.createElement("span", { ref: markerRef, className: "dsh-files-marker", "aria-hidden": "true" }),
        host ? createPortal(children, host) : null,
      );
    }

    function RemoveIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 12 12",
        width: 10,
        height: 10,
        fill: "none",
        "aria-hidden": true,
      }, React.createElement("path", {
        d: "m3 3 6 6m0-6L3 9",
        stroke: "currentColor",
        strokeWidth: 1.5,
        strokeLinecap: "round",
      }));
    }

    function FilesDock({ sessionId, input, removeFileReference, stabilizeFileReferences }) {
      const state = useFiles(sessionId);
      React.useEffect(() => {
        pruneRecords(sessionId, input);
      }, [sessionId, input.draftRev]);
      if (state.records.length === 0 && !state.status) return null;
      return React.createElement(React.Fragment, null,
        state.status && React.createElement("div", {
          className: "dsh-files-status",
          "data-error": state.status.error || undefined,
          role: "status",
        }, state.status.text),
        state.records.length > 0 && React.createElement(FilesRailPortal, {
          filesOnly: onlyFileReferences(input),
          stabilizeFileReferences,
        },
          state.records.map((record) => React.createElement("div", {
            className: "dsh-files-item",
            role: "listitem",
            key: record.id,
            title: `${record.name} · ${record.pages ? `${record.pages} pages` : humanBytes(record.size)}`,
          },
        React.createElement("div", { className: "dsh-files-tile", "aria-hidden": "true" },
          React.createElement(FileIcon, { kind: fileKind(record.name) })),
        React.createElement("button", {
          type: "button",
          className: "dsh-files-chip-remove",
          "aria-label": `Remove ${record.name}`,
          title: `Remove ${record.name}`,
          onClick: () => {
            removeFileReference(record.ref);
            deleteRecord(sessionId, record.id);
          },
        }, React.createElement(RemoveIcon))))),
      );
    }

    const inject = ["slots", "conversation", "sessions", "inputTriggers"];
    function apply(ctx) {
      installCss();
      ctx.effect(() => ctx.inputTriggers.registerSource({
        trigger: "attachment",
        name: REFERENCE_SOURCE,
        candidates: () => Promise.resolve([]),
        onPick: () => ({ text: "" }),
        codec: {
          clipboardText: (ref) => recordsByRef.get(ref)?.name ?? "Attached file",
          serialize: (ref) => {
            const record = recordsByRef.get(ref);
            if (!record) return Promise.reject(new Error("An attached file is no longer available; remove it and attach it again."));
            return Promise.resolve(makePromptBlock(record));
          },
        },
      }), "composer-files: reference serializer");

      const shellFor = (sessionId) => {
        const actx = ctx.sessions.scope(sessionId);
        if (!actx) throw new Error(`composer-files: session "${String(sessionId)}" resolved no scope`);
        if (!cleanupBound.has(sessionId)) {
          cleanupBound.add(sessionId);
          actx.effect(() => () => {
            const state = sessions.get(sessionId);
            for (const record of state?.records ?? []) recordsByRef.delete(record.ref);
            sessions.delete(sessionId);
            cleanupBound.delete(sessionId);
            migratedSessions.delete(sessionId);
            stabilizingSessions.delete(sessionId);
          }, "composer-files: session cleanup");
        }
        return ctx.conversation.input.for(actx);
      };

      const attachmentActions = (sessionId) => ({
        stabilizeFileReferences() {
          if (stabilizingSessions.has(sessionId)) return null;
          const shell = shellFor(sessionId);
          const initial = shell.snapshot;
          const existingTail = fileReferenceTailStart(initial);
          if (initial.phase !== "plain" || !fileReferencesNeedTail(initial)) {
            return existingTail === null ? null : { moved: false, tailStart: existingTail };
          }
          const references = initial.occurrences
            .filter((occurrence) => occurrence.source === REFERENCE_SOURCE)
            .sort((a, b) => a.offset - b.offset)
            .map(({ source, ref, label, clipboardText }) => ({ source, ref, label, clipboardText }));
          stabilizingSessions.add(sessionId);
          try {
            for (const reference of [...references].reverse()) {
              const snapshot = shell.snapshot;
              const occurrence = recordOccurrence(snapshot, reference.ref);
              if (!occurrence) continue;
              const removal = removeOccurrenceDraft(snapshot.draft, occurrence);
              shell.setDraft(removal.draft, removal.editRange);
            }
            const tailStart = shell.snapshot.draft.length;
            for (const reference of references) {
              const snapshot = shell.snapshot;
              const accepted = shell.insertReference(reference, {
                start: snapshot.draft.length,
                end: snapshot.draft.length,
                draftRev: snapshot.draftRev,
              });
              if (!accepted) {
                shell.notify("error", "A file reference could not be repositioned. Remove and attach that file again.");
                return null;
              }
            }
            return { moved: true, tailStart };
          } finally {
            stabilizingSessions.delete(sessionId);
          }
        },
        migrateLegacyDraft() {
          if (migratedSessions.has(sessionId)) return;
          migratedSessions.add(sessionId);
          const shell = shellFor(sessionId);
          const blocks = parseLegacyBlocks(shell.snapshot.draft);
          for (const block of blocks.reverse()) {
            const before = shell.snapshot;
            const record = {
              ...block.record,
              size: new TextEncoder().encode(block.record.text).length,
            };
            record.ref = recordRef(sessionId, record.id);
            recordsByRef.set(record.ref, record);
            const accepted = shell.insertReference({
              source: REFERENCE_SOURCE,
              ref: record.ref,
              label: `${REFERENCE_LABEL}${record.id}`,
              clipboardText: `[Attached file: ${record.name}]`,
            }, {
              start: block.start,
              end: block.end,
              draftRev: before.draftRev,
            });
            if (accepted) addRecord(sessionId, record);
            else recordsByRef.delete(record.ref);
          }
        },
        insertFileReference(record) {
          const shell = shellFor(sessionId);
          const snapshot = shell.snapshot;
          recordsByRef.set(record.ref, record);
          const accepted = shell.insertReference({
            source: REFERENCE_SOURCE,
            ref: record.ref,
            label: `${REFERENCE_LABEL}${record.id}`,
            clipboardText: `[Attached file: ${record.name}]`,
          }, {
            start: snapshot.draft.length,
            end: snapshot.draft.length,
            draftRev: snapshot.draftRev,
          });
          if (!accepted) recordsByRef.delete(record.ref);
          return accepted ? { caret: snapshot.draft.length } : null;
        },
        removeFileReference(ref) {
          const shell = shellFor(sessionId);
          const snapshot = shell.snapshot;
          const occurrence = recordOccurrence(snapshot, ref);
          if (!occurrence) return false;
          const removal = removeOccurrenceDraft(snapshot.draft, occurrence);
          shell.setDraft(removal.draft, removal.editRange);
          return true;
        },
      });

      ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
        name: "conversation.input.left",
        id: "composer-files",
        order: 80,
        label: "Attach files",
        inject: attachmentActions,
      }, FilesButton));
      ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
        name: "conversation.input.dock",
        id: "composer-files",
        order: 80,
        label: "Attached files",
        inject: attachmentActions,
      }, FilesDock));
    }

    module.exports.apply = apply;
    module.exports.inject = inject;
    module.exports.__test = {
      addRecord,
      clampFileCaret,
      deleteRecord,
      extensionOf,
      fileReferencesNeedTail,
      fileReferenceTailStart,
      fileKind,
      isSupportedFile,
      makePromptBlock,
      onlyFileReferences,
      parseLegacyBlocks,
      placeRailHost,
      recordOccurrence,
      recordRef,
      removeOccurrenceDraft,
    };
    return module.exports;
  },
});
