# Aislide (JSON -> HTML Preview -> PPTX)

This project creates consultant-style slides from JSON.

## What it does

1. Accepts slide JSON in a web UI.
2. Renders a pixel-based HTML preview.
3. Exports the confirmed slide(s) to a PowerPoint `.pptx` file.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## JSON format

You can provide either:
- a single slide object, or
- a deck object with `slides: []` for export.

### Slide object

```json
{
  "page": {
    "width": 1280,
    "height": 720,
    "background": "#FFFFFF"
  },
  "elements": [
    {
      "type": "text",
      "text": "Slide title",
      "x": 60,
      "y": 36,
      "width": 700,
      "height": 60,
      "fontSize": 34,
      "bold": true,
      "color": "#0F172A"
    },
    {
      "type": "kpi",
      "value": "$14.8M",
      "label": "Quarterly Revenue",
      "x": 60,
      "y": 170,
      "width": 250,
      "height": 120,
      "background": "#EEF2FF"
    },
    {
      "type": "chart",
      "chartType": "bar",
      "x": 60,
      "y": 320,
      "width": 760,
      "height": 300,
      "labels": ["Jan", "Feb", "Mar"],
      "values": [78, 84, 91],
      "colors": ["#60A5FA", "#3B82F6", "#1D4ED8"]
    }
  ]
}
```

## Notes

- Supported element types: `text`, `kpi`, `chart`.
- Supported chart types: `bar`, `line`, `pie` (preview line chart renders as bars for now; PPTX export uses true chart type).
- Coordinates are pixel-based in JSON; PPTX export converts to inches.
