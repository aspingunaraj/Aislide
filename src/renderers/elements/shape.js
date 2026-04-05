/**
 * Shape element — rect, circle, ellipse, rounded rect.
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor } = require("../pptx");

register("shape", {
  renderHtml(element, theme) {
    const fill = resolveColor(element.fill || element.background, theme) || "#E5E7EB";
    const strokeColor = resolveColor(element.strokeColor, theme) || "transparent";
    const strokeWidth = sanitizeNumber(element.strokeWidth, 0);
    const shapeType = element.shape || "rect";
    const radius = shapeType === "circle" || shapeType === "ellipse" ? "50%" : `${sanitizeNumber(element.borderRadius, 0)}px`;
    return `<div style="width:100%;height:100%;background:${fill};border:${strokeWidth}px solid ${strokeColor};border-radius:${radius}"></div>`;
  },

  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const { x, y, w, h } = bounds;
    const shape = element.shape;
    const pptxShape = (shape === "circle" || shape === "ellipse")
      ? pptx.ShapeType.ellipse
      : pptx.ShapeType.roundRect;

    slide.addShape(pptxShape, {
      x, y, w, h,
      fill: { color: toPptColor(resolveColor(element.fill || element.background, theme) || "#E5E7EB") },
      line: {
        color: toPptColor(resolveColor(element.strokeColor, theme) || "transparent"),
        pt: sanitizeNumber(element.strokeWidth, 0)
      },
      radius: sanitizeNumber(element.borderRadius, 0) / 72
    });
  }
});
