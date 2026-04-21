/*
Module: multi split overlay renderer
Description: Draws N-way split grid lines on the crop box for the multi-sketchbook mode.
Domain: domain/crop
Dependencies: none
Usage:
  const { renderMultiSplitOverlays } = createMultiSplitOverlayRenderer({...});
  renderMultiSplitOverlays();
*/

function createMultiSplitOverlayRenderer({
  APP_MODES,
  getActiveMode,
  getVisibleCropViews,
  getActiveLayout,
  getCropSelectionForView,
  getCropDisplayMetrics,
}) {
  function renderMultiSplitOverlays() {
    const views = typeof getVisibleCropViews === "function" ? getVisibleCropViews() : [];
    views.forEach((view) => renderMultiSplitOverlaysOnView(view));
  }

  function renderMultiSplitOverlaysOnView(view) {
    const container = view?.splitOverlay;
    if (!container) return;

    if (getActiveMode() !== APP_MODES.MULTI_SKETCHBOOK) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    const layout = typeof getActiveLayout === "function" ? getActiveLayout() : null;
    const selection = typeof getCropSelectionForView === "function" ? getCropSelectionForView(view.key) : null;
    const metrics = typeof getCropDisplayMetrics === "function" ? getCropDisplayMetrics(view) : null;
    if (!layout || !selection || !metrics || layout.count <= 1) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    const rows = Number(layout.rows);
    const cols = Number(layout.cols);
    if (!(rows > 0) || !(cols > 0)) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    const left = metrics.offsetLeft + (selection.x * metrics.width);
    const top = metrics.offsetTop + (selection.y * metrics.height);
    const width = selection.width * metrics.width;
    const height = selection.height * metrics.height;
    const html = [];

    for (let col = 1; col < cols; col += 1) {
      const x = left + (col / cols) * width;
      html.push(`<div class="multi-split-line vertical" style="left:${x}px;top:${top}px;height:${height}px;"></div>`);
    }

    for (let row = 1; row < rows; row += 1) {
      const y = top + (row / rows) * height;
      html.push(`<div class="multi-split-line horizontal" style="left:${left}px;top:${y}px;width:${width}px;"></div>`);
    }

    container.hidden = html.length === 0;
    container.innerHTML = html.join("");
  }

  return {
    renderMultiSplitOverlays,
  };
}

export { createMultiSplitOverlayRenderer };
