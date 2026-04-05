/**
 * Layout engine — resolves relative sizes into absolute pixel bounds.
 *
 * Supports:
 *   layout: "absolute"  — children use their own x/y/width/height (legacy)
 *   layout: "row"       — children flow left-to-right
 *   layout: "column"    — children flow top-to-bottom
 *   layout: "grid"      — CSS-grid-like with columns/rows template
 *   layout: "stack"     — children overlap (same position)
 *
 * Sizing values:
 *   200        — pixels
 *   "50%"      — percentage of parent content area
 *   "1fr"      — fractional remaining space
 *   "auto"     — intrinsic / content-driven (uses element's own w/h or a default)
 *   undefined  — inherits from layout algorithm
 *
 * Every node gets a `_computed` property: { x, y, width, height }
 */

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* ── Parse a dimension value ─────────────────────────────────────── */

function parseDimension(value) {
  if (value === undefined || value === null) return { type: "auto", value: 0 };
  if (typeof value === "number") return { type: "px", value };
  const str = String(value).trim();
  if (str === "auto") return { type: "auto", value: 0 };
  if (str.endsWith("%")) return { type: "percent", value: parseFloat(str) || 0 };
  if (str.endsWith("fr")) return { type: "fr", value: parseFloat(str) || 1 };
  const num = parseFloat(str);
  if (Number.isFinite(num)) return { type: "px", value: num };
  return { type: "auto", value: 0 };
}

/**
 * Resolve a single dimension against available space.
 */
function resolveDim(parsed, available, autoFallback) {
  switch (parsed.type) {
    case "px":      return parsed.value;
    case "percent":  return (parsed.value / 100) * available;
    case "auto":     return autoFallback !== undefined ? autoFallback : available;
    case "fr":       return 0; // resolved in distribute pass
    default:         return autoFallback !== undefined ? autoFallback : available;
  }
}

/* ── Spacing helpers ─────────────────────────────────────────────── */

function parseSpacing(value) {
  if (typeof value === "number") return { top: value, right: value, bottom: value, left: value };
  if (typeof value === "object" && value !== null) {
    return {
      top:    sanitizeNumber(value.top, 0),
      right:  sanitizeNumber(value.right, 0),
      bottom: sanitizeNumber(value.bottom, 0),
      left:   sanitizeNumber(value.left, 0)
    };
  }
  const n = sanitizeNumber(value, 0);
  return { top: n, right: n, bottom: n, left: n };
}

/* ── Distribute children along main axis ─────────────────────────── */

/**
 * Given a list of children and available space along the main axis,
 * assign each child a position and size.
 *
 * @param {Array} children      – node objects
 * @param {number} available    – total pixels along main axis
 * @param {number} gap          – gap between children (px)
 * @param {string} axis         – "width" or "height"
 * @param {string} justify      – "start" | "center" | "end" | "space-between" | "space-around"
 * @returns {Array<{offset, size}>}
 */
function distributeAxis(children, available, gap, axis, justify) {
  const totalGap = Math.max(0, children.length - 1) * gap;
  const netAvailable = available - totalGap;

  // First pass: resolve fixed & percent sizes; collect fr items
  const items = children.map(child => {
    const raw = child[axis];
    const parsed = parseDimension(raw);
    let size = 0;
    let isFr = false;
    let frValue = 0;

    if (parsed.type === "fr") {
      isFr = true;
      frValue = parsed.value;
    } else if (parsed.type === "auto") {
      // For auto, use the child's own pixel value if present, else 0 (will be flex'd)
      const childPx = typeof child[axis] === "number" ? child[axis] : 0;
      if (childPx > 0) {
        size = childPx;
      } else {
        isFr = true;
        frValue = 1; // auto items share remaining space equally
      }
    } else {
      size = resolveDim(parsed, netAvailable, 0);
    }

    return { size, isFr, frValue };
  });

  // Second pass: distribute remaining space among fr items
  const fixedTotal = items.reduce((sum, it) => sum + (it.isFr ? 0 : it.size), 0);
  const remaining = Math.max(0, netAvailable - fixedTotal);
  const totalFr = items.reduce((sum, it) => sum + (it.isFr ? it.frValue : 0), 0);

  items.forEach(item => {
    if (item.isFr && totalFr > 0) {
      item.size = (item.frValue / totalFr) * remaining;
    }
  });

  // Third pass: compute offsets
  const totalUsed = items.reduce((sum, it) => sum + it.size, 0) + totalGap;
  let startOffset = 0;
  let effectiveGap = gap;

  if (justify === "center") {
    startOffset = (available - totalUsed) / 2;
  } else if (justify === "end") {
    startOffset = available - totalUsed;
  } else if (justify === "space-between" && children.length > 1) {
    effectiveGap = (available - items.reduce((s, i) => s + i.size, 0)) / (children.length - 1);
    startOffset = 0;
  } else if (justify === "space-around" && children.length > 0) {
    const totalSpace = available - items.reduce((s, i) => s + i.size, 0);
    effectiveGap = totalSpace / children.length;
    startOffset = effectiveGap / 2;
  }

  let cursor = startOffset;
  return items.map(item => {
    const offset = cursor;
    cursor += item.size + effectiveGap;
    return { offset, size: item.size };
  });
}

