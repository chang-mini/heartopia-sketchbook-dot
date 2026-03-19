/*
Module: conversion session controller
Description: Conversion snapshot normalization, completion handling, and session tracking state.
Domain: application
Dependencies: none
Usage:
  const conversionSession = createConversionSessionController({...});
  conversionSession.handleSnapshot(snapshot);
*/

function createConversionSessionController({
  APP_MODES,
  BOOK_LAYOUT,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
  createEmptyGridCodes,
  cloneGridCodes,
  mergeBookSegmentIntoGrid,
  buildBookSnapshotFromGrid,
  buildCurrentBookSegmentCrop,
  formatStatus,
  setStatus,
  renderCompleted,
  renderError,
  updateSaveButtonState,
  getActiveMode,
  getSelectedBookSegmentId,
  getSelectedFile,
  getCurrentResultSnapshot,
  setCurrentResultSnapshot,
  getBookSnapshot,
  setBookSnapshot,
  getSketchbookSnapshot,
  setSketchbookSnapshot,
  getPendingConversionContext,
  setPendingConversionContext,
  getActiveSocket,
  setActiveSocket,
  setActiveJobId,
  setPollingHandle,
  setSubmitEnabled,
}) {
  function createIdlePendingContext() {
    return {
      mode: getActiveMode(),
      bookSegmentId: null,
      bookSegmentCrop: null,
    };
  }

  function buildPortableSnapshot(snapshot) {
    return {
      job_id: snapshot.job_id || `local-${Date.now()}`,
      filename: snapshot.filename || "saved-dot-guide",
      ratio: snapshot.ratio,
      precision: snapshot.precision,
      status: "completed",
      progress: 100,
      message: snapshot.message || "저장된 도안 파일",
      created_at: snapshot.created_at || new Date().toISOString(),
      updated_at: snapshot.updated_at || snapshot.created_at || new Date().toISOString(),
      width: snapshot.width,
      height: snapshot.height,
      used_colors: Array.isArray(snapshot.used_colors) ? snapshot.used_colors : [],
      grid_codes: Array.isArray(snapshot.grid_codes) ? snapshot.grid_codes : [],
      canvas_mode: snapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK,
      book_selected_segment: snapshot.book_selected_segment || getSelectedBookSegmentId(),
      book_applied_segments: normalizeBookAppliedSegments(snapshot.book_applied_segments),
      book_segment_crops: normalizeBookSegmentCrops(snapshot.book_segment_crops),
    };
  }

  function handleSnapshot(snapshot) {
    setStatus(formatStatus(snapshot.status), snapshot.message, snapshot.progress);
    const pendingConversionContext = getPendingConversionContext();

    if (snapshot.status === "completed") {
      if (pendingConversionContext.mode === APP_MODES.BOOK) {
        const currentBookSnapshot = getBookSnapshot();
        const currentResultSnapshot = getCurrentResultSnapshot();
        const baseGridCodes = currentBookSnapshot?.grid_codes?.length
          ? cloneGridCodes(currentBookSnapshot.grid_codes)
          : createEmptyGridCodes(BOOK_LAYOUT.width, BOOK_LAYOUT.height, "");
        const nextAppliedSegments = normalizeBookAppliedSegments([
          ...(currentBookSnapshot?.book_applied_segments || []),
          pendingConversionContext.bookSegmentId,
        ]);
        const nextSegmentCrops = {
          ...normalizeBookSegmentCrops(currentBookSnapshot?.book_segment_crops || currentResultSnapshot?.book_segment_crops),
        };
        const currentSegmentCrop = pendingConversionContext.bookSegmentCrop || buildCurrentBookSegmentCrop();
        if (pendingConversionContext.bookSegmentId && currentSegmentCrop) {
          nextSegmentCrops[pendingConversionContext.bookSegmentId] = currentSegmentCrop;
        }
        const mergedGridCodes = mergeBookSegmentIntoGrid(baseGridCodes, pendingConversionContext.bookSegmentId, snapshot.grid_codes);
        const nextBookSnapshot = buildBookSnapshotFromGrid(
          mergedGridCodes,
          getSelectedFile()?.name || snapshot.filename,
          nextAppliedSegments,
          nextSegmentCrops,
        );
        setBookSnapshot(nextBookSnapshot);
        if (getActiveMode() === APP_MODES.BOOK) {
          setCurrentResultSnapshot(nextBookSnapshot);
        }
      } else {
        const nextSketchbookSnapshot = buildPortableSnapshot({
          ...snapshot,
          canvas_mode: APP_MODES.SKETCHBOOK,
        });
        setSketchbookSnapshot(nextSketchbookSnapshot);
        if (getActiveMode() === APP_MODES.SKETCHBOOK) {
          setCurrentResultSnapshot(nextSketchbookSnapshot);
        }
      }

      const nextCurrentResultSnapshot = getCurrentResultSnapshot();
      updateSaveButtonState(pendingConversionContext.mode === getActiveMode() && Boolean(nextCurrentResultSnapshot));
      if (pendingConversionContext.mode === getActiveMode() && nextCurrentResultSnapshot) {
        renderCompleted(nextCurrentResultSnapshot);
      }
      finishTracking();
      return;
    }

    if (snapshot.status === "failed") {
      renderError(snapshot.error || snapshot.message || "변환에 실패했습니다.");
      finishTracking();
    }
  }

  function stopPolling() {
    setPollingHandle(null);
  }

  function stopTracking() {
    stopPolling();
    const activeSocket = getActiveSocket();
    if (activeSocket) {
      activeSocket.close();
      setActiveSocket(null);
    }
    setActiveJobId(null);
    setPendingConversionContext(createIdlePendingContext());
  }

  function finishTracking() {
    stopPolling();
    setActiveJobId(null);
    setPendingConversionContext(createIdlePendingContext());
    setSubmitEnabled(true);
  }

  return {
    buildPortableSnapshot,
    finishTracking,
    handleSnapshot,
    stopTracking,
  };
}

export { createConversionSessionController };
