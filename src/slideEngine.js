const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/* ── Helpers ─────────────────────────────────────────────────────── */

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pxToInches(px) {
  return sanitizeNumber(px) / 96;
}

function toPptColor(color) {
  if (!color || color === "transparent") return "FFFFFF";
  let hex = String(color).replace("#", "").toUpperCase();
  // Expand 3-digit hex to 6-digit (e.g. "F0A" -> "FF00AA")
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return hex;
}

function mapVAlign(val) {
  if (val === "center" || val === "middle") return "mid";
  if (val === "flex-end" || val === "bottom") return "down";
  return "top";
}

function resolveAlign(element) {
  return element.textAlign || element.align || "left";
}

function resolveFontFamily(element, fallback) {
  return element.fontFamily || element.fontFace || fallback || "Arial";
}

/* ── Normalize ───────────────────────────────────────────────────── */

function normalizeSlideSpec(rawSpec) {
  if (!rawSpec || typeof rawSpec !== "object") {
    throw new Error("Slide JSON must be an object.");
  }

  const page = rawSpec.page || {};
  return {
    title: rawSpec.title || rawSpec.metadata?.title || "Consulting Slide",
    subtitle: rawSpec.subtitle || "",
    width: sanitizeNumber(page.width, DEFAULT_WIDTH),
    height: sanitizeNumber(page.height, DEFAULT_HEIGHT),
    background: page.background || "#FFFFFF",
    elements: Array.isArray(rawSpec.elements) ? rawSpec.elements : [],
    metadata: rawSpec.metadata || {}
  };
}

function getElementText(element) {
  if (element.text != null) return String(element.text);
  if (element.value != null && element.label != null) return `${element.value}\n${element.label}`;
  if (element.value != null) return String(element.value);
  return "";
}

function toCssStyle(style = {}) {
  return Object.entries(style)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
    .join(";");
}
/* ── CSS box (shared by all element renderers) ───────────────────── */

function cssBox(element) {
  const x = sanitizeNumber(element.x);
  const y = sanitizeNumber(element.y);
  const w = sanitizeNumber(element.width, 100);
  const h = sanitizeNumber(element.height, 40);
  const fontSize = sanitizeNumber(element.fontSize, 20);
  const align = resolveAlign(element);
  const fontFamily = resolveFontFamily(element);

  const style = [
    `position:absolute`,
    `left:${x}px`,
    `top:${y}px`,
    `width:${w}px`,
    `height:${h}px`,
    `font-size:${fontSize}px`,
    `font-family:${fontFamily},sans-serif`,
    `font-weight:${element.bold ? "700" : "400"}`,
    `color:${element.color || "#111827"}`,
    `background:${element.background || "transparent"}`,
    `border:${element.border || "none"}`,
    `border-radius:${sanitizeNumber(element.borderRadius, 0)}px`,
    `padding:${sanitizeNumber(element.padding, 4)}px`,
    `line-height:${sanitizeNumber(element.lineHeight, 1.2)}`,
    `text-align:${align}`,
    "display:flex",
    `align-items:${element.verticalAlign || "flex-start"}`,
    `justify-content:${
      align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"
    }`,
    "box-sizing:border-box",
    "overflow:hidden",
    `opacity:${sanitizeNumber(element.opacity, 1)}`
  ];

  if (element.shadow) style.push("box-shadow:0 6px 18px rgba(0,0,0,0.15)");
  if (element.zIndex != null) style.push(`z-index:${sanitizeNumber(element.zIndex, 1)}`);
  if (element.style && typeof element.style === "object") style.push(toCssStyle(element.style));

  return style.join(";");
}

function inferChartSeries(element) {
  if (Array.isArray(element.series) && element.series.length > 0) return element.series;
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const values = Array.isArray(element.values) ? element.values : [];
  return [{ name: element.seriesName || "Series 1", labels, values, color: (element.colors || [])[0] || "#2563EB" }];
}

function buildStackedPercent(element) {
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const series = inferChartSeries(element);
  if (!labels.length || !series.length) return "<div class=\"chart-empty\">Invalid chart data</div>";

  const topLabels = element.barTopLabels?.values || [];
  const showTop = Boolean(element.barTopLabels?.enabled);

  const columns = labels
    .map((label, i) => {
      const stack = series
        .map((serie, sIndex) => {
          const value = sanitizeNumber(serie.values?.[i]);
          const color = serie.color || ["#1F3A5F", "#2F6BFF", "#5BC0EB", "#A855F7"][sIndex % 4];
          return `<div class=\"stack-segment\" title=\"${serie.name}: ${value}%\" style=\"height:${Math.max(value, 0)}%;background:${color}\"></div>`;
        })
        .join("");

      return `<div class=\"stack-col-wrap\">${showTop ? `<div class=\"stack-top-label\">${topLabels[i] || ""}</div>` : ""}<div class=\"stack-col\">${stack}</div><div class=\"stack-x\">${label}</div></div>`;
    })
    .join("");

  const legend = `<div class=\"stack-legend\">${series
    .map((serie, idx) => `<div class=\"legend-item\"><span class=\"swatch\" style=\"background:${serie.color || ["#1F3A5F", "#2F6BFF", "#5BC0EB", "#A855F7"][idx % 4]}\"></span>${serie.name || `Series ${idx + 1}`}</div>`)
    .join("")}</div>`;

  return `<div class=\"chart stacked-percent\"><div class=\"stack-area\">${columns}</div>${legend}</div>`;
}