/* ── Cross-axis alignment ────────────────────────────────────────── */

function alignCross(childSize, availableCross, align) {
  if (align === "center" || align === "middle") return (availableCross - childSize) / 2;
  if (align === "end" || align === "flex-end" || align === "bottom" || align === "right") return availableCross - childSize;
  return 0; // start
}

/* ── Main layout resolver ────────────────────────────────────────── */

/**
 * Recursively resolve layout for a node tree.
 *
 * @param {object} node          – element or container node
 * @param {object} parentBounds  – { x, y, width, height } in absolute px
 * @returns the same node, mutated with `_computed` on every node
 */
function resolveLayout(node, parentBounds) {
  const padding = parseSpacing(node.padding);
  const margin  = parseSpacing(node.margin);

  // Determine this node's own bounds
  const ownWidth  = resolveOwnDim(node, "width",  parentBounds.width);
  const ownHeight = resolveOwnDim(node, "height", parentBounds.height);

  // Apply margin to determine position within parent flow
  // (position is set by parent's distribute pass; margin offsets from that)
  const computed = {
    x:      sanitizeNumber(node._flowX, sanitizeNumber(node.x, parentBounds.x)) + margin.left,
    y:      sanitizeNumber(node._flowY, sanitizeNumber(node.y, parentBounds.y)) + margin.top,
    width:  ownWidth  - margin.left - margin.right,
    height: ownHeight - margin.top  - margin.bottom
  };

  node._computed = computed;

  // Content area (inside padding)
  const content = {
    x:      computed.x + padding.left,
    y:      computed.y + padding.top,
    width:  computed.width  - padding.left - padding.right,
    height: computed.height - padding.top  - padding.bottom
  };

  // Resolve children
  const children = node.children || node.elements || [];
  if (children.length === 0) return node;

  const layoutMode = node.layout || detectLayout(node, children);
  const gap = sanitizeNumber(node.gap, 0);
  const justify = node.justify || "start";
  const alignItems = node.align || node.alignItems || "start";

  switch (layoutMode) {
    case "row":
      layoutRow(children, content, gap, justify, alignItems);
      break;
    case "column":
      layoutColumn(children, content, gap, justify, alignItems);
      break;
    case "grid":
      layoutGrid(children, content, node, gap);
      break;
    case "stack":
      layoutStack(children, content);
      break;
    case "absolute":
    default:
      layoutAbsolute(children, content);
      break;
  }

  // Recurse into each child
  children.forEach(child => {
    const childBounds = {
      x: child._flowX !== undefined ? child._flowX : content.x,
      y: child._flowY !== undefined ? child._flowY : content.y,
      width:  child._flowW !== undefined ? child._flowW : content.width,
      height: child._flowH !== undefined ? child._flowH : content.height
    };
    resolveLayout(child, childBounds);
  });

  return node;
}

/* ── Detect layout mode heuristic ────────────────────────────────── */

function detectLayout(node, children) {
  // If any child has explicit x/y, treat as absolute
  if (children.some(c => c.x !== undefined && c.y !== undefined)) return "absolute";
  // If node has columns/rows template, treat as grid
  if (node.columns || node.rows) return "grid";
  // Default to column
  return "column";
}

/* ── Resolve own dimension ───────────────────────────────────────── */

function resolveOwnDim(node, prop, parentSize) {
  const raw = node[prop];
  if (raw === undefined || raw === null) {
    // If no explicit size, take full parent
    return parentSize;
  }
  const parsed = parseDimension(raw);
  return resolveDim(parsed, parentSize, parentSize);
}

/* ── Layout modes ────────────────────────────────────────────────── */

