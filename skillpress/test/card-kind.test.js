import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { kindFromMeta, normalizeDeclaredKind } from "../lib/card-kind.js";

test("canonical class metadata normalizes to the legacy role transport", () => {
  assert.equal(kindFromMeta({ class: "PROMPTER" }), "role");
  assert.equal(kindFromMeta({ kind: "character" }), "persona");
  assert.equal(kindFromMeta({ kind: "class" }), "role");
  assert.equal(kindFromMeta({}, "class"), "role");
});

test("legacy role and other card kinds remain compatible", () => {
  assert.equal(kindFromMeta({ role: "SC-DEBUGGER" }), "role");
  assert.equal(kindFromMeta({ kind: "role" }), "role");
  assert.equal(kindFromMeta({ kind: "persona" }), "persona");
  assert.equal(kindFromMeta({ kind: "skill" }), "skill");
  assert.equal(normalizeDeclaredKind("class"), "role");
  assert.equal(normalizeDeclaredKind("role"), "role");
  assert.equal(normalizeDeclaredKind("character"), "persona");
});

test("browser press uses the same class compatibility rule", async () => {
  const client = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const host = await readFile(new URL("../lib/index.js", import.meta.url), "utf8");
  assert.match(client, /raw === "role" \|\| raw === "class"/);
  assert.match(client, /raw === "soul" \|\| raw === "persona" \|\| raw === "character"/);
  assert.match(client, /meta\?\.class/);
  assert.match(host, /declared === "role" \|\| declared === "persona"/);
  assert.doesNotMatch(host, /if \(declared\) return declared/);
});

test("gallery labels the compatible role kind as class", async () => {
  const client = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.match(client, /function kindLabel/);
  assert.match(client, /kind === "role" \? "class"/);
  assert.match(client, /kind === "persona" \? "character"/);
  assert.match(client, /className: "dshp-kind" \}, kindLabel\(card\.kind\)/);
});

function reactHarness() {
  const hooks = [];
  let cursor = 0;
  const React = {
    Fragment: Symbol("Fragment"),
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity) };
    },
    useCallback(callback) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = callback;
      return hooks[index];
    },
    useEffect() { cursor += 1; },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (next) => {
        hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
      }];
    },
  };
  return {
    React,
    render(Component) {
      cursor = 0;
      return Component();
    },
  };
}

class FakeFile {
  constructor(parts, name, options = {}) {
    this.bytes = Buffer.concat(parts.map((part) => Buffer.from(part)));
    this.name = name;
    this.type = options.type || "";
    this.size = this.bytes.length;
    this.webkitRelativePath = "";
  }
  async arrayBuffer() {
    return this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.byteLength);
  }
  async text() { return this.bytes.toString("utf8"); }
}

async function pressViewHarness() {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const hooks = reactHarness();
  let plugin;
  const window = {
    __ModuleLoader__: {
      load(definition) {
        plugin = definition.factory((name) => {
          assert.equal(name, "react");
          return hooks.React;
        });
      },
    },
    addEventListener() {},
    dispatchEvent() {},
    removeEventListener() {},
  };
  runInNewContext(source, {
    window,
    File: FakeFile,
    Uint8Array,
    Uint32Array,
    DataView,
    TextDecoder,
    TextEncoder,
    URL,
  });
  let PressView;
  plugin.apply({
    slots: {
      inject(_name, mount) { mount(); },
      register(config, Component) {
        if (config.name === "conversation.view") PressView = Component;
        return () => {};
      },
    },
  });
  assert.equal(typeof PressView, "function");
  return { File: FakeFile, render: () => hooks.render(PressView) };
}

function elements(node, predicate, found = []) {
  if (!node || typeof node !== "object") return found;
  if (predicate(node)) found.push(node);
  for (const child of node.children || []) elements(child, predicate, found);
  return found;
}

function text(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return (node?.children || []).map(text).join("");
}

function button(tree, label) {
  return elements(tree, (node) => node.type === "button" && text(node) === label)[0];
}

function headings(tree) {
  return elements(tree, (node) => node.type === "h2").map(text);
}

test("Cards keeps Gallery and Create as separate selectable views", async () => {
  const view = await pressViewHarness();
  let tree = view.render();
  assert.equal(button(tree, "Gallery").props["data-on"], "1");
  assert.equal(button(tree, "Create").props["data-on"], "0");
  assert.deepEqual(headings(tree), ["Gallery"]);

  button(tree, "Create").props.onClick();
  tree = view.render();
  assert.equal(button(tree, "Gallery").props["data-on"], "0");
  assert.equal(button(tree, "Create").props["data-on"], "1");
  assert.ok(headings(tree).includes("Face"));
  assert.ok(!headings(tree).includes("Gallery"));

  button(tree, "Gallery").props.onClick();
  tree = view.render();
  assert.equal(button(tree, "Gallery").props["data-on"], "1");
  assert.deepEqual(headings(tree), ["Gallery"]);
});

test("adding files excludes operating-system metadata", async () => {
  const view = await pressViewHarness();
  let tree = view.render();
  button(tree, "Create").props.onClick();
  tree = view.render();
  const addFiles = elements(tree, (node) =>
    node.type === "input" && node.props.multiple === true && !("webkitdirectory" in node.props))[0];
  const files = [".DS_Store", "Thumbs.db", "desktop.ini", "._ghost", "keep.txt"].map((name) => {
    const file = new view.File([name], name, { type: "text/plain" });
    file.webkitRelativePath = `folder/${name}`;
    return file;
  });
  await addFiles.props.onChange({ target: { files } });

  tree = view.render();
  const addedNames = elements(tree, (node) => node.type === "li").map((item) => text(item.children[0]));
  assert.deepEqual(addedNames, ["folder/keep.txt"]);
});
