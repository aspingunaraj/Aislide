/**
 * Schema inference — detect element type from JSON structure.
 *
 * When `type` is explicitly set, it's used directly.
 * Otherwise, the engine inspects keys to guess the best match.
 */

const INFERENCE_RULES = [
  // Order matters — first match wins

  // Container / group (has nested children)
  { test: (el) => Array.isArray(el.children) && el.children.length > 0, type: "container" },

  // Table (has headers or rows)
  { test: (el) => Array.isArray(el.headers) || Array.isArray(el.rows), type: "table" },

  // Chart (has series or values+labels+chartType)
  { test: (el) => Array.isArray(el.series), type: "chart" },
  { test: (el) => Array.isArray(el.values) && Array.isArray(el.labels), type: "chart" },

  // KPI / Callout (has value + label, no series/rows)
  { test: (el) => el.value !== undefined && el.label !== undefined, type: "callout" },

  // Image (has src)
  { test: (el) => typeof el.src === "string", type: "image" },

  // Divider (very narrow height or width with a color but no text)
  { test: (el) => (el.height <= 4 || el.width <= 4) && !el.text && el.color, type: "divider" },

  // Shape (has shape or fill property, no text)
  { test: (el) => (el.shape || el.fill) && !el.text, type: "shape" },

  // Text (fallback — has text or is default)
  { test: () => true, type: "text" }
];

/**
 * Infer type for a single element.
 */
function inferType(element) {
  if (element.type) return element.type;
  for (const rule of INFERENCE_RULES) {
    if (rule.test(element)) return rule.type;
  }
  return "text";
}

/**
 * Walk an entire element tree and assign `type` where missing.
 */
function inferTypes(elements) {
  if (!Array.isArray(elements)) return [];
  return elements.map(el => {
    const resolved = { ...el };
    if (!resolved.type) {
      resolved.type = inferType(resolved);
    }
    // Recurse into children
    if (Array.isArray(resolved.children)) {
      resolved.children = inferTypes(resolved.children);
    }
    if (Array.isArray(resolved.elements)) {
      resolved.elements = inferTypes(resolved.elements);
    }
    return resolved;
  });
}

module.exports = { inferType, inferTypes };
