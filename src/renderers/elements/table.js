/**
 * Table element — data grid with styled headers, striping, borders.
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor } = require("../pptx");

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getTableDefaults(element, theme) {
  const td = theme.table || {};
  return {
    headerBg:       resolveColor(element.headerBackground || td.headerBackground, theme) || "#1F3A5F",
    headerColor:    resolveColor(element.headerColor || td.headerColor, theme) || "#FFFFFF",
    headerFontSize: sanitizeNumber(element.headerFontSize || td.headerFontSize, 12),
    cellFontSize:   sanitizeNumber(element.cellFontSize || td.cellFontSize, 11),
    cellColor:      resolveColor(element.cellColor || td.cellColor, theme) || "#333333",
    stripedColor:   resolveColor(element.stripedColor || td.stripedColor, theme) || "#F8FAFC",
    borderColor:    resolveColor(element.tableBorderColor || td.borderColor, theme) || "#E5E7EB",
    fontFamily:     element.fontFamily || theme.fontFamily || "Arial"
  };
}

register("table", {
  renderHtml(element, theme, inherited) {
    const headers = Array.isArray(element.headers) ? element.headers : [];
    const rows = Array.isArray(element.rows) ? element.rows : [];
    const d = getTableDefaults(element, theme);

    let html = `<table class="slide-table" style="width:100%;border-collapse:collapse;font-family:${d.fontFamily},sans-serif">`;

    if (headers.length > 0) {
      html += `<thead><tr>`;
      headers.forEach(h => {
        html += `<th style="background:${d.headerBg};color:${d.headerColor};font-size:${d.headerFontSize}px;padding:6px 10px;text-align:left;border:1px solid ${d.borderColor};font-weight:600">${esc(h)}</th>`;
      });
      html += `</tr></thead>`;
    }

    html += `<tbody>`;
    rows.forEach((row, ri) => {
      const bg = ri % 2 === 1 ? d.stripedColor : "#FFFFFF";
      html += `<tr>`;
      (Array.isArray(row) ? row : []).forEach(cell => {
        html += `<td style="background:${bg};color:${d.cellColor};font-size:${d.cellFontSize}px;padding:5px 10px;border:1px solid ${d.borderColor}">${esc(cell)}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
  },

  renderPptx(element, slide, pptx, theme, inherited, bounds) {
    const { x, y, w, h } = bounds;
    const headers = Array.isArray(element.headers) ? element.headers : [];
    const rows = Array.isArray(element.rows) ? element.rows : [];
    const d = getTableDefaults(element, theme);

    const tableRows = [];

    if (headers.length > 0) {
      tableRows.push(headers.map(hdr => ({
        text: String(hdr),
        options: {
          bold: true,
          fontSize: d.headerFontSize,
          color: toPptColor(d.headerColor),
          fill: { color: toPptColor(d.headerBg) },
          fontFace: d.fontFamily
        }
      })));
    }

    rows.forEach(row => {
      if (Array.isArray(row)) {
        tableRows.push(row.map(cell => ({
          text: String(cell),
          options: {
            fontSize: d.cellFontSize,
            color: toPptColor(d.cellColor),
            fontFace: d.fontFamily
          }
        })));
      }
    });

    if (tableRows.length > 0) {
      slide.addTable(tableRows, {
        x, y, w, h,
        border: { pt: 0.5, color: toPptColor(d.borderColor) },
        fontFace: d.fontFamily
      });
    }
  }
});
