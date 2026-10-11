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
