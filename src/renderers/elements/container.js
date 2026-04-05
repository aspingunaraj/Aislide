/**
 * Container element — a group/layout wrapper.
 * Its children are rendered by the main renderer pipeline (recursion).
 * The container itself just provides optional background/border.
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor } = require("../pptx");

register("container", {
  renderHtml(element, theme) {
    // Container content is rendered via child recursion in html.js
    // Here we just render a visual wrapper if needed
    return "";
  },

  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const { x, y, w, h } = bounds;
    const bg = resolveColor(element.background, theme);
    if (bg && bg !== "transparent") {
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w, h,
        fill: { color: toPptColor(bg) },
        line: { pt: 0 },
        radius: sanitizeNumber(element.borderRadius, 0) / 72
      });
    }
    // Children are rendered by the pptx.js pipeline recursion
  }
});