function buildCartesianChart(element) {
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const series = inferChartSeries(element);
  const type = element.chartType || "bar";

  const allValues = series.flatMap((s) => (Array.isArray(s.values) ? s.values : [])).map((v) => sanitizeNumber(v));
  const max = Math.max(...allValues, 1);

  const bars = labels
    .map((label, i) => {
      const chunks = series
        .map((s, sIdx) => {
          const value = sanitizeNumber(s.values?.[i]);
          const height = Math.max(2, (value / max) * 100);
          const color = s.color || (element.colors || [])[sIdx] || ["#1F3A5F", "#2F6BFF", "#5BC0EB", "#A855F7"][sIdx % 4];
          if (type === "line" || type === "area") return `<div class=\"line-point\" style=\"bottom:${height}%;background:${color}\" title=\"${s.name}: ${value}\"></div>`;
          return `<div class=\"bar\" style=\"height:${height}%;background:${color};width:${90 / Math.max(1, series.length)}%\" title=\"${s.name}: ${value}\"></div>`;
        })
        .join("");
      return `<div class=\"bar-wrap\"><div class=\"bar-group ${type === "line" || type === "area" ? "line-group" : ""}\">${chunks}</div><span>${label}</span></div>`;
    })
    .join("");

  const legend = `<div class=\"stack-legend\">${series
    .map((s, idx) => `<div class=\"legend-item\"><span class=\"swatch\" style=\"background:${s.color || ["#1F3A5F", "#2F6BFF", "#5BC0EB", "#A855F7"][idx % 4]}\"></span>${s.name || `Series ${idx + 1}`}</div>`)
    .join("")}</div>`;

  return `<div class=\"chart cartesian\"><div class=\"chart bars\">${bars}</div>${legend}</div>`;
}

function buildPieChart(element) {
  const series = inferChartSeries(element);
  const values = series[0]?.values || element.values || [];
  const labels = series[0]?.labels || element.labels || [];
  const total = values.reduce((a, b) => a + sanitizeNumber(b), 0) || 1;

  let current = 0;
  const segments = values
    .map((v, i) => {
      const pct = (sanitizeNumber(v) / total) * 100;
      const start = current;
      current += pct;
      const color = (element.colors && element.colors[i]) || series[i]?.color || ["#1F3A5F", "#2F6BFF", "#5BC0EB", "#A855F7"][i % 4];
      return `${color} ${start}% ${current}%`;
    })
    .join(",");

  const legend = `<div class=\"stack-legend\">${values
    .map((v, i) => `<div class=\"legend-item\"><span class=\"swatch\" style=\"background:${(element.colors && element.colors[i]) || ["#1F3A5F", "#2F6BFF", "#5BC0EB", "#A855F7"][i % 4]}\"></span>${labels[i] || `Slice ${i + 1}`}</div>`)
    .join("")}</div>`;

  return `<div class=\"chart pie-wrap\"><div class=\"chart pie\" style=\"background:conic-gradient(${segments})\"></div>${legend}</div>`;
}

function buildChartHtml(element) {
  const type = element.chartType || "bar";
  if (type === "stackedBarPercent") return buildStackedPercent(element);
  if (type === "pie" || type === "donut") return buildPieChart(element);
  return buildCartesianChart(element);
}

