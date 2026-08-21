/** Domain qualification for skill_card_v1 packets: Class vs Character vs ordinary skill. */

export function frontmatter(markdown) {
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

function kindOf(meta) {
  return String(meta.kind ?? "").trim().toLowerCase();
}

/** True when the packet declares a Class (canonical class: or legacy role forms). */
export function isClassPacket(files) {
  const anchor = fileText(files, "SKILL.md") || fileText(files, "ROLE.md");
  if (!anchor.trim()) return false;
  const meta = frontmatter(anchor);
  if (typeof meta.class === "string" && meta.class.trim()) return true;
  if (typeof meta.role === "string" && meta.role.trim()) return true;
  if (kindOf(meta) === "role" || kindOf(meta) === "class") return true;
  // Legacy role packets used a ROLE.md anchor with no SKILL.md contract.
  if (!fileText(files, "SKILL.md").trim() && fileText(files, "ROLE.md").trim()) return true;
  return false;
}

/** True when the packet declares a Character (canonical SOUL.md+kind: character or legacy persona/soul forms). */
export function isCharacterPacket(files) {
  const soul = fileText(files, "SOUL.md");
  if (!soul.trim()) return false;
  const meta = frontmatter(soul);
  if (kindOf(meta) === "character") return true;
  if (kindOf(meta) === "persona" || kindOf(meta) === "soul") return true;
  if (typeof meta.persona === "string" && meta.persona.trim()) return true;
  // A SOUL.md packet with no Class marker is a legacy persona.
  if (typeof meta.class !== "string" && typeof meta.role !== "string" && kindOf(meta) !== "role" && kindOf(meta) !== "class") return true;
  return false;
}

function fileText(files, rel) {
  const entry = files?.[rel];
  if (!entry || typeof entry !== "object") return "";
  if (typeof entry.content !== "string") return "";
  if (entry.encoding === "utf-8") return entry.content;
  if (entry.encoding === "base64") return Buffer.from(entry.content, "base64").toString("utf8");
  return "";
}
