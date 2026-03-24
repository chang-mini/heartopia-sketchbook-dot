/*
Module: crop ratio controller
Description: Target crop ratio calculations for sketchbook and book modes.
Domain: application
Dependencies: none
Usage:
  const { getTargetCropRatio, getTargetCropRatioLabel } = createCropRatioController({...});
*/

function createCropRatioController({
  APP_MODES,
  BOOK_LAYOUT,
  CANVAS_PRESETS,
  ratioInput,
  precisionInput,
  getBookSegment,
  getActiveMode,
  getSelectedBookSegmentId,
}) {
  function getTargetCropRatio() {
    if (getActiveMode() === APP_MODES.BOOK) {
      const segment = getBookSegment(getSelectedBookSegmentId());
      return segment.width / BOOK_LAYOUT.usableHeight;
    }

    const ratio = ratioInput.value;
    const precision = Number(precisionInput.value);
    const preset = CANVAS_PRESETS[ratio]?.[precision];
    if (preset) {
      return preset[0] / preset[1];
    }

    const [width, height] = ratio.split(":").map(Number);
    return width > 0 && height > 0 ? width / height : 1;
  }

  function getTargetCropRatioLabel() {
    if (getActiveMode() === APP_MODES.BOOK) {
      const segment = getBookSegment(getSelectedBookSegmentId());
      return `${segment.width}:${BOOK_LAYOUT.usableHeight}`;
    }

    return ratioInput.value;
  }

  return {
    getTargetCropRatio,
    getTargetCropRatioLabel,
  };
}

export { createCropRatioController };
