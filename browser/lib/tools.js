import { defineTool } from "@deepseek-ai/dsh-tools";

function text(value) {
  return [{ type: "text", text: value }];
}

function imageBlocks(value) {
  return [
    { type: "text", text: `${value.image.mediaType} screenshot, ${value.image.width}x${value.image.height} px, ${value.url}` },
    {
      type: "image",
      attachment: {
        attachmentId: value.image.attachmentId,
        mediaType: value.image.mediaType,
        bytes: value.image.bytes,
        width: value.image.width,
        height: value.image.height,
        ...(value.image.name ? { name: value.image.name } : {}),
      },
    },
  ];
}

const imageSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    url: { type: "string", required: true },
    image: {
      type: "object",
      additionalProperties: false,
      required: true,
      properties: {
        attachmentId: { type: "string", required: true },
        mediaType: { type: "string", enum: ["image/png", "image/jpeg", "image/webp", "image/gif"], required: true },
        bytes: { type: "integer", required: true },
        width: { type: "integer", required: true },
        height: { type: "integer", required: true },
        name: { type: "string" },
      },
    },
  },
};

const statusSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ready: { type: "boolean", required: true },
    url: { type: "string", required: true },
    title: { type: "string", required: true },
  },
};

function statusOf(info) {
  return { ready: Boolean(info.ready), url: info.url || "", title: info.title || "" };
}

async function assertVision(ctx, exec) {
  const routed = exec.agent?.session.requestHeader()?.config;
  const provider = routed?.provider ?? exec.agent?.options.provider;
  const model = routed?.model ?? exec.agent?.options.model;
  const llm = ctx.get("llm");
  if (!provider || !model || !llm) {
    throw new Error("browser_screenshot needs an image-capable model; the current route could not be resolved");
  }
  const active = await llm.resolveModelInfo(provider, model, exec.signal);
  if (!active.inputModalities?.includes("image")) {
    throw new Error(`browser_screenshot needs image input; model "${model}" is text-only. Use browser_snapshot, or switch models.`);
  }
}

export function registerTools(ctx, session) {
  ctx.tools.register(defineTool({
    name: "browser_navigate",
    description: "Open a URL in the shared Chrome tab (the user sees the same page). http(s) only.",
    parameters: { url: { type: "string", required: true, description: "http(s) URL to load." } },
    output: { schema: statusSchema, render: (_a, v) => text(`Opened ${v.url}${v.title ? ` — ${v.title}` : ""}`) },
    timeoutMs: 35_000,
    isConcurrencySafe: () => false,
    execute: (args) => session.run(() => session.navigate(args.url).then(statusOf)),
    presentCall: (args) => ({ card: "generic", title: `Open ${args.url}`, kind: "fetch" }),
  }));

  ctx.tools.register(defineTool({
    name: "browser_snapshot",
    description: "Read the current Chrome tab as a text outline of visible controls. Each control has a [ref=eN] handle for browser_click / browser_type. Prefer this over screenshots.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string", required: true },
          title: { type: "string", required: true },
          count: { type: "integer", required: true },
          snapshot: { type: "string", required: true },
        },
      },
      render: (_a, v) => text(`## ${v.title}\n${v.url}\n\n${v.snapshot || "(no interactive controls)"}`),
    },
    timeoutMs: 20_000,
    isConcurrencySafe: () => false,
    execute: () => session.run(() => session.snapshot()),
    presentCall: () => ({ card: "generic", title: "Snapshot browser", kind: "read" }),
  }));

  ctx.tools.register(defineTool({
    name: "browser_screenshot",
    description: "Capture the current Chrome tab as an image. Requires an image-capable model. Prefer browser_snapshot for structure.",
    parameters: {},
    output: { schema: imageSchema, render: (_a, v) => imageBlocks(v) },
    timeoutMs: 25_000,
    isConcurrencySafe: () => false,
    async execute(_args, exec) {
      await assertVision(ctx, exec);
      const attachments = ctx.get("attachments");
      if (!attachments) throw new Error("no attachment service is mounted");
      return session.run(async () => {
        const data = await session.screenshot();
        const info = await session.status();
        const ref = await attachments.saveImage({ data, mediaType: "image/jpeg", name: "browser.jpg" });
        return {
          url: info.url || "",
          image: {
            attachmentId: ref.attachmentId,
            mediaType: ref.mediaType,
            bytes: ref.bytes,
            width: ref.width,
            height: ref.height,
            ...(ref.name ? { name: ref.name } : {}),
          },
        };
      });
    },
    presentCall: () => ({ card: "generic", title: "Screenshot browser", kind: "read" }),
  }));

  ctx.tools.register(defineTool({
    name: "browser_click",
    description: "Click a control from the latest browser_snapshot, by its ref (e.g. e12).",
    parameters: { ref: { type: "string", required: true, description: "Snapshot handle, like e12." } },
    output: { schema: statusSchema, render: (_a, v) => text(`Clicked. Now at ${v.url}`) },
    timeoutMs: 20_000,
    isConcurrencySafe: () => false,
    execute: (args) => session.run(() => session.clickRef(args.ref).then(statusOf)),
    presentCall: (args) => ({ card: "generic", title: `Click ${args.ref}` }),
  }));

  ctx.tools.register(defineTool({
    name: "browser_type",
    description: "Click a snapshot ref, then type. Set submit to press Enter afterwards (search boxes, forms).",
    parameters: {
      ref: { type: "string", required: true, description: "Snapshot handle of the field." },
      text: { type: "string", required: true, description: "Characters to type." },
      submit: { type: "boolean", description: "Press Enter after typing." },
    },
    output: { schema: statusSchema, render: (_a, v) => text(`Typed into ${v.url}`) },
    timeoutMs: 30_000,
    isConcurrencySafe: () => false,
    execute: (args) => session.run(() => session.typeRef(args.ref, args.text, args.submit).then(statusOf)),
    presentCall: (args) => ({ card: "generic", title: `Type into ${args.ref}` }),
  }));

  ctx.tools.register(defineTool({
    name: "browser_press",
    description: "Press a key in the Chrome tab (Enter, Tab, Escape, Backspace, ArrowDown, Meta+A, …).",
    parameters: { key: { type: "string", required: true, description: "Puppeteer key name, e.g. Enter or ArrowDown." } },
    output: { schema: statusSchema, render: (_a, v) => text(`Pressed key. Now at ${v.url}`) },
    timeoutMs: 15_000,
    isConcurrencySafe: () => false,
    execute: (args) => session.run(() => session.press(args.key).then(statusOf)),
  }));

  ctx.tools.register(defineTool({
    name: "browser_scroll",
    description: "Scroll the Chrome tab. Positive deltaY moves down.",
    parameters: {
      deltaY: { type: "integer", required: true, description: "Pixels to scroll. Positive is down." },
      ref: { type: "string", description: "Optional snapshot handle of a scrollable region." },
    },
    output: { schema: statusSchema, render: (_a, v) => text(`Scrolled. ${v.url}`) },
    timeoutMs: 15_000,
    isConcurrencySafe: () => false,
    execute: (args) => session.run(() => session.scroll(args.deltaY, args.ref).then(statusOf)),
  }));
}
