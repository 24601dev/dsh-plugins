import test from "node:test";
import assert from "node:assert/strict";

function fakeTrigger(text = "7 subagents", ariaLabel = "1 subagent running", hasTree = true) {
  const spans = [{ textContent: "" }, { textContent: text }];
  const attributes = new Map([["aria-label", ariaLabel]]);
  return {
    nextElementSibling: hasTree
      ? { getAttribute: (name) => name === "role" ? "tree" : null }
      : null,
    querySelectorAll: () => spans,
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    spans,
    attributes,
  };
}

async function loadClient(triggerOrTriggers, descendantSummary, subagentsByParent = {}) {
  const triggers = Array.isArray(triggerOrTriggers) ? triggerOrTriggers : [triggerOrTriggers];
  let definition;
  let observer;
  const styles = [];
  const subscriptions = [];
  globalThis.window = { __ModuleLoader__: { load(value) { definition = value; } } };
  globalThis.document = {
    body: {},
    head: { appendChild(node) { styles.push(node); } },
    createElement() { return { dataset: {}, textContent: "" }; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (!selector.includes('button[aria-haspopup="tree"]')) return [];
      return triggers.filter((trigger) => {
        if (selector.includes('[aria-label*="subagent" i]')
          && !/subagent/iu.test(trigger.getAttribute("aria-label") ?? "")) return false;
        if (selector.includes(':has(+ [role="tree"])')
          && trigger.nextElementSibling?.getAttribute("role") !== "tree") return false;
        return true;
      });
    },
  };
  globalThis.MutationObserver = class {
    constructor(callback) { observer = callback; }
    observe() {}
    disconnect() {}
  };

  await import(`../lib/client.js?test=${Date.now()}-${Math.random()}`);
  const runtime = {
    indexSubagentDescendants() {
      return new Map([["parent", descendantSummary.current]]);
    },
  };
  const plugin = definition.factory((id) => {
    assert.equal(id, "@deepseek-ai/dsh-client-runtime/client");
    return runtime;
  });
  assert.deepEqual(plugin.inject, ["sessions"]);
  const state = { current: "parent", byId: {}, subagentsByParent };
  const list = {
    getSnapshot: () => state,
    subscribe(listener) { subscriptions.push(listener); return () => {}; },
  };
  const disposers = [];
  plugin.apply({
    sessions: { list },
    effect(start) { const dispose = start(); disposers.push(dispose); return dispose; },
  });
  return { styles, subscriptions, observer, disposers, state };
}

test("picker uses the installed semantic DOM and renders above content layers", async () => {
  const trigger = fakeTrigger("7 subagents", "1 SUBAGENT running");
  const summary = { current: { count: 7, runningCount: 1 } };
  const active = await loadClient(trigger, summary);
  const css = active.styles.map((style) => style.textContent).join("\n");

  assert.ok(css.includes('[aria-label*="subagent" i] + [role="tree"]'));
  assert.match(css, /z-index:\s*10000/);
  assert.match(css, /\[role="treeitem"\]:has\(\[data-state="done"\]\)/);
});

test("closed subagent picker projects active count without touching unrelated tree", async () => {
  const subagentTrigger = fakeTrigger("99 subagents", "99 subagents", false);
  const unrelatedTrigger = fakeTrigger("9 settings", "Settings tree", false);
  const summary = { current: { count: 7, runningCount: 0 } };
  const active = await loadClient([subagentTrigger, unrelatedTrigger], summary);
  const css = active.styles.map((style) => style.textContent).join("\n");
  const treeSelectors = [...css.matchAll(/([^{}]+)\{/gu)]
    .flatMap((match) => match[1].split(","))
    .filter((selector) => selector.includes('[role="tree"]'));

  assert.equal(subagentTrigger.spans[1].textContent, "0 subagents");
  assert.equal(subagentTrigger.attributes.get("data-subagent-relay-empty"), "");
  assert.equal(unrelatedTrigger.spans[1].textContent, "9 settings");
  assert.equal(unrelatedTrigger.attributes.get("aria-label"), "Settings tree");
  assert.equal(unrelatedTrigger.attributes.has("data-subagent-relay-empty"), false);
  assert.ok(treeSelectors.length > 0);
  assert.equal(
    treeSelectors.every((selector) => selector.includes('[aria-label*="subagent" i]')),
    true,
  );
});

test("re-projection is idempotent so the body observer cannot feed itself", async () => {
  const trigger = fakeTrigger("99 subagents", "99 subagents");
  const span = trigger.spans[1];
  let writes = 0;
  let value = span.textContent;
  Object.defineProperty(span, "textContent", {
    get: () => value,
    set: (next) => { writes += 1; value = next; },
  });
  const summary = { current: { count: 99, runningCount: 0 } };
  const active = await loadClient(trigger, summary);

  assert.equal(value, "0 subagents");
  const settled = writes;
  active.observer();
  active.observer();
  assert.equal(writes, settled);
});

test("current catalog reveals a running child before lineage catches up", async () => {
  const trigger = fakeTrigger("0 subagents", "0 subagents", false);
  const summary = { current: { count: 0, runningCount: 0 } };
  const catalog = { parent: { entries: [
    { kind: "child", activity: "running" },
    { kind: "child", activity: "ready" },
    { kind: "diagnostic", activity: "running" },
  ] } };
  const active = await loadClient(trigger, summary, catalog);

  assert.equal(trigger.spans[1].textContent, "1 subagent");
  assert.equal(trigger.attributes.has("data-subagent-relay-empty"), false);

  active.state.subagentsByParent.parent.entries[0].activity = "ready";
  active.subscriptions[0]();
  assert.equal(trigger.spans[1].textContent, "0 subagents");
  assert.equal(trigger.attributes.get("data-subagent-relay-empty"), "");
});

test("picker count derives from the existing session store and drops inactive children", async () => {
  const trigger = fakeTrigger();
  const summary = { current: { count: 7, runningCount: 1 } };
  const active = await loadClient(trigger, summary);

  assert.equal(trigger.spans[1].textContent, "1 subagent");
  assert.equal(trigger.attributes.get("aria-label"), "1 subagent running");

  summary.current = { count: 7, runningCount: 0 };
  active.subscriptions[0]();
  assert.equal(trigger.attributes.get("data-subagent-relay-empty"), "");
  assert.equal(trigger.spans[1].textContent, "0 subagents");
});
