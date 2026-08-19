# dsh-plugin-catalog

Browse plugins from DeepSeek Harness Settings and install them into the current `web` profile. First-party plugins from your plugin hub are listed first (green **hub** badge); community repos from [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin) follow.

## Demo mode — instant curtain (no restart)

The toggle lives in the main Settings → Plugins modal, as the first card of
the Configurable tab. It hides every other community plugin **instantly**, so
you can compare the bare default UI against the dressed one without restarting
the GUI. A floating **“Exit demo mode”** button appears at the bottom-right
while it is on, so there is always a way back even if the path to Settings is
itself hidden.

This is **visual suppression, not an unload.** The slot system gives a plugin
no runtime API to remove another plugin's rendered React output, so the
curtain does the two things that *are* attributable and reversible:

1. **Disables each community plugin's injected `<style>` tag** — they carry
   `data-dyn="<pluginId>"` / `data-plugin-css`, matched against an exact
   allow-list of plugin ids. Harness tags and this catalog's own tag are never
   touched.
2. **Hides each community plugin's rendered roots** by a dynamic class rule.
   Community plugin classes are `dsh<letters>-…` (dsh followed by a LETTER):
   `dshbd-`, `dshp-`, `dshrs-`, … Harness classes are `dsh-<word>-…` (dsh
   followed by a DASH): `dsh-bash-`, `dsh-tool-`, … and this catalog is
   `dshpc-…`. So the curtain hides `[class*="dsh"]` while keeping `[class*="dsh-"]`
   (harness) and `[class*="dshpc"]` (the switch) visible. A new plugin prefix is
   caught automatically — there is no per-plugin list to maintain.

The on/off flag is persisted server-side (`dsh.catalog.demoOn`) only so a page
refresh comes back in the same state; it never gates the bundle list.

**Limits.** Plugin JS keeps running in the background (fetch loops,
subscriptions), so this is a *visual* before/after, not a performance one. The
hide rule relies on the `dsh<letters>`-vs-`dsh-` convention; a plugin that
ignores it (no `dsh` class prefix at all) would not be hidden.

> History: v1 matched class *substrings* and ate harness UI. v2 used a
> whole-token prefix list that had to be hand-maintained — and it kept
> breaking because a missing prefix (e.g. `dshrs`) left a plugin visible while
> others vanished. v3 (current) uses the dynamic letter-vs-dash rule above, so
> it maintains itself.

## Plugin hub priority

The catalog queries the hub API (`GET /api/v1/games/dsh/mods`) before the GitHub
topic and prepends the results. Hub installs differ from GitHub installs:

1. the artifact URL and sha256 come from the hub's files endpoint;
2. the tarball is downloaded into `<profile>/.catalog/` and **the sha256 is
   verified before npm ever sees it** — a mismatch aborts the install;
3. npm installs the verified local tarball, saved as a portable
   `file:.catalog/…` dependency.

Updates compare the installed package version against the hub's `latest`, and
hub mods are included in **Update all**. The hub's `engines.dsh` range is
checked against the running harness, with the same block/warn + "Install
anyway" flow as npm installs.

The hub URL defaults to `https://plugin-hub-khaki.vercel.app`; point at a local
hub with `DSH_PLUGIN_HUB_URL` (e.g. `http://127.0.0.1:3100`). If the hub is
unreachable the catalog still works — the hub section is simply absent.

## Install into this GUI

From any directory:

```sh
dsh plugin --profile web add ../../plugins/dsh-plugin-catalog
```

Then restart `dsh web` and open **Settings → Plugins → Catalog**.

## Install / uninstall

**A GitHub repo is the browse target; the installable unit is an npm package.**
Almost nothing in the topic is installable as `github:owner/repo` — the repos are
monorepos whose root is not a bundle, and whose plugins ship to npm prebuilt.

Clicking Install therefore:

1. reads the repo's root `package.json`, and if it isn't a bundle, scans the repo
   tree for subdirectories that declare `dsh.bundle`;
2. looks each candidate up on the npm registry;
3. installs the published package with
   `npm install --prefix <profile> --save <name>@<version>`;
4. appends it to `dsh.profile.bundles` and records the repo → package mapping.

One match installs directly; several offer a button per plugin; none gives a
refusal naming what it found. The button spins throughout and flips to
**Uninstall** once installed. Uninstall runs `npm uninstall` and then strips the
bundle wiring npm knows nothing about.

Both operations need a process restart before the change takes effect.

## Skills are not plugins — the no-npm path

