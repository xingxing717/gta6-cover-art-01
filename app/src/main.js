// Sunset Cover Studio — editor UI: photo pool, layout/grade/caption controls,
// drag-to-pan and wheel-to-zoom cropping on the live preview, PNG export,
// and the ?shot= modes the screenshots use. Photos are read with FileReader
// on the user's own machine and are never uploaded anywhere.

import { EXPORT_SIZES, LAYOUTS, GRADES, drawCover, panelAt, panelRects } from "./cover.js";

const SAMPLES = {
  woman: { src: "./assets/boulevard-woman.jpg", name: "Boulevard sample" },
  man: { src: "./assets/neon-man.jpg", name: "Neon night sample" },
};

const $ = (id) => document.getElementById(id);
const preview = $("preview");
const pctx = preview.getContext("2d");

const state = {
  layout: "hero-split",
  grade: "sunset",
  caption: "SUNSET HEIST",
  subline: "OCEAN DRIVE · 6 PM",
  captionScale: 100,
  sizeKey: "1080x1080",
  // Pool of loaded photos: { img, name, src }.
  pool: [],
  selectedPhoto: -1,
  activePanel: 0,
  // One crop per panel slot: { photo: pool index | -1, x, y, scale }.
  panels: [],
};

function panelCount() {
  return (LAYOUTS[state.layout] || LAYOUTS["hero-split"]).panels.length;
}

function resetPanels(keepPhotos) {
  const n = panelCount();
  const next = [];
  for (let i = 0; i < n; i++) {
    const old = keepPhotos ? state.panels[i] : null;
    next.push(old || { photo: -1, x: 0, y: 0, scale: 1 });
  }
  state.panels = next;
  if (state.activePanel >= n) state.activePanel = 0;
}

function coverState() {
  return {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subline: state.subline,
    captionScale: state.captionScale,
    panels: state.panels.map((p) => ({
      photo: p.photo >= 0 ? state.pool[p.photo].img : null,
      x: p.x,
      y: p.y,
      scale: p.scale,
    })),
  };
}

function renderPreview() {
  const { w, h } = EXPORT_SIZES[state.sizeKey];
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  drawCover(pctx, w, h, coverState());
  $("stageLabel").textContent = `Live preview · ${EXPORT_SIZES[state.sizeKey].label}`;
  const filled = state.panels.filter((p) => p.photo >= 0).length;
  $("status").textContent =
    filled === 0
      ? "Ready — add a photo to begin."
      : `${filled} of ${state.panels.length} panels filled · panel ${state.activePanel + 1} active — drag to pan, scroll to zoom.`;
  renderSlots();
}

function renderSlots() {
  const list = $("slotList");
  list.innerHTML = "";
  state.panels.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className = "slot" + (i === state.activePanel ? " active" : "");
    btn.type = "button";
    const name = p.photo >= 0 ? state.pool[p.photo].name : "— empty —";
    btn.innerHTML = `<span>Panel ${i + 1}</span><span class="slot-photo"></span>`;
    btn.querySelector(".slot-photo").textContent = name;
    btn.addEventListener("click", () => {
      state.activePanel = i;
      syncZoomSlider();
      renderPreview();
    });
    list.appendChild(btn);
  });
}

function renderPool() {
  const pool = $("pool");
  pool.innerHTML = "";
  if (state.pool.length === 0) {
    const span = document.createElement("span");
    span.className = "empty";
    span.textContent = "No photos yet.";
    pool.appendChild(span);
    return;
  }
  state.pool.forEach((photo, i) => {
    const thumb = document.createElement("img");
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (i === state.selectedPhoto) thumb.classList.add("selected");
    thumb.addEventListener("click", () => {
      state.selectedPhoto = i;
      // Assign the clicked photo to the active panel.
      state.panels[state.activePanel].photo = i;
      renderPool();
      renderPreview();
    });
    pool.appendChild(thumb);
  });
}

function syncZoomSlider() {
  const p = state.panels[state.activePanel];
  $("zoomSlider").value = Math.round((p ? p.scale : 1) * 100);
}

