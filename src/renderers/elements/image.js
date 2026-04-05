/**
 * Image element — embeds an image with object-fit control.
 */

const { register } = require("../../engine/registry");

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

register("image", {
  renderHtml(element) {
    const src = element.src || "";
    const fit = element.fit || "contain";
    const alt = element.alt || "";
    return `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;height:100%;object-fit:${fit};display:block"/>`;
  },

  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const { x, y, w, h } = bounds;
    if (element.src) {
      try {
        slide.addImage({ path: element.src, x, y, w, h });
      } catch (e) {
        // If image can't be loaded, add a placeholder
        slide.addText("[Image]", { x, y, w, h, align: "center", fontSize: 12, color: "999999" });
      }
    }
  }
});
