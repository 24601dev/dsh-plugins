# dsh-plugin-p5

A **Persona 5** skin for the DeepSeek Harness, as its own plugin rather than a
ninth card in `dsh-plugin-themes`.

Phantom in the shared theme picker is the lightweight cousin: tokens plus CSS
atmosphere, no files. This plugin exists so marks, textures, and later fonts
can live in `assets/` and grow without stuffing the themes bundle.

## What it is

- Settings → General, directly under Theme: a **Persona 5** card.
- While on, it sets `data-dsh-p5="on"` and **overrides** whatever theme is
  selected. Appearance still chooses light (calling-card paper) or dark (menu).
- Original geometry only. No Atlus logotype, stamps, character art, or copied
  UI screens. The sidebar mark is a sheared slab “P5”, not the game logo.

## Assets

Host serves `assets/` at `/dsh-plugin-p5/<file>`:

| File | Use |
|------|-----|
| `mark.svg` | Sidebar / empty-state wordmark (CSS mask) |
| `seal.svg` | Collapsed rail stamp |
| `halftone.svg` | Dark chat-field dots |

Drop more SVGs, PNGs, or `.woff2` here and point at them from `lib/client.js`.

## Tradeoffs

- Enabling this skin hides the Theme picker’s effect until you turn it off.
  That is intentional: a print skin cannot layer on Arasaka without mud.
- Phantom stays in the theme picker for people who want the look with no extra
  plugin. The two should not be on at once — this skin wins either way.
- Marks load over HTTP from the harness. A missing asset falls back to a blank
  mask, not the DeepSeek fish.
