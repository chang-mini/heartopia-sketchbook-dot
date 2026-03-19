/*
Module: grid color controller
Description: Guide grid color UI state, persistence, and redraw orchestration.
Domain: application
Dependencies: browser localStorage
Usage:
  const gridColorController = createGridColorController({...});
  gridColorController.applyGuideGridColor("#6f758b");
*/

function createGridColorController({
  DEFAULT_GUIDE_GRID_COLOR,
  GUIDE_GRID_COLOR_STORAGE_KEY,
  viewerState,
  guideViewport,
  gridColorControl,
  gridColorPanel,
  gridColorInput,
  gridColorValue,
  gridColorChip,
  gridColorSample,
  gridColorToggleButton,
  normalizeHexColor,
  rgbaFromHexColor,
  drawGuideCanvas,
  getGuideGridColor,
  setGuideGridColor,
}) {
  function toggleGridColorPanel() {
    setGridColorPanelOpen(gridColorPanel?.hidden ?? true);
  }

  function setGridColorPanelOpen(isOpen) {
    if (!gridColorPanel || !gridColorToggleButton) {
      return;
    }
    gridColorPanel.hidden = !isOpen;
    gridColorToggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  function handleGridColorInput(event) {
    applyGuideGridColor(event.target?.value || DEFAULT_GUIDE_GRID_COLOR);
  }

  function resetGuideGridColor() {
    applyGuideGridColor(DEFAULT_GUIDE_GRID_COLOR);
  }

  function handleGridColorPointerDown(event) {
    if (!gridColorControl || gridColorPanel?.hidden) {
      return;
    }
    if (gridColorControl.contains(event.target)) {
      return;
    }
    setGridColorPanelOpen(false);
  }

  function handleGridColorKeyDown(event) {
    if (event.key !== "Escape" || gridColorPanel?.hidden) {
      return;
    }
    setGridColorPanelOpen(false);
    gridColorToggleButton?.focus();
  }

  function loadStoredGuideGridColor() {
    try {
      const storedColor = window.localStorage.getItem(GUIDE_GRID_COLOR_STORAGE_KEY);
      const normalized = normalizeHexColor(storedColor);
      if (normalized) {
        setGuideGridColor(normalized);
      }
    } catch {
    }
  }

  function applyGuideGridColor(nextColor, { persist = true, redraw = true } = {}) {
    const normalized = normalizeHexColor(nextColor) || DEFAULT_GUIDE_GRID_COLOR;
    setGuideGridColor(normalized);
    updateGuideGridColorUi();
    guideViewport?.style.setProperty("--grid-fade", rgbaFromHexColor(getGuideGridColor(), 0.16));
    if (persist) {
      try {
        window.localStorage.setItem(GUIDE_GRID_COLOR_STORAGE_KEY, getGuideGridColor());
      } catch {
      }
    }
    if (redraw && viewerState.rows > 0) {
      drawGuideCanvas();
    }
  }

  function updateGuideGridColorUi() {
    const displayValue = getGuideGridColor().toUpperCase();
    if (gridColorInput) {
      gridColorInput.value = getGuideGridColor();
    }
    if (gridColorValue) {
      gridColorValue.textContent = displayValue;
    }
    if (gridColorChip) {
      gridColorChip.style.background = getGuideGridColor();
    }
    if (gridColorSample) {
      gridColorSample.style.setProperty("--sample-color", getGuideGridColor());
    }
  }

  return {
    applyGuideGridColor,
    handleGridColorInput,
    handleGridColorKeyDown,
    handleGridColorPointerDown,
    loadStoredGuideGridColor,
    resetGuideGridColor,
    toggleGridColorPanel,
  };
}

export { createGridColorController };
