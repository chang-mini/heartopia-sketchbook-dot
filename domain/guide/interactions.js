/*
Module: guide interactions
Description: Guide canvas pointer handling, hover state, and cell completion tracking.
Domain: domain/guide
Dependencies: none
Usage:
  const guideInteractions = createGuideInteractionController({...});
  guideViewport.addEventListener("pointerdown", guideInteractions.handleGuidePointerDown);
*/

function createGuideInteractionController({
  guideViewport,
  viewerState,
  getGuideInteraction,
  setGuideInteraction,
  getCellFromClientPoint,
  getActivePaletteCodes,
  zoomGuide,
  clampGuidePan,
  drawGuideCanvas,
  renderPaletteDetails,
  updatePaletteFilterUi,
  updateViewerNote,
  updateViewerDetail,
}) {
  function handleGuideWheel(event) {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    event.preventDefault();
    const rect = guideViewport.getBoundingClientRect();
    const originX = event.clientX - rect.left;
    const originY = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomGuide(factor, originX, originY);
  }

  function handleGuidePointerDown(event) {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }
    if (event.pointerType !== "touch" && event.button !== 0 && event.button !== 1) {
      return;
    }

    const mode = event.pointerType !== "touch" && event.button === 1 ? "paint" : "pan";
    const initialCell = mode === "paint" ? getCellFromClientPoint(event.clientX, event.clientY) : null;
    const paintCompleted = mode === "paint" ? !isCellCompleted(initialCell) : null;

    setGuideInteraction({
      pointerId: event.pointerId,
      mode,
      paintCompleted,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startPanX: viewerState.panX,
      startPanY: viewerState.panY,
      didDrag: false,
      lastPaintedKey: getCellKey(initialCell),
    });

    if (mode === "pan") {
      guideViewport.classList.add("is-dragging");
    } else if (setCompletedStateForCell(initialCell, paintCompleted)) {
      syncCompletedCellUi();
    }
    guideViewport.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handleGuidePointerMove(event) {
    const guideInteraction = getGuideInteraction();
    if (!guideInteraction || event.pointerId !== guideInteraction.pointerId) {
      return;
    }

    if (guideInteraction.mode === "paint") {
      const cell = getCellFromClientPoint(event.clientX, event.clientY);
      const cellKey = getCellKey(cell);
      if (cellKey !== guideInteraction.lastPaintedKey) {
        guideInteraction.lastPaintedKey = cellKey;
        if (setCompletedStateForCell(cell, guideInteraction.paintCompleted)) {
          syncCompletedCellUi();
        }
      }

      updateHoveredCellFromClientPoint(event.clientX, event.clientY);
      event.preventDefault();
      return;
    }

    const deltaX = event.clientX - guideInteraction.startPointerX;
    const deltaY = event.clientY - guideInteraction.startPointerY;

    if (!guideInteraction.didDrag && Math.hypot(deltaX, deltaY) > 6) {
      guideInteraction.didDrag = true;
    }

    if (guideInteraction.didDrag) {
      viewerState.panX = guideInteraction.startPanX + deltaX;
      viewerState.panY = guideInteraction.startPanY + deltaY;
      clampGuidePan();
    }

    updateHoveredCellFromClientPoint(event.clientX, event.clientY);
    drawGuideCanvas();
    updateViewerNote();
    event.preventDefault();
  }

  function handleGuidePointerEnd(event) {
    const guideInteraction = getGuideInteraction();
    if (!guideInteraction || event.pointerId !== guideInteraction.pointerId) {
      return;
    }

    const wasDrag = guideInteraction.didDrag;
    const mode = guideInteraction.mode;
    const paintCompleted = guideInteraction.paintCompleted;
    guideViewport.classList.remove("is-dragging");
    guideViewport.releasePointerCapture?.(event.pointerId);
    setGuideInteraction(null);

    if (event.type === "pointercancel") {
      return;
    }

    if (mode === "paint") {
      const cell = getCellFromClientPoint(event.clientX, event.clientY);
      if (setCompletedStateForCell(cell, paintCompleted)) {
        syncCompletedCellUi();
      }
      return;
    }

    if (!wasDrag) {
      toggleCompletedCellFromClientPoint(event.clientX, event.clientY);
    }
  }

  let pinchState = null;

  function getTouchDistance(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  function getTouchCenter(t1, t2, rect) {
    return {
      x: ((t1.clientX + t2.clientX) / 2) - rect.left,
      y: ((t1.clientY + t2.clientY) / 2) - rect.top,
    };
  }

  function handleGuideTouchStart(event) {
    if (event.touches.length === 2) {
      event.preventDefault();
      const guideInteraction = getGuideInteraction();
      if (guideInteraction) {
        guideViewport.classList.remove("is-dragging");
        guideViewport.releasePointerCapture?.(guideInteraction.pointerId);
        setGuideInteraction(null);
      }
      const rect = guideViewport.getBoundingClientRect();
      pinchState = {
        startDistance: getTouchDistance(event.touches[0], event.touches[1]),
        startScale: viewerState.scale,
        startPanX: viewerState.panX,
        startPanY: viewerState.panY,
        startCenter: getTouchCenter(event.touches[0], event.touches[1], rect),
      };
    }
  }

  function handleGuideTouchMove(event) {
    if (!pinchState || event.touches.length !== 2) {
      return;
    }
    event.preventDefault();
    const rect = guideViewport.getBoundingClientRect();
    const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
    const currentCenter = getTouchCenter(event.touches[0], event.touches[1], rect);
    const scaleFactor = currentDistance / pinchState.startDistance;
    const nextScale = Math.min(viewerState.maxScale, Math.max(viewerState.minScale, pinchState.startScale * scaleFactor));

    const gridX = (pinchState.startCenter.x - pinchState.startPanX) / pinchState.startScale;
    const gridY = (pinchState.startCenter.y - pinchState.startPanY) / pinchState.startScale;

    viewerState.scale = nextScale;
    viewerState.panX = currentCenter.x - (gridX * nextScale);
    viewerState.panY = currentCenter.y - (gridY * nextScale);

    clampGuidePan();
    drawGuideCanvas();
    updateViewerNote();
  }

  function handleGuideTouchEnd(event) {
    if (pinchState && event.touches.length < 2) {
      pinchState = null;
    }
  }

  function handleGuideHover(event) {
    if (!viewerState.rows || !viewerState.columns || getGuideInteraction()) {
      return;
    }

    updateHoveredCellFromClientPoint(event.clientX, event.clientY);
  }

  function clearGuideHover() {
    if (viewerState.hoverColumn === null && viewerState.hoverRow === null) {
      return;
    }

    viewerState.hoverColumn = null;
    viewerState.hoverRow = null;
    updateViewerDetail();
    drawGuideCanvas();
  }

  function countCompletedCellsForCode(targetCode) {
    if (!targetCode || viewerState.completedCells.size === 0) {
      return 0;
    }

    let completedCount = 0;
    viewerState.completedCells.forEach((key) => {
      const [rowText, columnText] = key.split(":");
      const row = Number(rowText);
      const column = Number(columnText);
      if (viewerState.gridCodes[row]?.[column] === targetCode) {
        completedCount += 1;
      }
    });

    return completedCount;
  }

  function getTotalCountForCode(targetCode) {
    return Number(viewerState.paletteByCode.get(targetCode)?.count || 0);
  }

  function getRemainingCountForCode(targetCode) {
    const totalCount = getTotalCountForCode(targetCode);
    return Math.max(0, totalCount - countCompletedCellsForCode(targetCode));
  }

  function isCodeCompleted(targetCode) {
    const totalCount = getTotalCountForCode(targetCode);
    return totalCount > 0 && getRemainingCountForCode(targetCode) === 0;
  }

  function completeActiveColorCells() {
    const activeCode = viewerState.activeColorCode;
    if (!activeCode || !viewerState.rows || !viewerState.columns) {
      return;
    }

    const shouldComplete = !isCodeCompleted(activeCode);
    let changed = false;

    for (let row = 0; row < viewerState.rows; row += 1) {
      const gridRow = viewerState.gridCodes[row];
      for (let column = 0; column < viewerState.columns; column += 1) {
        if (gridRow[column] !== activeCode) {
          continue;
        }

        const key = `${row}:${column}`;
        if (shouldComplete && !viewerState.completedCells.has(key)) {
          viewerState.completedCells.add(key);
          changed = true;
        } else if (!shouldComplete && viewerState.completedCells.has(key)) {
          viewerState.completedCells.delete(key);
          changed = true;
        }
      }
    }

    if (changed) {
      syncCompletedCellUi();
    }
  }

  function getCellKey(cell) {
    return cell ? `${cell.row}:${cell.column}` : null;
  }

  function isCellCompleted(cell) {
    const key = getCellKey(cell);
    return key ? viewerState.completedCells.has(key) : false;
  }

  function setCompletedStateForCell(cell, nextCompleted = null) {
    if (!cell) {
      return false;
    }

    const activeCode = viewerState.activeColorCode || getActivePaletteCodes()[0] || null;
    if (!activeCode) {
      return false;
    }

    const code = viewerState.gridCodes[cell.row]?.[cell.column];
    if (!code || code !== activeCode) {
      return false;
    }

    const key = getCellKey(cell);
    const isCompleted = viewerState.completedCells.has(key);
    const shouldComplete = nextCompleted === null ? !isCompleted : nextCompleted;
    if (shouldComplete === isCompleted) {
      return false;
    }

    if (shouldComplete) {
      viewerState.completedCells.add(key);
    } else {
      viewerState.completedCells.delete(key);
    }

    return true;
  }

  function syncCompletedCellUi() {
    drawGuideCanvas();
    renderPaletteDetails();
    updatePaletteFilterUi();
    updateViewerNote();
    updateViewerDetail();
  }

  function toggleCompletedCellFromClientPoint(clientX, clientY) {
    const cell = getCellFromClientPoint(clientX, clientY);
    if (setCompletedStateForCell(cell)) {
      syncCompletedCellUi();
    }
  }

  function updateHoveredCellFromClientPoint(clientX, clientY) {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    const cell = getCellFromClientPoint(clientX, clientY);
    if (!cell) {
      if (viewerState.hoverColumn !== null || viewerState.hoverRow !== null) {
        viewerState.hoverColumn = null;
        viewerState.hoverRow = null;
        updateViewerDetail();
        drawGuideCanvas();
      }
      return;
    }

    const { column, row } = cell;
    if (viewerState.hoverColumn === column && viewerState.hoverRow === row) {
      return;
    }

    viewerState.hoverColumn = column;
    viewerState.hoverRow = row;
    updateViewerDetail();
    drawGuideCanvas();
  }

  return {
    clearGuideHover,
    completeActiveColorCells,
    countCompletedCellsForCode,
    getTotalCountForCode,
    handleGuideHover,
    handleGuidePointerDown,
    handleGuidePointerEnd,
    handleGuidePointerMove,
    handleGuideTouchEnd,
    handleGuideTouchMove,
    handleGuideTouchStart,
    handleGuideWheel,
    isCodeCompleted,
  };
}

export { createGuideInteractionController };
