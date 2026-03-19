/*
Module: book grid
Description: Book-cover grid helpers and crop normalization logic.
Domain: domain/book
Dependencies: ../../config/app-constants.js, ../shared/math.js
Usage:
  import { mergeBookSegmentIntoGrid, normalizeBookSegmentCrops } from "./grid.js";
*/

import { BOOK_LAYOUT } from "../../config/app-constants.js";
import { clamp } from "../shared/math.js";

function createEmptyGridCodes(width, height, fillCode = "") {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fillCode));
}

function cloneGridCodes(gridCodes) {
  return gridCodes.map((row) => [...row]);
}

function getBookSegment(segmentId) {
  return BOOK_LAYOUT.segments[segmentId] || BOOK_LAYOUT.segments.back_cover;
}

function getBookFullGuideSegments() {
  return [
    BOOK_LAYOUT.segments.back_cover,
    BOOK_LAYOUT.segments.spine,
    BOOK_LAYOUT.segments.front_cover,
  ];
}

function normalizeBookAppliedSegments(segments) {
  if (!Array.isArray(segments)) {
    return [];
  }
  const seen = new Set();
  return segments.filter((segmentId) => {
    if (!BOOK_LAYOUT.segments[segmentId] || seen.has(segmentId)) {
      return false;
    }
    seen.add(segmentId);
    return true;
  });
}

function normalizeStoredBookCrop(crop) {
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

function normalizeBookSegmentCrops(crops) {
  if (!crops || typeof crops !== "object") {
    return {};
  }

  const normalized = {};
  for (const [segmentId, crop] of Object.entries(crops)) {
    if (!BOOK_LAYOUT.segments[segmentId]) {
      continue;
    }
    const normalizedCrop = normalizeStoredBookCrop(crop);
    if (!normalizedCrop) {
      continue;
    }
    normalized[segmentId] = normalizedCrop;
  }
  return normalized;
}

function mergeBookSegmentIntoGrid(baseGridCodes, segmentId, segmentGridCodes) {
  const segment = getBookSegment(segmentId);
  const nextGridCodes = cloneGridCodes(baseGridCodes);
  for (let row = 0; row < BOOK_LAYOUT.usableHeight; row += 1) {
    const targetRow = BOOK_LAYOUT.topBlockedRows + row;
    for (let offset = 0; offset < segment.width; offset += 1) {
      nextGridCodes[targetRow][segment.startColumn + offset] = segmentGridCodes[row]?.[offset] || "";
    }
  }
  return nextGridCodes;
}

export {
  cloneGridCodes,
  createEmptyGridCodes,
  getBookFullGuideSegments,
  getBookSegment,
  mergeBookSegmentIntoGrid,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
  normalizeStoredBookCrop,
};
