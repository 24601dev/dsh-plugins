/** Page-side collector: visible controls get [ref=eN] handles the agent can click. */

export const SNAPSHOT_SCRIPT = `(() => {
  const SEL = [
    "a", "button", "input", "textarea", "select", "summary",
    "[role='button']", "[role='link']", "[role='tab']", "[role='menuitem']",
    "[role='checkbox']", "[role='radio']", "[role='textbox']", "[role='combobox']",
    "[role='option']", "[role='switch']", "[contenteditable='true']",
  ].join(",");

  function visible(el) {
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (Number(style.opacity) === 0) return false;
    return true;
  }

  function label(el) {
    const raw = el.getAttribute("aria-label")
      || el.getAttribute("title")
      || el.getAttribute("placeholder")
      || el.getAttribute("alt")
      || el.getAttribute("name")
      || (el.type === "submit" || el.type === "button" ? el.value : "")
      || el.innerText
      || "";
    return String(raw).replace(/\\s+/g, " ").trim().slice(0, 96);
  }

  const seen = new Set();
  const refs = Object.create(null);
  const lines = [];
  let n = 0;
  for (const el of document.querySelectorAll(SEL)) {
    if (seen.has(el) || !visible(el)) continue;
    seen.add(el);
    const id = "e" + (++n);
    refs[id] = el;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || tag;
    const type = el.type && tag === "input" ? " type=" + el.type : "";
    const href = typeof el.href === "string" && el.href.startsWith("http")
      ? " " + el.href.slice(0, 120)
      : "";
    const text = label(el);
    const value = tag === "input" && el.value && el.type !== "password"
      ? ' value="' + String(el.value).slice(0, 40).replace(/"/g, "'") + '"'
      : "";
    lines.push("- " + role + type + (text ? ' "' + text + '"' : "") + value + href + " [ref=" + id + "]");
  }
  window.__dshBrowserRefs = refs;
  return {
    url: location.href,
    title: document.title,
    snapshot: lines.join("\\n"),
    count: n,
  };
})()`;
