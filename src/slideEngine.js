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
  const slide = {
    title: rawSpec.title || "Consulting Slide",
    subtitle: rawSpec.subtitle || "",
    width: sanitizeNumber(page.width, DEFAULT_WIDTH),
    height: sanitizeNumber(page.height, DEFAULT_HEIGHT),
    background: page.background || "#FFFFFF",
    elements: Array.isArray(rawSpec.elements) ? rawSpec.elements : [],
    metadata: rawSpec.metadata || {}
  };

  return slide;
}

function cssBox(element, page) {
  const x = sanitizeNumber(element.x);
  const y = sanitizeNumber(element.y);
  const w = sanitizeNumber(element.width, 100);
  const h = sanitizeNumber(element.height, 40);
  const fontSize = sanitizeNumber(element.fontSize, 20);

  const style = [
    `left:${x}px`,
    `top:${y}px`,
    `width:${w}px`,
    `height:${h}px`,
    `font-size:${fontSize}px`,
    `font-weight:${element.bold ? "700" : "400"}`,
    `color:${element.color || "#111827"}`,
    `background:${element.background || "transparent"}`,
    `border:${element.border || "none"}`,
    `border-radius:${sanitizeNumber(element.borderRadius, 0)}px`,
    `padding:${sanitizeNumber(element.padding, 4)}px`,
    `line-height:${sanitizeNumber(element.lineHeight, 1.2)}`,
    `text-align:${element.align || "left"}`,
    `display:flex`,
    `align-items:${element.verticalAlign || "flex-start"}`,
    `justify-content:${
      element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start"
    }`,
    `box-sizing:border-box`,
    `overflow:hidden`
  ];

  if (element.shadow) {
    style.push("box-shadow:0 6px 18px rgba(0,0,0,0.15)");
  }

  return style.join(";");
}

function buildChartHtml(element) {
  const labels = Array.isArray(element.labels) ? element.labels : [];
  const series = Array.isArray(element.values) ? element.values : [];
  const max = Math.max(...series, 1);

  if (element.chartType === "pie") {
    const total = series.reduce((a, b) => a + b, 0) || 1;
    let current = 0;
    const segments = series
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

  return `
    <div class=\"chart bars\">
      ${series
        .map((value, i) => {
          const height = Math.max(4, Math.round((value / max) * 100));
          const color = (element.colors && element.colors[i]) || "#2563EB";
          const label = labels[i] || `S${i + 1}`;
          return `<div class=\"bar-wrap\"><div class=\"bar\" style=\"height:${height}%;background:${color}\"></div><span>${label}</span></div>`;
        })
        .join("")}
    </div>
  `;
}

function renderElement(element, page) {
  const type = element.type || "text";
  const style = cssBox(element, page);

  if (type === "chart") {
    return `<div class=\"element\" style=\"${style}\">${buildChartHtml(element)}</div>`;
  }

  if (type === "kpi") {
    return `<div class=\"element kpi\" style=\"${style}\"><div class=\"kpi-value\">${element.value ?? "--"}</div><div class=\"kpi-label\">${element.label || "KPI"}</div></div>`;
  }

  return `<div class=\"element\" style=\"${style}\">${element.text || ""}</div>`;
}

function renderSlideHtml(spec) {
  const slide = normalizeSlideSpec(spec);
  const elements = slide.elements.map((element) => renderElement(element, slide)).join("\n");

  return `
  <div class=\"slide\" style=\"width:${slide.width}px;height:${slide.height}px;background:${slide.background};\">
    ${elements}
  </div>`;
}

function toPptxSlide(slideSpec, slide) {
  slide.background = { color: toPptColor(slideSpec.background || "#FFFFFF") };

  (slideSpec.elements || []).forEach((element) => {
    const x = pxToInches(sanitizeNumber(element.x));
    const y = pxToInches(sanitizeNumber(element.y));
    const w = pxToInches(sanitizeNumber(element.width, 200));
    const h = pxToInches(sanitizeNumber(element.height, 60));

    if (element.type === "chart") {
      const labels = Array.isArray(element.labels) ? element.labels : [];
      const values = Array.isArray(element.values) ? element.values : [];
      const chartData = [{ name: element.seriesName || "Series", labels, values }];
      const typeMap = {
        bar: slide.ChartType.bar,
        line: slide.ChartType.line,
        pie: slide.ChartType.pie
      };
      slide.addChart(typeMap[element.chartType] || slide.ChartType.bar, chartData, {
        x,
        y,
        w,
        h,
        showLegend: true,
        catAxisLabelRotate: 0,
        fontFace: "Aptos",
        chartColors: Array.isArray(element.colors) ? element.colors.map(toPptColor) : undefined
      });
      return;
    }

    if (element.type === "kpi") {
      slide.addShape(slide.ShapeType.roundRect, {
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
        align: element.align || "left",
        fontFace: "Aptos"
      });
      slide.addText(String(element.label || "KPI"), {
        x: x + 0.1,
        y: y + h * 0.55,
        w: w - 0.2,
        h: h * 0.35,
        fontSize: sanitizeNumber(element.fontSize, 12),
        color: toPptColor(element.subColor || "#475569"),
        align: element.align || "left",
        fontFace: "Aptos"
      });
      return;
    }

    if (element.background || element.border) {
      slide.addShape(slide.ShapeType.roundRect, {
        x,
        y,
        w,
        h,
        fill: { color: toPptColor(element.background || "transparent") },
        line: {
          color: toPptColor((element.borderColor || "#CBD5E1").replace("#", "")),
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
      align: element.align || "left",
      valign: mapVAlign(element.verticalAlign),
      fontFace: element.fontFace || "Aptos"
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
