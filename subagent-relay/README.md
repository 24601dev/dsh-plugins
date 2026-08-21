# dsh-plugin-subagent-relay

This plugin surfaces completed one-shot subagent output through the installed job owner.
It does not add a poller, report queue, settlement ledger, or subagent store.

## Host behavior

The host uses the public `ctx.jobs.onJobDone()` completion hook.
For an unreported, completed `subagent` job, it reads the final output with `ctx.jobs.read()`.
That read uses the same owner record and marks the job reported.
The plugin then injects one user-role notice into the owning agent.

`@deepseek-ai/dsh-tool-jobs` still owns wakeup delivery.
Its default `completionDelivery: "wakeup"` opens the parent turn that consumes the injected report.
The installed owner limits this to three consecutive completion wakes per parent.
A user-authored message resets that budget.
After the limit, both notices remain injected until another turn starts.

Continuable children do not use Jobs.
The installed `dsh-subagent` owner already calls `notifySettlement()` before ownership release.
That notice includes the final assistant message and uses `sendWaking()`.
The plugin does not add a second continuable report path.
The explicit `report` tool remains owned by `dsh-tool-subagent-report` and `ctx.subagents.reportFrom()`.

A failed, cancelled, or token-limited one-shot job has no final output in the Jobs outcome.
The generic job completion notice still reports that terminal status.

## Client behavior

The client uses the existing `ctx.sessions.list` store.
It derives the active count with `indexSubagentDescendants()`.
It hides rows whose installed `StateDot` has `data-state="done"`.
It uses the installed tree roles and trigger attributes instead of private class hashes.
It raises the tree and its local stacking context above chat content.

A store subscription updates the count when session state changes.
A DOM observer applies that projection when React mounts or replaces the header action.
