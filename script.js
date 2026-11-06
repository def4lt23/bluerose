// Intro: mantener presionada la rosa para entrar
const HOLD_MS = 1500; // cuánto hay que mantener presionado

const intro = document.getElementById("intro");
const holdBtn = intro.querySelector(".intro__hold");
const burst = intro.querySelector(".intro__burst");
let holdStart = 0;
let progress = 0;
let frame = 0;
let unlocked = false;

function setProgress(p) {
  progress = Math.max(0, Math.min(1, p));
  holdBtn.style.setProperty("--p", progress);
}

function tick(now) {
  if (unlocked) return;
  if (holdStart) {
    setProgress((now - holdStart) / HOLD_MS);
    if (progress >= 1) return unlock();
  } else {
    // al soltar antes de tiempo, el anillo se vacía de a poco
    setProgress(progress - 0.04);
    if (progress <= 0) return (frame = 0);
  }
  frame = requestAnimationFrame(tick);
}

function startHold(e) {
  if (unlocked) return;
  e.preventDefault();
  // retoma desde donde había quedado el anillo
  holdStart = performance.now() - progress * HOLD_MS;
  holdBtn.classList.add("is-holding");
  if (!frame) frame = requestAnimationFrame(tick);
}

function endHold() {
  holdStart = 0;
  holdBtn.classList.remove("is-holding");
}

function unlock() {
  unlocked = true;
  frame = 0;
  setProgress(1);
  navigator.vibrate?.(40);

  for (let i = 0; i < 14; i++) {
    const petal = document.createElement("span");
    const angle = (i / 14) * Math.PI * 2;
    const dist = 110 + Math.random() * 90;
    petal.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
    petal.style.setProperty("--y", `${Math.sin(angle) * dist}px`);
    petal.style.setProperty("--r", `${Math.random() * 360}deg`);
    burst.append(petal);
  }

  intro.classList.add("is-done");
  setTimeout(() => {
    document.documentElement.classList.add("intro-vista");
    try { sessionStorage.setItem("intro-vista", "1"); } catch (e) {}
  }, 1200);
}

holdBtn.addEventListener("pointerdown", startHold);
holdBtn.addEventListener("pointerup", endHold);
holdBtn.addEventListener("pointerleave", endHold);
holdBtn.addEventListener("pointercancel", endHold);
holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());
holdBtn.addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold(e);
});
holdBtn.addEventListener("keyup", endHold);
intro.querySelector(".intro__skip").addEventListener("click", unlock);

// Modo oscuro / claro (oscuro por defecto)
const root = document.documentElement;
const themeBtn = document.getElementById("theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(light) {
  if (light) root.dataset.theme = "light";
  else delete root.dataset.theme;
  themeBtn.setAttribute("aria-label", light ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
  themeMeta.content = light ? "#f3f6ff" : "#070b1a";
}

applyTheme(root.dataset.theme === "light");

themeBtn.addEventListener("click", () => {
  const light = root.dataset.theme !== "light";
  applyTheme(light);
  try { localStorage.setItem("tema", light ? "claro" : "oscuro"); } catch (e) {}
});

// Palabra que se escribe y se borra sola en el inicio
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rotator = document.getElementById("rotator");
const WORDS = ["barbería", "despensa", "peluquería", "emprendimiento", "negocio"];

if (!reduceMotion) {
  let word = 0;
  let letters = rotator.textContent.length;
  let deleting = true;

  (function type() {
    const target = WORDS[word];
    if (deleting) {
      rotator.textContent = rotator.textContent.slice(0, --letters);
      if (letters === 0) deleting = false;
      setTimeout(type, 45);
    } else {
      rotator.textContent = target.slice(0, ++letters);
      if (letters === target.length) {
        deleting = true;
        word = (word + 1) % WORDS.length;
        setTimeout(type, 1800);
      } else {
        setTimeout(type, 90);
      }
    }
  })();
}

// Pétalos azules que caen de fondo
const canvas = document.getElementById("petals");
const ctx = canvas.getContext("2d");
let petals = [];

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function newPetal(anywhere) {
  return {
    x: Math.random() * innerWidth,
    y: anywhere ? Math.random() * innerHeight : -20,
    size: 6 + Math.random() * 8,
    speed: 0.3 + Math.random() * 0.6,
    sway: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.02,
    angle: Math.random() * Math.PI * 2,
    hue: 210 + Math.random() * 50, // de celeste a violeta
  };
}

function drawPetals() {
  const alpha = getComputedStyle(root).getPropertyValue("--petal-alpha");
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of petals) {
    p.y += p.speed;
    p.sway += 0.01;
    p.x += Math.sin(p.sway) * 0.4;
    p.angle += p.spin;
    if (p.y > innerHeight + 20) Object.assign(p, newPetal(false));

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (!document.hidden) requestAnimationFrame(drawPetals);
}

if (!reduceMotion) {
  resizeCanvas();
  petals = Array.from({ length: innerWidth < 600 ? 14 : 24 }, () => newPetal(true));
  addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestAnimationFrame(drawPetals);
  });
  requestAnimationFrame(drawPetals);
}

