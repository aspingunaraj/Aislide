const defaultJson = {
  metadata: {
    title: "Q2 Operating Review",
    author: "Strategy Team"
  },
  page: {
    width: 1280,
    height: 720,
    background: "#FFFFFF"
  },
  elements: [
    {
      type: "text",
      text: "Q2 2026 Performance Review",
      x: 60,
      y: 36,
      width: 700,
      height: 60,
      fontSize: 34,
      bold: true,
      color: "#0F172A"
    },
    {
      type: "text",
      text: "Revenue momentum continued while cost efficiency improved.",
      x: 60,
      y: 100,
      width: 900,
      height: 40,
      fontSize: 18,
      color: "#334155"
    },
    {
      type: "kpi",
      value: "$14.8M",
      label: "Quarterly Revenue",
      x: 60,
      y: 170,
      width: 250,
      height: 120,
      background: "#EEF2FF",
      color: "#1E3A8A"
    },
    {
      type: "kpi",
      value: "19.4%",
      label: "EBITDA Margin",
      x: 330,
      y: 170,
      width: 250,
      height: 120,
      background: "#ECFDF5",
      color: "#065F46"
    },
    {
      type: "chart",
      chartType: "bar",
      x: 60,
      y: 320,
      width: 760,
      height: 300,
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      values: [78, 84, 91, 103, 97, 112],
      colors: ["#60A5FA", "#60A5FA", "#60A5FA", "#3B82F6", "#3B82F6", "#1D4ED8"]
    },
    {
      type: "text",
      text: "Key takeaways:\n• Pipeline conversion improved by 11%\n• CAC down 9% QoQ\n• Churn remains below target",
      x: 860,
      y: 320,
      width: 360,
      height: 300,
      fontSize: 20,
      lineHeight: 1.4,
      background: "#F8FAFC",
      border: "1px solid #CBD5E1",
      borderRadius: 8,
      padding: 16,
      color: "#0F172A"
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
