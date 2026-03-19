/*
Module: browser files
Description: Browser-only helpers for blobs and downloads.
Domain: infrastructure/browser
Dependencies: none
Usage:
  import { canvasToBlob, triggerFileDownload } from "./files.js";
*/

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, 0.95);
  });
}

function getPreferredUploadType(fileType) {
  return ["image/png", "image/jpeg", "image/webp"].includes(fileType) ? fileType : "image/png";
}

function buildCroppedFilename(filename, mimeType) {
  const extension = mimeType === "image/jpeg"
    ? ".jpg"
    : mimeType === "image/webp"
      ? ".webp"
      : ".png";
  const baseName = filename.replace(/\.[^.]+$/, "") || "upload";
  return `${baseName}-crop${extension}`;
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export {
  buildCroppedFilename,
  canvasToBlob,
  getPreferredUploadType,
  triggerFileDownload,
};
