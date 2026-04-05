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
    title: rawSpec.title || "Consulting Slide",
    subtitle: rawSpec.subtitle || "",
    width: sanitizeNumber(page.width, DEFAULT_WIDTH),
    height: sanitizeNumber(page.height, DEFAULT_HEIGHT),
    background: page.background || "#FFFFFF",
    elements: Array.isArray(rawSpec.elements) ? rawSpec.elements : [],
    metadata: rawSpec.metadata || {}
  };
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
    `display:flex`,
    `align-items:${element.verticalAlign || "flex-start"}`,
    `justify-content:${
      textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"
    }`,
    "box-sizing:border-box",
    "overflow:hidden",
    `opacity:${sanitizeNumber(element.opacity, 1)}`
  ];

  if (element.shadow) {
    style.push("box-shadow:0 6px 18px rgba(0,0,0,0.15)");
  }

  return style.join(";");
}

function buildSimpleBars(element) {
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const values = Array.isArray(element.values) ? element.values : [];
  const max = Math.max(...values, 1);

  return `
    <div class=\"chart bars\">
      ${values
        .map((value, i) => {
          const height = Math.max(3, Math.round((value / max) * 100));
          const color = (element.colors && element.colors[i]) || "#2563EB";
          const label = labels[i] || `S${i + 1}`;
          return `<div class=\"bar-wrap\"><div class=\"bar\" style=\"height:${height}%;background:${color}\"></div><span>${label}</span></div>`;
        })
        .join("")}
    </div>
  `;
}

function buildStackedPercent(element) {
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const series = Array.isArray(element.series) ? element.series : [];
  if (!labels.length || !series.length) {
    return "<div class=\"chart-empty\">Invalid stackedBarPercent data</div>";
  }

  const topLabels = element.barTopLabels?.values || [];
  const showTop = Boolean(element.barTopLabels?.enabled);

  const columns = labels
    .map((label, i) => {
      const stack = series
        .map((serie, sIndex) => {
          const value = sanitizeNumber(serie.values?.[i]);
          const color = serie.color || ["#1F3A5F", "#2F6BFF", "#5BC0EB"][sIndex % 3];
          return `<div class=\"stack-segment\" title=\"${serie.name}: ${value}%\" style=\"height:${Math.max(value, 0)}%;background:${color}\"></div>`;
        })
        .join("");

      return `
        <div class=\"stack-col-wrap\">
          ${showTop ? `<div class=\"stack-top-label\">${topLabels[i] || ""}</div>` : ""}
          <div class=\"stack-col\">${stack}</div>
          <div class=\"stack-x\">${label}</div>
        </div>
      `;
    })
    .join("");

  const legend = `
    <div class=\"stack-legend\">
      ${series
        .map(
          (serie, idx) =>
            `<div class=\"legend-item\"><span class=\"swatch\" style=\"background:${serie.color || ["#1F3A5F", "#2F6BFF", "#5BC0EB"][idx % 3]}\"></span>${serie.name || `Series ${idx + 1}`}</div>`
        )
        .join("")}
    </div>
  `;

  return `<div class=\"chart stacked-percent\"><div class=\"stack-area\">${columns}</div>${legend}</div>`;
}

function buildChartHtml(element) {
  if (element.chartType === "pie") {
    const values = Array.isArray(element.values) ? element.values : [];
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let current = 0;
    const segments = values
      .map((value, i) => {
        const percentage = (value / total) * 100;
        const start = current;
        current += percentage;
        const color = (element.colors && element.colors[i]) || "#3B82F6";
        return `${color} ${start}% ${current}%`;
      })
      .join(", ");

    return `<div class=\"chart pie\" style=\"background:conic-gradient(${segments})\"></div>`;
  }

  if (element.chartType === "stackedBarPercent") {
    return buildStackedPercent(element);
  }

  return buildSimpleBars(element);
}

function renderElement(element) {
  const type = element.type || "text";
  const style = cssBox(element);

  if (type === "chart") {
    return `<div class=\"element\" style=\"${style}\">${buildChartHtml(element)}</div>`;
  }

  if (type === "kpi") {
    return `<div class=\"element kpi\" style=\"${style}\"><div class=\"kpi-value\">${element.value ?? "--"}</div><div class=\"kpi-label\">${element.label || "KPI"}</div></div>`;
  }

  if (type === "callout") {
    return `<div class=\"element callout\" style=\"${style}\"><div class=\"callout-value\" style=\"font-size:${sanitizeNumber(element.valueFontSize, 24)}px;color:${element.valueColor || "#111827"};font-weight:${element.valueBold ? 700 : 600};\">${element.value || ""}</div><div class=\"callout-label\" style=\"font-size:${sanitizeNumber(element.labelFontSize, 11)}px;color:${element.labelColor || "#334155"};\">${element.label || ""}</div></div>`;
  }

  if (type === "divider") {
    return `<div class=\"element divider\" style=\"${style};background:${element.color || "#CBD5E1"};padding:0;border:0\"></div>`;
  }

  return `<div class=\"element\" style=\"${style}\">${element.text || ""}</div>`;
}