function buildTableHtml(element) {
  const headers = Array.isArray(element.headers) ? element.headers : [];
  const rows = Array.isArray(element.rows) ? element.rows : [];
  return `<div class=\"table-wrap\"><table class=\"dyn-table\"><thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${(Array.isArray(r) ? r : []).map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}
/* ── Chart HTML builders ─────────────────────────────────────────── */

function normalizeSeries(element) {
  if (Array.isArray(element.series)) return element.series;
  if (Array.isArray(element.values)) {
    return [{
      name: element.seriesName || "Series",
      values: element.values,
      color: null
    }];
  }
  return [];
}

function getSeriesColor(series, index, fallbackPalette) {
  if (series.color) return series.color;
  return fallbackPalette[index % fallbackPalette.length];
}

const DEFAULT_PALETTE = [
  "#1F3A5F", "#2F6BFF", "#5BC0EB", "#FF6B6B", "#FFD93D",
  "#6BCB77", "#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C"
];

function buildLegendHtml(seriesList, element) {
  const legend = element.legend;
  if (!legend && seriesList.length <= 1) return "";
  const fontSize = (legend && legend.fontSize) || 11;
  const color = (legend && legend.color) || "#444444";
  const fontFamily = (legend && legend.fontFamily) || resolveFontFamily(element);

  const items = seriesList.map((s, i) => {
    const c = getSeriesColor(s, i, DEFAULT_PALETTE);
    return `<span style="display:inline-flex;align-items:center;margin-right:14px;font-size:${fontSize}px;color:${color};font-family:${fontFamily},sans-serif"><span style="width:12px;height:12px;background:${c};border-radius:2px;display:inline-block;margin-right:5px"></span>${escapeHtml(s.name)}</span>`;
  }).join("");

  return `<div class="chart-legend">${items}</div>`;
}

function buildAxisLabelsHtml(labels, element) {
  const cfg = element.axisLabel || {};
  const fontSize = cfg.fontSize || 11;
  const color = cfg.color || "#777777";
  const fontFamily = cfg.fontFamily || resolveFontFamily(element);

  return labels.map(l =>
    `<span style="font-size:${fontSize}px;color:${color};font-family:${fontFamily},sans-serif">${escapeHtml(l)}</span>`
  ).join("");
}

function buildBarTopLabelsHtml(element) {
  const cfg = element.barTopLabels;
  if (!cfg || !cfg.enabled) return null;
  const fontSize = cfg.fontSize || 10;
  const color = cfg.color || "#444444";
  const fontFamily = cfg.fontFamily || resolveFontFamily(element);
  return (cfg.values || []).map(v =>
    `<span style="font-size:${fontSize}px;color:${color};font-family:${fontFamily},sans-serif;text-align:center">${escapeHtml(v)}</span>`
  );
}

function buildGridLinesStyle(element) {
  const cfg = element.gridLines;
  if (!cfg) return "";
  const color = cfg.color || "#E5E7EB";
  const style = cfg.style === "dashed" ? "dashed" : "solid";
  return `border-color:${color};border-style:${style}`;
}

/* Bar chart (simple, single series) */
function buildSimpleBarHtml(element) {
  const series = normalizeSeries(element);
  const allValues = series.flatMap(s => s.values);
  const max = Math.max(...allValues, 1);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const colors = Array.isArray(element.colors) ? element.colors : null;
  const s = series[0] || { values: [], color: "#2563EB" };

  const gridStyle = buildGridLinesStyle(element);
  const topLabels = buildBarTopLabelsHtml(element);

  const bars = s.values.map((value, i) => {
    const height = Math.max(4, Math.round((value / max) * 100));
    const color = (colors && colors[i]) || s.color || "#2563EB";
    const label = labels[i] || `S${i + 1}`;
    const topLabel = topLabels ? `<span class="bar-top-label">${topLabels[i] || ""}</span>` : "";
    return `<div class="bar-wrap"><div class="bar" style="height:${height}%;background:${color}">${topLabel}</div><span>${escapeHtml(label)}</span></div>`;
  }).join("");

  return `<div class="chart bars" ${gridStyle ? `style="${gridStyle}"` : ""}>${bars}</div>${buildLegendHtml(series, element)}`;
}

/* Pie chart */
function buildPieHtml(element) {
  const series = normalizeSeries(element);
  const values = series[0] ? series[0].values : [];
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let current = 0;

  const segments = values.map((value, i) => {
    const percentage = (value / total) * 100;
    const start = current;
    current += percentage;
    const color = (element.colors && element.colors[i]) || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
    return `${color} ${start}% ${current}%`;
  }).join(", ");

  const legendSeries = values.map((v, i) => ({
    name: labels[i] || `Slice ${i + 1}`,
    color: (element.colors && element.colors[i]) || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]
  }));

  return `<div class="chart-pie-container"><div class="chart pie" style="background:conic-gradient(${segments})"></div></div>${buildLegendHtml(legendSeries, element)}`;
}

/* Stacked bar percent chart */
function buildStackedBarPercentHtml(element) {
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const numBars = labels.length;
  const topLabels = buildBarTopLabelsHtml(element);
  const gridCfg = element.gridLines || {};
  const gridColor = gridCfg.color || "#E5E7EB";
  const gridStyle = gridCfg.style === "dashed" ? "dashed" : "solid";

  const axisCfg = element.axisLabel || {};
  const axisFontSize = axisCfg.fontSize || 11;
  const axisColor = axisCfg.color || "#777777";
  const axisFontFamily = axisCfg.fontFamily || resolveFontFamily(element);

  let barsHtml = "";
  for (let i = 0; i < numBars; i++) {
    let total = 0;
    series.forEach(s => { total += (s.values[i] || 0); });

    let segments = "";
    series.forEach((s, si) => {
      const val = s.values[i] || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      const color = getSeriesColor(s, si, DEFAULT_PALETTE);
      segments += `<div class="stacked-segment" style="height:${pct}%;background:${color}" title="${escapeHtml(s.name)}: ${val}%"></div>`;
    });

    const topLabel = topLabels ? `<div class="bar-top-label">${topLabels[i] || ""}</div>` : "";
    const axisLabel = `<span style="font-size:${axisFontSize}px;color:${axisColor};font-family:${axisFontFamily},sans-serif">${escapeHtml(labels[i] || "")}</span>`;

    barsHtml += `<div class="stacked-bar-wrap">${topLabel}<div class="stacked-bar-col">${segments}</div>${axisLabel}</div>`;
  }

  // Grid lines (horizontal at 25%, 50%, 75%)
  const gridHtml = `<div class="stacked-grid">
    <div class="grid-line" style="bottom:25%;border-bottom:1px ${gridStyle} ${gridColor}"><span class="grid-label" style="font-size:9px;color:${axisColor}">25%</span></div>
    <div class="grid-line" style="bottom:50%;border-bottom:1px ${gridStyle} ${gridColor}"><span class="grid-label" style="font-size:9px;color:${axisColor}">50%</span></div>
    <div class="grid-line" style="bottom:75%;border-bottom:1px ${gridStyle} ${gridColor}"><span class="grid-label" style="font-size:9px;color:${axisColor}">75%</span></div>
  </div>`;

  return `<div class="chart stacked-percent">${gridHtml}<div class="stacked-bars-row">${barsHtml}</div></div>${buildLegendHtml(series, element)}`;
}

/* Stacked bar (absolute values) */
function buildStackedBarHtml(element) {
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const numBars = labels.length;
  const topLabels = buildBarTopLabelsHtml(element);

  // Find max total across bars for scaling
  let maxTotal = 1;
  for (let i = 0; i < numBars; i++) {
    let total = 0;
    series.forEach(s => { total += (s.values[i] || 0); });
    if (total > maxTotal) maxTotal = total;
  }

  const axisCfg = element.axisLabel || {};
  const axisFontSize = axisCfg.fontSize || 11;
  const axisColor = axisCfg.color || "#777777";
  const axisFontFamily = axisCfg.fontFamily || resolveFontFamily(element);

  let barsHtml = "";
  for (let i = 0; i < numBars; i++) {
    let total = 0;
    series.forEach(s => { total += (s.values[i] || 0); });
    const barHeight = Math.max(4, Math.round((total / maxTotal) * 100));

    let segments = "";
    series.forEach((s, si) => {
      const val = s.values[i] || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      const color = getSeriesColor(s, si, DEFAULT_PALETTE);
      segments += `<div class="stacked-segment" style="height:${pct}%;background:${color}" title="${escapeHtml(s.name)}: ${val}"></div>`;
    });

    const topLabel = topLabels ? `<div class="bar-top-label">${topLabels[i] || ""}</div>` : "";
    const axisLabel = `<span style="font-size:${axisFontSize}px;color:${axisColor};font-family:${axisFontFamily},sans-serif">${escapeHtml(labels[i] || "")}</span>`;

    barsHtml += `<div class="stacked-bar-wrap"><div class="stacked-bar-col" style="height:${barHeight}%">${topLabel}${segments}</div>${axisLabel}</div>`;
  }

  return `<div class="chart stacked-abs"><div class="stacked-bars-row">${barsHtml}</div></div>${buildLegendHtml(series, element)}`;
}

/* Grouped bar chart */
function buildGroupedBarHtml(element) {
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const numGroups = labels.length;
  const allValues = series.flatMap(s => s.values);
  const max = Math.max(...allValues, 1);

  const axisCfg = element.axisLabel || {};
  const axisFontSize = axisCfg.fontSize || 11;
  const axisColor = axisCfg.color || "#777777";
  const axisFontFamily = axisCfg.fontFamily || resolveFontFamily(element);

  let groupsHtml = "";
  for (let i = 0; i < numGroups; i++) {
    let barsInGroup = "";
    series.forEach((s, si) => {
      const val = s.values[i] || 0;
      const height = Math.max(2, Math.round((val / max) * 100));
      const color = getSeriesColor(s, si, DEFAULT_PALETTE);
      barsInGroup += `<div class="grouped-bar" style="height:${height}%;background:${color}" title="${escapeHtml(s.name)}: ${val}"></div>`;
    });
    const axisLabel = `<span style="font-size:${axisFontSize}px;color:${axisColor};font-family:${axisFontFamily},sans-serif">${escapeHtml(labels[i] || "")}</span>`;
    groupsHtml += `<div class="grouped-bar-wrap"><div class="grouped-bar-group">${barsInGroup}</div>${axisLabel}</div>`;
  }

  return `<div class="chart grouped-bars">${groupsHtml}</div>${buildLegendHtml(series, element)}`;
}

/* Line chart */
function buildLineHtml(element) {
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const allValues = series.flatMap(s => s.values);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const axisCfg = element.axisLabel || {};
  const axisFontSize = axisCfg.fontSize || 11;
  const axisColor = axisCfg.color || "#777777";
  const axisFontFamily = axisCfg.fontFamily || resolveFontFamily(element);

  const numPoints = labels.length || (series[0] ? series[0].values.length : 0);
  const svgWidth = 100;
  const svgHeight = 60;
  const padX = 2;
  const padY = 4;

  let paths = "";
  series.forEach((s, si) => {
    const color = getSeriesColor(s, si, DEFAULT_PALETTE);
    const points = s.values.map((v, i) => {
      const x = padX + (i / Math.max(numPoints - 1, 1)) * (svgWidth - 2 * padX);
      const y = padY + (1 - (v - min) / range) * (svgHeight - 2 * padY);
      return `${x},${y}`;
    });
    paths += `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`;
    // dots
    s.values.forEach((v, i) => {
      const x = padX + (i / Math.max(numPoints - 1, 1)) * (svgWidth - 2 * padX);
      const y = padY + (1 - (v - min) / range) * (svgHeight - 2 * padY);
      paths += `<circle cx="${x}" cy="${y}" r="1.5" fill="${color}"/>`;
    });
  });

  const axisLabelsHtml = labels.map(l =>
    `<span style="font-size:${axisFontSize}px;color:${axisColor};font-family:${axisFontFamily},sans-serif">${escapeHtml(l)}</span>`
  ).join("");

  return `<div class="chart line-chart"><svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" class="line-svg">${paths}</svg><div class="line-axis-labels">${axisLabelsHtml}</div></div>${buildLegendHtml(series, element)}`;
}

