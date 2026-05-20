/*
Module: template grid
Description: Grid helpers, mask polygon logic, and crop normalization for clothes/furniture template modes.
Domain: domain/template
Dependencies: ../shared/math.js
Usage:
  import { applyMaskToGridCodes, normalizeTemplateAppliedCanvases } from "./grid.js";
*/

import { clamp } from "../shared/math.js";

/**
 * Test whether point (x, y) lies inside a polygon using ray-casting.
 * Coordinates may be fractional (grid-cell units).
 * @param {number} x
 * @param {number} y
 * @param {Array<{x:number, y:number}>} polygon  — ordered vertices
 * @returns {boolean}
 */
function isPointInsidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Test whether point (x, y) lies inside any of the mask-line polygons.
 * @param {number} x
 * @param {number} y
 * @param {Array<Array<{x:number, y:number}>>} maskLines  — array of polygons
 * @returns {boolean}
 */
function isPointInsideMaskLines(x, y, maskLines) {
  for (const polygon of maskLines) {
    if (isPointInsidePolygon(x, y, polygon)) {
      return true;
    }
  }
  return false;
}

/**
 * Return a new gridCodes array where cells outside the mask polygons are cleared to "".
 * Each cell is tested at its center (col + 0.5, row + 0.5).
 * The original array is not mutated.
 * @param {string[][]} gridCodes
 * @param {Array<Array<{x:number, y:number}>>} maskLines
 * @returns {string[][]}
 */
function applyMaskToGridCodes(gridCodes, maskLines) {
  return gridCodes.map((row, rowIndex) =>
    row.map((code, colIndex) => {
      const cx = colIndex + 0.5;
      const cy = rowIndex + 0.5;
      return isPointInsideMaskLines(cx, cy, maskLines) ? code : "";
    }),
  );
}

/**
 * Keep only canvas IDs that exist in templatePreset.canvases, removing duplicates.
 * Mirrors normalizeBookAppliedSegments from domain/book/grid.js.
 * @param {string[]} canvasIds
 * @param {{ canvases: Object }} templatePreset
 * @returns {string[]}
 */
function normalizeTemplateAppliedCanvases(canvasIds, templatePreset) {
  if (!Array.isArray(canvasIds) || !templatePreset?.canvases) {
    return [];
  }
  const validIds = new Set(templatePreset.canvases.map((c) => c.id));
  const seen = new Set();
  return canvasIds.filter((id) => {
    if (!validIds.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

/**
 * Validate and normalize a single stored crop rectangle.
 * Mirrors normalizeStoredBookCrop from domain/book/grid.js.
 * @param {Object|null} crop
 * @returns {Object|null}
 */
function normalizeStoredTemplateCrop(crop) {
  if (!crop || typeof crop !== "object") {
    return null;
  }

  const x = Number(crop.x);
  const y = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  if (x < 0 || y < 0 || width <= 0 || height <= 0) {
    return null;
  }

  const normalizedWidth = clamp(width, 0.02, 1);
  const normalizedHeight = clamp(height, 0.02, 1);
  return {
    x: clamp(x, 0, 1 - normalizedWidth),
    y: clamp(y, 0, 1 - normalizedHeight),
    width: normalizedWidth,
    height: normalizedHeight,
    source_filename: typeof crop.source_filename === "string" && crop.source_filename.trim()
      ? crop.source_filename.trim()
      : null,
  };
}

/**
 * Keep only crops whose keys exist in templatePreset.canvases, normalizing each.
 * Mirrors normalizeBookSegmentCrops from domain/book/grid.js.
 * @param {Object} crops
 * @param {{ canvases: Object }} templatePreset
 * @returns {Object}
 */
function normalizeTemplateCanvasCrops(crops, templatePreset) {
  if (!crops || typeof crops !== "object" || !templatePreset?.canvases) {
    return {};
  }

  const validIds = new Set(templatePreset.canvases.map((c) => c.id));
  const normalized = {};
  for (const [canvasId, crop] of Object.entries(crops)) {
    if (!validIds.has(canvasId)) {
      continue;
    }
    const normalizedCrop = normalizeStoredTemplateCrop(crop);
    if (!normalizedCrop) {
      continue;
    }
    normalized[canvasId] = normalizedCrop;
  }
  return normalized;
}

/**
 * Compute the integer bounding box of all maskLines polygons.
 * Returns {x, y, w, h} where (x,y) is the top-left offset and (w,h) is the size.
 * Falls back to {x:0, y:0, w:canvasW, h:canvasH} if no maskLines.
 */
function computeMaskBBox(maskLines, canvasW, canvasH) {
  if (!maskLines?.length) {
    return { x: 0, y: 0, w: canvasW, h: canvasH };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const polygon of maskLines) {
    for (const pt of polygon) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const x2 = Math.min(canvasW, Math.ceil(maxX));
  const y2 = Math.min(canvasH, Math.ceil(maxY));

  return { x, y, w: x2 - x, h: y2 - y };
}

/**
 * Place a smaller grid (bboxW × bboxH) into a full canvas grid at offset (bboxX, bboxY),
 * then apply the mask. Returns the full canvas-sized grid.
 */
function embedBBoxGridIntoCanvas(bboxGrid, bbox, canvasW, canvasH, maskLines) {
  const fullGrid = Array.from({ length: canvasH }, () => Array.from({ length: canvasW }, () => ""));
  for (let row = 0; row < bbox.h; row += 1) {
    for (let col = 0; col < bbox.w; col += 1) {
      const targetRow = bbox.y + row;
      const targetCol = bbox.x + col;
      if (targetRow < canvasH && targetCol < canvasW && bboxGrid[row]?.[col]) {
        fullGrid[targetRow][targetCol] = bboxGrid[row][col];
      }
    }
  }
  return maskLines ? applyMaskToGridCodes(fullGrid, maskLines) : fullGrid;
}

export {
  isPointInsideMaskLines,
  applyMaskToGridCodes,
  computeMaskBBox,
  embedBBoxGridIntoCanvas,
  normalizeTemplateAppliedCanvases,
  normalizeTemplateCanvasCrops,
  normalizeStoredTemplateCrop,
};