// El botón flotante de WhatsApp se oculta cuando ya se ve la sección Contacto
const fab = document.querySelector(".fab");
new IntersectionObserver(([entry]) => {
  fab.classList.toggle("is-hidden", entry.isIntersecting);
}, { threshold: 0.2 }).observe(document.getElementById("contacto"));

// Año en el pie de página
document.getElementById("year").textContent = new Date().getFullYear();

// Si falta una captura o un video, mostrar un recuadro indicando qué archivo poner
function placeholder(label, path) {
  const box = document.createElement("div");
  box.className = "placeholder";
  box.innerHTML = `<b>${label}</b><code>${path}</code>`;
  return box;
}

document.querySelectorAll(".gallery img").forEach((img) => {
  const swap = () => img.replaceWith(placeholder("Captura pendiente", img.getAttribute("src")));
  if (img.complete && img.naturalWidth === 0) swap();
  else img.addEventListener("error", swap, { once: true });
});

// El video solo se marca pendiente si el archivo realmente falla al cargar.
// (No se mira networkState al inicio: mientras el navegador elige la fuente vale NO_SOURCE aunque el archivo exista.)
document.querySelectorAll(".video video").forEach((video) => {
  const sources = video.querySelectorAll("source");
  const last = sources[sources.length - 1];
  const swap = () => video.isConnected && video.replaceWith(placeholder("Video de demostración pendiente", last.getAttribute("src")));
  last.addEventListener("error", swap, { once: true });
  // por si el error ocurrió antes de que se ejecute este script
  setTimeout(() => {
    if (video.readyState === 0 && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) swap();
  }, 4000);
});

// Apps desplegables: al abrir una se cierra la otra
const apps = document.querySelectorAll(".app");

function setOpen(app, open) {
  app.classList.toggle("is-open", open);
  app.querySelector(".app__toggle").setAttribute("aria-expanded", open);
  if (!open) app.querySelector("video")?.pause();
}

apps.forEach((app) => {
  app.querySelector(".app__toggle").addEventListener("click", () => {
    const opening = !app.classList.contains("is-open");
    apps.forEach((other) => setOpen(other, other === app && opening));
    if (opening) {
      // esperar a que termine de cerrarse la otra para ubicar bien la tarjeta
      setTimeout(() => app.scrollIntoView({ behavior: "smooth", block: "start" }), 420);
    }
  });
});

// Visor de capturas a pantalla completa, con paso a la anterior / siguiente
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector("img");
const lightboxCaption = lightbox.querySelector(".lightbox__caption");
const lightboxCount = lightbox.querySelector(".lightbox__count");
const prevBtn = lightbox.querySelector(".lightbox__nav--prev");
const nextBtn = lightbox.querySelector(".lightbox__nav--next");
let current = []; // figuras de la galería abierta (solo las que tienen imagen)
let index = 0;

function showSlide(i, dir = 0) {
  index = Math.max(0, Math.min(current.length - 1, i));
  const figure = current[index];
  const img = figure.querySelector("img");
  const apply = () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = figure.querySelector("figcaption")?.textContent || "";
    lightboxCount.textContent = current.length > 1 ? `${index + 1} / ${current.length}` : "";
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === current.length - 1;
    prevBtn.hidden = nextBtn.hidden = current.length < 2;
    lightboxImg.classList.remove("is-changing");
  };
  if (!dir || reduceMotion) return apply();
  // pequeño deslizamiento al cambiar de captura
  lightboxImg.style.setProperty("--dir", `${dir * -30}px`);
  lightboxImg.classList.add("is-changing");
  setTimeout(apply, 180);
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-gallery]").forEach((gallery) => {
  gallery.addEventListener("click", (e) => {
    const figure = e.target.closest("figure");
    if (!figure || !figure.querySelector("img")) return;
    current = [...gallery.querySelectorAll("figure")].filter((f) => f.querySelector("img"));
    showSlide(current.indexOf(figure));
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  });
});

prevBtn.addEventListener("click", () => showSlide(index - 1, -1));
nextBtn.addEventListener("click", () => showSlide(index + 1, 1));

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target.classList.contains("lightbox__close")) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft" && index > 0) showSlide(index - 1, -1);
  if (e.key === "ArrowRight" && index < current.length - 1) showSlide(index + 1, 1);
});

// Deslizar con el dedo sobre la captura para pasar de una a otra
let touchX = null;
lightboxImg.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lightboxImg.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (dx < -40 && index < current.length - 1) showSlide(index + 1, 1);
  if (dx > 40 && index > 0) showSlide(index - 1, -1);
});

// Aparición suave de las secciones al hacer scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
