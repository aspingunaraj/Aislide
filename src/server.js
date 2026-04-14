const express = require("express");
const path = require("path");
const fs = require("fs");
const PptxGenJS = require("pptxgenjs");
const { normalizeSlideSpec, renderSlideHtml, toPptxSlide } = require("./slideEngine");

const app = express();
const PORT = process.env.PORT || 3000;

const generatedDir = path.join(__dirname, "..", "generated");
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/preview", (req, res) => {
  try {
    const spec = normalizeSlideSpec(req.body);
    const html = renderSlideHtml(spec);
    res.json({ ok: true, html, normalizedSpec: spec });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/export", async (req, res) => {
  try {
    const payload = req.body;
    const slides = Array.isArray(payload.slides) ? payload.slides : [payload];
    if (slides.length === 0) throw new Error("At least one slide is required.");

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = payload.metadata?.author || "AI Slide Generator";
    pptx.company = payload.metadata?.company || "Aislide";
    pptx.subject = payload.metadata?.subject || "Auto-generated presentation";
    pptx.title = payload.metadata?.title || "Generated deck";
    pptx.theme = {
      lang: "en-US",
      headFontFace: "Aptos",
      bodyFontFace: "Aptos"
    };

    slides.forEach((rawSlide) => {
      const slideSpec = normalizeSlideSpec(rawSlide);
      const slide = pptx.addSlide();
      toPptxSlide(slideSpec, slide, pptx);
    });

    const fileName = `deck-${Date.now()}.pptx`;
    const outputPath = path.join(__dirname, "..", "generated", fileName);
    await pptx.writeFile({ fileName: outputPath });

    res.download(outputPath, fileName, (err) => {
      if (!err) {
        fs.unlink(outputPath, () => {});
      }
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Aislide running at http://localhost:${PORT}`);
});
