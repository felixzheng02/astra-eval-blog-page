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
