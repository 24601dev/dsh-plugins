export const name = "plugin-subagent-relay";
export const inject = ["jobs"];

function relayMessage(snapshot, text) {
  const content = Object.freeze([{ type: "text", text }]);
  const source = Object.freeze({
    kind: "plugin",
    plugin: name,
    form: "notice",
    summary: `subagent ${snapshot.label} completed`,
  });
  return Object.freeze({
    id: crypto.randomUUID(),
    role: "user",
    content,
    source,
  });
}

export function apply(ctx) {
  ctx.jobs.onJobDone((snapshot, owner) => {
    if (snapshot.kind !== "subagent" || snapshot.status !== "completed"
      || snapshot.reported || owner === undefined) return;

    const report = ctx.jobs.read(snapshot.id, owner).text;
    if (report.length === 0) return;
    owner.inject(relayMessage(snapshot, report));
  });
}
