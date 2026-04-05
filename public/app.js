const defaultJson = {
  metadata: {
    title: "Industry Deposit Trends — All SCBs",
    author: "KPMG Strategy Team"
    author: "KPMG Strategy Team",
    source: "RBI Table No. 2.2"
  },
  page: {
    width: 1280,
    height: 720,
    background: "#FFFFFF"
  },
  elements: [
    {
      type: "text",
      text: "India's deposit base crossed ₹240 lakh crore, but the mix is shifting fast",
      text: "India's deposit base crossed \u20b9240 lakh crore, but the mix is shifting fast",
      x: 60,
      y: 32,
      width: 900,
      height: 50,
      fontSize: 28,
      fontFamily: "Arial",
      bold: true,
      color: "#1F3A5F"
    },
    {
      type: "callout",
      value: "~540 bps",
      label: "CASA ratio erosion in under 3 years (43.2% → 37.8%)",
      type: "text",
      text: "Deposit composition — All Scheduled Commercial Banks (Half-yearly, Mar-23 to Dec-25)",
      x: 60,
      y: 86,
      width: 900,
      height: 30,
      fontSize: 14,
      fontFamily: "Arial",
      color: "#777777"
    },
    {
      type: "callout",
      value: "~540 bps",
      label: "CASA ratio erosion in under 3 years (43.2% \u2192 37.8%)",
      x: 960,
      y: 32,
      width: 280,
      height: 84,
      background: "#F6B6C9",
      valueFontSize: 28,
      valueBold: true,
      valueColor: "#FF4D8D",
      labelFontSize: 11,
      labelColor: "#444444",
      fontFamily: "Arial",
      borderRadius: 6,
      padding: 14
    },
    {
      type: "chart",
      chartType: "stackedBarPercent",
      x: 60,
      y: 130,
      width: 700,
      height: 340,
      labels: ["Mar-23", "Sep-23", "Mar-24", "Sep-24", "Mar-25", "Sep-25", "Dec-25"],
      series: [
        {
          name: "Term Deposits",
          values: [56.9, 59.5, 59.5, 61.0, 61.1, 61.9, 62.1],
          color: "#1F3A5F"
        },
        {
          name: "Savings",
          values: [32.9, 31.4, 30.6, 29.7, 28.9, 28.9, 28.9],
          color: "#2F6BFF"
        },
        {
          name: "Current Account",
          values: [10.2, 9.1, 9.9, 9.2, 10.0, 9.2, 8.9],
          color: "#5BC0EB"
        }
      ],
      barTopLabels: {
        enabled: true,
        values: ["₹181.5L Cr", "₹192.6L Cr", "₹206.1L Cr", "₹214.8L Cr", "₹227.6L Cr", "₹235.7L Cr", "₹239.8L Cr"]
      }
      fontFamily: "Arial",
      labels: ["Mar-23", "Sep-23", "Mar-24", "Sep-24", "Mar-25", "Sep-25", "Dec-25"],
      series: [
        { name: "Term Deposits", values: [56.9, 59.5, 59.5, 61.0, 61.1, 61.9, 62.1], color: "#1F3A5F" },
        { name: "Savings", values: [32.9, 31.4, 30.6, 29.7, 28.9, 28.9, 28.9], color: "#2F6BFF" },
        { name: "Current Account", values: [10.2, 9.1, 9.9, 9.2, 10.0, 9.2, 8.9], color: "#5BC0EB" }
      ],
      barTopLabels: {
        enabled: true,
        values: ["\u20b9181.5L Cr", "\u20b9192.6L Cr", "\u20b9206.1L Cr", "\u20b9214.8L Cr", "\u20b9227.6L Cr", "\u20b9235.7L Cr", "\u20b9239.8L Cr"],
        fontSize: 10,
        color: "#444444",
        fontFamily: "Arial"
      },
      legend: { position: "bottom", fontSize: 11, color: "#444444", fontFamily: "Arial" },
      axisLabel: { fontSize: 11, color: "#777777", fontFamily: "Arial" },
      gridLines: { color: "#E5E7EB", style: "dashed" }
    },
    {
      type: "text",
      text: "Point of View",
      x: 790,
      y: 130,
      width: 450,
      height: 30,
      fontSize: 16,
      fontFamily: "Arial",
      bold: true,
      color: "#1F3A5F"
    },
    {
      type: "divider",
      x: 790,
      y: 160,
      width: 450,
      height: 2,
      color: "#5BC0EB",
      opacity: 0.4
    },
    {
      type: "text",
      text: "1",
      x: 790,
      y: 172,
      width: 22,
      height: 22,
      fontSize: 12,
      fontFamily: "Arial",
      bold: true,
      color: "#FFFFFF",
      background: "#1F3A5F",
      borderRadius: 11,
      textAlign: "center"
    },
    {
      type: "text",
      text: "Term deposits are commanding the deposit mix — driven by rate-sensitive depositors chasing higher yields in an elevated interest rate environment.",
      x: 820,
      y: 168,
      width: 420,
      height: 60,
      fontSize: 11,
      fontFamily: "Arial",
      lineHeight: 1.4,
      color: "#444444"
    },
    {
      type: "text",
      text: "Source: RBI Table No. 2.2 | Note: Excludes inter-bank deposits",
      x: 60,
      y: 688,
      width: 1160,
      height: 20,
      fontSize: 9,
      fontFamily: "Arial",
      color: "#777777"
    }
  ]
};

const jsonInput = document.getElementById("jsonInput");
const previewBtn = document.getElementById("previewBtn");
const exportBtn = document.getElementById("exportBtn");
const previewCanvas = document.getElementById("previewCanvas");
const status = document.getElementById("status");

jsonInput.value = JSON.stringify(defaultJson, null, 2);
let lastValidSpec = null;

function parseLenientJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    if (start === -1) throw new Error("No JSON object found.");

    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let i = start; i < raw.length; i += 1) {
      const ch = raw[i];
      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (ch === "\\") {
          escaping = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const candidate = raw.slice(start, i + 1);
          return JSON.parse(candidate);
        }
      }
    }

    throw new Error("Unable to parse a valid JSON object.");
  }
}

previewBtn.addEventListener("click", async () => {
  try {
    const payload = parseLenientJson(jsonInput.value);
previewBtn.addEventListener("click", async () => {
  try {
    const payload = JSON.parse(jsonInput.value);
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Failed to generate preview.");

    previewCanvas.innerHTML = data.html;
    lastValidSpec = payload;
    exportBtn.disabled = false;
    status.textContent = "Preview generated. Confirm when ready to export PPTX.";
    status.style.color = "#166534";
  } catch (error) {
    exportBtn.disabled = true;
    status.textContent = `Error: ${error.message}`;
    status.style.color = "#b91c1c";
  }
});

exportBtn.addEventListener("click", async () => {
  if (!lastValidSpec) return;

  status.textContent = "Generating PPTX...";
  status.style.color = "#1e40af";

  try {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastValidSpec)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export PPTX.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consulting-slide-${Date.now()}.pptx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    status.textContent = "PPTX downloaded successfully.";
    status.style.color = "#166534";
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
    status.style.color = "#b91c1c";
  }
});