function addPhoto(img, name) {
  state.pool.push({ img, name });
  const idx = state.pool.length - 1;
  state.selectedPhoto = idx;
  // First photo fills every empty panel.
  if (state.pool.length === 1) {
    state.panels.forEach((p) => { p.photo = idx; });
  } else {
    state.panels[state.activePanel].photo = idx;
  }
  renderPool();
  renderPreview();
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read " + file.name));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Not an image: " + file.name));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadSample(key) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Sample photo failed to load"));
    img.src = SAMPLES[key].src;
  });
}

async function useSample(key) {
  try {
    const img = await loadSample(key);
    addPhoto(img, SAMPLES[key].name);
  } catch (err) {
    $("status").textContent = String(err.message || err);
  }
}

// --- Export ---------------------------------------------------------------

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('20px "Archivo Black"'),
      document.fonts.ready,
    ]);
  } catch { /* canvas falls back to the next font in the stack */ }
}

async function exportPNG(sizeKey) {
  await ensureFonts();
  const { w, h } = EXPORT_SIZES[sizeKey];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext("2d"), w, h, coverState());
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function doExport() {
  const btn = $("exportBtn");
  btn.disabled = true;
  $("status").textContent = "Rendering PNG…";
  try {
    const blob = await exportPNG(state.sizeKey);
    const slug = state.caption.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cover";
    downloadBlob(blob, `sunset-cover-${slug}-${state.sizeKey}.png`);
    $("status").textContent = `Exported ${EXPORT_SIZES[state.sizeKey].label} PNG — check your downloads.`;
  } catch (err) {
    $("status").textContent = "Export failed: " + (err.message || err);
  } finally {
    btn.disabled = false;
  }
}

// --- Controls -------------------------------------------------------------

function buildPickers() {
  const layoutPicker = $("layoutPicker");
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = layout.label;
    btn.setAttribute("aria-pressed", String(key === state.layout));
    btn.addEventListener("click", () => {
      state.layout = key;
      resetPanels(true);
      layoutPicker.querySelectorAll(".btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      renderPreview();
    });
    layoutPicker.appendChild(btn);
  });

  const gradePicker = $("gradePicker");
  Object.entries(GRADES).forEach(([key, grade]) => {
    const btn = document.createElement("button");
    btn.className = "btn swatch";
    btn.type = "button";
    btn.title = grade.label;
    btn.setAttribute("aria-label", grade.label);
    btn.style.background = grade.swatch;
    btn.setAttribute("aria-pressed", String(key === state.grade));
    btn.addEventListener("click", () => {
      state.grade = key;
      gradePicker.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      renderPreview();
    });
    gradePicker.appendChild(btn);
  });
}

function bindControls() {
  $("fileInput").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      try {
        addPhoto(await loadImageFile(file), file.name);
      } catch (err) {
        $("status").textContent = String(err.message || err);
      }
    }
    e.target.value = "";
  });
  $("sampleWoman").addEventListener("click", () => useSample("woman"));
  $("sampleMan").addEventListener("click", () => useSample("man"));
  $("fillAll").addEventListener("click", () => {
    if (state.selectedPhoto < 0) {
      $("status").textContent = "Pick a photo first (click one in the pool).";
      return;
    }
    state.panels.forEach((p) => { p.photo = state.selectedPhoto; });
    renderPreview();
  });
  $("clearPhotos").addEventListener("click", () => {
    state.pool = [];
    state.selectedPhoto = -1;
    resetPanels(false);
    renderPool();
    renderPreview();
  });
  $("captionInput").addEventListener("input", (e) => {
    state.caption = e.target.value;
    renderPreview();
  });
  $("sublineInput").addEventListener("input", (e) => {
    state.subline = e.target.value;
    renderPreview();
  });
  $("captionScale").addEventListener("input", (e) => {
    state.captionScale = Number(e.target.value);
    renderPreview();
  });
  $("size").addEventListener("change", (e) => {
    state.sizeKey = e.target.value;
    renderPreview();
  });
  $("exportBtn").addEventListener("click", doExport);
  $("exportBtn2").addEventListener("click", doExport);
  $("zoomSlider").addEventListener("input", (e) => {
    const p = state.panels[state.activePanel];
    if (p) {
      p.scale = Number(e.target.value) / 100;
      renderPreview();
    }
  });
  $("resetCrop").addEventListener("click", () => {
    const p = state.panels[state.activePanel];
    if (p) {
      p.x = 0;
      p.y = 0;
      p.scale = 1;
      syncZoomSlider();
      renderPreview();
    }
  });
}