/* Waterfall chart */
function buildWaterfallHtml(element) {
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const values = series[0] ? series[0].values : [];
  const isTotal = Array.isArray(element.isTotal) ? element.isTotal : [];

  let cumulative = 0;
  const segments = values.map((v, i) => {
    const wasTotal = isTotal[i];
    const start = wasTotal ? 0 : cumulative;
    cumulative = wasTotal ? v : cumulative + v;
    return { value: v, start, end: cumulative, isTotal: wasTotal };
  });

  const maxVal = Math.max(...segments.map(s => Math.max(Math.abs(s.start), Math.abs(s.end))), 1);
  const scale = maxVal * 1.15;

  const axisCfg = element.axisLabel || {};
  const axisFontSize = axisCfg.fontSize || 11;
  const axisColor = axisCfg.color || "#777777";

  let barsHtml = "";
  segments.forEach((seg, i) => {
    const bottom = (Math.min(seg.start, seg.end) / scale) * 100;
    const height = (Math.abs(seg.end - seg.start) / scale) * 100;
    const color = seg.isTotal ? "#1F3A5F" : (seg.value >= 0 ? "#6BCB77" : "#FF6B6B");
    const label = labels[i] || "";
    barsHtml += `<div class="waterfall-wrap"><div class="waterfall-bar" style="bottom:${Math.max(0, bottom)}%;height:${Math.max(2, height)}%;background:${color}"></div><span style="font-size:${axisFontSize}px;color:${axisColor}">${escapeHtml(label)}</span></div>`;
  });

  return `<div class="chart waterfall-chart">${barsHtml}</div>${buildLegendHtml(series, element)}`;
}

