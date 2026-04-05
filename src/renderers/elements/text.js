/**
 * Text element — basic text block, the default element type.
 * Also handles background boxes and borders in PPTX.
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor, mapVAlign } = require("../pptx");

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

register("text", {
  renderHtml(element, theme, inherited) {
    return `<span class="text-content">${esc(element.text || "")}</span>`;
  },

  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const { x, y, w, h } = bounds;
    const fontFamily = inherited.fontFamily || "Aptos";
    const bg = resolveColor(element.background, theme);
    const ShapeType = pptx.ShapeType;

    if (bg && bg !== "transparent") {
      slide.addShape(ShapeType.roundRect, {
        x, y, w, h,
        fill: { color: toPptColor(bg) },
        line: element.border
          ? { color: toPptColor(element.borderColor || "#CBD5E1"), pt: sanitizeNumber(element.borderWidth, 1) }
          : { pt: 0 },
        radius: sanitizeNumber(element.borderRadius, 0) / 72
      });
    }

    slide.addText(String(element.text || ""), {
      x, y, w, h,
      bold: Boolean(element.bold),
      fontSize: sanitizeNumber(inherited.fontSize, 18),
      color: toPptColor(resolveColor(inherited.color, theme) || "#111827"),
      align: element.textAlign || element.align || "left",
      valign: mapVAlign(element.verticalAlign),
      fontFace: fontFamily
    });
  }
});
