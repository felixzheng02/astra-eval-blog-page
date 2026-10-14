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

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function mediaFigure({ inner, caption = "", className = "media-block" }) {
  const cap = caption
    ? `<figcaption>${esc(caption)}</figcaption>`
    : "";
  return `<figure class="${className}">${inner}${cap}</figure>`;
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

  eleventyConfig.addCollection("sections", (api) =>
    api
      .getFilteredByGlob("content/sections/*.md")
      .filter((item) => !path.basename(item.inputPath).startsWith("_"))
      .sort((a, b) => path.basename(a.inputPath).localeCompare(path.basename(b.inputPath)))
  );

  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ html: true, linkify: true, typographer: true });
    md.enable("table");
    md.use(markdownItAnchor, { permalink: false, slugify });
    md.use(texmath, {
      engine: katex,
      delimiters: ["dollars", "brackets"],
      katexOptions: { throwOnError: false },
    });

    const defaultHeadingOpen = md.renderer.rules.heading_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const tag = tokens[idx].tag;
      if (tag === "h2") tokens[idx].attrJoin("class", "title is-3 has-text-centered");
      if (tag === "h3") tokens[idx].attrJoin("class", "title is-4");
      if (tag === "h4") tokens[idx].attrJoin("class", "title is-5");
      return defaultHeadingOpen(tokens, idx, options, env, self);
    };
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

  eleventyConfig.addShortcode("figure", (src, caption) => {
    const opts = asOpts(src, caption, "src", "caption");
    if (!opts.src) return "";
    const alt = esc(opts.alt || opts.caption || "");
    const width = opts.width ? ` style="max-width:${esc(opts.width)};margin-inline:auto"` : "";
    return mediaFigure({
      inner: `<img src="${esc(localUrl(opts.src))}" alt="${alt}"${width}>`,
      caption: opts.caption || "",
    });
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
