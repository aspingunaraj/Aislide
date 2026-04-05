/**
 * Element registry — pluggable normalize + render functions per type.
 *
 * Each registered type provides:
 *   normalize(element, theme)     → returns normalized element
 *   renderHtml(element, theme)    → returns HTML string for the element's *content*
 *   renderPptx(element, slide, pptx, theme) → adds shapes/text/charts to the pptx slide
 *
 * The registry is the single place to add new element types.
 */

const registry = {};

function register(type, handlers) {
  registry[type] = {
    normalize: handlers.normalize || identity,
    renderHtml: handlers.renderHtml || (() => ""),
    renderPptx: handlers.renderPptx || (() => {})
  };
}

function getHandler(type) {
  return registry[type] || registry["text"] || {
    normalize: identity,
    renderHtml: () => "",
    renderPptx: () => {}
  };
}

function listTypes() {
  return Object.keys(registry);
}

function identity(el) { return el; }

module.exports = { register, getHandler, listTypes };
