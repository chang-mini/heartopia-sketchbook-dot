/*
Module: multi sketchbook layout
Description: Pure layout math for multi-sketchbook split count, piece rects, and overall crop ratio.
Domain: domain/multi
Dependencies: ../../config/app-constants.js
Usage:
  import { getLayoutOptionsForCount, computeOverallCropRatio, computePieceRects } from "./layout.js";
*/

import { MULTI_LAYOUTS, MULTI_SPLIT_OPTIONS } from "../../config/app-constants.js";

function getLayoutOptionsForCount(count) {
  const options = MULTI_LAYOUTS[count];
  return Array.isArray(options) ? options.slice() : [];
}

function isValidSplitCount(count) {
  return MULTI_SPLIT_OPTIONS.includes(Number(count));
}

function computeOverallCropRatio(pieceRatio, layout) {
  if (!layout || !Number.isFinite(pieceRatio) || pieceRatio <= 0) {
    return pieceRatio || 1;
  }

  const rows = Number(layout.rows);
  const cols = Number(layout.cols);
  if (!(rows > 0) || !(cols > 0)) {
    return pieceRatio;
  }

  // piece ratio = pw/ph. Overall = (cols × pw) / (rows × ph) = (cols/rows) × pieceRatio
  return (cols / rows) * pieceRatio;
}

function computePieceRects(cropSelection, layout) {
  if (!cropSelection || !layout) {
    return [];
  }

  const rows = Number(layout.rows);
  const cols = Number(layout.cols);
  if (!(rows > 0) || !(cols > 0)) {
    return [];
  }

  const { x, y, width, height } = cropSelection;
  const pieceW = width / cols;
  const pieceH = height / rows;
  const rects = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      rects.push({
        index: row * cols + col,
        row,
        col,
        x: x + (col * pieceW),
        y: y + (row * pieceH),
        width: pieceW,
        height: pieceH,
      });
    }
  }

  return rects;
}

function normalizeLayout(layout) {
  if (!layout) return null;
  const rows = Number(layout.rows);
  const cols = Number(layout.cols);
  if (!(rows > 0) || !(cols > 0)) return null;
  return {
    rows,
    cols,
    count: rows * cols,
    label: `${rows}×${cols}`,
    locked: Boolean(layout.locked),
  };
}

function getDefaultLayoutForCount(count) {
  const options = getLayoutOptionsForCount(count);
  return options.length > 0 ? options[0] : null;
}

export {
  computeOverallCropRatio,
  computePieceRects,
  getDefaultLayoutForCount,
  getLayoutOptionsForCount,
  isValidSplitCount,
  normalizeLayout,
};
