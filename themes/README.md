# dsh-plugin-themes

Custom colour themes for the DeepSeek Harness. Each theme ships a **paired light
and dark palette**; the built-in Appearance control still decides which one is
showing. The picker appears in **Settings → General**, directly beneath
Appearance, only while this plugin is enabled.

Ships nine themes: **DeepSeek** (the untouched default), **Ember**, **Forest**,
**Nord**, **Rose**, **Arasaka**, **Militech**, **Phantom** and **Wayfarer**.

### Arasaka

Black steel and warning red. Dark is the canonical read — near-black surfaces
with a slight red cast, bone-white type, red-tinted borders. Light is the
corporate-document read of the same brand: bone paper, near-black type, the red
used sparingly, rather than an unrelated palette bolted on to satisfy the
light/dark contract.

Chat body type uses the design system's small markdown scale (14px/24px),
the HUD density that used to live in a separate plugin. Headings, code,
and chrome stay on their own scales.

Its dark accent is `rgb(235, 48, 60)` rather than a deeper, more "authentic"
`rgb(230, 38, 50)`, which measured **4.46:1** against the near-black base — just
under the 4.5:1 AA floor for small text. The shipped value measures 4.77:1.

### Militech

Black steel and hazard chartreuse — Arasaka's sibling, not a navy reskin.
Dark is the canonical HUD: near-black with an olive cast, yellow-chartreuse
chrome (`rgb(220, 232, 40)`, **15.0:1** on the base), square wireframes, corner
ticks, a faint engineering grid and scanlines. Light is the field-manual read:
pale chartreuse paper, near-black type, olive used sparingly.

Filled buttons cannot use the neon chartreuse. White-on-neon fails AA
(~1.3:1), so primary fills are a deeper olive (`rgb(102, 110, 12)` dark /
`rgb(96, 108, 10)` light) that keeps white label text above 4.5:1. The neon
is reserved for borders, marks, and glow.

Chat body type uses the same 14px/24px markdown scale as Arasaka. Phantom
and the default theme do not.

### Phantom

Pop-punk print, not a cyberpunk HUD. Dark is the canonical menu: graphic
black, white type, a single red (`rgb(228, 34, 44)`). No sub-hues — secondary
type stays grey, never blue or gold. Light is the calling-card read: off-white
paper, ink black, a deeper red (`rgb(186, 12, 28)`).

Atmosphere is parallelograms, a thick red rail slash, a white sight-line,
halftone dots, and hard offset cutouts (drop-shadow, not glow). P5 Royal
layers paper-cut slabs the same way. No glass or scanlines. Oswald is
fetched from Google Fonts. It does not copy Persona 5 marks, stamps, or
lettering — only the colour and construction relationships.

The dark accent on true black measures **4.56:1**; white on that fill
measures **4.60:1**. Magenta/turquoise from battle HP/MP are left out so
the red stays the only hue.

### Wayfarer

Celestial parchment for long-form chat: a misty slate-blue field sits behind
ivory paper in light mode and midnight-blue glass in dark mode. Antique gold is
reserved for keylines, focus, and state; filled actions use a deeper bronze so
their labels remain readable. Palatino/Georgia gives headings and chrome a
bookish voice while retaining the harness's complete CJK fallback tail.

The direction borrows material relationships from fantasy adventure interfaces
without borrowing their identity. Its scenic fields, four-point corner lines,
and translucent panels are original CSS. It includes no game art, marks,
character assets, icons, or copied ornamental compositions.

## How it works

The harness defines its design tokens twice:

```css
body                        { --dsw-alias-bg-base: …; }  /* light */
body[data-ds-dark-theme]    { --dsw-alias-bg-base: …; }  /* dark  */
```

A theme adds `data-dsh-theme="<id>"` to `<body>` and redefines the same tokens at
higher specificity:

```css
body[data-dsh-theme="ember"]                     { … }  /* 0,2,1 beats 0,0,1 */
body[data-dsh-theme="ember"][data-ds-dark-theme] { … }  /* 0,3,1 beats 0,2,1 */
```

This is deliberately *additive*. The plugin never touches `data-ds-dark-theme`,
so Appearance (Light/Dark/System) keeps working exactly as before and a theme
only supplies the colours for whichever mode is active. Selecting **DeepSeek**
removes the attribute and restores the stock palette with no overrides at all.

## Typography

A theme sets type as well as colour. This turns out to be a single seam: every
composite `--dsw-font-*-font-family` token in the design system resolves to
`var(--dsw-font-family)`, and code text to `--ds-font-family-code`. Overriding
those two re-fonts the entire UI, so a theme declares only a display face:

| Theme | Face |
|---|---|
| DeepSeek | system default (no override) |
| Ember | Iowan Old Style |
| Forest | Optima |
| Nord | Helvetica Neue |
| Rose | Baskerville |
| Arasaka | Chakra Petch / Menlo |
| Phantom | Oswald / Menlo |
| Wayfarer | Palatino / Georgia |

Chakra Petch is fetched from Google Fonts once at plugin load (Arasaka and
Militech share it). Oswald is fetched the same way for Phantom. The others use
system-resident faces; Wayfarer includes Palatino and Georgia fallbacks for
cross-platform coverage.

Fonts are emitted **once** on the base selector, not duplicated into the light
and dark blocks: a typeface does not change between modes.

### The tails are not optional

A theme supplies only the display face; `UI_TAIL` and `CODE_TAIL` are always
appended. Setting `font-family: Optima, sans-serif` and stopping there would
strip the CJK fallbacks (`'PingFang SC'`, `'Hiragino Sans GB'`, `'Microsoft
YaHei'`) that the harness ships, leaving Chinese text — the UI has a full `zh`
locale — to whatever the browser guesses.

`CODE_TAIL` also ends *without* a bare `monospace`, matching the harness's own
`base.css`, which omits it deliberately: on Windows that tail resolves CJK to
SimSun.

## Both palettes must define the same tokens

The stylesheet is generated by iterating a single `TOKENS` list over each theme's
`light` and `dark` maps. That is not tidiness — it is load-bearing.

Our light rule and the harness's dark rule have *equal* specificity (both
`0,2,1`), and ours is injected later, so in dark mode our light rule wins any
token our dark block fails to define. A token set for light but omitted for dark
would leak a light value into dark mode. Generating both blocks from one list
makes that impossible; `node --check` plus the parity assertion in the commit
notes cover it.

## Adding a theme

Append to `THEMES` in `lib/client.js` with `light` and `dark` maps covering every
entry in `TOKENS`, plus `swatch`/`accent` for the picker preview (the split
square showing the light and dark halves side by side).

The 14 themed tokens are the structural ones — surfaces, borders, label ranks,
brand and accent. The harness defines 78 aliases in total, most derived from
`--dsw-static-*` primitives; overriding the structural set recolours the UI
coherently without having to restate the whole system.

## Persistence

The selection is stored in `localStorage` under
`dsh-plugin-themes:selected`, and applied at module-factory time — before React
mounts — so a saved theme does not flash the default palette on load.

This is browser-local rather than harness settings: it does not sync across
profiles or machines. If that becomes wanted, the built-in theme plugin persists
through `ctx.settingsScope.bind({ namespace })`, which would be the path to
follow.
