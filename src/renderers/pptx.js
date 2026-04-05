/**
 * PPTX renderer — converts a resolved layout tree into pptxgenjs calls.
 */

const { cascadeStyle, resolveColor } = require("../engine/theme");
const { getHandler } = require("../engine/registry");
const { sanitizeNumber } = require("../engine/layout");

/* ── Helpers ──────────────────────────────────────────────────────── */

function pxToInches(px) {
  return sanitizeNumber(px) / 96;
}

function toPptColor(color) {
  if (!color || color === "transparent") return "FFFFFF";
  let hex = String(color).replace("#", "").toUpperCase();
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return hex;
}

function mapVAlign(val) {
  if (val === "center" || val === "middle") return "mid";
  if (val === "flex-end" || val === "bottom") return "down";
  return "top";
}

/* ── Render a single element ─────────────────────────────────────── */

function renderElementPptx(element, slide, pptx, parentStyle, theme) {
  const inherited = cascadeStyle(element, parentStyle, theme);
  const type = element.type || "text";
  const handler = getHandler(type);

  // Computed bounds in inches
  const c = element._computed || {};
  const bounds = {
    x: pxToInches(sanitizeNumber(c.x)),
    y: pxToInches(sanitizeNumber(c.y)),
    w: pxToInches(sanitizeNumber(c.width)),
    h: pxToInches(sanitizeNumber(c.height))
  };

  // Delegate to the registered handler
  handler.renderPptx(element, slide, pptx, theme, inherited, bounds);

  // Recurse into children
  const children = element.children || element.elements || [];
  children.forEach(child => {
    renderElementPptx(child, slide, pptx, inherited, theme);
  });
}

/* ── Render a full slide ─────────────────────────────────────────── */

function renderSlidePptx(slideSpec, slide, pptx, theme) {
  const bg = resolveColor(slideSpec.background, theme) || "#FFFFFF";
  slide.background = { color: toPptColor(bg) };

  const elements = slideSpec.elements || slideSpec.children || [];
  elements.forEach(el => {
    renderElementPptx(el, slide, pptx, {}, theme);
  });
}

module.exports = {
  renderSlidePptx,
  renderElementPptx,
  pxToInches,
  toPptColor,
  mapVAlign
};
