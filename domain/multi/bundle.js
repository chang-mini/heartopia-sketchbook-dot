/*
Module: multi sketchbook bundle builder
Description: Converts an in-memory multi-sketchbook session into the MULTI bundle disk format.
Domain: domain/multi
Dependencies: none
Usage:
  import { buildMultiBundleSnapshot } from "./bundle.js";
*/

function buildMultiBundleSnapshot(multiSnapshot) {
  if (!multiSnapshot) return null;

  const layout = multiSnapshot.layout
    ? {
      rows: Number(multiSnapshot.layout.rows),
      cols: Number(multiSnapshot.layout.cols),
      count: Number(multiSnapshot.layout.count ?? (multiSnapshot.layout.rows * multiSnapshot.layout.cols)),
    }
    : null;

  const pieces = Array.isArray(multiSnapshot.pieces)
    ? multiSnapshot.pieces.map((piece, index) => normalizePieceSnapshot(piece, index, multiSnapshot))
    : [];

  const nowIso = new Date().toISOString();

  return {
    canvas_mode: "multi_sketchbook",
    job_id: multiSnapshot.sessionId || `multi-${Date.now()}`,
    status: "completed",
    progress: 100,
    message: multiSnapshot.message || "멀티스케치북 도안",
    multi_layout: layout,
    multi_pieces: pieces,
    active_piece_index: multiSnapshot.activePieceIndex ?? null,
    source_filename: multiSnapshot.sourceFilename || null,
    filename: multiSnapshot.sourceFilename || null,
    ratio: multiSnapshot.pieceRatio || null,
    precision: multiSnapshot.piecePrecision ?? null,
    width: pieces[0]?.width ?? null,
    height: pieces[0]?.height ?? null,
    used_colors: [],
    grid_codes: [],
    created_at: multiSnapshot.createdAt || nowIso,
    updated_at: nowIso,
  };
}

function normalizePieceSnapshot(piece, index, parent) {
  return {
    canvas_mode: "sketchbook",
    job_id: piece?.job_id || `${parent?.sessionId || "multi"}-p${index + 1}`,
    status: "completed",
    progress: 100,
    filename: piece?.filename || `${parent?.sourceFilename || "piece"}_p${index + 1}.png`,
    ratio: piece?.ratio ?? parent?.pieceRatio ?? null,
    precision: piece?.precision ?? parent?.piecePrecision ?? null,
    width: piece?.width ?? null,
    height: piece?.height ?? null,
    used_colors: Array.isArray(piece?.used_colors) ? piece.used_colors : [],
    grid_codes: Array.isArray(piece?.grid_codes) ? piece.grid_codes : [],
    message: piece?.message || "",
    created_at: piece?.created_at || parent?.createdAt || new Date().toISOString(),
    updated_at: piece?.updated_at || new Date().toISOString(),
  };
}

export { buildMultiBundleSnapshot, normalizePieceSnapshot };
