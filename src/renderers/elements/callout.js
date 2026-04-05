/**
 * Callout element — prominent value + label card (like KPI but more flexible).
 * Also used for KPI (aliased).
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor } = require("../pptx");

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderCalloutHtml(element, theme, inherited) {
  const valueFontSize = sanitizeNumber(element.valueFontSize, 24);
  const valueColor = resolveColor(element.valueColor || element.color, theme) || "#1E3A8A";
  const valueBold = element.valueBold !== false ? "700" : "400";
  const labelFontSize = sanitizeNumber(element.labelFontSize, 11);
  const labelColor = resolveColor(element.labelColor, theme) || "#444444";
  const fontFamily = inherited.fontFamily || "Arial";

  return `<div class="callout-inner">
    <div class="callout-value" style="font-size:${valueFontSize}px;color:${valueColor};font-weight:${valueBold};font-family:${fontFamily},sans-serif">${esc(element.value ?? "--")}</div>
    <div class="callout-label" style="font-size:${labelFontSize}px;color:${labelColor};font-family:${fontFamily},sans-serif">${esc(element.label || "")}</div>
  </div>`;
}

function renderCalloutPptx(element, slide, pptx, theme, inherited, bounds) {
  const { x, y, w, h } = bounds;
  const fontFamily = inherited.fontFamily || "Aptos";
  const bg = resolveColor(element.background, theme) || "#F0F0F0";
  const ShapeType = pptx.ShapeType;

  slide.addShape(ShapeType.roundRect, {
    x, y, w, h,
    radius: sanitizeNumber(element.borderRadius, 6) / 72,
    fill: { color: toPptColor(bg) },
    line: { pt: 0 }
  });

  slide.addText(String(element.value ?? "--"), {
    x: x + 0.1, y: y + 0.05, w: w - 0.2, h: h * 0.5,
    bold: element.valueBold !== false,
    fontSize: sanitizeNumber(element.valueFontSize, 24),
    color: toPptColor(resolveColor(element.valueColor || element.color, theme) || "#1E3A8A"),
    align: element.textAlign || element.align || "left",
    fontFace: fontFamily
  });

  slide.addText(String(element.label || ""), {
    x: x + 0.1, y: y + h * 0.45, w: w - 0.2, h: h * 0.45,
    fontSize: sanitizeNumber(element.labelFontSize, 11),
    color: toPptColor(resolveColor(element.labelColor, theme) || "#444444"),
    align: element.textAlign || element.align || "left",
    fontFace: fontFamily
  });
}

register("callout", {
  renderHtml: renderCalloutHtml,
  renderPptx: renderCalloutPptx
});

// KPI is an alias for callout with slightly different defaults
register("kpi", {
  renderHtml(element, theme, inherited) {
    const el = {
      ...element,
      valueFontSize: element.valueFontSize || element.valueSize || 28,
      valueColor: element.valueColor || element.color || "#1E3A8A",
      labelFontSize: element.labelFontSize || element.fontSize || 12,
      labelColor: element.labelColor || element.subColor || "#475569",
      background: element.background || "#EEF2FF"
    };
    return renderCalloutHtml(el, theme, inherited);
  },
  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const el = {
      ...element,
      valueFontSize: element.valueFontSize || element.valueSize || 28,
      valueColor: element.valueColor || element.color || "#1E3A8A",
      labelFontSize: element.labelFontSize || element.fontSize || 12,
      labelColor: element.labelColor || element.subColor || "#475569",
      background: element.background || "#EEF2FF"
    };
    renderCalloutPptx(el, slide, pptx, theme, inherited, bounds);
  }
});
