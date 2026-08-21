import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function loadClient(runtime = {}) {
  const source = fs.readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  let descriptor;
  const styles = [];
  const window = {
    __ModuleLoader__: {
      load(value) {
        descriptor = value;
      },
    },
  };
  const document = {
    head: { appendChild(node) { styles.push(node); } },
    createElement(tag) { return { tag, dataset: {} }; },
    querySelector() { return null; },
  };
  new Function("window", "document", source)(window, document);
  const client = descriptor.factory((name) => {
    if (name === "react") return {};
    if (name === "react-dom") return { createPortal(children) { return children; } };
    throw new Error(`Unexpected module: ${name}`);
  });
  let sourceDefinition;
  const slotDefinitions = [];
  const ctx = {
    conversation: runtime.conversation ?? { input: { for() { throw new Error("not used by unit tests"); } } },
    effect(run) { return run(); },
    inputTriggers: {
      registerSource(value) {
        sourceDefinition = value;
        return () => {};
      },
    },
    sessions: runtime.sessions ?? { scope() { return undefined; } },
    slots: {
      inject(_name, register) { register(); },
      register(definition, component) { slotDefinitions.push({ definition, component }); },
    },
  };
  client.apply(ctx);
  return { ...client.__test, slots: slotDefinitions, source: sourceDefinition, styles };
}

test("recognizes text-like files and PDFs without claiming native images", () => {
  const { fileKind, isSupportedFile } = loadClient();
  assert.equal(isSupportedFile({ name: "notes.md", type: "" }), true);
  assert.equal(isSupportedFile({ name: "data.weird", type: "application/problem+json" }), true);
  assert.equal(isSupportedFile({ name: "paper.PDF", type: "" }), true);
  assert.equal(isSupportedFile({ name: "photo.png", type: "image/png" }), false);
  assert.equal(isSupportedFile({ name: "archive.zip", type: "application/zip" }), false);
  assert.equal(fileKind("notes.markdown"), "MARK");
  assert.equal(fileKind("README"), "TXT");
});

test("file payload is serialized by the reference codec, not inserted into the visible draft", async () => {
  const { addRecord, deleteRecord, makePromptBlock, recordRef, source } = loadClient();
  const record = {
    id: "file-1",
    ref: recordRef("session-1", "file-1"),
    name: 'a <draft> & "notes".md',
    text: "original content",
    truncated: false,
  };
  addRecord("session-1", record);
  const block = await source.codec.serialize(record.ref);
  assert.match(block, /name="a &lt;draft&gt; &amp; &quot;notes&quot;\.md"/);
  assert.match(block, /original content/);
  assert.doesNotMatch(block, /dsh-composer-file|<!--/);
  assert.equal(block, makePromptBlock(record));
  deleteRecord("session-1", record.id);
  await assert.rejects(() => source.codec.serialize(record.ref), /no longer available/);
});

test("removing a file deletes only its native placeholder and preserves surrounding text", () => {
  const {
    clampFileCaret,
    fileReferencesNeedTail,
    fileReferenceTailStart,
    onlyFileReferences,
    removeOccurrenceDraft,
  } = loadClient();
  assert.deepEqual(removeOccurrenceDraft("hello\uFFFC world", { offset: 5 }), {
    draft: "hello world",
    editRange: { start: 5, end: 6, insertedLength: 0 },
  });
  assert.deepEqual(removeOccurrenceDraft("\uFFFC question", { offset: 0 }), {
    draft: "question",
    editRange: { start: 0, end: 2, insertedLength: 0 },
  });
  assert.deepEqual(removeOccurrenceDraft("question\uFFFC ", { offset: 8 }), {
    draft: "question",
    editRange: { start: 8, end: 10, insertedLength: 0 },
  });
  assert.equal(onlyFileReferences({
    draft: "\uFFFC ",
    occurrences: [{ source: "composer-file", offset: 0 }],
  }), true);
  assert.equal(onlyFileReferences({
    draft: "Question \uFFFC ",
    occurrences: [{ source: "composer-file", offset: 9 }],
  }), false);
  assert.equal(fileReferencesNeedTail({
    draft: "\uFFFC gh",
    occurrences: [{ source: "composer-file", offset: 0 }],
  }), true);
  assert.equal(fileReferenceTailStart({
    draft: "gh\uFFFC ",
    occurrences: [{ source: "composer-file", offset: 2 }],
  }), 2);
  const textarea = {
    selectionStart: 4,
    selectionEnd: 4,
    selectionDirection: "none",
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
  };
  assert.equal(clampFileCaret(textarea, 2), true);
  assert.deepEqual([textarea.selectionStart, textarea.selectionEnd], [2, 2]);
});

test("legacy visible wrappers are recognized for one-time migration", () => {
  const { parseLegacyBlocks } = loadClient();
  const draft = [
    "Before",
    '<!-- dsh-composer-file:file-1:begin -->',
    '<attached_file name="Proton &amp; Notes.md">',
    "first line\nsecond line",
    "</attached_file>",
    '<!-- dsh-composer-file:file-1:end -->',
    "After",
  ].join("\n");
  assert.deepEqual(parseLegacyBlocks(draft), [{
    start: 7,
    end: draft.length - 6,
    record: {
      id: "file-1",
      name: "Proton & Notes.md",
      text: "first line\nsecond line",
      truncated: false,
    },
  }]);
});

