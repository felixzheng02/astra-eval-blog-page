import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import katex from "katex";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");
const markdownItAnchor = require("markdown-it-anchor");
const texmath = require("markdown-it-texmath");

const root = path.dirname(fileURLToPath(import.meta.url));
const site = yaml.load(fs.readFileSync(path.join(root, "site.yaml"), "utf8"));

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sectionNumberFromPath(inputPath) {
  const match = path.basename(String(inputPath || "")).match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function assignHeadingNumbers(state) {
  const section = sectionNumberFromPath(state.env?.page?.inputPath);
  if (!section) return;

  let h3 = 0;
  let h4 = 0;
  for (const token of state.tokens) {
    if (token.type !== "heading_open") continue;
    let number = "";
    if (token.tag === "h2") {
      h3 = 0;
      h4 = 0;
      number = String(section);
    } else if (token.tag === "h3") {
      h3 += 1;
      h4 = 0;
      number = `${section}.${h3}`;
    } else if (token.tag === "h4") {
      h4 += 1;
      number = `${section}.${h3}.${h4}`;
    } else {
      continue;
    }
    token.attrSet("data-heading-number", number);
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function stripTags(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<span class="heading-number">[\s\S]*?<\/span>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function headingOutline(html) {
  const headings = [];
  const re = /<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    const attrs = match[2];
    headings.push({
      level: Number(match[1]),
      id: /(?:^|\s)id="([^"]+)"/.exec(attrs)?.[1] || "",
      number: /data-heading-number="([^"]+)"/.exec(attrs)?.[1] || "",
      title: stripTags(match[3]),
    });
  }
  return headings;
}

