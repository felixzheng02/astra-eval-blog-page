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
  burgers.forEach((el) => {
    el.addEventListener("click", () => {
      const targetId = el.dataset.target;
      const target = document.getElementById(targetId);
      el.classList.toggle("is-active");
      if (target) target.classList.toggle("is-active");
    });
  });

  document.querySelectorAll("#writeupNavMenu a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      burgers.forEach((el) => {
        el.classList.remove("is-active");
        const target = document.getElementById(el.dataset.target);
        if (target) target.classList.remove("is-active");
      });
    });
  });
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

async function renderPlotlyFrame(el) {
  const src = el.dataset.plotlySrc;
  if (!src) return;
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Figure JSON ${response.status} ${src}`);
  }
  const spec = await response.json();
  const layout = { ...(spec.layout || {}), autosize: true };
  delete layout.width;
  delete layout.height;
  const filename =
    el.closest("[data-figure]")?.getAttribute("data-figure") || "figure";
  el.replaceChildren();
  const width = el.clientWidth || el.offsetWidth;
  if (width) {
    el.style.height = `${Math.max(Math.round(width * (820 / 1450)), 320)}px`;
  }
  await window.Plotly.newPlot(el, spec.data || [], layout, {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    toImageButtonOptions: { format: "svg", filename },
  });
  window.Plotly.Plots.resize(el);
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

onReady(() => {
  setupNavbarBurger();
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