test("legacy migration atomically replaces transport markup with one native reference", async () => {
  const legacy = [
    "Question before attachment",
    '<!-- dsh-composer-file:file-1:begin -->',
    '<attached_file name="Proton.md">',
    "file contents",
    "</attached_file>",
    '<!-- dsh-composer-file:file-1:end -->',
    "Question after attachment",
  ].join("\n");
  let snapshot = { draft: legacy, draftRev: 4, occurrences: [], phase: "plain" };
  const shell = {
    get snapshot() { return snapshot; },
    insertReference(reference, span) {
      if (span.draftRev !== snapshot.draftRev) return false;
      snapshot = {
        ...snapshot,
        draft: `${snapshot.draft.slice(0, span.start)}\uFFFC ${snapshot.draft.slice(span.end)}`,
        draftRev: snapshot.draftRev + 1,
        occurrences: [{ ...reference, offset: span.start }],
      };
      return true;
    },
  };
  const actx = { effect(run) { this.cleanup = run(); } };
  const client = loadClient({
    conversation: { input: { for() { return shell; } } },
    sessions: { scope() { return actx; } },
  });
  const left = client.slots.find(({ definition }) => definition.name === "conversation.input.left");
  left.definition.inject("session-1").migrateLegacyDraft();
  assert.doesNotMatch(snapshot.draft, /dsh-composer-file|attached_file/);
  assert.equal(snapshot.occurrences.length, 1);
  assert.equal(snapshot.draft, "Question before attachment\n\uFFFC \nQuestion after attachment");
  assert.match(await client.source.codec.serialize(snapshot.occurrences[0].ref), /file contents/);
});

test("document tiles join the native image attachment group when it exists", () => {
  const { placeRailHost } = loadClient();
  const host = { parentElement: null };
  const nativeRail = {
    getAttribute(name) { return name === "role" ? "group" : null; },
    appendChild(node) { node.parentElement = this; },
  };
  const nativeArea = {
    matches() { return false; },
    firstElementChild: { children: [nativeRail] },
  };
  const scroll = { previousElementSibling: nativeArea };
  const card = {
    querySelector(selector) {
      if (selector === "[data-input-scroll]") return scroll;
      if (selector === '[data-dsh-file-attachments="1"]') return null;
      return null;
    },
  };
  const marker = {
    closest() {
      return { querySelector() { return card; } };
    },
  };
  assert.equal(placeRailHost(marker, host), card);
  assert.equal(host.parentElement, nativeRail);
});

test("file references are repaired to the draft tail without changing their payload", () => {
  let snapshot = {
    draft: "\uFFFC gh",
    draftRev: 2,
    occurrences: [{
      source: "composer-file",
      ref: "session-1:file-1",
      label: "dsh-composer-file:file-1",
      clipboardText: "[Attached file: Proton.md]",
      offset: 0,
    }],
    phase: "plain",
  };
  const shell = {
    get snapshot() { return snapshot; },
    setDraft(draft) {
      snapshot = { ...snapshot, draft, draftRev: snapshot.draftRev + 1, occurrences: [] };
    },
    insertReference(reference, span) {
      if (span.draftRev !== snapshot.draftRev) return false;
      snapshot = {
        ...snapshot,
        draft: `${snapshot.draft}\uFFFC `,
        draftRev: snapshot.draftRev + 1,
        occurrences: [{ ...reference, offset: span.start }],
      };
      return true;
    },
    notify() { throw new Error("stabilization should not fail"); },
  };
  const actx = { effect(run) { this.cleanup = run(); } };
  const client = loadClient({
    conversation: { input: { for() { return shell; } } },
    sessions: { scope() { return actx; } },
  });
  const dock = client.slots.find(({ definition }) => definition.name === "conversation.input.dock");
  assert.deepEqual(dock.definition.inject("session-1").stabilizeFileReferences(), {
    moved: true,
    tailStart: 2,
  });
  assert.equal(snapshot.draft, "gh\uFFFC ");
  assert.equal(snapshot.occurrences[0].offset, 2);
  assert.equal(snapshot.occurrences[0].clipboardText, "[Attached file: Proton.md]");
});

test("plugin CSS is scoped and does not create fixed-overlay containing blocks", () => {
  const { styles } = loadClient();
  assert.equal(styles.length, 1);
  const css = styles[0].textContent;
  assert.match(css, /\[data-decoration="chip"\]\[title\^="dsh-composer-file:"\]\{display:none!important\}/);
  assert.doesNotMatch(css, /backdrop-filter|\btransform\s*:|\bcontain\s*:/);
  assert.match(css, /\[data-composer-card\]\.dsh-file-drop-hot/);
  assert.match(css, /\[data-decoration="chip"\]\[title\^="dsh-composer-file:"\]/);
  assert.match(css, /\.dsh-files-item\{[^}]*width:64px;height:64px/);
  assert.match(css, /\.dsh-files-attachments\{[^}]*padding:4px 12px 0/);
  assert.match(css, /\[data-composer-card\]\[data-dsh-files-only\] \[data-input-scroll\]::before/);
  assert.doesNotMatch(css, /\.dsh-files-dock\{/);
});
