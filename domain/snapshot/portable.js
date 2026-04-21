/*
Module: portable snapshot
Description: Portable save-file detection and naming helpers.
Domain: domain/snapshot
Dependencies: ../../config/app-constants.js
Usage:
  import { buildSavedFilename, extractPortableSnapshot, isPortableSnapshot, isMultiBundleSnapshot } from "./portable.js";
*/

import { APP_MODES } from "../../config/app-constants.js";

function buildSavedFilename(snapshot) {
  const baseName = (snapshot.filename || "duduta-dot").replace(/\.[^.]+$/, "") || "duduta-dot";
  if (snapshot.canvas_mode === APP_MODES.MULTI_SKETCHBOOK) {
    const rows = snapshot.multi_layout?.rows ?? "x";
    const cols = snapshot.multi_layout?.cols ?? "x";
    return `${baseName}_multi_${rows}x${cols}_bundle.dudot.json`;
  }
  const modeLabel = snapshot.canvas_mode === APP_MODES.BOOK ? "book" : "sketchbook";
  return `${baseName}-${modeLabel}-${snapshot.ratio}-p${snapshot.precision}.dudot.json`;
}

function extractPortableSnapshot(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.type === "duduta-dot-save" && payload.snapshot) {
    return payload.snapshot;
  }

  if (payload.job && payload.job.grid_codes) {
    return payload.job;
  }

  return payload.grid_codes ? payload : null;
}

function isMultiBundleSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (snapshot.canvas_mode !== APP_MODES.MULTI_SKETCHBOOK) return false;
  if (!Array.isArray(snapshot.multi_pieces) || snapshot.multi_pieces.length === 0) return false;
  const expectedCount = Number(snapshot.multi_layout?.count);
  if (Number.isFinite(expectedCount) && expectedCount > 0 && snapshot.multi_pieces.length !== expectedCount) {
    return false;
  }
  return snapshot.multi_pieces.every((piece) => (
    piece
    && Array.isArray(piece.grid_codes)
    && piece.grid_codes.length > 0
  ));
}

function isPortableSnapshot(snapshot) {
  if (isMultiBundleSnapshot(snapshot)) {
    return true;
  }
  return Boolean(
    snapshot
    && Array.isArray(snapshot.grid_codes)
    && snapshot.grid_codes.length > 0
    && Array.isArray(snapshot.used_colors),
  );
}

export {
  buildSavedFilename,
  extractPortableSnapshot,
  isMultiBundleSnapshot,
  isPortableSnapshot,
};
