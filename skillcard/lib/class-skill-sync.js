/** Keep top-level class skill loads and the canonical class wear owner in sync. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function frontmatter(markdown) {
  const match = String(markdown ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*$/);
    if (!field) continue;
    let value = field[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[field[1].toLowerCase()] = value;
  }
  return meta;
}

async function classCandidate(value) {
  if (!value || typeof value !== "object") return null;
  let markdown = typeof value.content === "string" ? value.content : "";
  let meta = frontmatter(markdown);
  if (!meta.class && !meta.role && value.resourceBase?.kind === "directory") {
    try {
      markdown = await readFile(join(value.resourceBase.path, "SKILL.md"), "utf8");
      meta = frontmatter(markdown);
    } catch {
      return null;
    }
  }
  if (!meta.class && !meta.role) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  return {
    name: value.name.trim(),
    description: typeof meta.description === "string" ? meta.description : "",
  };
}

function acceptedValue(result, decision) {
  if (decision?.kind !== "accept") return { accepted: false };
  if (Object.prototype.hasOwnProperty.call(decision, "value")) {
    return { accepted: true, value: decision.value };
  }
  return result?.isError ? { accepted: false } : { accepted: true, value: result?.value };
}

function isTopLevelAgent(exec) {
  const meta = exec?.agent?.session?.meta;
  return Boolean(exec?.agent) && meta?.origin !== "subagent" && (meta?.delegationDepth ?? 0) === 0;
}

export function applyClassSkillSync(ctx, wear) {
  const pending = new Map();

  ctx.on("tools/post-execute", async (exec, result, next) => {
    const decision = await next();
    const accepted = acceptedValue(result, decision);
    if (!accepted.accepted || exec.signal?.aborted || !isTopLevelAgent(exec)) {
      pending.delete(exec.token);
      return decision;
    }

    if (exec.name === "skill") {
      const candidate = await classCandidate(accepted.value);
      if (!candidate) return decision;
      if (exec.parent) {
        pending.set(exec.parent, candidate);
      } else {
        await wear(candidate.name, candidate.description);
      }
      return decision;
    }

    const candidate = pending.get(exec.token);
    pending.delete(exec.token);
    if (!candidate) return decision;
    // Only the outermost successful execution commits. An enclosing tool that is
    // itself nested propagates the candidate upward; a failed/aborted ancestor
    // still discards it, so transactional effects follow the whole parent chain.
    if (exec.parent) {
      pending.set(exec.parent, candidate);
    } else {
      await wear(candidate.name, candidate.description);
    }
    return decision;
  });
}
