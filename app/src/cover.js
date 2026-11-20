// Sunset Cover Studio — the cover renderer. Draws the multi-panel poster cover
// (photos, sunset/neon colour grade, bold caption, synthwave sun) onto any canvas
// at any export size. Pure canvas 2D, no network, no libraries.

export const EXPORT_SIZES = {
  "1080x1080": { w: 1080, h: 1080, label: "1080 × 1080" },
  "1080x1350": { w: 1080, h: 1350, label: "1080 × 1350" },
  "1920x1080": { w: 1920, h: 1080, label: "1920 × 1080" },
};

export const LAYOUTS = {
  "hero-split": {
    label: "Hero split",
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  triptych: {
    label: "Triptych",
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  quad: {
    label: "Four squares",
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  duo: {
    label: "Duo",
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  single: {
    label: "Single frame",
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

export const GRADES = {
  sunset: {
    label: "Sunset",
    swatch: "linear-gradient(135deg,#ffc93c,#ff7a18 45%,#ff2d78)",
    top: "rgba(255,190,90,0.30)",
    bottom: "rgba(255,45,120,0.42)",
    vignette: "rgba(40,0,40,0.38)",
  },
  neon: {
    label: "Neon night",
    swatch: "linear-gradient(135deg,#2ee6c8,#7b2fff 50%,#ff2d78)",
    top: "rgba(80,220,255,0.26)",
    bottom: "rgba(255,45,180,0.48)",
    vignette: "rgba(10,0,40,0.42)",
  },
  gold: {
    label: "Golden hour",
    swatch: "linear-gradient(135deg,#fff3b0,#ffc93c 50%,#ff7a18)",
    top: "rgba(255,220,120,0.34)",
    bottom: "rgba(255,122,24,0.38)",
    vignette: "rgba(50,20,0,0.32)",
  },
  coast: {
    label: "Coast dusk",
    swatch: "linear-gradient(135deg,#7dd8ff,#2e6fe6 50%,#7b2fff)",
    top: "rgba(120,200,255,0.28)",
    bottom: "rgba(60,40,180,0.44)",
    vignette: "rgba(0,10,40,0.40)",
  },
};

function fitCaptionSize(ctx, text, maxWidth, start) {
  let size = start;
  ctx.font = `${size}px Anton, "Archivo Black", sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px Anton, "Archivo Black", sans-serif`;
  }
  return size;
}

// Draw one photo into a panel rect, cover-fit, with the user's pan/zoom crop.
// crop: { x, y, scale } — x/y are fractions of the panel size, scale >= 1.
export function drawPhotoInPanel(ctx, img, rect, crop) {
  const { x, y, w, h } = rect;
  const scale = Math.max(1, crop.scale || 1);
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * scale;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = x + (w - dw) / 2 + (crop.x || 0) * w;
  const dy = y + (h - dh) / 2 + (crop.y || 0) * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = "saturate(1.22) contrast(1.07)";
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawGrade(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, grade.top);
  g.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = "source-over";
  const cx = x + w / 2;
  const cy = y + h / 2;
  const v = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, grade.vignette);
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, index) {
  const { x, y, w, h } = rect;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#3a1550");
  g.addColorStop(1, "#1c0a2c");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  ctx.restore();
  const size = Math.max(14, Math.min(w, h) * 0.07);
  ctx.font = `${size}px "Archivo Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`PANEL ${index + 1}`, x + w / 2, y + h / 2);
}

// Classic synthwave sun: a gradient disc with horizontal cuts in its lower half.
function drawSun(ctx, cx, cy, r, bandTop, bandBottom) {
  ctx.save();
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, "#ffe95e");
  g.addColorStop(0.45, "#ff9e3d");
  g.addColorStop(1, "#ff2d78");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  let stripeY = cy + r * 0.05;
  let stripeH = Math.max(2, r * 0.035);
  ctx.fillStyle = bandTop;
  while (stripeY < cy + r) {
    ctx.fillRect(cx - r, stripeY, r * 2, stripeH);
    stripeY += stripeH + r * 0.16;
    stripeH *= 1.45;
  }
  ctx.restore();
}

function drawCaptionZone(ctx, W, H, zone, state) {
  const { y, h } = zone;
  const band = ctx.createLinearGradient(0, y, W, y + h);
  band.addColorStop(0, "#2a0a3d");
  band.addColorStop(0.35, "#7b1e63");
  band.addColorStop(0.7, "#ff2d78");
  band.addColorStop(1, "#ff7a18");
  ctx.fillStyle = band;
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(0, y, W, Math.max(2, H * 0.003));

  // Sun sits behind the caption, tucked into the right corner so it never
  // crosses the centred subline.
  const sunR = h * 0.68;
  const sunX = W * 0.88;
  const sunY = y + h * 0.52;
  drawSun(ctx, sunX, sunY, sunR, "#ff2d78", "#ff7a18");

  // Big caption, fitted to the width.
  const caption = (state.caption || "").toUpperCase();
  const scale = (state.captionScale || 100) / 100;
  const start = Math.round(H * 0.085 * scale);
  const size = fitCaptionSize(ctx, caption, W * 0.92, start);
  ctx.font = `${size}px Anton, "Archivo Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try { ctx.letterSpacing = "2px"; } catch { /* older canvas: no letter spacing */ }
  const cx = W / 2;
  const cy = y + h * 0.44;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.02);
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeStyle = "#1c0526";
  ctx.lineJoin = "round";
  ctx.strokeText(caption, 0, 0);
  const textGrad = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  textGrad.addColorStop(0, "#ffffff");
  textGrad.addColorStop(0.55, "#ffe9f4");
  textGrad.addColorStop(1, "#ffc93c");
  ctx.fillStyle = textGrad;
  ctx.fillText(caption, 0, 0);
  ctx.restore();
  try { ctx.letterSpacing = "0px"; } catch { /* ignore */ }

  // Subline, letterspaced small caps under the caption.
  const sub = (state.subline || "").toUpperCase();
  if (sub) {
    const subSize = Math.max(12, Math.round(H * 0.02));
    ctx.font = `${subSize}px "Archivo Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    try { ctx.letterSpacing = `${Math.max(2, subSize * 0.35)}px`; } catch { /* ignore */ }
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(sub, W / 2, y + h * 0.82);
    try { ctx.letterSpacing = "0px"; } catch { /* ignore */ }
  }
}

// The whole cover. state: { layout, grade, caption, subline, captionScale,
// panels: [{ photo: HTMLImageElement|null, x, y, scale }] }.
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const pad = Math.max(10, Math.round(W * 0.018));
  const captionH = Math.round(H * 0.22);

  // Deep purple-black backdrop.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1c0a2e");
  bg.addColorStop(1, "#0c0416");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Panel area: everything above the caption zone.
  const rects = panelRects(W, H, state.layout);

  rects.forEach((rect, i) => {
    const slot = state.panels[i] || {};
    if (slot.photo) {
      drawPhotoInPanel(ctx, slot.photo, rect, slot);
    } else {
      drawEmptyPanel(ctx, rect, i);
    }
    drawGrade(ctx, rect, grade);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Thin outer frame.
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, W * 0.001);
  ctx.strokeRect(pad / 2, pad / 2, W - pad, H - pad);

  drawCaptionZone(ctx, W, H, { y: H - captionH, h: captionH }, state);
}

// Panel rectangles (in cover pixels) for a layout at a given cover size.
export function panelRects(W, H, layoutName) {
  const layout = LAYOUTS[layoutName] || LAYOUTS["hero-split"];
  const pad = Math.max(10, Math.round(W * 0.018));
  const captionH = Math.round(H * 0.22);
  const gutter = Math.max(6, Math.round(W * 0.008));
  const area = { x: pad, y: pad, w: W - pad * 2, h: H - captionH - pad * 2 };
  return layout.panels.map((p) => {
    const px = area.x + p.x * area.w + (p.x > 0 ? gutter / 2 : 0);
    const py = area.y + p.y * area.h + (p.y > 0 ? gutter / 2 : 0);
    const pw = p.w * area.w - (p.x > 0 ? gutter / 2 : 0) - (p.x + p.w < 1 ? gutter / 2 : 0);
    const ph = p.h * area.h - (p.y > 0 ? gutter / 2 : 0) - (p.y + p.h < 1 ? gutter / 2 : 0);
    return { x: px, y: py, w: pw, h: ph };
  });
}

// Hit-test: which panel contains point (px, py) in a W×H cover?
export function panelAt(W, H, layoutName, px, py) {
  const rects = panelRects(W, H, layoutName);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
