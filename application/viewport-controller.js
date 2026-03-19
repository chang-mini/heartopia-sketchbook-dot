/*
Module: viewport controller
Description: Responsive crop and guide workspace resize handling.
Domain: application
Dependencies: browser window APIs
Usage:
  const { handleWindowResize } = createViewportController({...});
*/

function getViewportLayoutMode(viewportWidth = window.innerWidth) {
  return viewportWidth <= 1180 ? "stacked" : "desktop";
}

function createViewportController({
  viewerState,
  viewerShell,
  scheduleCropLayoutRefresh,
  fitGuideToViewport,
  clearGuideCanvas,
  getCropSelection,
  getExpandedCropSelection,
  getLastViewportLayoutMode,
  setLastViewportLayoutMode,
}) {
  function handleWindowResize() {
    const nextViewportLayoutMode = getViewportLayoutMode();
    const layoutModeChanged = nextViewportLayoutMode !== getLastViewportLayoutMode();
    setLastViewportLayoutMode(nextViewportLayoutMode);

    if (getCropSelection() || getExpandedCropSelection()) {
      scheduleCropLayoutRefresh();
    }
    if (viewerState.rows && viewerState.columns) {
      if (layoutModeChanged) {
        fitGuideToViewport(true);
        if (nextViewportLayoutMode === "desktop") {
          window.requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            viewerShell?.scrollIntoView({ block: "start" });
          });
        }
        return;
      }
      fitGuideToViewport(false);
    } else {
      clearGuideCanvas();
    }
  }

  return {
    handleWindowResize,
  };
}

export { createViewportController, getViewportLayoutMode };
