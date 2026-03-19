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
  ratioInput,
  getBookSegment,
  getActiveMode,
  getSelectedBookSegmentId,
}) {
  function getTargetCropRatio() {
    if (getActiveMode() === APP_MODES.BOOK) {
      const segment = getBookSegment(getSelectedBookSegmentId());
      return segment.width / BOOK_LAYOUT.usableHeight;
    }

    const [width, height] = ratioInput.value.split(":").map(Number);
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
