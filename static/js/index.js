window.HELP_IMPROVE_VIDEOJS = false;

function copyBibTeX() {
  const bibtexElement = document.getElementById("bibtex-code");
  const button = document.querySelector(".copy-bibtex-btn");
  if (!bibtexElement || !button) return;

  const copyText = button.querySelector(".copy-text");
  const done = () => {
    button.classList.add("copied");
    if (copyText) copyText.textContent = "Copied";
    setTimeout(() => {
      button.classList.remove("copied");
      if (copyText) copyText.textContent = "Copy";
    }, 2000);
  };

  navigator.clipboard.writeText(bibtexElement.textContent).then(done).catch(() => {
    const textArea = document.createElement("textarea");
    textArea.value = bibtexElement.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    done();
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("scroll", () => {
  const scrollButton = document.querySelector(".scroll-to-top");
  if (!scrollButton) return;
  scrollButton.classList.toggle("visible", window.pageYOffset > 300);
});

function setupNavbarBurger() {
  const burgers = document.querySelectorAll(".navbar-burger");

  function setOpen(open) {
    burgers.forEach((el) => {
      el.classList.toggle("is-active", open);
      el.setAttribute("aria-expanded", open ? "true" : "false");
      const target = document.getElementById(el.dataset.target);
      if (target) target.classList.toggle("is-active", open);
    });
  }

  burgers.forEach((el) => {
    el.addEventListener("click", () => {
      setOpen(!el.classList.contains("is-active"));
    });
  });

  document.querySelectorAll("#writeupNavMenu a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

function setupNavbarOverflow() {
  const nav = document.querySelector(".writeup-nav");
  if (!nav) return;
  const title = nav.querySelector(".navbar-brand > .navbar-item");
  const menu = document.getElementById("writeupNavMenu");
  const end = menu && menu.querySelector(".navbar-end");
  if (!title || !end) return;

  const probe = document.createElement("div");
  probe.className = "writeup-nav-probe";
  probe.setAttribute("aria-hidden", "true");
  const titleClone = title.cloneNode(true);
  titleClone.removeAttribute("href");
  probe.appendChild(titleClone);
  [...end.children].forEach((child) => {
    const clone = child.cloneNode(true);
    clone.querySelectorAll(".navbar-dropdown").forEach((el) => el.remove());
    probe.appendChild(clone);
  });
  nav.appendChild(probe);

  function closeMenu() {
    nav.querySelectorAll(".navbar-burger").forEach((el) => {
      el.classList.remove("is-active");
      el.setAttribute("aria-expanded", "false");
      const target = document.getElementById(el.dataset.target);
      if (target) target.classList.remove("is-active");
    });
  }

  function apply() {
    const available = nav.clientWidth;
    const needed = probe.scrollWidth;
    const compact = nav.classList.contains("is-compact");
    const shouldCompact = compact ? needed > available - 48 : needed > available - 1;
    if (shouldCompact === compact) return;
    nav.classList.toggle("is-compact", shouldCompact);
    if (!shouldCompact) closeMenu();
  }

  let frame = 0;
  function update() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  }

  window.addEventListener("resize", update);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", update);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(update);
  }
  update();
}

function setupVideoAutoplay() {
  const videos = document.querySelectorAll(".media-block video, .results-carousel video");
  if (!videos.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.4 }
  );

  videos.forEach((video) => observer.observe(video));
}

const PLOTLY_CDN =
  "https://cdn.jsdelivr.net/npm/plotly.js-dist-min@4.1.1/plotly.min.js";

let plotlyLoader = null;

function loadPlotly() {
  if (window.Plotly) return Promise.resolve();
  if (plotlyLoader) return plotlyLoader;
  plotlyLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PLOTLY_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Plotly"));
    document.head.appendChild(script);
  });
  return plotlyLoader;
}

function setPlotlyStatus(el, message) {
  el.replaceChildren();
  const status = document.createElement("span");
  status.className = "plotly-frame-status";
  status.textContent = message;
  el.appendChild(status);
}

function kindOfTrace(trace) {
  return trace && trace.meta ? trace.meta.kind : null;
}

