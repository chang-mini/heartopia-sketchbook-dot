/*
Module: crop ratio controller
Description: Target crop ratio calculations for sketchbook, book, and multi-sketchbook modes.
Domain: application
Dependencies: ../domain/multi/layout.js
Usage:
  const { getTargetCropRatio, getTargetCropRatioLabel } = createCropRatioController({...});
*/

import { computeOverallCropRatio } from "../domain/multi/layout.js";

function createCropRatioController({
  APP_MODES,
  BOOK_LAYOUT,
  CANVAS_PRESETS,
  ratioInput,
  precisionInput,
  getBookSegment,
  getActiveMode,
  getSelectedBookSegmentId,
  getMultiLayout = () => null,
}) {
  function getSketchbookPieceRatio() {
    const ratio = ratioInput.value;
    const precision = Number(precisionInput.value);
    const preset = CANVAS_PRESETS[ratio]?.[precision];
    if (preset) {
      return preset[0] / preset[1];
    }

    const [width, height] = ratio.split(":").map(Number);
    return width > 0 && height > 0 ? width / height : 1;
  }

  function getTargetCropRatio() {
    if (getActiveMode() === APP_MODES.BOOK) {
      const segment = getBookSegment(getSelectedBookSegmentId());
      return segment.width / BOOK_LAYOUT.usableHeight;
    }

    if (getActiveMode() === APP_MODES.MULTI_SKETCHBOOK) {
      const layout = getMultiLayout();
      return computeOverallCropRatio(getSketchbookPieceRatio(), layout);
    }

    return getSketchbookPieceRatio();
  }

  function getTargetCropRatioLabel() {
    if (getActiveMode() === APP_MODES.BOOK) {
      const segment = getBookSegment(getSelectedBookSegmentId());
      return `${segment.width}:${BOOK_LAYOUT.usableHeight}`;
    }

    if (getActiveMode() === APP_MODES.MULTI_SKETCHBOOK) {
      const layout = getMultiLayout();
      if (layout) {
        const [w, h] = ratioInput.value.split(":").map(Number);
        if (w > 0 && h > 0) {
          return `${w * layout.cols}:${h * layout.rows}`;
        }
      }
    }

    return ratioInput.value;
  }

  return {
    getTargetCropRatio,
    getTargetCropRatioLabel,
  };
}

export { createCropRatioController };
