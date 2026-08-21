# dsh-plugin-skillcard

Wear skill_card_v1 Character, class, and skill seats. Character cards keep the
canonical `SOUL.md` filename and `kind: character` metadata. Internal `persona`
and `role` kinds and HTTP paths remain compatible with existing cards. Card
authoring stays in `dsh-plugin-skillpress`. Canonical Character and class
packets are reread from disk whenever they are worn or restored.

## Surfaces

Settings → Plugins → Plugin configuration → **Skillcard surfaces**:

- **Composer skill dock** — the eight-slot bar above the composer.
- **Sidebar Character & class seats** — wear seats in the sidebar chrome.

Both default on. Turning a surface off hides its UI only; equipped cards and
host wear/install routes stay in place. The choice is stored in
`$DSH_HOME/plugin-skillcard.json`.
