import test from "node:test";
import assert from "node:assert/strict";

import { apply, inject, name } from "../lib/index.js";

test("settled one-shot subagent output enters the parent's message path immediately", () => {
  let complete;
  const accepted = [];
  const owner = {
    inject(message) { accepted.push(message); },
    followup() { throw new Error("the existing job owner controls wakeup delivery"); },
  };
  const jobs = {
    onJobDone(listener) { complete = listener; return () => {}; },
    read(id, caller) {
      assert.equal(id, "subagent-1");
      assert.equal(caller, owner);
      return { text: "The final child report.", snapshot: { reported: true } };
    },
  };

  apply({ jobs });
  complete({
    id: "subagent-1",
    kind: "subagent",
    label: "inspect owner",
    status: "completed",
    reported: false,
  }, owner);

  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].role, "user");
  assert.deepEqual(accepted[0].content, [{ type: "text", text: "The final child report." }]);
  assert.deepEqual(accepted[0].source, {
    kind: "plugin",
    plugin: "plugin-subagent-relay",
    form: "notice",
    summary: "subagent inspect owner completed",
  });
});

test("host relay uses only the one-shot job owner's completion hook", () => {
  let complete;
  const jobs = {
    onJobDone(listener) { complete = listener; return () => {}; },
    read() { throw new Error("non-subagent jobs must stay with their owner"); },
  };

  assert.equal(name, "plugin-subagent-relay");
  assert.deepEqual(inject, ["jobs"]);
  assert.doesNotThrow(() => apply({ jobs }));
  assert.doesNotThrow(() => complete({ kind: "bash" }, {}));
});
