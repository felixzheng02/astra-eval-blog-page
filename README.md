# Academic experiment writeup (GitHub Pages)

Markdown-first project page in the style of [Pi0 in the Wild](https://penn-pal-lab.github.io/Pi0-Experiment-in-the-Wild/) / [Nerfies](https://nerfies.github.io). Edit YAML and Markdown. Do not edit the HTML layout for normal content changes.

## Preview locally

```bash
npm install
npm run serve
```

Open the URL Eleventy prints (usually `http://localhost:8080/`).

```bash
npm run build   # writes _site/
```

## What to edit

| You want to change | Edit |
| --- | --- |
| Title, authors, affiliation, links, BibTeX | [`site.yaml`](site.yaml) |
| A section's text | `content/sections/NN-name.md` |
| Add a section | Copy [`content/sections/_template.md`](content/sections/_template.md) to `content/sections/06-name.md` |
| Images | Drop files in `media/images/` |
| Videos | Drop compressed mp4s in `media/videos/` (see limits below) |

Section files are concatenated **in filename order**. Keep the `NN-` prefix. The `nav:` field in front matter is the top-bar label and the fragment id.

`_template.md` is not published.

## Shortcodes

Nunjucks runs **before** Markdown. Use the quotes-and-commas form:

```njk
{% video "/media/videos/clip.mp4", "Caption" %}
{% youtube "xxxxxxxxxxx", "YouTube caption" %}
{% vimeo "000000000", "Vimeo caption" %}
{% figure "/media/images/plot.png", "Figure caption" %}

{% videoGrid 2 %}
{% video "/media/videos/left.mp4", "Left" %}
{% video "/media/videos/right.mp4", "Right" %}
{% endvideoGrid %}

{% figureGrid 2 %}
{% figure "/media/images/a.png", "A" %}
{% figure "/media/images/b.png", "B" %}
{% endfigureGrid %}

{% callout "Note" %}
Highlighted remark.
{% endcallout %}

{% comment %}
Editorial comment shown as a block on the page.
{% endcomment %}

{% comment "Felix" %}
Optional heading, typically a name or TODO label.
{% endcomment %}

{% comment { title: "TODO", author: "Ankit" } %}
Optional title plus author.
{% endcomment %}
```

Object form also works: `{% video { src: "/media/videos/clip.mp4", caption: "Caption", poster: "/media/images/thumb.jpg" } %}`. `{% comment %}` renders on the page; HTML `<!-- comments -->` and Nunjucks `{# comments #}` stay hidden. Put `{% comment %}` outside `{% raw %}` blocks, like the other shortcodes.

Grids accept `2`, `3`, or `4` columns (1 column on small screens).

Markdown tables, lists, and headings work as usual:

```markdown
| Instruction | Success rate | Behavior |
| --- | --- | --- |
| "pick up the cup" |  |  |
```

Math (KaTeX): `$x$`, `$$...$$`, `\(...\)`, `\[...\]`. Optional HTML in `site.yaml` `title_html` if you need math in the title.

Each shipped section file has the same examples inside an HTML comment. Those comments are wrapped in `{% raw %}…{% endraw %}` so they do not render. Copy them out of the comment when you fill the page in.

## Videos and GitHub size limits

GitHub **blocks files over 100MB**. A repo with many raw robot mp4s will also get slow. Prefer:

1. `scripts/compress-video.sh your-raw.mov` — writes a compressed mp4 under `media/videos/` (needs `ffmpeg`).
2. YouTube or Vimeo plus `{% youtube %}` / `{% vimeo %}` for anything large.

Aim for **under ~10MB per clip** on the page itself.

## GitHub Pages (later)

This repo is local-only until you create a GitHub.com remote. `gh` on this machine is not logged into github.com.

1. `gh auth login` against github.com (or create the repo in the browser).
2. Create a public repo named **`astra-eval-blog-page`** (the Actions workflow assumes that path prefix).
3. `git remote add origin git@github.com:<you>/astra-eval-blog-page.git`
4. Push `main` or `master`.
5. Repo **Settings → Pages → GitHub Actions**.

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds Eleventy with

`ELEVENTY_PATH_PREFIX=/astra-eval-blog-page/`

If the repo name changes, change that prefix to `/<repo>/`. For a user site (`<user>.github.io`) set it to `/`.

Local preview keeps the prefix empty, so `npm run serve` works at `/`.

## Layout and license

Look and CSS/JS come from the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template) (Nerfies-derived). Keep the footer attribution. The page is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See [`static/VENDOR.txt`](static/VENDOR.txt).
