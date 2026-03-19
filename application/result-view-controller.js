/*
Module: result view controller
Description: Conversion status display, result rendering, and guide viewer reset orchestration.
Domain: application
Dependencies: none
Usage:
  const resultViewController = createResultViewController({...});
  resultViewController.renderCompleted(snapshot);
*/

function createResultViewController({
  statusPill,
  progressBar,
  guideEmpty,
  guideEmptyText,
  guideViewport,
  viewerNote,
  zoomOutButton,
  zoomResetButton,
  zoomInButton,
  saveCurrentButton,
  viewerState,
  renderPalette,
  loadGuideGrid,
  clearGuideCanvas,
  renderBookCropOverlays,
  scheduleGuideViewportFit,
  restoreModeUiStateForSnapshot,
  setPaletteVisibility,
  getCurrentResultSnapshot,
  setCurrentResultSnapshot,
  setGuideInteraction,
}) {
  function setStatus(label, message, progress) {
    if (statusPill) {
      statusPill.textContent = label;
      statusPill.title = message;
    }
    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(progress || 0, 100))}%`;
    }
  }

  function renderCompleted(snapshot) {
    if (!Array.isArray(snapshot.grid_codes) || snapshot.grid_codes.length === 0 || !Array.isArray(snapshot.grid_codes[0])) {
      renderError("도안 칸 데이터를 불러오지 못했습니다.");
      return;
    }

    renderPalette(snapshot.used_colors || []);
    loadGuideGrid(snapshot.grid_codes, snapshot.used_colors || []);
    restoreModeUiStateForSnapshot(snapshot);
    setPaletteVisibility((snapshot.used_colors || []).length > 0);
    renderBookCropOverlays();
    scheduleGuideViewportFit();
  }

  function renderError(message) {
    if (statusPill) {
      statusPill.textContent = "실패";
      statusPill.title = message;
    }
    prepareGuideViewer(message);
    renderPalette([]);
    setPaletteVisibility(false);
  }

  function resetResultArea(message = "도안 생성 후 여기서 바로 확대하고 이동할 수 있습니다.") {
    prepareGuideViewer(message);
    renderPalette([]);
    setPaletteVisibility(false);
  }

  function prepareGuideViewer(message) {
    setGuideMessage(message);
    guideEmpty.hidden = false;
    guideViewport?.classList.remove("is-ready", "is-dragging");
    setGuideControlsEnabled(false);
    setCurrentResultSnapshot(null);
    viewerState.gridCodes = [];
    viewerState.paletteByCode = new Map();
    viewerState.columns = 0;
    viewerState.rows = 0;
    viewerState.fitScale = 1;
    viewerState.scale = 1;
    viewerState.minScale = 1;
    viewerState.maxScale = 1;
    viewerState.panX = 0;
    viewerState.panY = 0;
    viewerState.hoverColumn = null;
    viewerState.hoverRow = null;
    viewerState.activeColorCode = null;
    viewerState.activeColorCodes = [];
    viewerState.completedCells = new Set();
    setGuideInteraction(null);
    clearGuideCanvas();
    updateSaveButtonState(false);
  }

  function setGuideMessage(message) {
    viewerNote.textContent = message;
    guideEmptyText.textContent = message;
  }

  function setGuideControlsEnabled(enabled) {
    zoomOutButton.disabled = !enabled;
    zoomResetButton.disabled = !enabled;
    zoomInButton.disabled = !enabled;
  }

  function updateSaveButtonState(enabled) {
    if (!saveCurrentButton) {
      return;
    }
    saveCurrentButton.disabled = !enabled;
    saveCurrentButton.textContent = "저장";
  }

  return {
    prepareGuideViewer,
    renderCompleted,
    renderError,
    resetResultArea,
    setGuideControlsEnabled,
    setGuideMessage,
    setStatus,
    updateSaveButtonState,
  };
}

export { createResultViewController };
