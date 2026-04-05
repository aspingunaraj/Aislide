/**
 * HTML renderer — converts a resolved layout tree into HTML/CSS.
 *
 * Each element is absolutely positioned using its `_computed` bounds.
 * Element-specific content comes from the registry's `renderHtml` handler.
 */

const { cascadeStyle, resolveColor } = require("../engine/theme");
const { getHandler } = require("../engine/registry");
const { sanitizeNumber } = require("../engine/layout");

/* ── Escape ──────────────────────────────────────────────────────── */

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Build inline style for any element wrapper ──────────────────── */

function buildWrapperStyle(element, inherited, theme) {
  const c = element._computed || {};
  const bg = resolveColor(element.background, theme) || "transparent";
  const color = resolveColor(inherited.color, theme) || "#111827";
  const fontFamily = inherited.fontFamily || "Arial";
  const fontSize = sanitizeNumber(inherited.fontSize, 14);
  const lineHeight = sanitizeNumber(inherited.lineHeight || element.lineHeight, 1.3);
  const fontWeight = element.bold ? "700" : (inherited.fontWeight || "400");
  const align = element.textAlign || element.align || "left";
  const borderRadius = sanitizeNumber(element.borderRadius, 0);
  const opacity = element.opacity !== undefined ? element.opacity : 1;

  const parts = [
    `position:absolute`,
    `left:${sanitizeNumber(c.x)}px`,
    `top:${sanitizeNumber(c.y)}px`,
    `width:${sanitizeNumber(c.width)}px`,
    `height:${sanitizeNumber(c.height)}px`,
    `font-family:${esc(fontFamily)},sans-serif`,
    `font-size:${fontSize}px`,
    `font-weight:${fontWeight}`,
    `color:${color}`,
    `line-height:${lineHeight}`,
    `text-align:${align}`,
    `background:${bg}`,
    `border-radius:${borderRadius}px`,
    `box-sizing:border-box`,
    `overflow:hidden`
  ];

  if (element.border) parts.push(`border:${element.border}`);
  if (element.padding) {
    const p = typeof element.padding === "number" ? `${element.padding}px` : element.padding;
    parts.push(`padding:${p}`);
  }
  if (opacity !== 1) parts.push(`opacity:${opacity}`);
  if (element.shadow) parts.push("box-shadow:0 6px 18px rgba(0,0,0,0.15)");

  return parts.join(";");
}

/* ── Render a single element ─────────────────────────────────────── */

function renderElementHtml(element, parentStyle, theme) {
  const inherited = cascadeStyle(element, parentStyle, theme);
  const type = element.type || "text";
  const handler = getHandler(type);
  const wrapperStyle = buildWrapperStyle(element, inherited, theme);

  // Get inner content from the registered handler
  const innerHtml = handler.renderHtml(element, theme, inherited);

  // Check for children (container elements)
  const children = element.children || element.elements || [];
  let childrenHtml = "";
  if (children.length > 0) {
    childrenHtml = children
      .map(child => renderElementHtml(child, inherited, theme))
      .join("\n");
  }

  const cssClass = `element el-${type}`;
  return `<div class="${cssClass}" style="${wrapperStyle}">${innerHtml}${childrenHtml}</div>`;
}

/* ── Render a full slide ─────────────────────────────────────────── */

function renderSlideHtml(slideSpec, theme) {
  const bg = resolveColor(slideSpec.background, theme) || "#FFFFFF";
  const w = sanitizeNumber(slideSpec.width, 1280);
  const h = sanitizeNumber(slideSpec.height, 720);

  const elements = slideSpec.elements || slideSpec.children || [];
  const content = elements
    .map(el => renderElementHtml(el, {}, theme))
    .join("\n");

  return `<div class="slide" style="width:${w}px;height:${h}px;background:${bg};position:relative;">\n${content}\n</div>`;
}

module.exports = { renderSlideHtml, renderElementHtml, esc };
