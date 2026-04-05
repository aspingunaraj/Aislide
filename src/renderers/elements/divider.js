/**
 * Divider element — horizontal or vertical rule.
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor } = require("../pptx");

register("divider", {
  renderHtml(element, theme) {
    const color = resolveColor(element.color, theme) || "#CBD5E1";
    const opacity = element.opacity !== undefined ? element.opacity : 1;
    return `<div class="divider-line" style="width:100%;height:100%;background:${color};opacity:${opacity}"></div>`;
  },

  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const { x, y, w, h } = bounds;
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h,
      fill: { color: toPptColor(resolveColor(element.color, theme) || "#CBD5E1") },
      line: { pt: 0 }
    });
  }
});
