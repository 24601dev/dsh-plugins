/**
 * Host half of the themes bundle.
 *
 * Theming is entirely a client concern — the palettes are CSS custom properties
 * applied in the browser, and the selection lives in the browser's localStorage.
 * The host side exists only because a dsh bundle needs a loadable entry.
 */
export const name = "plugin-themes";

export function apply() {
  /* no host-side behaviour */
}