function renderSlideHtml(spec) {
  const slide = normalizeSlideSpec(spec);
  const elements = slide.elements.map((element) => renderElement(element)).join("\n");

  return `<div class=\"slide\" style=\"width:${slide.width}px;height:${slide.height}px;background:${slide.background};\">${elements}</div>`;
}

function toPptxSlide(slideSpec, slide) {
  slide.background = { color: toPptColor(slideSpec.background || "#FFFFFF") };

  (slideSpec.elements || []).forEach((element) => {
    const x = pxToInches(sanitizeNumber(element.x));
    const y = pxToInches(sanitizeNumber(element.y));
    const w = pxToInches(sanitizeNumber(element.width, 200));
    const h = pxToInches(sanitizeNumber(element.height, 60));

    if (element.type === "divider") {
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

    if (element.type === "callout") {
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h,
        radius: 0.05,
        fill: { color: toPptColor(element.background || "#FCE7F3") },
        line: { pt: 0, color: toPptColor(element.background || "#FCE7F3") }
      });
      slide.addText(String(element.value || ""), {
        x: x + 0.08,
        y: y + 0.05,
        w: w - 0.16,
        h: h * 0.45,
        bold: Boolean(element.valueBold),
        fontSize: sanitizeNumber(element.valueFontSize, 24),
        color: toPptColor(element.valueColor || "#111827"),
        align: "left",
        fontFace: element.fontFamily || "Arial"
      });
      slide.addText(String(element.label || ""), {
        x: x + 0.08,
        y: y + h * 0.47,
        w: w - 0.16,
        h: h * 0.43,
        fontSize: sanitizeNumber(element.labelFontSize, 11),
        color: toPptColor(element.labelColor || "#334155"),
        align: "left",
        fontFace: element.fontFamily || "Arial"
      });
      return;
    }

    if (element.type === "chart") {
      if (element.chartType === "stackedBarPercent") {
        const labels = Array.isArray(element.labels) ? element.labels : [];
        const data = (element.series || []).map((serie, idx) => ({
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
          catAxisLabelPos: "nextTo",
          showLegend: true,
          legendPos: (element.legend?.position || "bottom").toLowerCase(),
          valAxisMinVal: 0,
          valAxisMaxVal: 100,
          valAxisMajorUnit: 20,
          showValue: false,
          chartColors: (element.series || []).map((s) => toPptColor(s.color || "#3B82F6")),
          fontFace: element.fontFamily || "Arial"
        });
        return;
      }

      const labels = Array.isArray(element.labels) ? element.labels : [];
      const values = Array.isArray(element.values) ? element.values : [];
      const chartData = [{ name: element.seriesName || "Series", labels, values }];
      const typeMap = {
        bar: "bar",
        line: "line",
        pie: "pie"
      };
      slide.addChart(typeMap[element.chartType] || "bar", chartData, {
        x,
        y,
        w,
        h,
        showLegend: true,
        fontFace: element.fontFamily || "Arial",
        chartColors: Array.isArray(element.colors) ? element.colors.map(toPptColor) : undefined
      });
      return;
    }

    if (element.type === "kpi") {
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h,
        radius: 0.08,
        fill: { color: toPptColor(element.background || "#EEF2FF") },
        line: { color: toPptColor("#C7D2FE"), pt: 1 }
      });
      slide.addText(String(element.value ?? "--"), {
        x: x + 0.1,
        y: y + 0.05,
        w: w - 0.2,
        h: h * 0.55,
        bold: true,
        fontSize: sanitizeNumber(element.valueSize, 24),
        color: toPptColor(element.color || "#1E3A8A"),
        align: element.textAlign || element.align || "left",
        fontFace: element.fontFamily || "Arial"
      });
      slide.addText(String(element.label || "KPI"), {
        x: x + 0.1,
        y: y + h * 0.55,
        w: w - 0.2,
        h: h * 0.35,
        fontSize: sanitizeNumber(element.fontSize, 12),
        color: toPptColor(element.subColor || "#475569"),
        align: element.textAlign || element.align || "left",
        fontFace: element.fontFamily || "Arial"
      });
      return;
    }

    if (element.background || element.border) {
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h,
        fill: { color: toPptColor(element.background || "transparent") },
        line: {
          color: toPptColor(element.borderColor || "#CBD5E1"),
          pt: sanitizeNumber(element.borderWidth, element.border ? 1 : 0)
        },
        radius: sanitizeNumber(element.borderRadius, 0) / 72
      });
    }

    slide.addText(String(element.text || ""), {
      x,
      y,
      w,
      h,
      bold: Boolean(element.bold),
      fontSize: sanitizeNumber(element.fontSize, 18),
      color: toPptColor(element.color || "#111827"),
      align: element.textAlign || element.align || "left",
      valign: mapVAlign(element.verticalAlign),
      fontFace: element.fontFamily || "Arial"
    });
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