function setupSampleHighlight(gd, cfg) {
  if (!gd || !cfg) return;

  let current = null;
  let chain = Promise.resolve();

  function sameKey(a, b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return (
      String(a.id) === String(b.id) &&
      String(a.condition || "") === String(b.condition || "")
    );
  }

  function restyleHighlight(key) {
    const indices = [];
    const sizes = [];
    const opacities = [];
    const textColors = [];
    const textIdx = [];
    const id = key && key.id;
    const condition = key && key.condition;
    (gd.data || []).forEach((trace, i) => {
      const kind = kindOfTrace(trace);
      if (kind !== "trial" && kind !== "average") return;
      indices.push(i);
      const traceCond = trace.meta && trace.meta.condition;
      const otherCondition = !!(condition && traceCond && traceCond !== condition);
      if (kind === "trial") {
        const trials = (trace.meta && trace.meta.trials) || [];
        const sz = [];
        const op = [];
        trials.forEach((trial) => {
          if (key == null) {
            sz.push(cfg.trialSize);
            op.push(cfg.trialOpacity);
          } else if (
            !otherCondition &&
            id !== "average" &&
            Number(trial) === Number(id)
          ) {
            sz.push(cfg.trialHiSize);
            op.push(cfg.trialHiOpacity);
          } else {
            sz.push(cfg.trialSize);
            op.push(cfg.dimOpacity);
          }
        });
        sizes.push(sz);
        opacities.push(op);
      } else {
        const hi = !!(key && id === "average" && !otherCondition);
        const on = key == null || hi;
        sizes.push([hi ? cfg.meanHiSize : cfg.meanSize]);
        opacities.push([on ? 1 : cfg.dimOpacity]);
        textIdx.push(i);
        textColors.push(
          on
            ? (trace.meta && trace.meta.label_color) || "#263342"
            : "rgba(38,51,66,0.22)"
        );
      }
    });
    if (!indices.length) return Promise.resolve();
    return window.Plotly.restyle(
      gd,
      { "marker.size": sizes, "marker.opacity": opacities },
      indices
    ).then(() => {
      if (!textIdx.length) return;
      return window.Plotly.restyle(gd, { "textfont.color": textColors }, textIdx);
    });
  }

  function highlight(key) {
    if (sameKey(key, current)) return;
    current = key;
    chain = chain.then(() => {
      if (!sameKey(key, current)) return;
      return restyleHighlight(current);
    });
  }

  function keyFromEvent(ev) {
    if (!ev || !ev.points || !ev.points.length) return null;
    const pt = ev.points[0];
    const trace = gd.data[pt.curveNumber];
    const kind = kindOfTrace(trace);
    const condition = trace && trace.meta && trace.meta.condition;
    if (kind === "average") return { id: "average", condition };
    if (kind === "trial") {
      const trial = ((trace.meta && trace.meta.trials) || [])[pt.pointNumber];
      if (trial == null) return null;
      return { id: String(trial), condition };
    }
    return null;
  }

  let unhoverTimer = null;
  gd.on("plotly_hover", (ev) => {
    if (unhoverTimer) {
      clearTimeout(unhoverTimer);
      unhoverTimer = null;
    }
    const key = keyFromEvent(ev);
    if (key != null) highlight(key);
  });
  gd.on("plotly_unhover", () => {
    unhoverTimer = setTimeout(() => {
      unhoverTimer = null;
      highlight(null);
    }, 80);
  });
}

async function renderPlotlyFrame(el) {
  const src = el.dataset.plotlySrc;
  if (!src) return;
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Figure JSON ${response.status} ${src}`);
  }
  const spec = await response.json();
  // Scale the whole chart with its frame so browser zoom preserves its proportions.
  const chartWidth = 960;
  const chartHeight = chartWidth * (920 / 1450);
  const layout = {
    ...(spec.layout || {}),
    autosize: false,
    width: chartWidth,
    height: chartHeight,
  };
  const highlight = layout.meta && layout.meta.highlight;
  const filename =
    el.closest("[data-figure]")?.getAttribute("data-figure") || "figure";
  const chart = document.createElement("div");
  Object.assign(chart.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${chartWidth}px`,
    height: `${chartHeight}px`,
    transformOrigin: "top left",
    fontSize: "16px",
    lineHeight: "normal",
  });
  el.style.position = "relative";
  el.replaceChildren(chart);
  let previousWidth = 0;
  function fitChart() {
    const width = el.clientWidth;
    if (!width || width === previousWidth) return false;
    previousWidth = width;
    const scale = width / chartWidth;
    chart.style.transform = `scale(${scale})`;
    el.style.height = `${chartHeight * scale}px`;
    return true;
  }
  fitChart();
  await window.Plotly.newPlot(chart, spec.data || [], layout, {
    responsive: false,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    toImageButtonOptions: { format: "svg", filename },
  });
  // Bulma's .icon uses rem; keep Plotly toolbar icons in the chart's own scale.
  chart.querySelectorAll(".modebar .icon").forEach((icon) => {
    icon.style.width = "1em";
    icon.style.height = "1em";
  });
  setupSampleHighlight(chart, highlight);
  const resizeObserver = new ResizeObserver(() => {
    if (fitChart()) window.Plotly.redraw(chart);
  });
  resizeObserver.observe(el);
}