/* Donut chart */
function buildDonutHtml(element) {
  const series = normalizeSeries(element);
  const values = series[0] ? series[0].values : [];
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let current = 0;

  const segments = values.map((value, i) => {
    const percentage = (value / total) * 100;
    const start = current;
    current += percentage;
    const color = (element.colors && element.colors[i]) || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
    return `${color} ${start}% ${current}%`;
  }).join(", ");

  const legendSeries = values.map((v, i) => ({
    name: labels[i] || `Slice ${i + 1}`,
    color: (element.colors && element.colors[i]) || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]
  }));

  const centerLabel = element.centerLabel || "";
  const centerValue = element.centerValue || "";

  return `<div class="chart-pie-container"><div class="chart donut" style="background:conic-gradient(${segments})"><div class="donut-hole"><div class="donut-value">${escapeHtml(centerValue)}</div><div class="donut-label">${escapeHtml(centerLabel)}</div></div></div></div>${buildLegendHtml(legendSeries, element)}`;
}

/* Chart dispatcher */
function buildChartHtml(element) {
  const chartType = element.chartType || "bar";

  switch (chartType) {
    case "pie": return buildPieHtml(element);
    case "donut": return buildDonutHtml(element);
    case "stackedBarPercent": return buildStackedBarPercentHtml(element);
    case "stackedBar": return buildStackedBarHtml(element);
    case "groupedBar": return buildGroupedBarHtml(element);
    case "line": return buildLineHtml(element);
    case "waterfall": return buildWaterfallHtml(element);
    case "bar":
    default:
      return buildSimpleBarHtml(element);
  }
}

/* ── Element HTML renderers ──────────────────────────────────────── */

function renderElement(element) {
  const type = element.type || "text";
  const style = cssBox(element);

  if (type === "group") {
    const children = (element.children || []).map((child) => renderElement(child)).join("\n");
    return `<div class=\"element group\" style=\"${style};position:absolute\">${children}</div>`;
  }

  if (type === "chart") return `<div class=\"element\" style=\"${style}\">${buildChartHtml(element)}</div>`;
  if (type === "table") return `<div class=\"element\" style=\"${style}\">${buildTableHtml(element)}</div>`;
  if (type === "image") return `<img class=\"element\" style=\"${style};object-fit:${element.fit || "contain"}\" src=\"${element.src || ""}\" alt=\"${element.alt || "image"}\"/>`;

  if (type === "kpi") {
    return `<div class=\"element kpi\" style=\"${style}\"><div class=\"kpi-value\">${element.value ?? "--"}</div><div class=\"kpi-label\">${element.label || "KPI"}</div></div>`;
  }

  if (type === "callout") {
    return `<div class=\"element callout\" style=\"${style}\"><div class=\"callout-value\" style=\"font-size:${sanitizeNumber(element.valueFontSize, 24)}px;color:${element.valueColor || "#111827"};font-weight:${element.valueBold ? 700 : 600};\">${element.value || ""}</div><div class=\"callout-label\" style=\"font-size:${sanitizeNumber(element.labelFontSize, 11)}px;color:${element.labelColor || "#334155"};\">${element.label || ""}</div></div>`;
  }

  if (type === "divider" || type === "line") {
    return `<div class=\"element divider\" style=\"${style};background:${element.color || "#CBD5E1"};padding:0;border:0\"></div>`;
  }

  if (type === "shape") {
    return `<div class=\"element shape\" style=\"${style};background:${element.fill || element.background || "#E2E8F0"};border:${element.border || "none"}\"></div>`;
  }

  return `<div class=\"element\" style=\"${style}\">${getElementText(element)}</div>`;
}

