import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { SNAPSHOT_SCRIPT } from "./snapshot.js";
import { EMPTY_JPEG, encodeBinary, handshake, writeJpeg } from "./ws.js";

const HOME = process.env.DSH_BROWSER_HOME || "https://www.google.com";

function chromePath() {
  const listed = [
    process.env.DSH_BROWSER_CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return listed.find((path) => path && existsSync(path)) || "";
}

function profileDir() {
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  return join(home, "plugin-browser-profile");
}

function allowedUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("url is required");
  const url = new URL(text.includes("://") ? text : `https://${text}`);
  if (!["http:", "https:"].includes(url.protocol) && url.href !== "about:blank") {
    throw new Error("Only http(s) URLs are allowed");
  }
  return url.href;
}

export function createBrowserSession() {
  const streams = new Set();
  const sockets = new Set();
  let browser;
  let page;
  let cdp;
  let lastJpeg = EMPTY_JPEG;
  let boot;
  let viewport = { width: 1280, height: 800, deviceScaleFactor: 2 };
  let queue = Promise.resolve();
  let castGen = 0;

  function run(work) {
    const next = queue.then(work, work);
    queue = next.catch(() => {});
    return next;
  }

  function hasViewers() {
    return streams.size > 0 || sockets.size > 0;
  }

  function pushFrame(jpeg) {
    lastJpeg = jpeg;
    for (const res of streams) {
      try { writeJpeg(res, jpeg); } catch { streams.delete(res); }
    }
    const packet = sockets.size ? encodeBinary(jpeg) : null;
    for (const client of sockets) {
      if (!packet || client.busy || !client.socket.writable) continue;
      client.busy = !client.socket.write(packet);
    }
  }

  async function startCast() {
    const gen = ++castGen;
    await stopCast();
    if (gen !== castGen || !page || !hasViewers()) return;
    cdp = await page.createCDPSession();
    const dpr = viewport.deviceScaleFactor || 1;
    cdp.on("Page.screencastFrame", async (frame) => {
      try {
        pushFrame(Buffer.from(frame.data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
      } catch { /* tab closed */ }
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 78,
      everyNthFrame: 1,
      maxWidth: Math.round(viewport.width * dpr),
      maxHeight: Math.round(viewport.height * dpr),
    });
  }

  async function stopCast() {
    if (!cdp) return;
    try { await cdp.send("Page.stopScreencast"); } catch { /* ignore */ }
    try { await cdp.detach(); } catch { /* ignore */ }
    cdp = null;
  }

  async function bootChrome() {
    const executablePath = chromePath();
    if (!executablePath) {
      throw new Error("Google Chrome not found. Set DSH_BROWSER_CHROME to the browser binary.");
    }
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      userDataDir: profileDir(),
      defaultViewport: viewport,
      ignoreHTTPSErrors: true,
      args: [
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();
    await page.setViewport(viewport);
    page.setDefaultTimeout(25_000);
    await page.goto(HOME, { waitUntil: "domcontentloaded" }).catch(() => {});
  }

  async function ensure() {
    if (page && !page.isClosed()) return page;
    if (browser) {
      try { await browser.close(); } catch { /* already gone */ }
      browser = page = null;
    }
    if (!boot) {
      boot = bootChrome().finally(() => { boot = null; });
    }
    await boot;
    return page;
  }

  async function status() {
    try {
      if (!page) return { ready: false, url: "", title: "", width: viewport.width, height: viewport.height };
      return {
        ready: true,
        url: page.url(),
        title: await page.title().catch(() => ""),
        width: viewport.width,
        height: viewport.height,
      };
    } catch (error) {
      return { ready: false, url: "", title: "", error: String(error?.message ?? error) };
    }
  }

  async function navigate(url) {
    const href = allowedUrl(url);
    const current = await ensure();
    await current.goto(href, { waitUntil: "domcontentloaded" });
    return status();
  }

  async function snapshot() {
    const current = await ensure();
    return current.evaluate(new Function(`return ${SNAPSHOT_SCRIPT}`));
  }

  async function screenshot() {
    const current = await ensure();
    const data = await current.screenshot({ type: "jpeg", quality: 82 });
    return Buffer.from(data);
  }

  async function clickRef(ref) {
    const current = await ensure();
    const box = await current.evaluate(async (id) => {
      const el = window.__dshBrowserRefs?.[id];
      if (!el) return null;
      el.scrollIntoView({ block: "center", inline: "nearest" });
      await new Promise((r) => setTimeout(r, 40));
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, ref);
    if (!box) throw new Error(`Unknown ref "${ref}". Call browser_snapshot first.`);
    await current.mouse.click(box.x, box.y);
    return status();
  }

  async function typeRef(ref, text, submit) {
    await clickRef(ref);
    const current = page;
    if (text) await current.keyboard.type(String(text), { delay: 12 });
    if (submit) await current.keyboard.press("Enter");
    return status();
  }

  async function press(key) {
    const current = await ensure();
    await current.keyboard.press(key);
    return status();
  }

  async function scroll(deltaY, ref) {
    const current = await ensure();
    if (ref) {
      await current.evaluate((id, dy) => {
        const el = window.__dshBrowserRefs?.[id];
        (el || window).scrollBy(0, dy);
      }, ref, deltaY);
    } else {
      await current.mouse.wheel({ deltaY });
    }
    return status();
  }

  async function clickAt(x, y) {
    const current = await ensure();
    await current.mouse.click(Number(x), Number(y));
    return status();
  }

  async function key(name, text) {
    const current = await ensure();
    if (text) await current.keyboard.type(text, { delay: 8 });
    else if (name) await current.keyboard.press(name);
    return status();
  }

  async function setViewport(width, height, deviceScaleFactor) {
    const dpr = Math.min(2, Math.max(1, Number(deviceScaleFactor) || 1));
    const w = Math.max(400, Math.min(1920, Math.round(width)));
    const h = Math.max(300, Math.min(1200, Math.round(height)));
    if (w === viewport.width && h === viewport.height && dpr === viewport.deviceScaleFactor) {
      return viewport;
    }
    viewport = { width: w, height: h, deviceScaleFactor: dpr };
    if (page && !page.isClosed()) await page.setViewport(viewport);
    if (hasViewers()) void startCast();
    return viewport;
  }

  function addStream(res) {
    res.writeHead(200, {
      "content-type": "multipart/x-mixed-replace; boundary=frame",
      "cache-control": "no-store, no-cache, must-revalidate",
      connection: "keep-alive",
    });
    writeJpeg(res, lastJpeg);
    streams.add(res);
    void ensure().then(startCast).catch(() => {});
    const drop = () => {
      streams.delete(res);
      if (!hasViewers()) void stopCast();
    };
    res.on("close", drop);
    res.on("error", drop);
  }

  function addSocket(req, socket, head) {
    if (!handshake(req, socket, head)) return;
    const client = { socket, busy: false };
    socket.on("drain", () => { client.busy = false; });
    socket.on("data", () => { /* client pings/close; display socket is one-way */ });
    const drop = () => {
      sockets.delete(client);
      if (!hasViewers()) void stopCast();
    };
    socket.on("close", drop);
    socket.on("end", drop);
    socket.on("error", drop);
    sockets.add(client);
    if (lastJpeg && lastJpeg !== EMPTY_JPEG) {
      client.busy = !socket.write(encodeBinary(lastJpeg));
    }
    void ensure().then(startCast).catch(() => {});
  }

  async function close() {
    streams.clear();
    for (const client of sockets) {
      try { client.socket.destroy(); } catch { /* ignore */ }
    }
    sockets.clear();
    await stopCast();
    try { await browser?.close(); } catch { /* ignore */ }
    browser = page = null;
  }

  return {
    run,
    ensure,
    close,
    status,
    navigate,
    snapshot,
    screenshot,
    clickRef,
    typeRef,
    press,
    scroll,
    clickAt,
    key,
    setViewport,
    addStream,
    addSocket,
    async back() { await (await ensure()).goBack(); return status(); },
    async forward() { await (await ensure()).goForward(); return status(); },
    async reload() { await (await ensure()).reload({ waitUntil: "domcontentloaded" }); return status(); },
  };
}
