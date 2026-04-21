/*
Module: multi sketchbook filename helpers
Description: Filename builders for multi-sketchbook bundle and per-piece save files.
Domain: domain/multi
Dependencies: none
Usage:
  import { buildMultiPieceFilename, buildMultiBundleFilename } from "./filename.js";
*/

function stripExtension(name) {
  if (typeof name !== "string" || !name) return "file";
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed || "file";
  return trimmed.slice(0, lastDot);
}

function buildMultiPieceFilename(baseName, totalCount, pieceIndex1Based) {
  const base = stripExtension(baseName || "file");
  return `${base}_multi_${totalCount}x${pieceIndex1Based}.dudot.json`;
}

function buildMultiBundleFilename(baseName, rows, cols) {
  const base = stripExtension(baseName || "file");
  return `${base}_multi_${rows}x${cols}_bundle.dudot.json`;
}

export {
  buildMultiBundleFilename,
  buildMultiPieceFilename,
  stripExtension,
};