function renderSlideHtml(spec) {
  const slide = normalizeSlideSpec(spec);
  const elements = slide.elements.map((element) => renderElement(element)).join("\n");
  return `<div class=\"slide\" style=\"width:${slide.width}px;height:${slide.height}px;background:${slide.background};\">${elements}</div>`;
}

function addTextBox(slide, element, x, y, w, h) {
  if (element.background || element.border || element.type === "shape") {
    slide.addShape("roundRect", {
      x,
      y,
      w,
      h,
      fill: { color: toPptColor(element.fill || element.background || "transparent") },
      line: {
        color: toPptColor(element.borderColor || "#CBD5E1"),
        pt: sanitizeNumber(element.borderWidth, element.border ? 1 : 0)
      },
      radius: sanitizeNumber(element.borderRadius, 0) / 72
    });
  }

  const text = getElementText(element);
  if (text) {
    slide.addText(String(text), {
      x,
      y,
      w,
      h,
      bold: Boolean(element.bold || element.valueBold),
      fontSize: sanitizeNumber(element.fontSize || element.valueFontSize, 18),
      color: toPptColor(element.color || element.valueColor || "#111827"),
      align: element.textAlign || element.align || "left",
      valign: mapVAlign(element.verticalAlign),
      fontFace: element.fontFamily || "Arial"
    });
  }
}

function toPptxSlide(slideSpec, slide) {
  switch (type) {
    case "chart":
      return `<div class="element chart-container" style="${style}">${buildChartHtml(element)}</div>`;

    case "kpi":
      return `<div class="element kpi" style="${style}"><div class="kpi-value" style="color:${element.color || "#1E3A8A"}">${escapeHtml(element.value ?? "--")}</div><div class="kpi-label">${escapeHtml(element.label || "KPI")}</div></div>`;

    case "callout": {
      const valueFontSize = sanitizeNumber(element.valueFontSize, 24);
      const valueColor = element.valueColor || element.color || "#1E3A8A";
      const valueBold = element.valueBold !== false ? "700" : "400";
      const labelFontSize = sanitizeNumber(element.labelFontSize, 11);
      const labelColor = element.labelColor || "#444444";
      const fontFamily = resolveFontFamily(element);
      return `<div class="element callout" style="${style}">
        <div class="callout-value" style="font-size:${valueFontSize}px;color:${valueColor};font-weight:${valueBold};font-family:${fontFamily},sans-serif">${escapeHtml(element.value ?? "--")}</div>
        <div class="callout-label" style="font-size:${labelFontSize}px;color:${labelColor};font-family:${fontFamily},sans-serif">${escapeHtml(element.label || "")}</div>
      </div>`;
    }

    case "divider": {
      const divColor = element.color || "#CBD5E1";
      const opacity = element.opacity !== undefined ? element.opacity : 1;
      return `<div class="element divider-el" style="${style};background:${divColor};opacity:${opacity};padding:0"></div>`;
    }

    case "image": {
      const src = element.src || "";
      const fit = element.fit || "contain";
      return `<div class="element" style="${style}"><img src="${escapeHtml(src)}" style="width:100%;height:100%;object-fit:${fit}" alt="${escapeHtml(element.alt || "")}"/></div>`;
    }

    case "shape": {
      const shapeColor = element.fill || element.background || "#E5E7EB";
      const borderColor = element.strokeColor || "transparent";
      const borderWidth = sanitizeNumber(element.strokeWidth, 0);
      const shapeType = element.shape || "rect";
      const extraRadius = shapeType === "circle" || shapeType === "ellipse" ? "border-radius:50%;" : "";
      return `<div class="element" style="${style};background:${shapeColor};border:${borderWidth}px solid ${borderColor};${extraRadius}padding:0"></div>`;
    }

    case "table": {
      return `<div class="element table-container" style="${style}">${buildTableHtml(element)}</div>`;
    }

    default: // "text"
      return `<div class="element" style="${style}">${escapeHtml(element.text || "")}</div>`;
  }
}

/* ── Table HTML builder ──────────────────────────────────────────── */

