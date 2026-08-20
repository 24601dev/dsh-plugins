/**
 * Wear surfaces for skill_card_v1: soul, role, and skill bar.
 * Card authoring stays in dsh-plugin-skillpress.
 */
import { apply as applyConfig } from "./config.js";
import { apply as applySoul } from "./soul.js";
import { apply as applyRole } from "./role.js";
import { apply as applySkills } from "./skill.js";

export const name = "plugin-skillcard";
export const inject = ["webServer", "systemPrompt"];

export function apply(ctx) {
  applyConfig(ctx);
  applySoul(ctx);
  applyRole(ctx);
  applySkills(ctx);
}
