const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

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

function cssBox(element) {
  const x = sanitizeNumber(element.x);
  const y = sanitizeNumber(element.y);
  const w = sanitizeNumber(element.width, 100);
  const h = sanitizeNumber(element.height, 40);
  const fontSize = sanitizeNumber(element.fontSize, 20);
  const textAlign = element.textAlign || element.align || "left";

  const style = [
    `left:${x}px`,
    `top:${y}px`,
    `width:${w}px`,
    `height:${h}px`,
    `font-size:${fontSize}px`,
    `font-family:${element.fontFamily || "Arial, sans-serif"}`,
    `font-weight:${element.bold ? "700" : "400"}`,
    `color:${element.color || "#111827"}`,
    `background:${element.background || "transparent"}`,
    `border:${element.border || "none"}`,
    `border-radius:${sanitizeNumber(element.borderRadius, 0)}px`,
    `padding:${sanitizeNumber(element.padding, 4)}px`,
    `line-height:${sanitizeNumber(element.lineHeight, 1.2)}`,
    `text-align:${textAlign}`,
    "display:flex",
    `align-items:${element.verticalAlign || "flex-start"}`,
    `justify-content:${
      textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"
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

function mapVAlign(val) {
  if (val === "center") return "mid";
  if (val === "flex-end" || val === "bottom") return "down";
  return "top";
}

function toPptColor(color) {
  if (!color || color === "transparent") return "FFFFFF";
  return String(color).replace("#", "").toUpperCase();
}

function pxToInches(px) {
  return sanitizeNumber(px) / 96;
}

module.exports = {
  normalizeSlideSpec,
  renderSlideHtml,
  toPptxSlide,
  pxToInches
};
