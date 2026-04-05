/**
 * Main pipeline — the single entry point for processing slide JSON.
 *
 * Pipeline:  raw JSON → inferTypes → normalize → resolveLayout → render
 *
 * Backwards-compatible with legacy absolute-positioned JSON AND
 * the new layout-based format.
 */

const { buildTheme } = require("./theme");
const { inferTypes } = require("./schema");
const { resolveLayout, cleanFlowProps, sanitizeNumber } = require("./layout");
const { renderSlideHtml } = require("../renderers/html");
const { renderSlidePptx } = require("../renderers/pptx");

// Load all element type registrations
require("../renderers/elements/index");

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/* ── Normalize a raw slide spec ──────────────────────────────────── */

function normalizeSlideSpec(rawSpec) {
  if (!rawSpec || typeof rawSpec !== "object") {
    throw new Error("Slide JSON must be an object.");
  }

  const page = rawSpec.page || {};
  const width = sanitizeNumber(page.width, DEFAULT_WIDTH);
  const height = sanitizeNumber(page.height, DEFAULT_HEIGHT);

  // Collect elements from either `elements` or `children`
  let elements = rawSpec.elements || rawSpec.children || [];
  if (!Array.isArray(elements)) elements = [];

  // Run schema inference (assigns `type` where missing)
  elements = inferTypes(elements);

  return {
    title:      rawSpec.title || rawSpec.metadata?.title || "Slide",
    subtitle:   rawSpec.subtitle || "",
    width,
    height,
    background: page.background || rawSpec.background || "#FFFFFF",
    layout:     rawSpec.layout || undefined,
    gap:        rawSpec.gap,
    padding:    rawSpec.padding,
    justify:    rawSpec.justify,
    align:      rawSpec.align,
    elements,
    children:   elements,  // alias for layout engine
    metadata:   rawSpec.metadata || {},
    theme:      rawSpec.theme || {}
  };
}

/* ── Process: normalize + layout ─────────────────────────────────── */

function processSlide(rawSpec) {
  const spec = normalizeSlideSpec(rawSpec);
  const theme = buildTheme(spec.theme);

  // Run layout engine
  const rootBounds = { x: 0, y: 0, width: spec.width, height: spec.height };

  // Create a virtual root node for the layout engine
  const root = {
    layout:   spec.layout,
    gap:      spec.gap,
    padding:  spec.padding,
    justify:  spec.justify,
    align:    spec.align,
    children: spec.elements,
    x: 0, y: 0,
    width: spec.width,
    height: spec.height
  };

  resolveLayout(root, rootBounds);

  return { spec, theme };
}

/* ── Public API ──────────────────────────────────────────────────── */

function previewHtml(rawSpec) {
  const { spec, theme } = processSlide(rawSpec);
  return renderSlideHtml(spec, theme);
}

function exportPptxSlide(rawSpec, slide, pptx) {
  const { spec, theme } = processSlide(rawSpec);
  renderSlidePptx(spec, slide, pptx, theme);
}

module.exports = {
  normalizeSlideSpec,
  processSlide,
  previewHtml,
  exportPptxSlide
};