Many repos in the topic ship **skills**, not packages. A skill is just a directory
containing `SKILL.md`; the harness reads them from, in rank order:

```
<projectRoot>/.dsh/skills
<projectRoot>/.agents/skills
<DSH_HOME>/skills
~/.agents/skills
```

Installing one is a file copy — no npm, no bundle, no build. When a repo has no
installable package but does contain skills, Install offers to copy them into
**`<DSH_HOME>/skills`**.

That target is deliberate: `~/.agents/skills` is shared with Claude Code and
Codex, so a bulk install there would add hundreds of skills to every agent
session on the machine. `<DSH_HOME>/skills` is harness-only.

Because a repo can hold hundreds of skills — `Vibe-Skills` has 253, and every one
lands in the agent's skill catalog — the first click only **counts** them and asks.
The route also takes an explicit subset:

```sh
curl -X POST localhost:3080/dsh-plugin-catalog/install \
  -H 'content-type: application/json' \
  -d '{"spec":"github:owner/repo","skills":["one-skill","another"]}'
```

Clones stage in the OS temp dir and are deleted afterwards — never inside a
watched tree. Uninstall removes the copied directories.

## Use npm, not pnpm

`dsh plugin add` shells out to `pnpm`, which is **not installed on this box** —
that is the original "dsh spawn" failure. `npm` (10.9.8) *is* installed, at
`~/.local/bin/npm`, and it resolves the plugin's own dependency tree. That
matters: `@linxin666/dsh-pet` needs `schemastery`, which is absent from every
`node_modules` in the resolution chain, so a hand-rolled tarball extract loads
broken. npm handles it.

## Three things that will brick the GUI if you skip them

Learned the hard way, on 2026-08-17:

1. **A package without `dsh.bundle` is not installable.** Adding one to
   `dsh.profile.bundles` makes the profile fail to boot with `profile bundle "x"
   declares no dsh.bundle in its package.json`, and the GUI never comes up.
   Install verifies this before writing anything. The GitHub topic is
   self-applied, so many repos tagged `dsh-plugin` are unrelated projects.

2. **Nothing large may be written inside the profile directory.** The harness
   watches that tree recursively; one 12k-file repo clone under `profiles/web/`
   exhausted the fd limit and killed the process with `EMFILE: too many open
   files, watch`. An npm install of a built plugin is ~800 files, which is fine —
   but never clone a monorepo there.

3. **Never guess the package name from the repo name.** `zhu1090093659/dsh-web-ui`
   publishes `@linxin666/dsh-live-stats`. Install records `dsh.catalog.installs`
   in the profile manifest mapping repo → package, and uninstall reads it back.

## Card covers

Each card leads with a 2.6:1 cover banner, storefront-style.

**Only genuine cover art is used** — the social preview an owner uploaded, served
from `repository-images.githubusercontent.com`. There is a tempting shortcut here
that is wrong: `opengraph.githubassets.com/1/<owner>/<repo>` always returns a
1200x600 image and needs no lookup, but for a repo *without* a preview that image
is an auto-generated card repeating the name, description and star count already
printed on our card — redundant, and white-on-dark in this UI.

The REST API does not expose the social-preview URL, so it is read from the repo
page's `og:image` meta tag. The response body is streamed and abandoned as soon
as the tag is found, rather than pulling ~500KB of repo page per card, capped at
8 concurrent lookups and memoised in `coverCache`. On the topic's first 50 repos
that is 22 with real art; a cold list takes ~8s, cached ~0.6s.

Repos with no cover get a monogram — the repo's first letter after stripping a
`dsh-`/`deepseek-` prefix — on a gradient hue hashed from the repo name, so it is
stable across reloads instead of changing shade on every render.

Installed repos also show a badge next to the title: `installed` for a package,
or `N skills` for a skill install.

## Reading a failed install

Results render in a dismissible panel **above** the repo list. They used to render
below it, i.e. 50 cards off-screen, and the list briefly collapsed during the
post-install refresh — so a failure appeared to flash and vanish. The refresh now
keeps the previous rows mounted.

Every install and uninstall is also written to the harness log, so a message you
missed is still recoverable:

```sh
grep plugin-catalog "$HOME/Work.nosync/tools/deepseek-harness/state/web-launcher.log" | tail
```

## Verified

`@linxin666/dsh-live-stats@0.1.19`, resolved from `zhu1090093659/dsh-web-ui`,
installs in ~4s, survives a restart, and renders its `TPS` readout in the session
status bar.
