import { DomainQualificationError } from "./card-boundary.js";

/** Restore saved text only when re-wear fails without rejecting the packet domain. */
export async function restoreWear(wear, saved, applyWorn, notifyPrompt) {
  if (!saved || typeof saved.name !== "string" || !saved.name) return;
  try {
    await wear(saved.name, typeof saved.description === "string" ? saved.description : "");
  } catch (error) {
    if (error instanceof DomainQualificationError) return;
    if (typeof saved.text !== "string" || !saved.text) return;
    applyWorn(saved);
    notifyPrompt();
  }
}
