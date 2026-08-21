import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harness, request } from "../test-support/harness.js";

async function waitFor(check, timeoutMs = 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("timed out waiting for restored canonical class");
}

test("wear and restart compose from the canonical class packet", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-class-card-"));
  process.env.DSH_HOME = home;
  try {
    const canonical = join(home, "canonical-prompter");
    await mkdir(canonical, { recursive: true });
    await writeFile(join(canonical, "SKILL.md"), "---\nname: prompter\ndescription: Canonical class\nclass: PROMPTER\n---\n\n# Canonical v1\n\nCANONICAL_ONLY_V1\n");
    await mkdir(join(home, "roles"), { recursive: true });
    await symlink(canonical, join(home, "roles", "prompter"));

    const first = harness();
    const route = first.routes.get("exact:/dsh-plugin-roles/wear");
    const result = await request(route, {
      name: "prompter",
      description: "stale card",
      files: {
        "SKILL.md": { encoding: "utf-8", content: "---\nname: prompter\ndescription: Stale\nrole: SC-PROMPTER\n---\n\nSTALE_CARD_PAYLOAD\n" },
      },
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.match(first.prompt(), /CANONICAL_ONLY_V1/);
    assert.doesNotMatch(first.prompt(), /STALE_CARD_PAYLOAD/);

    const persisted = JSON.parse(await readFile(join(home, "roles", "_worn.json"), "utf8"));
    assert.match(persisted.text, /CANONICAL_ONLY_V1/);

    await writeFile(join(canonical, "SKILL.md"), "---\nname: prompter\ndescription: Canonical class\nclass: PROMPTER\n---\n\n# Canonical v2\n\nCANONICAL_ONLY_V2\n");
    const restored = harness();
    await waitFor(() => restored.prompt().includes("CANONICAL_ONLY_V2"));
    assert.doesNotMatch(restored.prompt(), /CANONICAL_ONLY_V1/);
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
});

test("legacy role cards still write, wear, and restore", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-legacy-role-card-"));
  process.env.DSH_HOME = home;
  try {
    const first = harness();
    const route = first.routes.get("exact:/dsh-plugin-roles/wear");
    const result = await request(route, {
      name: "debugger",
      description: "legacy role",
      files: {
        "SKILL.md": { encoding: "utf-8", content: "---\nname: debugger\ndescription: Legacy role\nrole: SC-DEBUGGER\nkind: role\n---\n\nLEGACY_ROLE_CONTRACT\n" },
        "ROLES.md": { encoding: "utf-8", content: "# Legacy packet law\n\nLEGACY_ROLE_LAW\n" },
      },
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.match(first.prompt(), /LEGACY_ROLE_CONTRACT/);
    assert.match(first.prompt(), /LEGACY_ROLE_LAW/);
    assert.match(await readFile(join(home, "roles", "debugger", "SKILL.md"), "utf8"), /role: SC-DEBUGGER/);

    const restored = harness();
    await waitFor(() => restored.prompt().includes("LEGACY_ROLE_CONTRACT"));
    assert.match(restored.prompt(), /LEGACY_ROLE_LAW/);
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
});

test("a successful class skill load commits the same class to the wear owner", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-class-skill-sync-"));
  process.env.DSH_HOME = home;
  try {
    const canonical = join(home, "canonical-debugger");
    await mkdir(canonical, { recursive: true });
    const markdown = "---\nname: debugger\ndescription: Debugger class\nclass: DEBUGGER\n---\n\n# Debugger\n\nDEBUGGER_CLASS_CONTRACT\n";
    await writeFile(join(canonical, "SKILL.md"), markdown);
    await mkdir(join(home, "roles"), { recursive: true });
    await symlink(canonical, join(home, "roles", "debugger"));
    const planner = join(home, "canonical-planner");
    const plannerMarkdown = "---\nname: planner\ndescription: Planner class\nclass: PLANNER\n---\n\n# Planner\n\nPLANNER_CLASS_CONTRACT\n";
    await mkdir(planner, { recursive: true });
    await writeFile(join(planner, "SKILL.md"), plannerMarkdown);
    await symlink(planner, join(home, "roles", "planner"));

    const active = harness();
    const postListener = active.listeners.get("tools/post-execute")?.[0];
    assert.equal(typeof postListener, "function", "class wear owner must stage successful class loads until the outer tool succeeds");

    const agent = { session: { meta: {} } };
    const outerToken = Symbol("run-code");
    await postListener({ name: "skill", parent: outerToken, token: Symbol("skill"), signal: new AbortController().signal, agent }, {
      isError: false,
      value: { name: "debugger", provider: "filesystem", resourceBase: { kind: "directory", path: canonical }, content: "# Debugger\n\nDEBUGGER_CLASS_CONTRACT\n" },
      content: [],
    }, async () => ({ kind: "accept" }));
    await postListener({ name: "run_code", token: outerToken, signal: new AbortController().signal, agent }, { isError: false, value: true, content: [] }, async () => ({ kind: "accept" }));

    assert.match(active.prompt(), /# Worn class: debugger/);
    assert.match(active.prompt(), /DEBUGGER_CLASS_CONTRACT/);
    let saved = JSON.parse(await readFile(join(home, "roles", "_worn.json"), "utf8"));
    assert.equal(saved.name, "debugger");

    const childAgent = { session: { meta: { origin: "subagent", delegationDepth: 1 } } };
    const childToken = Symbol("child-run-code");
    await postListener({ name: "skill", parent: childToken, token: Symbol("child-skill"), signal: new AbortController().signal, agent: childAgent }, {
      isError: false,
      value: { name: "planner", provider: "filesystem", resourceBase: { kind: "directory", path: planner }, content: "# Planner\n\nPLANNER_CLASS_CONTRACT\n" },
      content: [],
    }, async () => ({ kind: "accept" }));
    await postListener({ name: "run_code", token: childToken, signal: new AbortController().signal, agent: childAgent }, { isError: false, value: true, content: [] }, async () => ({ kind: "accept" }));
    saved = JSON.parse(await readFile(join(home, "roles", "_worn.json"), "utf8"));
    assert.equal(saved.name, "debugger", "subagent class loads must not replace the top-level session class");

    const failedToken = Symbol("failed-run-code");
    await postListener({ name: "skill", parent: failedToken, token: Symbol("failed-skill"), signal: new AbortController().signal, agent }, {
      isError: false,
      value: { name: "planner", provider: "filesystem", resourceBase: { kind: "directory", path: planner }, content: "# Planner\n\nPLANNER_CLASS_CONTRACT\n" },
      content: [],
    }, async () => ({ kind: "accept" }));
    await postListener({ name: "run_code", token: failedToken, signal: new AbortController().signal, agent }, { isError: true, error: { code: "FAILED", message: "outer failed" }, content: [] }, async () => ({ kind: "accept" }));
    saved = JSON.parse(await readFile(join(home, "roles", "_worn.json"), "utf8"));
    assert.equal(saved.name, "debugger", "a failed outer tool must not commit its nested class load");

    await postListener({ name: "skill", token: Symbol("native-skill"), signal: new AbortController().signal, agent }, {
      isError: false,
      value: { name: "planner", provider: "filesystem", resourceBase: { kind: "directory", path: planner }, content: "# Planner\n\nPLANNER_CLASS_CONTRACT\n" },
      content: [],
    }, async () => ({ kind: "accept" }));
    saved = JSON.parse(await readFile(join(home, "roles", "_worn.json"), "utf8"));
    assert.equal(saved.name, "planner", "native class skill loads must use the same wear owner");
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
});
