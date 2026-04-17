/* Generate components/dashboard/body-svg-source.ts from the processed SVG. */
const fs = require("fs");
const path = require("path");

const SRC = "C:/Users/ASUS/AppData/Local/Temp/wikimedia-body-processed.svg";
const DEST = path.resolve(__dirname, "..", "components", "dashboard", "body-svg-source.ts");

const raw = fs.readFileSync(SRC, "utf8")
  .replace(/<\?xml[^>]*\?>\s*/, "")
  .replace(/<!--[\s\S]*?-->\s*/g, "")
  .trim();

// Escape template-literal specials: backslash, backtick, ${
const escaped = raw
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const header = [
  "// Human body line drawing — Wikimedia 'Human_body_with_no_labels.svg'",
  "// License: CC0 1.0 Universal Public Domain Dedication (no attribution required)",
  "// Source: https://commons.wikimedia.org/wiki/File:Human_body_with_no_labels.svg",
  "// Strokes recoloured from #000 to Tvacha gold (#b8936a); Inkscape attrs stripped.",
  "// viewBox 0 0 750 768 — anterior (left) and posterior (right) views side by side.",
  "",
  "export const HUMAN_BODY_SVG = `" + escaped + "`;",
  "",
].join("\n");

fs.writeFileSync(DEST, header);
console.log("wrote", header.length, "bytes →", DEST);
