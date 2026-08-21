import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");

function effectBody(marker, endMarker, after = "") {
  const boundary = after ? source.indexOf(after) : 0;
  const markerAt = source.indexOf(marker, boundary);
  const opening = "React.useEffect(() => {";
  const start = source.lastIndexOf(opening, markerAt) + opening.length;
  const end = source.indexOf(endMarker, markerAt);
  assert.ok(markerAt >= boundary && start >= opening.length && end > start, "missing effect around " + marker);
  return source.slice(start, end);
}

function fakeWindow() {
  const listeners = new Map();
  let interval = null;
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
    },
    setInterval(callback) {
      interval = callback;
      return 1;
    },
    clearInterval() {},
    runInterval() {
      assert.ok(interval, "class poll interval was not registered");
      interval();
    },
  };
}

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

async function flush() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

test("each successful class poll refreshes a stale sidebar title and art consumer", async () => {
  const window = fakeWindow();
  let releaseStale;
  const staleInitialRead = new Promise((resolve) => {
    releaseStale = () => resolve({ json: async () => ({ name: "auditor" }) });
  });
  const hostReplies = [];
  const fetch = (url) => {
    if (url !== "/dsh-plugin-roles/worn") {
      return Promise.resolve({ ok: false, json: async () => ({}), blob: async () => ({ size: 0 }) });
    }
    return hostReplies.length
      ? Promise.resolve({ json: async () => hostReplies.shift() })
      : staleInitialRead;
  };

  let local = { name: "auditor" };
  let sidebarClass = local;
  let classSeat = local;
  const wornRef = { current: classSeat };
  const context = {
    API: "/dsh-plugin-roles",
    fetch,
    window,
    CustomEvent: FakeCustomEvent,
    wornRef,
    setRoleWorn(value) {
      sidebarClass = typeof value === "function" ? value(sidebarClass) : value;
    },
    setWorn(value) {
      classSeat = typeof value === "function" ? value(classSeat) : value;
      wornRef.current = classSeat;
    },
    loadRoleLocal: () => local,
    saveLocal(value) { local = value; },
    adoptRoleFace() {},
    patchActive() {},
    adoptFace() {},
  };
  const runEffect = (body) => vm.runInNewContext("(function(){" + body + "})", context)();

  runEffect(effectBody(
    'void fetch("/dsh-plugin-roles/worn")',
    "}, [adoptRoleFace, patchActive]);",
  ));
  hostReplies.push({ name: "debugger" });
  runEffect(effectBody("const syncWorn = () => {", "}, []);", "function RoleSeat()"));
  await flush();
  assert.equal(sidebarClass.name, "debugger", "the first poll must fan out Debugger");

  releaseStale();
  await flush();
  assert.equal(sidebarClass.name, "auditor", "the delayed consumer read must reproduce the stale title");

  hostReplies.push({ name: "debugger" });
  window.runInterval();
  await flush();
  assert.equal(classSeat.name, "debugger", "the class seat follows the host");
  assert.equal(sidebarClass.name, "debugger", "the same poll must repair the sidebar title and art consumer");
});
