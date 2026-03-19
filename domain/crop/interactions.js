/*
Module: crop interactions
Description: Crop selection rendering, pointer interactions, and layout refresh orchestration.
Domain: domain/crop
Dependencies: none
Usage:
  const cropInteractions = createCropInteractionController({...});
  cropFrame.addEventListener("pointerdown", cropInteractions.handleCropPointerDown);
*/

function createCropInteractionController({
  getVisibleCropViews,
  getCropViewByKey,
  getCropSelectionForView,
  setCropSelectionForView,
  getCropSelection,
  getExpandedCropSelection,
  setExpandedCropSelection,
  getExpandedCropDraft,
  setExpandedCropDraft,
  getNaturalCropImageElement,
  getSelectedFile,
  getTargetCropRatioLabel,
  createCenteredCropSelection,
  createFullCropSelection,
  getCropDisplayMetrics,
  buildDisplayCropRect,
  isDisplayCropRectAligned,
  cloneDisplayCropRect,
  normalizeDisplayCropRect,
  computeMovedDisplayRect,
  computeMovedSelection,
  computeResizedDisplayRect,
  computeResizedSelection,
  getCropPixelsForSelection,
  renderBookCropOverlays,
}) {
  let cropInteraction = null;
  let cropLayoutRefreshHandle = null;

  function scheduleCropLayoutRefresh() {
    if (cropLayoutRefreshHandle) {
      window.cancelAnimationFrame(cropLayoutRefreshHandle);
    }
    cropLayoutRefreshHandle = window.requestAnimationFrame(() => {
      cropLayoutRefreshHandle = null;
      renderCropSelection();
    });
  }

  function resetCropSelection(viewKey = "sidebar") {
    const view = getCropViewByKey(viewKey);
    const naturalImage = view.image?.naturalWidth ? view.image : getNaturalCropImageElement();
    if (!naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
      return;
    }

    setCropSelectionForView(viewKey, createCenteredCropSelection(viewKey));
    renderCropSelection();
  }

  function applyDefaultCropSelection(viewKey = "sidebar") {
    const view = getCropViewByKey(viewKey);
    const naturalImage = view.image?.naturalWidth ? view.image : getNaturalCropImageElement();
    if (!naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
      return;
    }

    setCropSelectionForView(viewKey, createCenteredCropSelection(viewKey));
    renderCropSelection();
  }

  function selectFullCropSelection(viewKey = "sidebar") {
    const view = getCropViewByKey(viewKey);
    const naturalImage = view.image?.naturalWidth ? view.image : getNaturalCropImageElement();
    if (!naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
      return;
    }

    setCropSelectionForView(viewKey, createFullCropSelection());
    renderCropSelection();
  }

  function renderCropSelection() {
    getVisibleCropViews().forEach((view) => renderCropSelectionOnView(view));
    renderBookCropOverlays();
  }

  function renderCropSelectionOnView(view) {
    if (!view?.box) {
      return;
    }

    const selection = getCropSelectionForView(view.key) || (view.key === "expanded" ? getCropSelection() : null);
    if (!selection) {
      view.box.hidden = true;
      view.box.classList.remove("is-dragging");
      if (view.meta && !getSelectedFile()) {
        view.meta.textContent = view.key === "expanded"
          ? "사진을 열면 확장 화면에서 범위를 조절할 수 있습니다."
          : "사진을 열면 여기서 변환할 범위를 선택할 수 있습니다.";
      }
      return;
    }

    const metrics = getCropDisplayMetrics(view);
    if (!metrics) {
      view.box.hidden = true;
      return;
    }

    let displayRect = null;
    if (view.key === "expanded") {
      if (!isDisplayCropRectAligned(getExpandedCropDraft(), metrics)) {
        setExpandedCropDraft(buildDisplayCropRect(selection, view));
      }
      displayRect = getExpandedCropDraft();
    } else {
      displayRect = buildDisplayCropRect(selection, view);
    }

    if (!displayRect) {
      view.box.hidden = true;
      return;
    }

    view.box.hidden = false;
    view.box.style.left = `${metrics.offsetLeft + displayRect.left}px`;
    view.box.style.top = `${metrics.offsetTop + displayRect.top}px`;
    view.box.style.width = `${displayRect.width}px`;
    view.box.style.height = `${displayRect.height}px`;
    if (view.meta) {
      view.meta.textContent = formatCropMeta(view.key);
    }
  }

  function formatCropMeta(viewKey = "sidebar") {
    const selection = getCropSelectionForView(viewKey) || (viewKey === "expanded" ? getCropSelection() : null);
    const cropPixels = getCropPixelsForSelection(selection);
    if (!cropPixels) {
      return viewKey === "expanded"
        ? "사진을 열면 확장 화면에서 범위를 조절할 수 있습니다."
        : "사진을 열면 여기서 변환할 범위를 선택할 수 있습니다.";
    }

    return `선택 영역 ${cropPixels.width} x ${cropPixels.height}px | 비율 ${getTargetCropRatioLabel()} | 드래그로 이동, 모서리로 크기 조절`;
  }

  function handleCropPointerDown(event) {
    const viewKey = event.currentTarget?.dataset.cropView || "sidebar";
    const view = getCropViewByKey(viewKey);
    const selection = getCropSelectionForView(viewKey) || (viewKey === "expanded" ? getCropSelection() : null);
    if (!selection || !view?.frame) {
      return;
    }

    const metrics = getCropDisplayMetrics(view);
    if (!metrics) {
      return;
    }
    let startRect = null;
    if (viewKey === "expanded" && isDisplayCropRectAligned(getExpandedCropDraft(), metrics)) {
      startRect = cloneDisplayCropRect(getExpandedCropDraft());
    } else {
      startRect = buildDisplayCropRect(selection, view);
    }
    if (!startRect) {
      return;
    }
    if (viewKey === "expanded") {
      setExpandedCropDraft(cloneDisplayCropRect(startRect));
    }

    const startLeft = startRect.left;
    const startTop = startRect.top;
    const startWidth = startRect.width;
    const startHeight = startRect.height;
    const visibleSelection = normalizeDisplayCropRect(startRect, metrics.width, metrics.height);

    const handle = event.target.closest("[data-handle]")?.dataset.handle ?? null;
    const handleEdgeX = handle?.includes("w") ? startLeft : startLeft + startWidth;
    const handleEdgeY = handle?.includes("n") ? startTop : startTop + startHeight;
    const pointerOffsetX = handle ? (event.clientX - (metrics.viewportLeft + handleEdgeX)) : 0;
    const pointerOffsetY = handle ? (event.clientY - (metrics.viewportTop + handleEdgeY)) : 0;
    cropInteraction = {
      pointerId: event.pointerId,
      mode: handle ? "resize" : "move",
      handle,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      frameLeft: metrics.viewportLeft,
      frameTop: metrics.viewportTop,
      frameWidth: metrics.width,
      frameHeight: metrics.height,
      startLeft,
      startTop,
      startWidth,
      startHeight,
      startSelection: visibleSelection,
      startRect,
      viewKey,
      pointerOffsetX,
      pointerOffsetY,
    };

    view.box.classList.add("is-dragging");
    view.box.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handleCropPointerMove(event) {
    if (!cropInteraction || event.pointerId !== cropInteraction.pointerId) {
      return;
    }

    if (cropInteraction.viewKey === "expanded") {
      const nextRect = cropInteraction.mode === "move"
        ? computeMovedDisplayRect(cropInteraction, event)
        : computeResizedDisplayRect(cropInteraction, event);
      if (!nextRect) {
        return;
      }
      setExpandedCropDraft(nextRect);
      setExpandedCropSelection(normalizeDisplayCropRect(nextRect, cropInteraction.frameWidth, cropInteraction.frameHeight));
    } else {
      const nextSelection = cropInteraction.mode === "move"
        ? computeMovedSelection(cropInteraction, event)
        : computeResizedSelection(cropInteraction, event);

      if (!nextSelection) {
        return;
      }

      setCropSelectionForView(cropInteraction.viewKey, nextSelection);
    }
    renderCropSelection();
    event.preventDefault();
  }

  function handleCropPointerEnd(event) {
    if (!cropInteraction || event.pointerId !== cropInteraction.pointerId) {
      return;
    }

    const view = getCropViewByKey(cropInteraction.viewKey);
    view.box?.classList.remove("is-dragging");
    view.box?.releasePointerCapture?.(event.pointerId);
    cropInteraction = null;
  }

  function getCropPixels() {
    return getCropPixelsForSelection(getCropSelection());
  }

  return {
    applyDefaultCropSelection,
    getCropPixels,
    handleCropPointerDown,
    handleCropPointerEnd,
    handleCropPointerMove,
    renderCropSelection,
    resetCropSelection,
    scheduleCropLayoutRefresh,
    selectFullCropSelection,
  };
}

export { createCropInteractionController };
