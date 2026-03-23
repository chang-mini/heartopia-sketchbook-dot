/*
Module: viewer info controller
Description: Guide viewer note and progress text calculation for active modes and palette selections.
Domain: application
Dependencies: none
Usage:
  const viewerInfo = createViewerInfoController({...});
  viewerInfo.updateViewerNote();
*/

function createViewerInfoController({
  APP_MODES,
  viewerState,
  viewerNote,
  getBookSegment,
  normalizeBookAppliedSegments,
  getActivePaletteCodes,
  getTotalCountForCode,
  countCompletedCellsForCode,
  getActiveMode,
  getSelectedBookSegmentId,
  getCurrentResultSnapshot,
}) {
  function isBookCanvasMode() {
    return getActiveMode() === APP_MODES.BOOK;
  }

  function getActiveColorProgressText() {
    const activeCode = viewerState.activeColorCode;
    if (!activeCode) {
      return "";
    }

    const totalCount = getTotalCountForCode(activeCode);
    const completedCount = countCompletedCellsForCode(activeCode);
    if (totalCount <= 0) {
      return "";
    }

    return ` · 총 ${totalCount}칸 중 ${completedCount}칸 완료`;
  }

  function updateViewerNote() {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    const activeCode = viewerState.activeColorCode;
    if (isBookCanvasMode()) {
      const segment = getBookSegment(getSelectedBookSegmentId());
      const appliedCount = normalizeBookAppliedSegments(getCurrentResultSnapshot()?.book_applied_segments || []).length;
      if (activeCode) {
        const color = viewerState.paletteByCode.get(activeCode);
        viewerNote.textContent = `현재 선택 범위: ${segment.label} · 적용한 구역 ${appliedCount}개\n현재 ${color?.code || activeCode}${getActiveColorProgressText()}`;
        return;
      }

      viewerNote.textContent = `현재 선택 범위: ${segment.label} · 적용한 구역 ${appliedCount}개`;
      return;
    }

    const activeColorCodes = getActivePaletteCodes();
    const activeColorProgress = getActiveColorProgressText();
    if (activeColorCodes.length > 1 && viewerState.activeColorCode) {
      viewerNote.textContent = `마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.\n${activeColorCodes.length}색 표시 중 · 현재 ${viewerState.activeColorCode}${activeColorProgress}\n클릭으로 체크, 휠 버튼 누른 채 지나가면 연속체크`;
      return;
    }

    if (viewerState.activeColorCode) {
      const color = viewerState.paletteByCode.get(viewerState.activeColorCode);
      viewerNote.textContent = `마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.\n현재 ${color?.code || viewerState.activeColorCode}${activeColorProgress}\n클릭으로 체크, 휠 버튼 누른 채 지나가면 연속체크`;
      return;
    }

    viewerNote.textContent = "마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.";
  }

  function updateViewerDetail() {
  }

  return {
    getActiveColorProgressText,
    isBookCanvasMode,
    updateViewerDetail,
    updateViewerNote,
  };
}

export { createViewerInfoController };
