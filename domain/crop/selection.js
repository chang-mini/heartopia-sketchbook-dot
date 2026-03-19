/*
Module: crop selection
Description: Crop selection geometry, normalization, and display-rect helpers.
Domain: domain/crop
Dependencies: none
Usage:
  const cropSelection = createCropSelectionController({...});
  const nextSelection = cropSelection.computeResizedSelection(session, event);
*/

function createCropSelectionController({
  cropViews,
  cropImage,
  getCropViewByKey,
  getReferenceCropView,
  getNaturalCropImageElement,
  getTargetCropRatio,
  clamp,
}) {
  function cloneCropSelection(selection) {
    return selection ? { ...selection } : null;
  }

  function cloneDisplayCropRect(rect) {
    return rect ? { ...rect } : null;
  }

  function getCropDisplayMetrics(view = cropViews.sidebar) {
    if (!view?.frame || !view?.image) {
      return null;
    }

    const frameRect = view.frame.getBoundingClientRect();
    const imageRect = view.image.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height || !imageRect.width || !imageRect.height) {
      return null;
    }

    return {
      viewportLeft: imageRect.left,
      viewportTop: imageRect.top,
      width: imageRect.width,
      height: imageRect.height,
      offsetLeft: imageRect.left - frameRect.left,
      offsetTop: imageRect.top - frameRect.top,
    };
  }

  function buildDisplayCropRect(selection, view) {
    const metrics = getCropDisplayMetrics(view);
    if (!selection || !metrics) {
      return null;
    }

    return {
      left: selection.x * metrics.width,
      top: selection.y * metrics.height,
      width: selection.width * metrics.width,
      height: selection.height * metrics.height,
      frameWidth: metrics.width,
      frameHeight: metrics.height,
    };
  }

  function isDisplayCropRectAligned(rect, metrics) {
    if (!rect || !metrics) {
      return false;
    }

    return Math.abs((rect.frameWidth || 0) - metrics.width) < 0.5
      && Math.abs((rect.frameHeight || 0) - metrics.height) < 0.5;
  }

  function normalizeDisplayCropRect(rect, frameWidth = rect?.frameWidth, frameHeight = rect?.frameHeight) {
    if (!rect || !frameWidth || !frameHeight) {
      return null;
    }

    return normalizeCropSelection(rect.left, rect.top, rect.width, rect.height, frameWidth, frameHeight);
  }

  function createCenteredCropSelection(viewKey = "sidebar") {
    return createCropSelection(0.9, viewKey);
  }

  function createFullCropSelection() {
    return {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
  }

  function createCropSelection(maxCoverage, viewKey = getReferenceCropView().key) {
    const referenceView = getCropViewByKey(viewKey);
    const metrics = getCropDisplayMetrics(referenceView);
    const naturalImage = referenceView.image?.naturalWidth ? referenceView.image : getNaturalCropImageElement();
    const imageWidth = metrics?.width || naturalImage?.naturalWidth || cropImage.naturalWidth;
    const imageHeight = metrics?.height || naturalImage?.naturalHeight || cropImage.naturalHeight;
    const targetRatio = getTargetCropRatio();
    const minDimension = 0.02;
    let width = imageWidth * maxCoverage;
    let height = width / targetRatio;

    if (!Number.isFinite(height) || height > imageHeight * maxCoverage) {
      height = imageHeight * maxCoverage;
      width = height * targetRatio;
    }

    if (width < imageWidth * minDimension) {
      width = imageWidth * minDimension;
      height = width / targetRatio;
    }

    if (height < imageHeight * minDimension) {
      height = imageHeight * minDimension;
      width = height * targetRatio;
    }

    if (width > imageWidth) {
      width = imageWidth;
      height = width / targetRatio;
    }

    if (height > imageHeight) {
      height = imageHeight;
      width = height * targetRatio;
    }

    const left = (imageWidth - width) / 2;
    const top = (imageHeight - height) / 2;

    return normalizeCropSelection(left, top, width, height, imageWidth, imageHeight);
  }

  function computeMovedSelection(session, event) {
    const nextRect = computeMovedDisplayRect(session, event);
    return normalizeDisplayCropRect(nextRect, session.frameWidth, session.frameHeight);
  }

  function computeMovedDisplayRect(session, event) {
    const dx = (event.clientX - session.startPointerX) / session.frameWidth;
    const dy = (event.clientY - session.startPointerY) / session.frameHeight;

    return {
      left: clamp(session.startLeft + (dx * session.frameWidth), 0, session.frameWidth - session.startWidth),
      top: clamp(session.startTop + (dy * session.frameHeight), 0, session.frameHeight - session.startHeight),
      width: session.startWidth,
      height: session.startHeight,
      frameWidth: session.frameWidth,
      frameHeight: session.frameHeight,
    };
  }

  function computeResizedSelection(session, event) {
    const nextRect = computeResizedDisplayRect(session, event);
    return normalizeDisplayCropRect(nextRect, session.frameWidth, session.frameHeight);
  }

  function computeResizedDisplayRect(session, event) {
    const pointerX = clamp(event.clientX - session.frameLeft - (session.pointerOffsetX || 0), 0, session.frameWidth);
    const pointerY = clamp(event.clientY - session.frameTop - (session.pointerOffsetY || 0), 0, session.frameHeight);
    const startLeft = session.startLeft;
    const startTop = session.startTop;
    const startWidth = session.startWidth;
    const startHeight = session.startHeight;
    const targetRatio = getTargetCropRatio();
    const minWidth = getMinimumCropWidth(session.frameWidth, session.frameHeight, targetRatio);

    let anchorX = startLeft;
    let anchorY = startTop;
    let widthToPointer = 0;
    let heightToPointer = 0;
    let maxWidth = session.frameWidth;
    let maxHeight = session.frameHeight;

    switch (session.handle) {
      case "nw":
        anchorX = startLeft + startWidth;
        anchorY = startTop + startHeight;
        widthToPointer = anchorX - pointerX;
        heightToPointer = anchorY - pointerY;
        maxWidth = anchorX;
        maxHeight = anchorY;
        break;
      case "ne":
        anchorX = startLeft;
        anchorY = startTop + startHeight;
        widthToPointer = pointerX - anchorX;
        heightToPointer = anchorY - pointerY;
        maxWidth = session.frameWidth - anchorX;
        maxHeight = anchorY;
        break;
      case "sw":
        anchorX = startLeft + startWidth;
        anchorY = startTop;
        widthToPointer = anchorX - pointerX;
        heightToPointer = pointerY - anchorY;
        maxWidth = anchorX;
        maxHeight = session.frameHeight - anchorY;
        break;
      case "se":
      default:
        anchorX = startLeft;
        anchorY = startTop;
        widthToPointer = pointerX - anchorX;
        heightToPointer = pointerY - anchorY;
        maxWidth = session.frameWidth - anchorX;
        maxHeight = session.frameHeight - anchorY;
        break;
    }

    const maxAllowedWidth = Math.max(1, Math.min(maxWidth, maxHeight * targetRatio));
    const lowerBound = Math.min(minWidth, maxAllowedWidth);
    const baseWidth = Math.max(widthToPointer, heightToPointer * targetRatio, lowerBound);
    const width = clamp(baseWidth, lowerBound, maxAllowedWidth);
    const height = width / targetRatio;

    let left = anchorX;
    let top = anchorY;

    if (session.handle?.includes("w")) {
      left = anchorX - width;
    }
    if (session.handle?.includes("n")) {
      top = anchorY - height;
    }

    return {
      left,
      top,
      width,
      height,
      frameWidth: session.frameWidth,
      frameHeight: session.frameHeight,
    };
  }

  function normalizeCropSelection(left, top, width, height, frameWidth, frameHeight) {
    const normalizedWidth = clamp(width / frameWidth, 0.02, 1);
    const normalizedHeight = clamp(height / frameHeight, 0.02, 1);
    const normalizedLeft = clamp(left / frameWidth, 0, 1 - normalizedWidth);
    const normalizedTop = clamp(top / frameHeight, 0, 1 - normalizedHeight);

    return {
      x: normalizedLeft,
      y: normalizedTop,
      width: normalizedWidth,
      height: normalizedHeight,
    };
  }

  function getMinimumCropWidth(frameWidth, frameHeight, targetRatio) {
    const minimumHeight = frameHeight * 0.02;
    const minimumWidth = Math.max(frameWidth * 0.02, minimumHeight * targetRatio);
    return Math.min(minimumWidth, frameWidth);
  }

  function getCropPixelsForSelection(selection) {
    const naturalImage = getNaturalCropImageElement();
    if (!selection || !naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
      return null;
    }

    let left = Math.round(selection.x * naturalImage.naturalWidth);
    let top = Math.round(selection.y * naturalImage.naturalHeight);
    let width = Math.round(selection.width * naturalImage.naturalWidth);
    let height = Math.round(selection.height * naturalImage.naturalHeight);

    width = clamp(Math.max(width, 1), 1, naturalImage.naturalWidth);
    height = clamp(Math.max(height, 1), 1, naturalImage.naturalHeight);
    left = clamp(left, 0, naturalImage.naturalWidth - width);
    top = clamp(top, 0, naturalImage.naturalHeight - height);

    return { left, top, width, height };
  }

  function isFullCropSelection(selection) {
    if (!selection) {
      return false;
    }

    return selection.x === 0
      && selection.y === 0
      && selection.width === 1
      && selection.height === 1;
  }

  return {
    buildDisplayCropRect,
    cloneCropSelection,
    cloneDisplayCropRect,
    computeMovedDisplayRect,
    computeMovedSelection,
    computeResizedDisplayRect,
    computeResizedSelection,
    createCenteredCropSelection,
    createCropSelection,
    createFullCropSelection,
    getCropDisplayMetrics,
    getCropPixelsForSelection,
    isDisplayCropRectAligned,
    isFullCropSelection,
    normalizeCropSelection,
    normalizeDisplayCropRect,
  };
}

export { createCropSelectionController };
