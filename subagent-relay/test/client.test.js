import test from "node:test";
import assert from "node:assert/strict";

function fakeTrigger(text = "7 subagents", ariaLabel = "1 subagent running") {
  const spans = [{ textContent: "" }, { textContent: text }];
  const attributes = new Map([["aria-label", ariaLabel]]);
  return {
    nextElementSibling: { getAttribute: (name) => name === "role" ? "tree" : null },
    querySelectorAll: () => spans,
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    spans,
    attributes,
  };
}

async function loadClient(triggerOrTriggers, descendantSummary) {
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
  const list = {
    getSnapshot: () => ({ current: "parent", byId: {} }),
    subscribe(listener) { subscriptions.push(listener); return () => {}; },
  };
  const disposers = [];
  plugin.apply({
    sessions: { list },
    effect(start) { const dispose = start(); disposers.push(dispose); return dispose; },
  });
  return { styles, subscriptions, observer, disposers };
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

test("unrelated tree picker is untouched by projection and plugin CSS", async () => {
  const subagentTrigger = fakeTrigger();
  const unrelatedTrigger = fakeTrigger("9 settings", "Settings tree");
  const summary = { current: { count: 7, runningCount: 0 } };
  const active = await loadClient([subagentTrigger, unrelatedTrigger], summary);
  const css = active.styles.map((style) => style.textContent).join("\n");
  const treeSelectors = [...css.matchAll(/([^{}]+)\{/gu)]
    .flatMap((match) => match[1].split(","))
    .filter((selector) => selector.includes('[role="tree"]'));

  assert.equal(unrelatedTrigger.spans[1].textContent, "9 settings");
  assert.equal(unrelatedTrigger.attributes.get("aria-label"), "Settings tree");
  assert.equal(unrelatedTrigger.attributes.has("data-subagent-relay-empty"), false);
  assert.ok(treeSelectors.length > 0);
  assert.equal(
    treeSelectors.every((selector) => selector.includes('[aria-label*="subagent" i]')),
    true,
  );
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