function buildTableHtml(element) {
  const headers = Array.isArray(element.headers) ? element.headers : [];
  const rows = Array.isArray(element.rows) ? element.rows : [];
  const headerBg = element.headerBackground || "#1F3A5F";
  const headerColor = element.headerColor || "#FFFFFF";
  const headerFontSize = sanitizeNumber(element.headerFontSize, 12);
  const cellFontSize = sanitizeNumber(element.cellFontSize, 11);
  const cellColor = element.cellColor || "#333333";
  const stripedColor = element.stripedColor || "#F8FAFC";
  const borderColor = element.tableBorderColor || "#E5E7EB";
  const fontFamily = resolveFontFamily(element);

  let html = `<table class="slide-table" style="width:100%;border-collapse:collapse;font-family:${fontFamily},sans-serif">`;

  if (headers.length > 0) {
    html += `<thead><tr>`;
    headers.forEach(h => {
      html += `<th style="background:${headerBg};color:${headerColor};font-size:${headerFontSize}px;padding:6px 10px;text-align:left;border:1px solid ${borderColor}">${escapeHtml(h)}</th>`;
    });
    html += `</tr></thead>`;
  }

  html += `<tbody>`;
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 1 ? stripedColor : "#FFFFFF";
    html += `<tr>`;
    (Array.isArray(row) ? row : []).forEach(cell => {
      html += `<td style="background:${bg};color:${cellColor};font-size:${cellFontSize}px;padding:5px 10px;border:1px solid ${borderColor}">${escapeHtml(cell)}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* ── Render full slide HTML ──────────────────────────────────────── */

function renderSlideHtml(spec) {
  const slide = normalizeSlideSpec(spec);
  const elements = slide.elements.map(el => renderElement(el)).join("\n");

  return `
  <div class="slide" style="width:${slide.width}px;height:${slide.height}px;background:${slide.background};position:relative;">
    ${elements}
  </div>`;
}

/* ── PPTX export ─────────────────────────────────────────────────── */

function toPptxSlide(slideSpec, slide, pptx) {
  const ShapeType = pptx ? pptx.ShapeType : {};
  const ChartType = pptx ? pptx.ChartType : {};

  slide.background = { color: toPptColor(slideSpec.background || "#FFFFFF") };

  (slideSpec.elements || []).forEach((element) => {
    const x = pxToInches(sanitizeNumber(element.x));
    const y = pxToInches(sanitizeNumber(element.y));
    const w = pxToInches(sanitizeNumber(element.width, 200));
    const h = pxToInches(sanitizeNumber(element.height, 60));

    if (element.type === "divider" || element.type === "line") {
      slide.addShape("rect", {
        x,
        y,
        w,
        h: Math.max(h, 0.01),
        line: { pt: 0, color: toPptColor(element.color || "#CBD5E1") },
        fill: { color: toPptColor(element.color || "#CBD5E1"), transparency: 100 - sanitizeNumber(element.opacity, 1) * 100 }
      });
      return;
    }

    const fontFamily = resolveFontFamily(element, "Aptos");

    const type = element.type || "text";

    /* ── Charts ──────────────────────────────────────────────── */
    if (type === "chart") {
      const chartType = element.chartType || "bar";
      const series = normalizeSeries(element);
      const labels = Array.isArray(element.labels) ? element.labels : [];

      const chartData = series.map(s => ({
        name: s.name || "Series",
        labels,
        values: s.values || []
      }));

      const typeMap = {
        bar: ChartType.bar,
        line: ChartType.line,
        pie: ChartType.pie,
        donut: ChartType.doughnut,
        stackedBar: ChartType.bar,
        stackedBarPercent: ChartType.bar,
        groupedBar: ChartType.bar,
        waterfall: ChartType.bar
      };

      const chartColors = series.map((s, i) => toPptColor(getSeriesColor(s, i, DEFAULT_PALETTE)));

      const opts = {
        x, y, w, h,
        showLegend: series.length > 1,
        catAxisLabelRotate: 0,
        fontFace: fontFamily,
        chartColors
      };

      if (chartType === "stackedBarPercent") {
        opts.barGrouping = "percentStacked";
      } else if (chartType === "stackedBar") {
        opts.barGrouping = "stacked";
      } else if (chartType === "groupedBar") {
        opts.barGrouping = "clustered";
      }

      slide.addChart(typeMap[chartType] || ChartType.bar, chartData, opts);
      return;
    }

    /* ── KPI ──────────────────────────────────────────────────── */
    if (type === "kpi") {
      slide.addShape(ShapeType.roundRect, {
        x, y, w, h,
        radius: 0.08,
        fill: { color: toPptColor(element.background || "#EEF2FF") },
        line: { color: toPptColor("#C7D2FE"), pt: 1 }
      });
      slide.addText(String(element.value ?? "--"), {
        x: x + 0.1, y: y + 0.05, w: w - 0.2, h: h * 0.55,
        bold: true,
        fontSize: sanitizeNumber(element.valueSize || element.valueFontSize, 24),
        color: toPptColor(element.color || "#1E3A8A"),
        align: resolveAlign(element),
        fontFace: fontFamily
      });
      slide.addText(String(element.label || "KPI"), {
        x: x + 0.1, y: y + h * 0.55, w: w - 0.2, h: h * 0.35,
        fontSize: sanitizeNumber(element.fontSize || element.labelFontSize, 12),
        color: toPptColor(element.subColor || element.labelColor || "#475569"),
        align: resolveAlign(element),
        fontFace: fontFamily
      });
      return;
    }

    if (element.type === "image" && element.src) {
      slide.addImage({ path: element.src, x, y, w, h });
      return;
    }

    if (element.type === "chart") {
      const chartType = element.chartType || "bar";

      if (chartType === "stackedBarPercent") {
        const labels = Array.isArray(element.labels) ? element.labels : [];
        const data = inferChartSeries(element).map((serie, idx) => ({
          name: serie.name || `Series ${idx + 1}`,
          labels,
          values: Array.isArray(serie.values) ? serie.values.map((v) => sanitizeNumber(v)) : []
        }));

        slide.addChart("bar", data, {
          x,
          y,
          w,
          h,
          barDir: "col",
          barGrouping: "stacked",
          showLegend: true,
          legendPos: (element.legend?.position || "bottom").toLowerCase(),
          valAxisMinVal: 0,
          valAxisMaxVal: 100,
          valAxisMajorUnit: 20,
          showValue: false,
          chartColors: inferChartSeries(element).map((s) => toPptColor(s.color || "#3B82F6")),
          fontFace: element.fontFamily || "Arial"
        });
        return;
      }

      if (chartType === "pie" || chartType === "donut") {
        const labels = Array.isArray(element.labels) ? element.labels : [];
        const values = Array.isArray(element.values) ? element.values : inferChartSeries(element)[0]?.values || [];
        slide.addChart("pie", [{ name: element.seriesName || "Series", labels, values }], {
          x,
          y,
          w,
          h,
          chartColors: (element.colors || []).map(toPptColor),
          fontFace: element.fontFamily || "Arial",
          showLegend: true
        });
        return;
      }

      const labels = Array.isArray(element.labels) ? element.labels : [];
      const series = inferChartSeries(element);
      const data = series.map((serie, idx) => ({
        name: serie.name || `Series ${idx + 1}`,
        labels,
        values: Array.isArray(serie.values) ? serie.values : []
      }));
      const typeMap = { bar: "bar", line: "line", area: "area", scatter: "scatter" };
      slide.addChart(typeMap[chartType] || "bar", data, {
        x,
        y,
        w,
        h,
        showLegend: true,
        fontFace: element.fontFamily || "Arial",
        chartColors: series.map((s) => toPptColor(s.color || "#2563EB"))
      });
      return;
    }

    /* ── Callout ──────────────────────────────────────────────── */
    if (type === "callout") {
      slide.addShape(ShapeType.roundRect, {
        x, y, w, h,
        radius: sanitizeNumber(element.borderRadius, 6) / 72,
        fill: { color: toPptColor(element.background || "#F0F0F0") },
        line: { pt: 0 }
      });
      slide.addText(String(element.value ?? "--"), {
        x: x + 0.1, y: y + 0.05, w: w - 0.2, h: h * 0.5,
        bold: element.valueBold !== false,
        fontSize: sanitizeNumber(element.valueFontSize, 24),
        color: toPptColor(element.valueColor || element.color || "#1E3A8A"),
        align: resolveAlign(element),
        fontFace: fontFamily
      });
      slide.addText(String(element.label || ""), {
        x: x + 0.1, y: y + h * 0.45, w: w - 0.2, h: h * 0.45,
        fontSize: sanitizeNumber(element.labelFontSize, 11),
        color: toPptColor(element.labelColor || "#444444"),
        align: resolveAlign(element),
        fontFace: fontFamily
      });
      return;
    }

    /* ── Divider ──────────────────────────────────────────────── */
    if (type === "divider") {
      slide.addShape(ShapeType.rect, {
        x, y, w, h,
        fill: { color: toPptColor(element.color || "#CBD5E1") },
        line: { pt: 0 }
      });
      return;
    }

    /* ── Table ────────────────────────────────────────────────── */
    if (type === "table") {
      const headers = Array.isArray(element.headers) ? element.headers : [];
      const rows = Array.isArray(element.rows) ? element.rows : [];
      const tableRows = [];
      if (headers.length > 0) {
        tableRows.push(headers.map(hdr => ({
          text: String(hdr),
          options: {
            bold: true,
            fontSize: sanitizeNumber(element.headerFontSize, 12),
            color: toPptColor(element.headerColor || "#FFFFFF"),
            fill: { color: toPptColor(element.headerBackground || "#1F3A5F") },
            fontFace: fontFamily
          }
        })));
      }
      rows.forEach(row => {
        if (Array.isArray(row)) {
          tableRows.push(row.map(cell => ({
            text: String(cell),
            options: {
              fontSize: sanitizeNumber(element.cellFontSize, 11),
              color: toPptColor(element.cellColor || "#333333"),
              fontFace: fontFamily
            }
          })));
        }
      });
      if (tableRows.length > 0) {
        slide.addTable(tableRows, {
          x, y, w, h,
          border: { pt: 0.5, color: toPptColor(element.tableBorderColor || "#E5E7EB") },
          fontFace: fontFamily
        });
      }
      return;
    }

    /* ── Shape ────────────────────────────────────────────────── */
    if (type === "shape") {
      const resolvedShape = element.shape === "circle" || element.shape === "ellipse"
        ? ShapeType.ellipse
        : ShapeType.roundRect;
      slide.addShape(resolvedShape, {
        x, y, w, h,
        fill: { color: toPptColor(element.fill || element.background || "#E5E7EB") },
        line: {
          color: toPptColor(element.strokeColor || "transparent"),
          pt: sanitizeNumber(element.strokeWidth, 0)
        },
        radius: sanitizeNumber(element.borderRadius, 0) / 72
      });
      return;
    }

    if (element.type === "table") {
      const rows = [];
      if (Array.isArray(element.headers) && element.headers.length) rows.push(element.headers);
      if (Array.isArray(element.rows)) rows.push(...element.rows);
      slide.addTable(rows, {
        x,
        y,
        w,
        h,
        fontFace: element.fontFamily || "Arial",
        fontSize: sanitizeNumber(element.fontSize, 10),
        border: { type: "solid", color: "D1D5DB", pt: 1 }
      });
      return;
    }

    addTextBox(slide, element, x, y, w, h);
  });
}

module.exports = {
  normalizeSlideSpec,
  renderSlideHtml,
  toPptxSlide,
  pxToInches
};
