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

### Supported element types

- `text`
- `kpi`
- `callout`
- `divider`
- `chart`

### Supported chart types

- `bar`
- `line`
- `pie`
- `stackedBarPercent` (supports `labels`, `series`, optional `barTopLabels`)

## Notes

- Coordinates are pixel-based in JSON; PPTX export converts to inches.
- `textAlign` and `fontFamily` are supported for text-like elements.
- The JSON textbox uses a lenient parser: if you accidentally paste two JSON objects back-to-back, it will parse the first complete object.