function layoutRow(children, content, gap, justify, alignItems) {
  const distributed = distributeAxis(children, content.width, gap, "width", justify);

  children.forEach((child, i) => {
    const { offset, size } = distributed[i];
    child._flowX = content.x + offset;
    child._flowW = size;

    // Cross axis (height)
    const hParsed = parseDimension(child.height);
    let h = resolveDim(hParsed, content.height, content.height);

    const crossOffset = alignCross(h, content.height, alignItems);
    child._flowY = content.y + crossOffset;
    child._flowH = h;
  });
}

function layoutColumn(children, content, gap, justify, alignItems) {
  const distributed = distributeAxis(children, content.height, gap, "height", justify);

  children.forEach((child, i) => {
    const { offset, size } = distributed[i];
    child._flowY = content.y + offset;
    child._flowH = size;

    // Cross axis (width)
    const wParsed = parseDimension(child.width);
    let w = resolveDim(wParsed, content.width, content.width);

    const crossOffset = alignCross(w, content.width, alignItems);
    child._flowX = content.x + crossOffset;
    child._flowW = w;
  });
}

function layoutGrid(children, content, node, gap) {
  // Parse column/row templates
  const colTemplate = parseTemplate(node.columns, content.width, gap);
  const rowTemplate = parseTemplate(node.rows, content.height, gap);

  const numCols = colTemplate.length || 1;

  children.forEach((child, i) => {
    const col = (child.gridColumn !== undefined ? child.gridColumn : i % numCols);
    const row = (child.gridRow !== undefined ? child.gridRow : Math.floor(i / numCols));

    const colInfo = colTemplate[col] || { offset: 0, size: content.width };
    const rowInfo = rowTemplate[row] || { offset: 0, size: content.height / Math.ceil(children.length / numCols) };

    child._flowX = content.x + colInfo.offset;
    child._flowY = content.y + rowInfo.offset;
    child._flowW = colInfo.size;
    child._flowH = rowInfo.size;
  });
}

function layoutStack(children, content) {
  children.forEach(child => {
    child._flowX = content.x;
    child._flowY = content.y;
    child._flowW = content.width;
    child._flowH = content.height;
  });
}

function layoutAbsolute(children, content) {
  children.forEach(child => {
    // In absolute mode, x/y are relative to parent content area
    const cx = sanitizeNumber(child.x, 0);
    const cy = sanitizeNumber(child.y, 0);
    child._flowX = content.x + cx;
    child._flowY = content.y + cy;

    // Width/height resolve against parent content area
    const wParsed = parseDimension(child.width);
    const hParsed = parseDimension(child.height);
    child._flowW = resolveDim(wParsed, content.width, sanitizeNumber(child.width, 100));
    child._flowH = resolveDim(hParsed, content.height, sanitizeNumber(child.height, 40));
  });
}

/* ── Grid template parser ────────────────────────────────────────── */

/**
 * Parse a template like "1fr 2fr 1fr" or "200 1fr 300" or [200, "1fr", 300]
 * Returns array of { offset, size } for each track.
 */
function parseTemplate(template, available, gap) {
  if (!template) return [];

  const tracks = Array.isArray(template)
    ? template
    : String(template).trim().split(/\s+/);

  const parsed = tracks.map(t => parseDimension(t));
  const totalGap = Math.max(0, parsed.length - 1) * gap;
  const netAvailable = available - totalGap;

  // Resolve fixed first
  let fixedTotal = 0;
  let frTotal = 0;
  parsed.forEach(p => {
    if (p.type === "fr") {
      frTotal += p.value;
    } else {
      const size = resolveDim(p, netAvailable, 0);
      fixedTotal += size;
    }
  });

  const remaining = Math.max(0, netAvailable - fixedTotal);

  let cursor = 0;
  return parsed.map(p => {
    let size;
    if (p.type === "fr") {
      size = frTotal > 0 ? (p.value / frTotal) * remaining : 0;
    } else {
      size = resolveDim(p, netAvailable, 0);
    }
    const offset = cursor;
    cursor += size + gap;
    return { offset, size };
  });
}

/* ── Clean up internal flow properties ───────────────────────────── */

function cleanFlowProps(node) {
  delete node._flowX;
  delete node._flowY;
  delete node._flowW;
  delete node._flowH;
  const children = node.children || node.elements || [];
  children.forEach(cleanFlowProps);
  return node;
}

module.exports = {
  resolveLayout,
  cleanFlowProps,
  parseDimension,
  resolveDim,
  parseSpacing,
  sanitizeNumber
};
