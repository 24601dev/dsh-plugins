import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the sidebar class picker is mounted even when no class is worn", async () => {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.match(source, /React\.createElement\(SidebarChipPortal/);
  assert.doesNotMatch(
    source,
    /worn \|\| roleWorn\s*\n\s*\? React\.createElement\("div", \{ "data-dsh-role-chip": "1" \}\)/,
    "the sidebar must provide a class picker mount before a class is worn",
  );
  assert.doesNotMatch(
    source,
    /\n\s*worn\s*\n\s*\? React\.createElement\(SidebarChipPortal/,
    "an empty class seat must still expose the class gallery picker",
  );
});

test("all card wear surfaces can normalize card names", async () => {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const helper = source.indexOf("function bareSkillName");
  const personaSeat = source.indexOf("const { PersonaSeat");
  assert.ok(helper >= 0 && helper < personaSeat, "bareSkillName must be owned at module scope before every wear surface");
  assert.equal(source.match(/function bareSkillName/g)?.length, 1);
});

test("class controls do not expose legacy role wording", async () => {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Drop a role|Empty role|Remove role|add a soul or role/);
  assert.doesNotMatch(source, /cycleKind === "role" \? "role" : "soul"/);
});

test("Character controls keep SOUL.md without persona or soul labels", async () => {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.match(source, /SOUL\.md/);
  assert.doesNotMatch(source, /Empty soul|persona PNG|No soul|Soul skill slots|Sidebar persona|Swap persona|remove soul|Remove soul/);
  assert.match(source, /Character skill slots/);
  assert.match(source, /Sidebar Character & class seats/);
});

test("autonomous class changes fan out the new card art", async () => {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const start = source.indexOf("function RoleSeat()");
  const end = source.indexOf("return { RoleSeat }", start);
  const roleSeat = source.slice(start, end);
  assert.match(roleSeat, /const changed = cur\?\.name !== name/);
  assert.match(roleSeat, /if \(changed\) adoptFace\(null\)/, "the old class art must be released before the replacement loads");
  assert.match(roleSeat, /if \(changed\) window\.dispatchEvent\(new CustomEvent\("dsh-roles-changed"/, "the existing wear event must update every class-art consumer");
});
