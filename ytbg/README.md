# dsh-plugin-ytbg

Play a YouTube video as the DeepSeek Harness backdrop, with a small deck in
the foreground so you can run it while you work.

## Use

Settings → General → **YouTube backdrop**: paste a watch URL (or 11-character
id) and enable. A deck appears in the lower-right.

The corner deck is play/pause, stop, and replay. The chevron expands volume
and a scrub bar. Drag the dotted strip to move it. URL, enable, and sound
live in Settings.

The video is fit to the viewport (16:9, letterboxed if needed), with no
YouTube chrome. Autoplay starts muted because browsers block unmuted
autoplay; turn on Sound in Settings. Chat copy gets a Twitch-style dark
halo so it stays readable over the picture.

## Tradeoffs

- Chrome is made translucent so the picture reads through. Chat copy gets a
  dark text halo (Twitch-style). That helps over video; it can look a bit
  heavy on already-solid bubbles, and a bright clip can still win.
- Arasaka / Militech / Phantom / P5 column washes are switched off while the
  backdrop is on — otherwise they paint over the video.
- Sidebar frost is a flat translucent fill, not `backdrop-filter`. Blur on the
  sidebar column turned it into a containing block and crushed Settings.
- The picture is fitted to the chat column, not the full window, so the
  sidebar, details pane, and session tabs sit beside/above it instead of
  over it. The 16:9 frame is pinned to the top of that hole and grows if
  you collapse the sidebar.
- A luminance mask fades the lower ~40% of the picture to transparent (then
  to the black canvas). Busy lower-third shots lose detail there; that is
  the point of the vignette.
- YouTube’s play overlay and end screen sit inside the iframe, so they are
  covered with the video’s thumbnail while paused. That hides the chrome;
  pause does not freeze the current frame.
- Some videos refuse to embed (`onError` on the IFrame API). Nothing this
  plugin can do about that.
- YouTube’s embed terms assume a visible player. This is a personal wallpaper
  on a local GUI, not a redistribution of the stream.
- The YouTube IFrame API is loaded from `youtube.com`. Offline, the deck still
  shows but playback will not start.
