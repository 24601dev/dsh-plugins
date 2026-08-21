import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harness, request, applyCharacter } from "../test-support/harness.js";

async function waitFor(check, timeoutMs = 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("timed out waiting for restored canonical Character");
}

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
