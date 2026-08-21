import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function generatedThemeCss() {
  const source = fs.readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  const nodes = [];
  const document = {
    body: {
      setAttribute() {},
      removeAttribute() {},
    },
    head: {
      appendChild(node) {
        nodes.push(node);
      },
    },
    createElement(tag) {
      return { tag, dataset: {} };
    },
    querySelector(selector) {
      const style = selector.match(/^style\[data-dsh-style="([^"]+)"\]$/);
      if (style) {
        return nodes.find((node) => node.tag === "style" && node.dataset.dshStyle === style[1]) ?? null;
      }
      const font = selector.match(/^link\[data-dsh-font="([^"]+)"\]$/);
      if (font) {
        return nodes.find((node) => node.tag === "link" && node.dataset.dshFont === font[1]) ?? null;
      }
      return null;
    },
  };
  const localStorage = {
    getItem() {
      return "wayfarer";
    },
    setItem() {},
  };
  let descriptor;
  const window = {
    __ModuleLoader__: {
      load(value) {
        descriptor = value;
      },
    },
  };

  new Function("window", "document", "localStorage", source)(window, document, localStorage);
  descriptor.factory((name) => {
    if (name === "react") return {};
    throw new Error(`Unexpected module: ${name}`);
  });

  return nodes.find((node) => node.dataset.dshStyle === "themes").textContent;
}

test("Wayfarer never makes the shell sidebar a blurred containing block", () => {
  const css = generatedThemeCss();
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const sidebar = rules.find(([, selector]) =>
    selector.trim() === 'body[data-dsh-theme="wayfarer"] [class*="sidebarCol"]');
  const glassPanels = rules.find(([, selector]) =>
    selector.trim() ===
      'body[data-dsh-theme="wayfarer"] [class*="detailsCol"],body[data-dsh-theme="wayfarer"] .wSkVaW_header');

  assert.equal(
    sidebar?.[2],
    "background:rgba(249,246,232,.84)!important;border-right:1px solid var(--dsw-alias-border-l2)",
  );
  assert.equal(
    glassPanels?.[2],
    "background:rgba(249,246,232,.84)!important;backdrop-filter:blur(18px) saturate(.92);" +
      "-webkit-backdrop-filter:blur(18px) saturate(.92)",
  );
});
