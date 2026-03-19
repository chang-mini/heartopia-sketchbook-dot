/*
Module: portable snapshot
Description: Portable save-file detection and naming helpers.
Domain: domain/snapshot
Dependencies: ../../config/app-constants.js
Usage:
  import { buildSavedFilename, extractPortableSnapshot, isPortableSnapshot } from "./portable.js";
*/

import { APP_MODES } from "../../config/app-constants.js";

function buildSavedFilename(snapshot) {
  const baseName = (snapshot.filename || "duduta-dot").replace(/\.[^.]+$/, "") || "duduta-dot";
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

function isPortableSnapshot(snapshot) {
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
  isPortableSnapshot,
};
