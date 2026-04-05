# Aislide (JSON -> HTML Preview -> PPTX)

This project builds consultant-style slides from JSON and is designed to be highly dynamic.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Dynamic capabilities

The renderer supports a broad JSON model so you can define slides with mixed components and custom styling:

- Element primitives: `text`, `kpi`, `callout`, `divider`/`line`, `shape`, `image`, `table`, `group`, `chart`
- Rich style fields: `fontFamily`, `textAlign`, `lineHeight`, `opacity`, `border`, `borderRadius`, `padding`, `style` (custom CSS object)
- Chart model options:
  - single-series (`labels` + `values`)
  - multi-series (`series[]` with `{name, values, color}`)
  - chart types: `bar`, `line`, `area`, `scatter`, `pie`, `donut`, `stackedBarPercent`
- Deck export model: send one slide or `{ slides: [...] }` for multi-slide PPTX
- Lenient JSON input in UI: if two JSON objects are accidentally pasted together, first complete object is parsed

## Recommended JSON structure

```json
{
  "metadata": { "title": "Deck" },
  "page": { "width": 1280, "height": 720, "background": "#FFFFFF" },
  "elements": [
    { "type": "text", "text": "Title", "x": 60, "y": 30, "width": 700, "height": 50 },
    {
      "type": "chart",
      "chartType": "stackedBarPercent",
      "x": 60,
      "y": 120,
      "width": 700,
      "height": 320,
      "labels": ["Q1", "Q2"],
      "series": [
        { "name": "A", "values": [60, 55], "color": "#1F3A5F" },
        { "name": "B", "values": [40, 45], "color": "#2F6BFF" }
      ]
    }
  ]
}
```

## Notes

- Coordinates are pixel-based in JSON; PPTX export converts to inches.
- Unknown/partial structures gracefully fall back to text/shape rendering where possible.
