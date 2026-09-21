import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const root = new URL("../", import.meta.url);
const errors = [];
const sourceFiles = [];
const slash = String.fromCharCode(92);
const templateQuote = String.fromCharCode(96);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if ([".ts", ".tsx", ".mjs"].includes(extname(entry.name))) sourceFiles.push(path);
  }
}

function normalize(path) {
  const parts = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function checkBalance(text, file) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const closing = new Set(Object.values(pairs));
  const stack = [];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === slash) escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === templateQuote) {
      quote = char;
      continue;
    }
    if (pairs[char]) stack.push(char);
    else if (closing.has(char)) {
      const open = stack.pop();
      if (!open || pairs[open] !== char) {
        errors.push(file + ": unmatched " + char + " near byte " + index);
        return;
      }
    }
  }
  if (quote) errors.push(file + ": unterminated string");
  if (blockComment) errors.push(file + ": unterminated block comment");
  if (stack.length) errors.push(file + ": unclosed " + stack[stack.length - 1]);
}

const absoluteRoot = root.pathname;
await walk(absoluteRoot);
const names = new Set(sourceFiles.map((file) => file.replace(absoluteRoot, "").replaceAll(slash, "/")));
let totalLines = 0;
for (const file of sourceFiles) {
  const text = await readFile(file, "utf8");
  const relative = file.replace(absoluteRoot, "").replaceAll(slash, "/");
  totalLines += text.split("\n").length;
  checkBalance(text, relative);
  const imports = [...text.matchAll(/(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)].map((match) => match[1]);
  for (const target of imports) {
    if (!target.startsWith(".")) continue;
    const base = normalize(relative.split("/").slice(0, -1).join("/") + "/" + target);
    const candidates = [base, base + ".ts", base + ".tsx", base + ".mjs", base + "/index.ts"];
    if (!candidates.some((candidate) => names.has(candidate))) errors.push(relative + ": unresolved import " + target);
  }
}
if (totalLines < 10000) errors.push("line count below 10000: " + totalLines);
if (!names.has("package.json")) errors.push("package.json missing");
if (!names.has("src/main.ts")) errors.push("src/main.ts missing");
if (errors.length) {
  console.error("VALIDATION FAILED");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}
console.log("VALIDATION PASSED");
console.log("Files:", sourceFiles.length);
console.log("Lines:", totalLines);
console.log("Relative imports resolved.");
