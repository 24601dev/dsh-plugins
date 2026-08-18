import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchIndex, searchVault, tokenize } from "./search.js";

test("tokenize drops stopwords and keeps names", () => {
  assert.deepEqual(tokenize("The King of the North, Kael"), ["king", "north", "kael"]);
});

test("search ranks the relevant note and omits the rest", () => {
  const notes = [
    { id: "npcs/kael", rel: "npcs/kael.md", title: "Kael", text: "# Kael\n\nKael betrayed the northern king at the ford." },
    { id: "npcs/mira", rel: "npcs/mira.md", title: "Mira", text: "# Mira\n\nMira sells bread in the market and keeps pigeons." },
    { id: "places/ford", rel: "places/ford.md", title: "The Ford", text: "# The Ford\n\nA shallow crossing. No mention of bakers." },
  ];
  const index = buildSearchIndex(notes);
  const { hits } = searchVault(index, "who betrayed the king");
  assert.equal(hits[0].id, "npcs/kael");
  assert.ok(hits[0].snippet.toLowerCase().includes("betray"));
  assert.ok(hits.every((hit) => hit.id !== "npcs/mira"));
});

test("folder filter keeps search inside a prefix", () => {
  const notes = [
    { id: "npcs/kael", rel: "npcs/kael.md", title: "Kael", text: "Kael the spy" },
    { id: "lore/spies", rel: "lore/spies.md", title: "Spies", text: "Kael is listed among the spies" },
  ];
  const index = buildSearchIndex(notes);
  const { hits } = searchVault(index, "kael", { folder: "lore" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "lore/spies");
});
