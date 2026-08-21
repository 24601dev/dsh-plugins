import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { apply as applyRole } from "../lib/role.js";
import { apply as applyCharacter } from "../lib/soul.js";

function harness(apply = applyRole) {
  const routes = new Map();
  let promptSection = null;
  const listeners = new Map();
  const ctx = {
    effect(register) { return register(); },
    on(name, listener) {
      const group = listeners.get(name) || [];
      group.push(listener);
      listeners.set(name, group);
      return () => {};
    },
    emit() {},
    logger() { return { info() {} }; },
    systemPrompt: { section(section) { promptSection = section; return () => {}; } },
    webServer: { register(route) { routes.set(route.kind + ":" + route.path, route); return () => {}; } },
  };
  apply(ctx);
  return { routes, listeners, prompt: () => promptSection?.text() ?? "" };
}

async function request(route, body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  let status = 0;
  let raw = "";
  const res = {
    writeHead(next) { status = next; },
    end(chunk = "") { raw += String(chunk); },
  };
  try {
    await route.handler(req, res);
    return { status, body: JSON.parse(raw) };
  } catch (error) {
    return { status: 500, body: { error: String(error?.message ?? error) } };
  }
}

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

test("wear and restart compose from the canonical Character SOUL.md", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-character-card-"));
  process.env.DSH_HOME = home;
  try {
    const canonical = join(home, "canonical-power");
    await mkdir(canonical, { recursive: true });
    await writeFile(join(canonical, "SOUL.md"), "---\nname: Power\ndescription: Canonical Character\nkind: character\n---\n\nCANONICAL_CHARACTER_V1\n");
    await mkdir(join(home, "personas"), { recursive: true });
    await symlink(canonical, join(home, "personas", "Power"));

    const first = harness(applyCharacter);
    const route = first.routes.get("exact:/dsh-plugin-persona/wear");
    const result = await request(route, {
      name: "Power",
      description: "stale persona card",
      files: {
        "SOUL.md": { encoding: "utf-8", content: "---\nname: Power\ndescription: Stale\nkind: persona\n---\n\nSTALE_CHARACTER_PAYLOAD\n" },
      },
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.match(first.prompt(), /# Worn Character: Power/);
    assert.match(first.prompt(), /CANONICAL_CHARACTER_V1/);
    assert.doesNotMatch(first.prompt(), /STALE_CHARACTER_PAYLOAD/);

    await writeFile(join(canonical, "SOUL.md"), "---\nname: Power\ndescription: Canonical Character\nkind: character\n---\n\nCANONICAL_CHARACTER_V2\n");
    const restored = harness(applyCharacter);
    await waitFor(() => restored.prompt().includes("CANONICAL_CHARACTER_V2"));
    assert.doesNotMatch(restored.prompt(), /CANONICAL_CHARACTER_V1/);
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

test("host wear boundaries enforce Class and Character discriminators", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-card-discriminator-"));
  process.env.DSH_HOME = home;
  try {
    const roleHarness = harness();
    const roleWear = roleHarness.routes.get("exact:/dsh-plugin-roles/wear");
    const soulHarness = harness(applyCharacter);
    const soulWear = soulHarness.routes.get("exact:/dsh-plugin-persona/wear");

    const skillResp = await request(roleWear, {
      name: "ord",
      files: { "SKILL.md": { encoding: "utf-8", content: "---\nname: ord\ndescription: plain skill\n---\n\n# Ord\n" } },
    });
    assert.notEqual(skillResp.status, 200, "ordinary skill must be rejected as a Class");

    const canonResp = await request(roleWear, {
      name: "cls",
      files: { "SKILL.md": { encoding: "utf-8", content: "---\nname: cls\ndescription: c\nclass: CLS\n---\n\n# Cls\n" } },
    });
    assert.equal(canonResp.status, 200, "canonical class: must be accepted, got " + JSON.stringify(canonResp.body));
    const legacyResp = await request(roleWear, {
      name: "leg",
      files: { "ROLE.md": { encoding: "utf-8", content: "# Legacy role\n" } },
    });
    assert.equal(legacyResp.status, 200, "legacy ROLE.md must be accepted");

    const skillCharResp = await request(soulWear, {
      name: "ord",
      files: { "SKILL.md": { encoding: "utf-8", content: "---\nname: ord\n---\n\n# Ord\n" } },
    });
    assert.notEqual(skillCharResp.status, 200, "ordinary skill must be rejected as a Character");
    const classCharResp = await request(soulWear, {
      name: "cls",
      files: { "SOUL.md": { encoding: "utf-8", content: "---\nname: cls\nclass: CLS\n---\n\n# Cls\n" } },
    });
    assert.notEqual(classCharResp.status, 200, "a Class packet must not cross the Character boundary");

    const canonCharResp = await request(soulWear, {
      name: "who",
      files: { "SOUL.md": { encoding: "utf-8", content: "---\nname: who\ndescription: w\nkind: character\n---\n\n# Who\n" } },
    });
    assert.equal(canonCharResp.status, 200, "canonical kind: character must be accepted, got " + JSON.stringify(canonCharResp.body));
    const legacyCharResp = await request(soulWear, {
      name: "old",
      files: { "SOUL.md": { encoding: "utf-8", content: "---\nname: old\nkind: persona\n---\n\n# Old\n" } },
    });
    assert.equal(legacyCharResp.status, 200, "legacy persona must be accepted");
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
});

test("a nested class load commits only after the outermost enclosing call succeeds", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-class-skill-nest-"));
  process.env.DSH_HOME = home;
  try {
    const canonical = join(home, "canonical-debugger");
    await mkdir(canonical, { recursive: true });
    const markdown = "---\nname: debugger\ndescription: Debugger class\nclass: DEBUGGER\n---\n\n# Debugger\n\nDEBUGGER_CLASS_CONTRACT\n";
    await writeFile(join(canonical, "SKILL.md"), markdown);
    await mkdir(join(home, "roles"), { recursive: true });
    await symlink(canonical, join(home, "roles", "debugger"));

    const active = harness();
    const postListener = active.listeners.get("tools/post-execute")?.[0];
    const agent = { session: { meta: {} } };
    const outerToken = Symbol("outer-tool");
    const innerToken = Symbol("inner-run-code");

    await postListener({ name: "skill", parent: innerToken, token: Symbol("skill"), signal: new AbortController().signal, agent }, {
      isError: false,
      value: { name: "debugger", provider: "filesystem", resourceBase: { kind: "directory", path: canonical }, content: markdown },
      content: [],
    }, async () => ({ kind: "accept" }));
    // Intermediate enclosing call succeeds: candidate must propagate up, not commit.
    await postListener({ name: "run_code", parent: outerToken, token: innerToken, signal: new AbortController().signal, agent }, { isError: false, value: true, content: [] }, async () => ({ kind: "accept" }));
    assert.doesNotMatch(active.prompt(), /# Worn class: debugger/, "intermediate parent success must not commit a nested class load");
    // Outermost call fails: candidate is discarded, never persisted.
    await postListener({ name: "run_code", token: outerToken, signal: new AbortController().signal, agent }, { isError: true, error: { code: "FAILED", message: "outer failed" }, content: [] }, async () => ({ kind: "accept" }));
    await assert.rejects(readFile(join(home, "roles", "_worn.json"), "utf8"), "a failed outermost call must not commit its nested class load");

    // Outermost call aborted mid-flight: candidate is likewise discarded.
    const abortOuter = Symbol("abort-outer-tool");
    const abortInner = Symbol("abort-inner-run-code");
    const abortSignal = new AbortController();
    await postListener({ name: "skill", parent: abortInner, token: Symbol("skill2"), signal: new AbortController().signal, agent }, {
      isError: false,
      value: { name: "debugger", provider: "filesystem", resourceBase: { kind: "directory", path: canonical }, content: markdown },
      content: [],
    }, async () => ({ kind: "accept" }));
    await postListener({ name: "run_code", parent: abortOuter, token: abortInner, signal: new AbortController().signal, agent }, { isError: false, value: true, content: [] }, async () => ({ kind: "accept" }));
    abortSignal.abort();
    await postListener({ name: "run_code", token: abortOuter, signal: abortSignal.signal, agent }, { isError: true, error: { code: "CANCELLED", message: "aborted" }, content: [] }, async () => ({ kind: "accept" }));
    await assert.rejects(readFile(join(home, "roles", "_worn.json"), "utf8"), "an aborted outermost call must not commit its nested class load");
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
});