function nestHeadings(headings) {
  const root = [];
  const stack = [];
  for (const heading of headings) {
    const node = { ...heading, children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return root;
}

function renderToc(items) {
  if (!items.length) return "";
  let html = `<ol class="toc-list">`;
  for (const item of items) {
    const number = item.number
      ? `<span class="heading-number">${esc(item.number)}</span> `
      : "";
    html += `<li><a href="#${esc(item.id)}">${number}${esc(item.title)}</a>`;
    if (item.children.length) html += renderToc(item.children);
    html += `</li>`;
  }
  html += `</ol>`;
  return html;
}

function sectionsTableOfContents(sections = []) {
  const headings = [];
  for (const section of sections) {
    const extracted = headingOutline(section.templateContent).filter(
      (heading) => heading.level <= 3
    );
    if (extracted.length) {
      headings.push(...extracted);
      continue;
    }
    const title = section.data?.nav || "";
    if (!title) continue;
    const number = sectionNumberFromPath(section.inputPath);
    headings.push({
      level: 2,
      id: slugify(title),
      number: number ? String(number) : "",
      title,
    });
  }
  return renderToc(nestHeadings(headings));
}

function fallbackSectionId(section) {
  if (headingOutline(section?.templateContent).length) return "";
  return slugify(section?.data?.nav);
}

function sectionSubheadings(section) {
  return headingOutline(section?.templateContent).filter(
    (heading) => heading.level === 3 && heading.id && heading.title
  );
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function openOffsiteLinksInNewTab(html) {
  return String(html).replace(/<a\b([^>]*?)>/gi, (match, attrs) => {
    if (/\btarget\s*=/i.test(attrs)) return match;
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "") : "";
    if (!/^(https?:)?\/\//i.test(href)) return match;
    const rel = /\brel\s*=/i.test(attrs) ? "" : ' rel="noopener noreferrer"';
    return `<a${attrs} target="_blank"${rel}>`;
  });
}

function asOpts(first, second, firstKey, secondKey) {
  if (first && typeof first === "object" && !Array.isArray(first)) {
    return first;
  }
  const opts = {};
  if (first != null && first !== "") opts[firstKey] = first;
  if (second != null && second !== "") opts[secondKey] = second;
  return opts;
}

function gridColumns(columns) {
  if (columns && typeof columns === "object") {
    columns = columns.columns;
  }
  const n = Number(columns) || 2;
  return Math.min(4, Math.max(1, n));
}

function localUrl(src) {
  if (!src) return "";
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return src;
  const prefix = (process.env.ELEVENTY_PATH_PREFIX || "/").replace(/\/$/, "");
  const pathname = src.startsWith("/") ? src : `/${src}`;
  return `${prefix}${pathname}`;
}

function renderCaption(caption) {
  return esc(caption).replace(/`([^`]+)`/g, "<code>$1</code>");
}

let markdownLib;

function renderInnerMarkdown(content) {
  const source = String(content || "").trim();
  if (!source) return "";
  if (!markdownLib) return source;
  return markdownLib.render(source);
}

function figureKey(opts, fallbackSrc = "") {
  const raw = opts.label || opts.id;
  if (raw != null && String(raw).trim() !== "") {
    return slugify(raw).replace(/^fig-/, "");
  }
  const src = String(opts.src || fallbackSrc || "");
  const base = path.basename(src, path.extname(src));
  return slugify(base);
}

function tableKey(opts) {
  const raw = opts.label || opts.id || opts.caption;
  if (raw == null || String(raw).trim() === "") return "";
  return slugify(raw).replace(/^(tbl|table)-/, "");
}

function mediaFigure({
  inner,
  caption = "",
  className = "media-block",
  numberedKey = "",
}) {
  const attrs = [`class="${className}"`];
  if (numberedKey) {
    attrs.push(`id="fig-${esc(numberedKey)}"`);
    attrs.push(`data-figure="${esc(numberedKey)}"`);
  }
  const cap =
    caption || numberedKey
      ? `<figcaption>${renderCaption(caption)}</figcaption>`
      : "";
  return `<figure ${attrs.join(" ")}>${inner}${cap}</figure>`;
}

function lookupNumbered(numbers, raw, prefix) {
  const key = slugify(raw).replace(new RegExp(`^${prefix}-`), "");
  return (
    numbers.get(key) ||
    numbers.get(String(raw || "")) ||
    numbers.get(`${prefix}-${key}`) ||
    null
  );
}

function numberFigures(html) {
  const comments = [];
  let output = String(html).replace(/<!--[\s\S]*?-->/g, (comment) => {
    comments.push(comment);
    return `<!--NUMFIG_COMMENT_${comments.length - 1}-->`;
  });

  const numbers = new Map();
  const tableNumbers = new Map();
  const usedIds = new Set();
  let n = 0;
  let tn = 0;

  output = output.replace(
    /<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi,
    (full, attrs, inner) => {
      const keyMatch = /\bdata-figure="([^"]*)"/.exec(attrs);
      if (!keyMatch || /\bdata-figure-number="/.test(attrs)) return full;

      n += 1;
      const key = slugify(keyMatch[1]).replace(/^fig-/, "") || `figure-${n}`;
      const requestedId = /\bid="([^"]*)"/.exec(attrs)?.[1] || `fig-${key}`;
      let id = requestedId;
      if (usedIds.has(id)) {
        let i = 2;
        while (usedIds.has(`${requestedId}-${i}`)) i += 1;
        id = `${requestedId}-${i}`;
      }
      usedIds.add(id);

      const record = { n, id };
      numbers.set(key, record);
      numbers.set(id, record);
      numbers.set(id.replace(/^fig-/, ""), record);

      const nextAttrs = `${attrs
        .replace(/\s*\bid="[^"]*"/i, "")
        .replace(/\s*\bdata-figure(?:="[^"]*")?/i, "")
        .replace(/\s*\bdata-figure-number="[^"]*"/i, "")} id="${esc(id)}" data-figure="${esc(key)}" data-figure-number="${n}"`;

      const label = `<span class="figure-number">Figure&nbsp;${n}.</span>`;
      const capMatch = inner.match(/<figcaption([^>]*)>([\s\S]*?)<\/figcaption>/i);
      const capAttrs = capMatch?.[1] || "";
      const capBody = (capMatch?.[2] || "").trim();
      const figcaption = `<figcaption${capAttrs}>${label}${capBody ? ` ${capBody}` : ""}</figcaption>`;
      const withoutCap = inner.replace(/<figcaption[\s\S]*?<\/figcaption>/i, "");
      return `<figure${nextAttrs}>${withoutCap}${figcaption}</figure>`;
    }
  );

  output = output.replace(
    /<a\b([^>]*\bdata-figref="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs, ref) => {
      const found = lookupNumbered(numbers, ref, "fig");
      const label = found ? `Figure&nbsp;${found.n}` : "Figure&nbsp;?";
      const hrefId = found?.id || `fig-${slugify(ref).replace(/^fig-/, "")}`;
      let nextAttrs = attrs.replace(/\s*\bhref="[^"]*"/i, "");
      if (!/\bclass=/.test(nextAttrs)) nextAttrs += ` class="figure-ref"`;
      return `<a href="#${esc(hrefId)}"${nextAttrs}>${label}</a>`;
    }
  );

  output = output.replace(
    /<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi,
    (full, attrs, inner) => {
      const keyMatch = /\bdata-table="([^"]*)"/.exec(attrs);
      if (!keyMatch || /\bdata-table-number="/.test(attrs)) return full;

      tn += 1;
      const key = slugify(keyMatch[1]).replace(/^(tbl|table)-/, "") || `table-${tn}`;
      const requestedId = /\bid="([^"]*)"/.exec(attrs)?.[1] || `tbl-${key}`;
      let id = requestedId;
      if (usedIds.has(id)) {
        let i = 2;
        while (usedIds.has(`${requestedId}-${i}`)) i += 1;
        id = `${requestedId}-${i}`;
      }
      usedIds.add(id);

      const record = { n: tn, id };
      tableNumbers.set(key, record);
      tableNumbers.set(id, record);
      tableNumbers.set(id.replace(/^(tbl|table)-/, ""), record);

      const nextAttrs = `${attrs
        .replace(/\s*\bid="[^"]*"/i, "")
        .replace(/\s*\bdata-table(?:="[^"]*")?/i, "")
        .replace(/\s*\bdata-table-number="[^"]*"/i, "")} id="${esc(id)}" data-table="${esc(key)}" data-table-number="${tn}"`;

      const label = `<span class="table-number">Table&nbsp;${tn}.</span>`;
      const capMatch = inner.match(/<figcaption([^>]*)>([\s\S]*?)<\/figcaption>/i);
      const capAttrs = capMatch?.[1] || "";
      const capBody = (capMatch?.[2] || "").trim();
      const figcaption = `<figcaption${capAttrs}>${label}${capBody ? ` ${capBody}` : ""}</figcaption>`;
      const withoutCap = inner.replace(/<figcaption[\s\S]*?<\/figcaption>/i, "");
      return `<figure${nextAttrs}>${withoutCap}${figcaption}</figure>`;
    }
  );

  output = output.replace(
    /<a\b([^>]*\bdata-tabref="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs, ref) => {
      const found = lookupNumbered(tableNumbers, ref, "tbl") ||
        lookupNumbered(tableNumbers, ref, "table");
      const label = found ? `Table&nbsp;${found.n}` : "Table&nbsp;?";
      const hrefId = found?.id || `tbl-${slugify(ref).replace(/^(tbl|table)-/, "")}`;
      let nextAttrs = attrs.replace(/\s*\bhref="[^"]*"/i, "");
      if (!/\bclass=/.test(nextAttrs)) nextAttrs += ` class="table-ref"`;
      return `<a href="#${esc(hrefId)}"${nextAttrs}>${label}</a>`;
    }
  );

  return output.replace(
    /<!--NUMFIG_COMMENT_(\d+)-->/g,
    (_, index) => comments[Number(index)]
  );
}

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData("site", site);
  eleventyConfig.addPassthroughCopy("static");
  eleventyConfig.addPassthroughCopy("media");
  eleventyConfig.addPassthroughCopy(".nojekyll");
  eleventyConfig.addWatchTarget("site.yaml");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("content/sections/_template.md");

  eleventyConfig.addFilter("slug", slugify);
  eleventyConfig.addFilter("authorNames", (authors = []) =>
    authors.map((author) => author.name).filter(Boolean).join(", ")
  );
  eleventyConfig.addFilter("headingOutline", headingOutline);
  eleventyConfig.addFilter("tableOfContents", sectionsTableOfContents);
  eleventyConfig.addFilter("fallbackSectionId", fallbackSectionId);
  eleventyConfig.addFilter("sectionSubheadings", sectionSubheadings);

  eleventyConfig.addCollection("sections", (api) =>
    api
      .getFilteredByGlob("content/sections/*.md")
      .filter((item) => !path.basename(item.inputPath).startsWith("_"))
      .sort((a, b) => path.basename(a.inputPath).localeCompare(path.basename(b.inputPath)))
  );

  eleventyConfig.amendLibrary("md", (md) => {
    markdownLib = md;
    md.set({ html: true, linkify: true, typographer: true });
    md.enable("table");
    md.use(markdownItAnchor, { permalink: false, slugify });
    md.use(texmath, {
      engine: katex,
      delimiters: ["dollars", "brackets"],
      katexOptions: { throwOnError: false },
    });

    md.core.ruler.push("heading-numbers", assignHeadingNumbers);

    const defaultHeadingOpen = md.renderer.rules.heading_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const tag = token.tag;
      if (tag === "h2") token.attrJoin("class", "title is-3 has-text-centered");
      if (tag === "h3") token.attrJoin("class", "title is-4");
      if (tag === "h4") token.attrJoin("class", "title is-5");
      const open = defaultHeadingOpen(tokens, idx, options, env, self);
      const number = token.attrGet("data-heading-number");
      if (!number) return open;
      return `${open}<span class="heading-number">${esc(number)}</span> `;
    };
  });

  eleventyConfig.addTransform("number-figures", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return numberFigures(content);
  });

  eleventyConfig.addTransform("offsite-links-new-tab", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return openOffsiteLinksInNewTab(content);
  });

  eleventyConfig.addShortcode("video", (src, caption) => {
    const opts = asOpts(src, caption, "src", "caption");
    if (!opts.src) return "";
    const attrs = [
      `src="${esc(localUrl(opts.src))}"`,
      "muted",
      "loop",
      "playsinline",
      "controls",
      "autoplay",
    ];
    if (opts.poster) attrs.push(`poster="${esc(localUrl(opts.poster))}"`);
    return mediaFigure({
      inner: `<div class="embed-frame"><video ${attrs.join(" ")}></video></div>`,
      caption: opts.caption || "",
    });
  });

  eleventyConfig.addShortcode("youtube", (id, caption) => {
    const opts = asOpts(id, caption, "id", "caption");
    if (!opts.id) return "";
    const src = `https://www.youtube.com/embed/${encodeURIComponent(opts.id)}`;
    return mediaFigure({
      inner: `<div class="embed-frame"><iframe src="${src}" title="${esc(opts.caption || "YouTube video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
      caption: opts.caption || "",
    });
  });

  eleventyConfig.addShortcode("vimeo", (id, caption) => {
    const opts = asOpts(id, caption, "id", "caption");
    if (!opts.id) return "";
    const src = `https://player.vimeo.com/video/${encodeURIComponent(opts.id)}`;
    return mediaFigure({
      inner: `<div class="embed-frame"><iframe src="${src}" title="${esc(opts.caption || "Vimeo video")}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`,
      caption: opts.caption || "",
    });
  });

  eleventyConfig.addShortcode("figure", (src, caption, label) => {
    const opts = asOpts(src, caption, "src", "caption");
    if (typeof src !== "object" && label) opts.label = label;
    if (!opts.src) return "";
    const alt = esc(opts.alt || String(opts.caption || "").replace(/`([^`]+)`/g, "$1"));
    const width = opts.width ? ` style="max-width:${esc(opts.width)};margin-inline:auto"` : "";
    return mediaFigure({
      inner: `<button type="button" class="figure-zoom-trigger" aria-label="Enlarge figure"${width}><img src="${esc(localUrl(opts.src))}" alt="${alt}"></button>`,
      caption: opts.caption || "",
      numberedKey: figureKey(opts, opts.src),
    });
  });

  eleventyConfig.addShortcode("plotly", (src, caption, label) => {
    const opts = asOpts(src, caption, "src", "caption");
    if (typeof src !== "object" && label) opts.label = label;
    if (!opts.src) return "";
    const alt = esc(opts.alt || String(opts.caption || "").replace(/`([^`]+)`/g, "$1"));
    const fallback = opts.fallback
      ? `<noscript><img src="${esc(localUrl(opts.fallback))}" alt="${alt}"></noscript>`
      : "";
    return mediaFigure({
      inner: `<div class="plotly-frame" data-plotly-src="${esc(localUrl(opts.src))}" role="img" aria-label="${alt}"><span class="plotly-frame-status">Loading interactive figure…</span>${fallback}</div>`,
      caption: opts.caption || "",
      className: "media-block plotly-block",
      numberedKey: figureKey(opts, opts.src),
    });
  });

  eleventyConfig.addShortcode("figref", (id) => {
    const opts = asOpts(id, null, "id", "id");
    const key = figureKey(opts);
    if (!key) return "";
    return `<a class="figure-ref" href="#fig-${esc(key)}" data-figref="${esc(key)}">Figure</a>`;
  });

  eleventyConfig.addPairedShortcode("table", (content, caption, label) => {
    const opts = asOpts(caption, label, "caption", "label");
    const key = tableKey(opts);
    const inner = renderInnerMarkdown(content);
    if (!inner) return "";
    const attrs = [`class="table-block"`];
    if (key) {
      attrs.push(`id="tbl-${esc(key)}"`);
      attrs.push(`data-table="${esc(key)}"`);
    }
    const cap =
      opts.caption || key
        ? `<figcaption>${renderCaption(opts.caption || "")}</figcaption>`
        : "";
    return `<figure ${attrs.join(" ")}><div class="table-wrap">${inner}</div>${cap}</figure>`;
  });

  eleventyConfig.addShortcode("tabref", (id) => {
    const opts = asOpts(id, null, "id", "id");
    const key = tableKey(opts);
    if (!key) return "";
    return `<a class="table-ref" href="#tbl-${esc(key)}" data-tabref="${esc(key)}">Table</a>`;
  });

  eleventyConfig.addPairedShortcode("videoGrid", (content, columns = 2) => {
    return `<div class="media-grid video-grid columns-${gridColumns(columns)}">${content}</div>`;
  });

  eleventyConfig.addPairedShortcode("figureGrid", (content, columns = 2) => {
    return `<div class="media-grid figure-grid columns-${gridColumns(columns)}">${content}</div>`;
  });

  eleventyConfig.addPairedShortcode("callout", (content, title = "Note") => {
    const opts = typeof title === "object" ? title : { title };
    const heading = opts.title
      ? `<div class="callout-title">${esc(opts.title)}</div>`
      : "";
    return `<aside class="callout">${heading}${content}</aside>`;
  });

  eleventyConfig.addPairedShortcode("comment", (content, title = "Comment") => {
    const opts = typeof title === "object" ? title : { title };
    const label = opts.title || "Comment";
    const author = opts.author
      ? `<span class="comment-block-author">${esc(opts.author)}</span>`
      : "";
    const heading = `<div class="comment-block-title">${esc(label)}${author ? ` ${author}` : ""}</div>`;
    const body = renderInnerMarkdown(content);
    return `<aside class="comment-block" role="note">${heading}<div class="comment-block-body">${body}</div></aside>`;
  });

  return {
    pathPrefix: process.env.ELEVENTY_PATH_PREFIX || "/",
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
}
