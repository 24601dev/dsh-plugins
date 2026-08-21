# dsh-plugins

DeepSeek Harness plugins. One folder per plugin. Package names stay `dsh-plugin-<slug>`.

This is the author source. The Plugin Hub hosts download artifacts; do not treat GitHub topics as the catalog.

| Folder | Package | What |
|---|---|---|
| `board` | `dsh-plugin-board` | Shared agent message board |
| `browser` | `dsh-plugin-browser` | Chrome tab the user and agent share |
| `catalog` | `dsh-plugin-catalog` | Hub + GitHub-topic plugin browser |
| `chat-density` | `dsh-plugin-chat-density` | Compact chat layout |
| `p5` | `dsh-plugin-p5` | Persona 5 skin |
| `resend` | `dsh-plugin-resend` | Resend / regenerate from a session fork |
| `skillcard` | `dsh-plugin-skillcard` | Wear Character, class, and skill seats |
| `skillpress` | `dsh-plugin-skillpress` | Author and stamp cards |
| `themes` | `dsh-plugin-themes` | Paired light/dark colour themes |
| `ui-tweaks` | `dsh-plugin-ui-tweaks` | Plugin list and header chrome tweaks |
| `vault` | `dsh-plugin-vault` | Obsidian vault graph + search tools |
| `ytbg` | `dsh-plugin-ytbg` | YouTube video as the harness backdrop |

## Local harness

From `deepseek-harness-setup/state/profiles/web/package.json`:

```json
"dsh-plugin-skillcard": "file:../../../../dsh-plugins/skillcard"
```

Same pattern for the others. Restart `dsh web` after changing bundles.

## Add a plugin

1. Copy an existing folder.
2. Set `package.json` `name` to `dsh-plugin-<slug>` and keep `dsh.bundle`.
3. Point the web profile at `file:../../../../dsh-plugins/<slug>`.

## Release

Each folder versions itself. Do not tag the repo `v0.2.0`.

```bash
# in skillcard/package.json, bump version, then:
git tag skillcard/v0.2.0
git push origin skillcard/v0.2.0
```

Hub publish (when the GitHub Action is wired) packs that folder only. Changelog is required; the same semver cannot be overwritten.
