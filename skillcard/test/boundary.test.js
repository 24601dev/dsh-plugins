import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harness, request, applyCharacter } from "../test-support/harness.js";

async function settleRestore() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

test("client discriminator mirror names the canonical host owner", async () => {
  const host = await readFile(new URL("../lib/card-boundary.js", import.meta.url), "utf8");
  const client = (await readFile(new URL("../lib/client.js", import.meta.url), "utf8")).split("function bareSkillName", 1)[0];
  assert.match(host, /Canonical Class\/Character qualification rules/);
  assert.match(client, /Mirror of canonical card-boundary\.js rules/);
  for (const discriminator of ["role", "class", "character", "persona", "soul"]) {
    assert.ok(host.includes(`"${discriminator}"`), `host must qualify ${discriminator}`);
    assert.ok(client.includes(`"${discriminator}"`), `client mirror must qualify ${discriminator}`);
  }
});

test("an ordinary-skill snapshot does not revive in the class seat", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-class-restore-guard-"));
  process.env.DSH_HOME = home;
  try {
    await mkdir(join(home, "roles", "ord"), { recursive: true });
    await writeFile(join(home, "roles", "ord", "SKILL.md"), "---\nname: ord\ndescription: plain skill\n---\n\n# Ord skill\n\nORDINARY_SKILL_BODY\n");
    await writeFile(join(home, "roles", "_worn.json"), JSON.stringify({ name: "ord", description: "", text: "# Worn class: ord\n\nORDINARY_SKILL_BODY\n" }) + "\n");

    const active = harness();
    await settleRestore();
    assert.equal(active.prompt(), "", "an ordinary-skill snapshot must leave the class seat empty");
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
});

test("a Class snapshot does not revive in the Character seat", async () => {
  const previous = process.env.DSH_HOME;
  const home = await mkdtemp(join(tmpdir(), "dsh-character-restore-guard-"));
  process.env.DSH_HOME = home;
  try {
    await mkdir(join(home, "personas", "cls"), { recursive: true });
    await writeFile(join(home, "personas", "cls", "SOUL.md"), "---\nname: cls\nclass: CLS\n---\n\n# Cls\n\nCLASS_BODY\n");
    await writeFile(join(home, "personas", "_worn.json"), JSON.stringify({ name: "cls", description: "", text: "# Worn Character: cls\n\nCLASS_BODY\n" }) + "\n");

    const active = harness(applyCharacter);
    await settleRestore();
    assert.equal(active.prompt(), "", "a Class snapshot must leave the Character seat empty");
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
