/**
 * Chart element — all chart types with multi-series support.
 *
 * Supported chartTypes:
 *   bar, pie, donut, stackedBar, stackedBarPercent,
 *   groupedBar, line, area, waterfall, scatter, combo
 */

const { register } = require("../../engine/registry");
const { resolveColor } = require("../../engine/theme");
const { sanitizeNumber } = require("../../engine/layout");
const { toPptColor } = require("../pptx");

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── Shared helpers ──────────────────────────────────────────────── */

function normalizeSeries(element) {
  if (Array.isArray(element.series)) return element.series;
  if (Array.isArray(element.values)) {
    return [{ name: element.seriesName || "Series", values: element.values, color: null }];
  }
  return [];
}

function getChartPalette(theme) {
  return (theme.chart && theme.chart.palette) || [
    "#1F3A5F", "#2F6BFF", "#5BC0EB", "#FF6B6B", "#FFD93D",
    "#6BCB77", "#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C"
  ];
}

function seriesColor(s, idx, palette) {
  return s.color || palette[idx % palette.length];
}

function buildLegendHtml(seriesList, element, theme) {
  const palette = getChartPalette(theme);
  const legend = element.legend;
  if (!legend && seriesList.length <= 1) return "";
  const fontSize = (legend && legend.fontSize) || (theme.chart && theme.chart.legendFontSize) || 11;
  const color = (legend && legend.color) || "#444444";
  const fontFamily = (legend && legend.fontFamily) || element.fontFamily || theme.fontFamily || "Arial";

  const items = seriesList.map((s, i) => {
    const c = seriesColor(s, i, palette);
    return `<span style="display:inline-flex;align-items:center;margin-right:14px;font-size:${fontSize}px;color:${color};font-family:${fontFamily},sans-serif"><span style="width:12px;height:12px;background:${c};border-radius:2px;display:inline-block;margin-right:5px"></span>${esc(s.name || "")}</span>`;
  }).join("");

  return `<div class="chart-legend">${items}</div>`;
}

function barTopLabels(element) {
  const cfg = element.barTopLabels;
  if (!cfg || !cfg.enabled) return null;
  return (cfg.values || []).map(v => {
    const fontSize = cfg.fontSize || 10;
    const color = cfg.color || "#444444";
    const fontFamily = cfg.fontFamily || element.fontFamily || "Arial";
    return `<span style="font-size:${fontSize}px;color:${color};font-family:${fontFamily},sans-serif;text-align:center;white-space:nowrap">${esc(v)}</span>`;
  });
}

function axisConfig(element, theme) {
  const cfg = element.axisLabel || {};
  return {
    fontSize: cfg.fontSize || (theme.chart && theme.chart.axisFontSize) || 11,
    color: cfg.color || (theme.chart && theme.chart.axisColor) || "#777777",
    fontFamily: cfg.fontFamily || element.fontFamily || theme.fontFamily || "Arial"
  };
}

function gridConfig(element, theme) {
  const cfg = element.gridLines || {};
  return {
    color: cfg.color || (theme.chart && theme.chart.gridColor) || "#E5E7EB",
    style: cfg.style === "dashed" ? "dashed" : "solid"
  };
}

/* ── Bar chart (simple) ──────────────────────────────────────────── */

function barHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const s = series[0] || { values: [], color: "#2563EB" };
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const colors = Array.isArray(element.colors) ? element.colors : null;
  const max = Math.max(...s.values, 1);
  const tops = barTopLabels(element);
  const ax = axisConfig(element, theme);

  const bars = s.values.map((value, i) => {
    const height = Math.max(4, Math.round((value / max) * 100));
    const color = (colors && colors[i]) || seriesColor(s, 0, palette);
    const label = labels[i] || "";
    const topLabel = tops ? `<span class="bar-top-label">${tops[i] || ""}</span>` : "";
    return `<div class="bar-wrap"><div class="bar" style="height:${height}%;background:${color}">${topLabel}</div><span style="font-size:${ax.fontSize}px;color:${ax.color};font-family:${ax.fontFamily},sans-serif">${esc(label)}</span></div>`;
  }).join("");

  return `<div class="chart bars">${bars}</div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Pie chart ───────────────────────────────────────────────────── */

function pieHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const values = series[0] ? series[0].values : [];
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let current = 0;

  const segments = values.map((value, i) => {
    const pct = (value / total) * 100;
    const start = current;
    current += pct;
    const color = (element.colors && element.colors[i]) || palette[i % palette.length];
    return `${color} ${start}% ${current}%`;
  }).join(", ");

  const legendSeries = values.map((v, i) => ({
    name: labels[i] || `Slice ${i + 1}`,
    color: (element.colors && element.colors[i]) || palette[i % palette.length]
  }));

  return `<div class="chart-pie-container"><div class="chart pie" style="background:conic-gradient(${segments})"></div></div>${buildLegendHtml(legendSeries, element, theme)}`;
}

/* ── Donut chart ─────────────────────────────────────────────────── */

function donutHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const values = series[0] ? series[0].values : [];
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let current = 0;

  const segments = values.map((value, i) => {
    const pct = (value / total) * 100;
    const start = current;
    current += pct;
    const color = (element.colors && element.colors[i]) || palette[i % palette.length];
    return `${color} ${start}% ${current}%`;
  }).join(", ");

  const legendSeries = values.map((v, i) => ({
    name: labels[i] || `Slice ${i + 1}`,
    color: (element.colors && element.colors[i]) || palette[i % palette.length]
  }));

  return `<div class="chart-pie-container"><div class="chart donut" style="background:conic-gradient(${segments})"><div class="donut-hole"><div class="donut-value">${esc(element.centerValue || "")}</div><div class="donut-label">${esc(element.centerLabel || "")}</div></div></div></div>${buildLegendHtml(legendSeries, element, theme)}`;
}

/* ── Stacked bar percent ─────────────────────────────────────────── */

function stackedBarPercentHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const numBars = labels.length;
  const tops = barTopLabels(element);
  const ax = axisConfig(element, theme);
  const grid = gridConfig(element, theme);

  let barsHtml = "";
  for (let i = 0; i < numBars; i++) {
    let total = 0;
    series.forEach(s => { total += (s.values[i] || 0); });

    let segments = "";
    series.forEach((s, si) => {
      const val = s.values[i] || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      const color = seriesColor(s, si, palette);
      segments += `<div class="stacked-segment" style="height:${pct}%;background:${color}" title="${esc(s.name)}: ${val}%"></div>`;
    });

    const topLabel = tops ? `<div class="bar-top-label">${tops[i] || ""}</div>` : "";
    const axisLabel = `<span style="font-size:${ax.fontSize}px;color:${ax.color};font-family:${ax.fontFamily},sans-serif">${esc(labels[i] || "")}</span>`;

    barsHtml += `<div class="stacked-bar-wrap">${topLabel}<div class="stacked-bar-col">${segments}</div>${axisLabel}</div>`;
  }

  const gridHtml = `<div class="stacked-grid">
    <div class="grid-line" style="bottom:25%;border-bottom:1px ${grid.style} ${grid.color}"><span class="grid-label" style="font-size:9px;color:${ax.color}">25%</span></div>
    <div class="grid-line" style="bottom:50%;border-bottom:1px ${grid.style} ${grid.color}"><span class="grid-label" style="font-size:9px;color:${ax.color}">50%</span></div>
    <div class="grid-line" style="bottom:75%;border-bottom:1px ${grid.style} ${grid.color}"><span class="grid-label" style="font-size:9px;color:${ax.color}">75%</span></div>
  </div>`;

  return `<div class="chart stacked-percent">${gridHtml}<div class="stacked-bars-row">${barsHtml}</div></div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Stacked bar (absolute) ──────────────────────────────────────── */

function stackedBarHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const numBars = labels.length;
  const ax = axisConfig(element, theme);

  let maxTotal = 1;
  for (let i = 0; i < numBars; i++) {
    let total = 0;
    series.forEach(s => { total += (s.values[i] || 0); });
    if (total > maxTotal) maxTotal = total;
  }

  let barsHtml = "";
  for (let i = 0; i < numBars; i++) {
    let total = 0;
    series.forEach(s => { total += (s.values[i] || 0); });
    const barHeight = Math.max(4, Math.round((total / maxTotal) * 100));

    let segments = "";
    series.forEach((s, si) => {
      const val = s.values[i] || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      const color = seriesColor(s, si, palette);
      segments += `<div class="stacked-segment" style="height:${pct}%;background:${color}" title="${esc(s.name)}: ${val}"></div>`;
    });

    const axisLabel = `<span style="font-size:${ax.fontSize}px;color:${ax.color};font-family:${ax.fontFamily},sans-serif">${esc(labels[i] || "")}</span>`;
    barsHtml += `<div class="stacked-bar-wrap"><div class="stacked-bar-col" style="height:${barHeight}%">${segments}</div>${axisLabel}</div>`;
  }

  return `<div class="chart stacked-abs"><div class="stacked-bars-row">${barsHtml}</div></div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Grouped bar ─────────────────────────────────────────────────── */

function groupedBarHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const allValues = series.flatMap(s => s.values);
  const max = Math.max(...allValues, 1);
  const ax = axisConfig(element, theme);

  let html = "";
  for (let i = 0; i < labels.length; i++) {
    let barsInGroup = "";
    series.forEach((s, si) => {
      const val = s.values[i] || 0;
      const height = Math.max(2, Math.round((val / max) * 100));
      const color = seriesColor(s, si, palette);
      barsInGroup += `<div class="grouped-bar" style="height:${height}%;background:${color}" title="${esc(s.name)}: ${val}"></div>`;
    });
    const axisLabel = `<span style="font-size:${ax.fontSize}px;color:${ax.color};font-family:${ax.fontFamily},sans-serif">${esc(labels[i] || "")}</span>`;
    html += `<div class="grouped-bar-wrap"><div class="grouped-bar-group">${barsInGroup}</div>${axisLabel}</div>`;
  }

  return `<div class="chart grouped-bars">${html}</div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Line chart ──────────────────────────────────────────────────── */

function lineHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const allValues = series.flatMap(s => s.values);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;
  const ax = axisConfig(element, theme);
  const grid = gridConfig(element, theme);

  const numPoints = labels.length || (series[0] ? series[0].values.length : 0);
  const svgW = 100, svgH = 60, padX = 2, padY = 4;

  // Grid lines
  let gridSvg = "";
  for (let pct of [0.25, 0.5, 0.75]) {
    const gy = padY + (1 - pct) * (svgH - 2 * padY);
    gridSvg += `<line x1="${padX}" y1="${gy}" x2="${svgW - padX}" y2="${gy}" stroke="${grid.color}" stroke-width="0.3" stroke-dasharray="${grid.style === 'dashed' ? '2,2' : 'none'}"/>`;
  }

  let paths = "";
  series.forEach((s, si) => {
    const color = seriesColor(s, si, palette);
    const points = s.values.map((v, i) => {
      const x = padX + (i / Math.max(numPoints - 1, 1)) * (svgW - 2 * padX);
      const y = padY + (1 - (v - min) / range) * (svgH - 2 * padY);
      return `${x},${y}`;
    });

    // Area fill if area chart
    if (element.chartType === "area") {
      const firstX = padX;
      const lastX = padX + (1) * (svgW - 2 * padX);
      const bottomY = svgH - padY;
      paths += `<polygon points="${points.join(" ")} ${lastX},${bottomY} ${firstX},${bottomY}" fill="${color}" fill-opacity="0.15"/>`;
    }

    paths += `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`;
    s.values.forEach((v, i) => {
      const x = padX + (i / Math.max(numPoints - 1, 1)) * (svgW - 2 * padX);
      const y = padY + (1 - (v - min) / range) * (svgH - 2 * padY);
      paths += `<circle cx="${x}" cy="${y}" r="1.5" fill="${color}"/>`;
    });
  });

  const axisLabelsHtml = labels.map(l =>
    `<span style="font-size:${ax.fontSize}px;color:${ax.color};font-family:${ax.fontFamily},sans-serif">${esc(l)}</span>`
  ).join("");

  return `<div class="chart line-chart"><svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none" class="line-svg">${gridSvg}${paths}</svg><div class="line-axis-labels">${axisLabelsHtml}</div></div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Waterfall chart ─────────────────────────────────────────────── */

function waterfallHtml(element, theme) {
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const values = series[0] ? series[0].values : [];
  const isTotal = Array.isArray(element.isTotal) ? element.isTotal : [];
  const ax = axisConfig(element, theme);

  let cumulative = 0;
  const segments = values.map((v, i) => {
    const wasTotal = isTotal[i];
    const start = wasTotal ? 0 : cumulative;
    cumulative = wasTotal ? v : cumulative + v;
    return { value: v, start, end: cumulative, isTotal: wasTotal };
  });

  const maxVal = Math.max(...segments.map(s => Math.max(Math.abs(s.start), Math.abs(s.end))), 1);
  const scale = maxVal * 1.15;

  let html = "";
  segments.forEach((seg, i) => {
    const bottom = (Math.min(seg.start, seg.end) / scale) * 100;
    const height = (Math.abs(seg.end - seg.start) / scale) * 100;
    const color = seg.isTotal ? "#1F3A5F" : (seg.value >= 0 ? "#6BCB77" : "#FF6B6B");
    html += `<div class="waterfall-wrap"><div class="waterfall-bar" style="bottom:${Math.max(0, bottom)}%;height:${Math.max(2, height)}%;background:${color}"></div><span style="font-size:${ax.fontSize}px;color:${ax.color}">${esc(labels[i] || "")}</span></div>`;
  });

  return `<div class="chart waterfall-chart">${html}</div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Scatter chart ───────────────────────────────────────────────── */

