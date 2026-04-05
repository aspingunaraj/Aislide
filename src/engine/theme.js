/**
 * Theme system — defaults, merging, cascading inheritance.
 *
 * A theme provides the "design tokens" for an entire deck.  Individual
 * elements can override any token; unset properties cascade from the
 * nearest parent that defines them, falling back to the theme defaults.
 */

const DEFAULT_THEME = {
  fontFamily: "Arial",
  fontSize: 14,
  color: "#111827",
  background: "transparent",
  lineHeight: 1.3,
  fontWeight: "400",

  // Spacing defaults (px)
  padding: 0,
  margin: 0,
  gap: 0,
  borderRadius: 0,

  // Named palette — elements can reference e.g. "primary"
  colors: {
    primary:   "#1F3A5F",
    secondary: "#2F6BFF",
    accent:    "#5BC0EB",
    success:   "#6BCB77",
    danger:    "#FF6B6B",
    warning:   "#FFD93D",
    muted:     "#777777",
    light:     "#F8FAFC",
    dark:      "#111827",
    white:     "#FFFFFF",
    border:    "#E5E7EB"
  },

  // Chart-specific defaults
  chart: {
    palette: [
      "#1F3A5F", "#2F6BFF", "#5BC0EB", "#FF6B6B", "#FFD93D",
      "#6BCB77", "#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C",
      "#3498DB", "#2ECC71", "#F39C12", "#8E44AD", "#16A085"
    ],
    gridColor: "#E5E7EB",
    gridStyle: "dashed",
    legendFontSize: 11,
    axisFontSize: 11,
    axisColor: "#777777"
  },

  // Table-specific defaults
  table: {
    headerBackground: "#1F3A5F",
    headerColor: "#FFFFFF",
    headerFontSize: 12,
    cellFontSize: 11,
    cellColor: "#333333",
    stripedColor: "#F8FAFC",
    borderColor: "#E5E7EB"
  }
};

/* ── Helpers ──────────────────────────────────────────────────────── */

/**
 * Deep-merge `overrides` into `base` (non-destructive).
 * Arrays are replaced, not concatenated.
 */
function deepMerge(base, overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return overrides !== undefined ? overrides : base;
  }
  const result = { ...base };
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] &&
      typeof overrides[key] === "object" &&
      !Array.isArray(overrides[key]) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], overrides[key]);
    } else if (overrides[key] !== undefined) {
      result[key] = overrides[key];
    }
  }
  return result;
}

/**
 * Build a resolved theme by merging user overrides onto defaults.
 */
function buildTheme(userTheme) {
  if (!userTheme) return { ...DEFAULT_THEME };
  return deepMerge(DEFAULT_THEME, userTheme);
}

/**
 * Resolve a color value.  Accepts:
 *   - hex string "#1F3A5F" or "#ccc"
 *   - named palette key "primary", "accent" …
 *   - "transparent"
 *   - raw value pass-through
 */
function resolveColor(value, theme) {
  if (!value || value === "transparent") return value;
  if (theme && theme.colors && theme.colors[value]) return theme.colors[value];
  return value;
}

/* ── Inheritable style keys ──────────────────────────────────────── */

const INHERITABLE = [
  "fontFamily", "fontSize", "color", "lineHeight", "fontWeight"
];

/**
 * Compute the effective style for an element by cascading:
 *   theme defaults  →  parent inherited  →  element own props
 *
 * Returns a flat style object with all inheritable keys resolved.
 */
function cascadeStyle(element, parentStyle, theme) {
  const base = {};

  // Start with theme defaults for inheritable keys
  for (const key of INHERITABLE) {
    base[key] = theme[key];
  }

  // Layer parent inherited values
  if (parentStyle) {
    for (const key of INHERITABLE) {
      if (parentStyle[key] !== undefined) base[key] = parentStyle[key];
    }
  }

  // Layer element's own values (these win)
  for (const key of INHERITABLE) {
    if (element[key] !== undefined) base[key] = element[key];
  }

  // Resolve color names
  base.color = resolveColor(base.color, theme);

  return base;
}

module.exports = {
  DEFAULT_THEME,
  buildTheme,
  deepMerge,
  resolveColor,
  cascadeStyle,
  INHERITABLE
};
