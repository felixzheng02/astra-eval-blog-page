import assert from "node:assert/strict";
import fs from "node:fs";

const sectionFiles = fs.readdirSync(new URL("../content/sections/", import.meta.url))
  .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
  .sort();
const html = fs.readFileSync(
  process.argv[2] || new URL("../_site/index.html", import.meta.url),
  "utf8"
);
const sections = [...html.matchAll(
  /<div class="content publication-body">([\s\S]*?)<\/section>/g
)];

assert.equal(sections.length, sectionFiles.length, "The built page must include every section");
for (const [index, section] of sections.entries()) {
  const content = section[1]
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?div\b[^>]*>/gi, "")
    .trim();
  assert.ok(content, `The built page has an empty section: ${sectionFiles[index]}`);
}

console.log(`Verified ${sections.length} non-empty blog sections.`);
