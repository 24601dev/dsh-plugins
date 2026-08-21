/** Normalize canonical Character/Class metadata onto compatible transports. */
export function normalizeDeclaredKind(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "soul" || raw === "persona" || raw === "character") return "persona";
  if (raw === "role" || raw === "class") return "role";
  if (raw === "skill") return "skill";
  return "";
}

export function kindFromMeta(meta, fallback = "skill") {
  const declared = normalizeDeclaredKind(meta?.kind);
  if (declared) return declared;
  if (String(meta?.class ?? "").trim()) return "role";
  if (String(meta?.role ?? "").trim()) return "role";
  return normalizeDeclaredKind(fallback) || "skill";
}