// --- Drag to pan, wheel to zoom -------------------------------------------

function bindCanvas() {
  let dragging = false;
  let lastCover = null;

  function toCoverCoords(e) {
    const r = preview.getBoundingClientRect();
    const { w, h } = EXPORT_SIZES[state.sizeKey];
    return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
  }

  preview.addEventListener("pointerdown", (e) => {
    const { x, y } = toCoverCoords(e);
    const hit = panelAt(preview.width, preview.height, state.layout, x, y);
    if (hit >= 0) {
      state.activePanel = hit;
      syncZoomSlider();
      renderPreview();
    }
    dragging = true;
    lastCover = { x, y };
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener("pointermove", (e) => {
    if (!dragging || !lastCover) return;
    const p = state.panels[state.activePanel];
    if (!p) return;
    const c = toCoverCoords(e);
    const rect = panelRects(preview.width, preview.height, state.layout)[state.activePanel];
    // Pan in fractions of the active panel's size, so dragging tracks the cursor.
    p.x += (c.x - lastCover.x) / rect.w;
    p.y += (c.y - lastCover.y) / rect.h;
    // Clamp the pan so the photo cannot be dragged out of its panel.
    p.x = Math.max(-0.6, Math.min(0.6, p.x));
    p.y = Math.max(-0.6, Math.min(0.6, p.y));
    lastCover = c;
    renderPreview();
  });
  preview.addEventListener("pointerup", () => { dragging = false; });
  preview.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = state.panels[state.activePanel];
    if (!p) return;
    p.scale = Math.max(1, Math.min(2.5, p.scale * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncZoomSlider();
    renderPreview();
  }, { passive: false });
}

// --- Screenshot modes (?shot=...) ------------------------------------------
// ?shot=cover&size=1080x1080|1080x1350|1920x1080&photo=woman|man|both&caption=...
//   renders the finished cover full-viewport (the app's own drawing of it).
// ?shot=editor&photo=woman|man|both — the editor with a sample photo loaded.
async function applyShotMode() {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  if (!shot) return false;
  const photo = params.get("photo") || "both";
  const caption = params.get("caption");
  const grade = params.get("grade");
  const layout = params.get("layout");
  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
    resetPanels(false);
  }
  if (caption) {
    state.caption = caption;
    $("captionInput").value = caption;
  }
  if (grade && GRADES[grade]) state.grade = grade;
  const size = params.get("size");
  if (size && EXPORT_SIZES[size]) {
    state.sizeKey = size;
    $("size").value = size;
  }
  const keys = photo === "both" ? ["woman", "man"] : [photo];
  for (const key of keys) {
    if (SAMPLES[key]) {
      try {
        const img = await loadSample(key);
        addPhoto(img, SAMPLES[key].name);
      } catch { /* keep going with whatever loaded */ }
    }
  }
  if (shot === "cover") {
    document.body.classList.add("shot-cover");
  }
  renderPreview();
  return true;
}

// Test hook for headless checks: export any size as a PNG data URL.
window.__cover = {
  state,
  exportPNG: async (sizeKey) => {
    const blob = await exportPNG(sizeKey);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },
  ready: ensureFonts().then(() => {
    renderPreview();
    return true;
  }),
};

buildPickers();
bindControls();
bindCanvas();
resetPanels(false);
renderPool();
applyShotMode().then((shot) => {
  if (!shot) renderPreview();
});
