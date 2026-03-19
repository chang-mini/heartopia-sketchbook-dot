/*
Module: book crop overlays
Description: Book-mode crop overlay rendering for applied segments and full-range guides.
Domain: domain/crop
Dependencies: none
Usage:
  const { renderBookCropOverlays } = createBookCropOverlayRenderer({...});
*/

function createBookCropOverlayRenderer({
  APP_MODES,
  getVisibleCropViews,
  getNaturalCropImageElement,
  getActiveMode,
  getCropDisplayMetrics,
  getCurrentResultSnapshot,
  getBookSnapshot,
  getSelectedFileName,
  getSelectedBookSegmentId,
  getCropSelectionForView,
  getCropSelection,
  getBookSegment,
  getBookFullGuideSegments,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
}) {
  function renderBookCropOverlays() {
    getVisibleCropViews().forEach((view) => renderBookCropOverlaysOnView(view));
  }

  function renderBookCropOverlaysOnView(view) {
    if (!view?.overlays) {
      return;
    }

    const naturalImage = getNaturalCropImageElement();
    if (getActiveMode() !== APP_MODES.BOOK || !naturalImage?.naturalWidth) {
      view.overlays.hidden = true;
      view.overlays.innerHTML = "";
      return;
    }

    const metrics = getCropDisplayMetrics(view);
    if (!metrics) {
      view.overlays.hidden = true;
      view.overlays.innerHTML = "";
      return;
    }

    const currentResultSnapshot = getCurrentResultSnapshot();
    const bookSnapshot = getBookSnapshot();
    const appliedSegments = normalizeBookAppliedSegments(currentResultSnapshot?.book_applied_segments || bookSnapshot?.book_applied_segments || []);
    const segmentCrops = normalizeBookSegmentCrops(currentResultSnapshot?.book_segment_crops || bookSnapshot?.book_segment_crops);
    const currentSourceFilename = getSelectedFileName();
    const selectedBookSegmentId = getSelectedBookSegmentId();
    const overlayHtml = [];

    for (const segmentId of appliedSegments) {
      const crop = segmentCrops[segmentId];
      if (!crop) {
        continue;
      }
      if (currentSourceFilename && crop.source_filename && crop.source_filename !== currentSourceFilename) {
        continue;
      }
      const className = segmentId === selectedBookSegmentId ? "book-segment-overlay current" : "book-segment-overlay";
      overlayHtml.push(`
      <div
        class="${className}"
        data-book-segment="${segmentId}"
        style="left:${metrics.offsetLeft + (crop.x * metrics.width)}px;top:${metrics.offsetTop + (crop.y * metrics.height)}px;width:${crop.width * metrics.width}px;height:${crop.height * metrics.height}px;"
      ></div>
    `);
    }

    if (selectedBookSegmentId === "full") {
      const selection = getCropSelectionForView(view.key) || (view.key === "expanded" ? getCropSelection() : null);
      overlayHtml.push(...buildBookFullGuideOverlays(selection, metrics));
    }

    view.overlays.hidden = overlayHtml.length === 0;
    view.overlays.innerHTML = overlayHtml.join("");
  }

  function buildBookFullGuideOverlays(selection, metrics) {
    if (!selection || !metrics) {
      return [];
    }

    const fullSegment = getBookSegment("full");
    if (!fullSegment.width) {
      return [];
    }

    const selectionLeft = metrics.offsetLeft + (selection.x * metrics.width);
    const selectionTop = metrics.offsetTop + (selection.y * metrics.height);
    const selectionWidth = selection.width * metrics.width;
    const selectionHeight = selection.height * metrics.height;
    let offset = 0;

    return getBookFullGuideSegments().map((segment) => {
      const segmentLeft = selectionLeft + ((offset / fullSegment.width) * selectionWidth);
      const segmentWidth = (segment.width / fullSegment.width) * selectionWidth;
      offset += segment.width;
      const compactClass = segmentWidth <= 44 ? " compact" : "";

      return `
      <div
        class="book-segment-overlay guide${compactClass}"
        data-book-guide="${segment.id}"
        style="left:${segmentLeft}px;top:${selectionTop}px;width:${segmentWidth}px;height:${selectionHeight}px;"
      >
        <span class="book-segment-overlay-label">${segment.label.replace("?쒖?", "")}</span>
      </div>
    `;
    });
  }

  return {
    renderBookCropOverlays,
  };
}

export { createBookCropOverlayRenderer };
