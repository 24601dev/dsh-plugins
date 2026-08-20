# dsh-plugin-browser

A **Browser** tab in the session, backed by local Google Chrome. You watch a live picture of the page; the agent uses `browser_*` tools against the same tab.

This is not your everyday Chrome window. The plugin launches a **headless** Chrome with its own profile under `$DSH_HOME/plugin-browser-profile`, so cookies and logins do not carry over from your desktop browser.

## Tools

| Tool | Role |
|------|------|
| `browser_navigate` | Open an http(s) URL |
| `browser_snapshot` | Text outline of visible controls with `[ref=eN]` handles |
| `browser_click` / `browser_type` / `browser_press` / `browser_scroll` | Interact by ref or key |
| `browser_screenshot` | JPEG of the tab (needs an image-capable model) |

Prefer snapshot over screenshot unless layout actually matters.

## Config

- `DSH_BROWSER_CHROME` — path to the Chrome/Chromium binary (otherwise common macOS/Linux locations are probed)
- `DSH_BROWSER_HOME` — first URL after launch (default `https://www.google.com`)

## Tradeoffs

- Isolated profile: you must sign in again inside the tab if a site needs a session
- Headless: no separate OS window, only the harness tab
- One shared browser for the whole harness, not per session
- The live view is a 2× JPEG stream over WebSocket (dropped if the GUI falls behind). Sharper than the first MJPEG pass, still not a native Chrome window — heavy pages and video will look softer than the real browser
- Sites can still detect automation; some pages block headless Chrome
- `browser_screenshot` fails on text-only models
