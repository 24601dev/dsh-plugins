import { spawn } from "node:child_process";

const MAX_REQUEST_BYTES = 17 * 1024 * 1024;
export const MAX_PDF_BYTES = 12 * 1024 * 1024;
export const MAX_PDF_PAGES = 300;
export const MAX_EXTRACTED_CHARS = 180_000;

export async function readJsonBody(req, limit = MAX_REQUEST_BYTES) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) {
      const error = new Error("request is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("request body is not valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function runPdftotext(bytes) {
  return new Promise((resolve, reject) => {
    const child = spawn("pdftotext", ["-f", "1", "-l", "301", "-layout", "-enc", "UTF-8", "-", "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks = [];
    const errors = [];
    let keptBytes = 0;
    let overflow = false;
    let timedOut = false;
    const byteLimit = MAX_EXTRACTED_CHARS * 4;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 15_000);

    child.stdout.on("data", (chunk) => {
      const remaining = byteLimit - keptBytes;
      if (remaining <= 0) {
        overflow = true;
        return;
      }
      const kept = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      chunks.push(kept);
      keptBytes += kept.length;
      if (kept.length < chunk.length) overflow = true;
    });
    child.stderr.on("data", (chunk) => {
      if (errors.reduce((sum, item) => sum + item.length, 0) < 8_192) errors.push(chunk);
    });
    child.on("error", (cause) => {
      clearTimeout(timer);
      const error = new Error(cause?.code === "ENOENT"
        ? "PDF extraction is unavailable because pdftotext is not installed"
        : `Could not start PDF extraction: ${cause?.message ?? cause}`);
      error.statusCode = 501;
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        const error = new Error("PDF extraction timed out");
        error.statusCode = 422;
        reject(error);
        return;
      }
      if (code !== 0) {
        const detail = Buffer.concat(errors).toString("utf8").trim();
        const error = new Error(detail || "Could not extract text from this PDF");
        error.statusCode = 422;
        reject(error);
        return;
      }
      resolve({ text: Buffer.concat(chunks).toString("utf8"), overflow });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  });
}

export async function extractPdfText(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    const error = new Error("PDF data is empty");
    error.statusCode = 400;
    throw error;
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    const error = new Error("PDF exceeds the 12 MiB limit");
    error.statusCode = 413;
    throw error;
  }
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  if (signature !== "%PDF-") {
    const error = new Error("file is not a PDF");
    error.statusCode = 415;
    throw error;
  }

  const extracted = await runPdftotext(bytes);
  const rawPages = extracted.text.replace(/\r\n?/g, "\n").split("\f");
  if (rawPages.at(-1)?.trim() === "") rawPages.pop();
  const pageCount = Math.max(1, rawPages.length);
  const pageTexts = rawPages.slice(0, MAX_PDF_PAGES).map((text, index) =>
    `--- PDF page ${index + 1} ---\n${text.trim() || "(no extractable text)"}`);
  let text = pageTexts.join("\n\n");
  const truncated = extracted.overflow || rawPages.length > MAX_PDF_PAGES || text.length > MAX_EXTRACTED_CHARS;
  if (text.length > MAX_EXTRACTED_CHARS) text = text.slice(0, MAX_EXTRACTED_CHARS);
  return { text, pages: Math.min(pageCount, MAX_PDF_PAGES), truncated };
}

export function decodePdfRequest(body) {
  if (typeof body?.data !== "string" || body.data.length === 0) {
    const error = new Error("missing base64 PDF data");
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(body.data, "base64");
  if (buffer.byteLength === 0) {
    const error = new Error("invalid base64 PDF data");
    error.statusCode = 400;
    throw error;
  }
  return new Uint8Array(buffer);
}
