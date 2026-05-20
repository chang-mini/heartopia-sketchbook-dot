/*
Module: template crop overlays
Description: Renders maskLines polygon outlines on the crop selection area for clothes/furniture modes.
             Polygons are drawn relative to the mask bounding box so they fill the crop selection edge-to-edge.
Domain: domain/crop
Dependencies: ../template/grid.js
Usage:
  const { renderTemplateMaskOverlays } = createTemplateMaskOverlayRenderer({...});
*/

import { computeMaskBBox } from "../template/grid.js";

function createTemplateMaskOverlayRenderer({
  APP_MODES,
  getVisibleCropViews,
  getNaturalCropImageElement,
  getActiveMode,
  getCropDisplayMetrics,
  getCropSelectionForView,
  getCropSelection,
  getSelectedTemplateCanvas,
}) {
  function renderTemplateMaskOverlays() {
    getVisibleCropViews().forEach((view) => renderOnView(view));
  }

  function renderOnView(view) {
    const overlay = view.templateMaskOverlay;
    if (!overlay) {
      return;
    }

    const mode = getActiveMode();
    const isTemplate = mode === APP_MODES.CLOTHES || mode === APP_MODES.FURNITURE;
    const naturalImage = getNaturalCropImageElement();

    if (!isTemplate || !naturalImage?.naturalWidth) {
      overlay.hidden = true;
      overlay.innerHTML = "";
      return;
    }

    const tCanvas = getSelectedTemplateCanvas();
    if (!tCanvas?.maskLines?.length) {
      overlay.hidden = true;
      overlay.innerHTML = "";
      return;
    }

    const metrics = getCropDisplayMetrics(view);
    if (!metrics) {
      overlay.hidden = true;
      overlay.innerHTML = "";
      return;
    }

    const selection = getCropSelectionForView(view.key) || getCropSelection();
    if (!selection) {
      overlay.hidden = true;
      overlay.innerHTML = "";
      return;
    }

    const selLeft = metrics.offsetLeft + (selection.x * metrics.width);
    const selTop = metrics.offsetTop + (selection.y * metrics.height);
    const selWidth = selection.width * metrics.width;
    const selHeight = selection.height * metrics.height;

    if (selWidth < 2 || selHeight < 2) {
      overlay.hidden = true;
      overlay.innerHTML = "";
      return;
    }

    const { w, h, maskLines } = tCanvas;
    const bbox = computeMaskBBox(maskLines, w, h);
    const scaleX = selWidth / bbox.w;
    const scaleY = selHeight / bbox.h;

    const pathStrings = maskLines.map((polygon) => {
      const points = polygon.map((pt, i) => {
        const px = selLeft + ((pt.x - bbox.x) * scaleX);
        const py = selTop + ((pt.y - bbox.y) * scaleY);
        return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
      });
      return points.join(" ") + " Z";
    });

    const svgWidth = metrics.width + metrics.offsetLeft * 2;
    const svgHeight = metrics.height + metrics.offsetTop * 2;

    overlay.hidden = false;
    overlay.innerHTML = `<svg class="template-mask-svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <path d="${pathStrings.join(" ")}" fill="none" stroke="rgba(187, 92, 50, 0.6)" stroke-width="1.5" stroke-dasharray="4 3" />
    </svg>`;
  }

  return {
    renderTemplateMaskOverlays,
  };
}

export { createTemplateMaskOverlayRenderer };