function scatterHtml(element, theme) {
  const palette = getChartPalette(theme);
  const series = normalizeSeries(element);
  const ax = axisConfig(element, theme);
  const grid = gridConfig(element, theme);

  // For scatter, each series has `values` as array of [x, y] pairs or separate xValues/yValues
  const allX = [], allY = [];
  series.forEach(s => {
    const xVals = s.xValues || s.values.map((_, i) => i);
    const yVals = s.yValues || s.values;
    xVals.forEach(v => allX.push(v));
    yVals.forEach(v => allY.push(v));
  });

  const minX = Math.min(...allX, 0), maxX = Math.max(...allX, 1);
  const minY = Math.min(...allY, 0), maxY = Math.max(...allY, 1);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

  const svgW = 100, svgH = 60, padX = 4, padY = 4;

  let dots = "";
  series.forEach((s, si) => {
    const color = seriesColor(s, si, palette);
    const xVals = s.xValues || s.values.map((_, i) => i);
    const yVals = s.yValues || s.values;
    xVals.forEach((xv, i) => {
      const cx = padX + ((xv - minX) / rangeX) * (svgW - 2 * padX);
      const cy = padY + (1 - (yVals[i] - minY) / rangeY) * (svgH - 2 * padY);
      dots += `<circle cx="${cx}" cy="${cy}" r="2" fill="${color}" opacity="0.7"/>`;
    });
  });

  return `<div class="chart line-chart"><svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none" class="line-svg">${dots}</svg></div>${buildLegendHtml(series, element, theme)}`;
}

/* ── Chart HTML dispatcher ───────────────────────────────────────── */

function chartHtml(element, theme) {
  const ct = element.chartType || "bar";
  switch (ct) {
    case "pie":               return pieHtml(element, theme);
    case "donut":             return donutHtml(element, theme);
    case "stackedBarPercent": return stackedBarPercentHtml(element, theme);
    case "stackedBar":        return stackedBarHtml(element, theme);
    case "groupedBar":        return groupedBarHtml(element, theme);
    case "line":              return lineHtml(element, theme);
    case "area":              return lineHtml(element, theme); // shared with line
    case "waterfall":         return waterfallHtml(element, theme);
    case "scatter":           return scatterHtml(element, theme);
    case "bar":
    default:                  return barHtml(element, theme);
  }
}

/* ── Chart PPTX renderer ─────────────────────────────────────────── */

function chartPptx(element, slide, pptx, theme, inherited, bounds) {
  const palette = getChartPalette(theme);
  const ct = element.chartType || "bar";
  const series = normalizeSeries(element);
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const fontFamily = inherited.fontFamily || "Aptos";
  const { x, y, w, h } = bounds;
  const ChartType = pptx.ChartType;

  const chartData = series.map(s => ({
    name: s.name || "Series",
    labels,
    values: s.values || []
  }));

  const chartColors = series.map((s, i) => toPptColor(seriesColor(s, i, palette)));

  const typeMap = {
    bar:               ChartType.bar,
    line:              ChartType.line,
    area:              ChartType.area,
    pie:               ChartType.pie,
    donut:             ChartType.doughnut,
    stackedBar:        ChartType.bar,
    stackedBarPercent: ChartType.bar,
    groupedBar:        ChartType.bar,
    waterfall:         ChartType.bar,
    scatter:           ChartType.scatter
  };

  const opts = {
    x, y, w, h,
    showLegend: series.length > 1,
    catAxisLabelRotate: 0,
    fontFace: fontFamily,
    chartColors
  };

  if (ct === "stackedBarPercent") opts.barGrouping = "percentStacked";
  else if (ct === "stackedBar")  opts.barGrouping = "stacked";
  else if (ct === "groupedBar")  opts.barGrouping = "clustered";

  const pptxType = typeMap[ct] || ChartType.bar;

  if (ct === "scatter") {
    // Scatter needs special data format
    const scatterData = series.map((s, i) => ({
      name: s.name || "Series",
      values: (s.xValues || s.values.map((_, idx) => idx)).map((xv, idx) => ({
        x: xv,
        y: (s.yValues || s.values)[idx] || 0
      }))
    }));
    try { slide.addChart(ChartType.scatter, scatterData, opts); } catch (e) { /* fallback */ }
  } else {
    slide.addChart(pptxType, chartData, opts);
  }
}

/* ── Register ────────────────────────────────────────────────────── */

register("chart", {
  renderHtml: chartHtml,
  renderPptx: chartPptx
});