async function setupPlotlyFigures() {
  const frames = document.querySelectorAll(".plotly-frame[data-plotly-src]");
  if (!frames.length) return;
  try {
    await loadPlotly();
  } catch (error) {
    frames.forEach((el) => setPlotlyStatus(el, "Interactive figure failed to load."));
    console.error(error);
    return;
  }
  await Promise.all(
    [...frames].map(async (el) => {
      try {
        await renderPlotlyFrame(el);
      } catch (error) {
        setPlotlyStatus(el, "Interactive figure failed to load.");
        console.error(error);
      }
    })
  );
}

function setupFigureZoom() {
  const triggers = document.querySelectorAll(
    ".media-block:not(.plotly-block) .figure-zoom-trigger"
  );
  if (!triggers.length) return;

  const root = document.createElement("div");
  root.className = "figure-lightbox";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Enlarged figure");
  root.innerHTML = `
    <button type="button" class="figure-lightbox-close" aria-label="Close enlarged figure">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>
    <div class="figure-lightbox-stage">
      <img alt="">
    </div>
    <p class="figure-lightbox-caption"></p>
  `;
  document.body.appendChild(root);

  const stage = root.querySelector(".figure-lightbox-stage");
  const img = root.querySelector("img");
  const caption = root.querySelector(".figure-lightbox-caption");
  const closeBtn = root.querySelector(".figure-lightbox-close");
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastFocus = null;

  function applyTransform() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    img.classList.toggle("is-zoomed", scale > 1.01);
  }

  function resetView() {
    scale = 1;
    tx = 0;
    ty = 0;
    dragging = false;
    applyTransform();
  }

  function clampScale(value) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
  }

  function zoomAt(clientX, clientY, nextScale) {
    const next = clampScale(nextScale);
    if (next === scale) return;
    const rect = stage.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    const ratio = next / scale;
    tx = cx - (cx - tx) * ratio;
    ty = cy - (cy - ty) * ratio;
    scale = next;
    if (scale === MIN_SCALE) {
      tx = 0;
      ty = 0;
    }
    applyTransform();
  }

  function openFrom(trigger) {
    const source = trigger.querySelector("img");
    if (!source) return;
    const figure = trigger.closest("figure");
    lastFocus = trigger;
    img.src = source.currentSrc || source.src;
    img.alt = source.alt || "";
    caption.textContent =
      figure?.querySelector("figcaption")?.textContent.trim() || source.alt || "";
    resetView();
    root.hidden = false;
    document.body.classList.add("figure-lightbox-open");
    closeBtn.focus();
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("figure-lightbox-open");
    img.removeAttribute("src");
    resetView();
    lastFocus?.focus();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openFrom(trigger));
  });

  closeBtn.addEventListener("click", close);

  root.addEventListener("click", (event) => {
    if (event.target === root || event.target === stage) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  stage.addEventListener(
    "wheel",
    (event) => {
      if (root.hidden) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(event.clientX, event.clientY, scale * factor);
    },
    { passive: false }
  );

  img.addEventListener("dblclick", (event) => {
    event.preventDefault();
    if (scale > 1.01) {
      resetView();
    } else {
      zoomAt(event.clientX, event.clientY, 2.5);
    }
  });

  img.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || scale <= 1.01) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    img.setPointerCapture(event.pointerId);
  });

  img.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    tx += dx;
    ty += dy;
    lastX = event.clientX;
    lastY = event.clientY;
    applyTransform();
  });

  const stopDrag = () => {
    dragging = false;
  };
  img.addEventListener("pointerup", stopDrag);
  img.addEventListener("pointercancel", stopDrag);
  img.addEventListener("dragstart", (event) => event.preventDefault());
}

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

// The hero video grid autoplays; leave it paused for visitors who ask for reduced motion.
// Phones can also refuse to autoplay (iOS Low Power Mode, data saver) and show a play icon
// instead, so a tap anywhere on the hero starts the video.
function setupTeaserGrid() {
  const hero = document.querySelector(".teaser-grid");
  const video = document.querySelector(".teaser-grid-video");
  if (!hero || !video) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.removeAttribute("autoplay");
    video.pause();
  } else {
    video.play().catch(() => {});
  }
  hero.addEventListener("click", (event) => {
    if (event.target.closest(".teaser-grid-scroll")) return;
    if (video.paused) video.play().catch(() => {});
  });
}

onReady(() => {
  setupNavbarBurger();
  setupNavbarOverflow();
  setupTeaserGrid();
  setupVideoAutoplay();
  setupFigureZoom();
  setupPlotlyFigures();

  if (window.bulmaCarousel) {
    window.bulmaCarousel.attach(".carousel", {
      slidesToScroll: 1,
      slidesToShow: 1,
      loop: true,
      infinite: true,
      autoplay: true,
      autoplaySpeed: 5000,
    });
  }
  if (window.bulmaSlider) {
    window.bulmaSlider.attach();
  }
});
