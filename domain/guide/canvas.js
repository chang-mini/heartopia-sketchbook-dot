/*
Module: guide canvas
Description: Guide canvas rendering, viewport math, and visible cell lookup.
Domain: domain/guide
Dependencies: none
Usage:
  const guideCanvas = createGuideCanvasController({...});
  guideCanvas.loadGuideGrid(gridCodes, usedColors);
*/

function createGuideCanvasController({
  guideCanvas,
  guideContext,
  guideEmpty,
  guideViewport,
  viewerState,
  getGuideGridColor,
  getActiveMode,
  getCurrentResultSnapshot,
  ratioInput,
  precisionInput,
  getBookSegment,
  getActivePaletteCodes,
  syncActivePaletteSelection,
  setGuideControlsEnabled,
  updateViewerNote,
  updateViewerDetail,
  isBookCanvasMode,
  APP_MODES,
  BOOK_LAYOUT,
  clamp,
  mixHexColors,
  getGuideLabelColor,
  rgbaFromHexColor,
}) {
  function loadGuideGrid(gridCodes, usedColors) {
    viewerState.gridCodes = gridCodes;
    viewerState.rows = gridCodes.length;
    viewerState.columns = gridCodes[0]?.length ?? 0;
    viewerState.paletteByCode = new Map(usedColors.map((item) => [item.code, item]));
    viewerState.completedCells = new Set();
    syncActivePaletteSelection(new Set(viewerState.paletteByCode.keys()));
    viewerState.hoverColumn = null;
    viewerState.hoverRow = null;
    if (guideEmpty) {
      guideEmpty.hidden = true;
    }
    guideViewport.hidden = false;
    guideViewport.classList.add("is-ready");
    setGuideControlsEnabled(true);
    fitGuideToViewport(true);
  }

  function clearGuideCanvas() {
    if (!guideContext) {
      return;
    }

    const size = resizeGuideCanvas();
    if (!size) {
      return;
    }

    guideContext.clearRect(0, 0, size.width, size.height);
  }

  function resizeGuideCanvas() {
    if (!guideCanvas || !guideContext || !guideViewport) {
      return null;
    }

    const rect = guideViewport.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = Math.max(1, Math.floor(width * dpr));
    const scaledHeight = Math.max(1, Math.floor(height * dpr));

    if (guideCanvas.width !== scaledWidth || guideCanvas.height !== scaledHeight) {
      guideCanvas.width = scaledWidth;
      guideCanvas.height = scaledHeight;
      guideCanvas.style.width = `${width}px`;
      guideCanvas.style.height = `${height}px`;
    }

    guideContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function fitGuideToViewport(resetPan) {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    const size = resizeGuideCanvas();
    if (!size) {
      return;
    }

    const padding = 28;
    const availableWidth = Math.max(120, size.width - (padding * 2));
    const availableHeight = Math.max(120, size.height - (padding * 2));
    const fitScale = Math.max(2, Math.min(availableWidth / viewerState.columns, availableHeight / viewerState.rows));

    viewerState.fitScale = fitScale;
    viewerState.minScale = Math.max(2, fitScale * 0.75);
    viewerState.maxScale = Math.max(96, fitScale * 18);
    viewerState.scale = resetPan ? fitScale : clamp(viewerState.scale, viewerState.minScale, viewerState.maxScale);

    if (resetPan) {
      viewerState.panX = (size.width - (viewerState.columns * viewerState.scale)) / 2;
      viewerState.panY = (size.height - (viewerState.rows * viewerState.scale)) / 2;
    }

    clampGuidePan();
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }

  function scheduleGuideViewportFit() {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        fitGuideToViewport(true);
      });
    });
  }

  function zoomGuideAtViewportCenter(factor) {
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    const rect = guideViewport.getBoundingClientRect();
    zoomGuide(factor, rect.width / 2, rect.height / 2);
  }

  function zoomGuide(factor, originX, originY) {
    const currentScale = viewerState.scale;
    const nextScale = clamp(currentScale * factor, viewerState.minScale, viewerState.maxScale);
    if (Math.abs(nextScale - currentScale) < 0.001) {
      return;
    }

    const gridX = (originX - viewerState.panX) / currentScale;
    const gridY = (originY - viewerState.panY) / currentScale;

    viewerState.scale = nextScale;
    viewerState.panX = originX - (gridX * nextScale);
    viewerState.panY = originY - (gridY * nextScale);

    clampGuidePan();
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }

  function clampGuidePan() {
    const size = resizeGuideCanvas();
    if (!size || !viewerState.rows || !viewerState.columns) {
      return;
    }

    const worldWidth = viewerState.columns * viewerState.scale;
    const worldHeight = viewerState.rows * viewerState.scale;

    if (worldWidth <= size.width) {
      viewerState.panX = clamp(viewerState.panX, 0, size.width - worldWidth);
    } else {
      viewerState.panX = clamp(viewerState.panX, size.width - worldWidth, 0);
    }

    if (worldHeight <= size.height) {
      viewerState.panY = clamp(viewerState.panY, 0, size.height - worldHeight);
    } else {
      viewerState.panY = clamp(viewerState.panY, size.height - worldHeight, 0);
    }
  }

  function drawGuideCanvas() {
    if (!guideContext) {
      return;
    }

    const size = resizeGuideCanvas();
    if (!size) {
      return;
    }

    guideContext.clearRect(0, 0, size.width, size.height);
    if (!viewerState.rows || !viewerState.columns) {
      return;
    }

    const cellSize = viewerState.scale;
    const activeColorCodes = getActivePaletteCodes();
    const selectedCodeSet = new Set(activeColorCodes);
    const activeColorCode = viewerState.activeColorCode || activeColorCodes[activeColorCodes.length - 1] || null;
    const isFiltering = selectedCodeSet.size > 0;
    const startColumn = Math.max(0, Math.floor(-viewerState.panX / cellSize) - 1);
    const endColumn = Math.min(viewerState.columns, Math.ceil((size.width - viewerState.panX) / cellSize) + 1);
    const startRow = Math.max(0, Math.floor(-viewerState.panY / cellSize) - 1);
    const endRow = Math.min(viewerState.rows, Math.ceil((size.height - viewerState.panY) / cellSize) + 1);

    for (let row = startRow; row < endRow; row += 1) {
      const y = viewerState.panY + (row * cellSize);
      const gridRow = viewerState.gridCodes[row];
      for (let column = startColumn; column < endColumn; column += 1) {
        const x = viewerState.panX + (column * cellSize);
        const code = gridRow[column];
        const color = viewerState.paletteByCode.get(code);
        const isCompleted = viewerState.completedCells.has(`${row}:${column}`);
        const isCurrentMatch = Boolean(activeColorCode) && code === activeColorCode;
        const isPreviousMatch = !isCurrentMatch && selectedCodeSet.has(code);
        const isMatch = !isFiltering || isCurrentMatch || isPreviousMatch;
        const showCompletedFade = isFiltering && isCurrentMatch && isCompleted;
        const baseFill = !isFiltering
          ? color?.hex_value || "#ffffff"
          : isCurrentMatch
            ? color?.hex_value || "#ffffff"
            : isPreviousMatch
              ? mixHexColors(color?.hex_value || "#ffffff", "#f8f0e7", 0.86)
              : "rgba(248,240,231,.82)";
        guideContext.fillStyle = showCompletedFade ? mixHexColors(baseFill, "#f8f0e7", 0.72) : baseFill;
        guideContext.fillRect(x, y, cellSize + 0.6, cellSize + 0.6);

        if (isMatch && cellSize >= 16) {
          guideContext.save();
          if (showCompletedFade) {
            guideContext.globalAlpha = 0.28;
          } else if (isPreviousMatch) {
            guideContext.globalAlpha = 0.24;
          }
          const fontSize = clamp(cellSize * (code.length >= 4 ? 0.34 : 0.46), 8, 28);
          const labelColor = getGuideLabelColor(color?.hex_value || "#ffffff");
          guideContext.font = `700 ${fontSize}px Consolas, "Courier New", monospace`;
          guideContext.textAlign = "center";
          guideContext.textBaseline = "middle";
          guideContext.lineWidth = Math.max(1, fontSize * 0.12);
          guideContext.strokeStyle = labelColor === "#2d241c" ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.85)";
          guideContext.fillStyle = labelColor;
          guideContext.strokeText(code, x + (cellSize / 2), y + (cellSize / 2));
          guideContext.fillText(code, x + (cellSize / 2), y + (cellSize / 2));
          guideContext.restore();
        }

        if (showCompletedFade && isCurrentMatch && cellSize >= 10) {
          guideContext.save();
          guideContext.strokeStyle = "rgba(86, 69, 55, .34)";
          guideContext.lineWidth = Math.max(1.5, cellSize * 0.08);
          guideContext.beginPath();
          guideContext.moveTo(x + (cellSize * 0.22), y + (cellSize * 0.54));
          guideContext.lineTo(x + (cellSize * 0.42), y + (cellSize * 0.72));
          guideContext.lineTo(x + (cellSize * 0.78), y + (cellSize * 0.3));
          guideContext.stroke();
          guideContext.restore();
        }
      }
    }

    if (isBookCanvasMode()) {
      drawBookOverlay(cellSize, startRow, endRow);
    }
    drawGuideGridLines(startColumn, endColumn, startRow, endRow, cellSize, size.width, size.height);
    if (isBookCanvasMode()) {
      drawBookBoundaryLines(cellSize, startRow, endRow);
    }
    drawHoveredCell(cellSize);
  }

  function drawGuideGridLines(startColumn, endColumn, startRow, endRow, cellSize, viewportWidth, viewportHeight) {
    const guideGridColor = getGuideGridColor();
    const strongGridLineColor = rgbaFromHexColor(guideGridColor, 0.58);
    const baseGridLineColor = rgbaFromHexColor(guideGridColor, 0.18);
    const strongRowOffset = getGuideStrongRowOffset();
    const strongRowRemainder = strongRowOffset % 5;
    for (let column = startColumn; column <= endColumn; column += 1) {
      const x = viewerState.panX + (column * cellSize);
      const isStrongLine = column > 0 && column % 5 === 0;
      guideContext.beginPath();
      guideContext.moveTo(x, Math.max(0, viewerState.panY + (startRow * cellSize)));
      guideContext.lineTo(x, Math.min(viewportHeight, viewerState.panY + (endRow * cellSize)));
      guideContext.lineWidth = isStrongLine ? Math.max(1.5, cellSize * 0.08) : 1;
      guideContext.strokeStyle = isStrongLine ? strongGridLineColor : baseGridLineColor;
      guideContext.stroke();
    }

    for (let row = startRow; row <= endRow; row += 1) {
      const y = viewerState.panY + (row * cellSize);
      const isStrongLine = row >= strongRowOffset && row % 5 === strongRowRemainder;
      guideContext.beginPath();
      guideContext.moveTo(Math.max(0, viewerState.panX + (startColumn * cellSize)), y);
      guideContext.lineTo(Math.min(viewportWidth, viewerState.panX + (endColumn * cellSize)), y);
      guideContext.lineWidth = isStrongLine ? Math.max(1.5, cellSize * 0.08) : 1;
      guideContext.strokeStyle = isStrongLine ? strongGridLineColor : baseGridLineColor;
      guideContext.stroke();
    }
  }

  function getGuideStrongRowOffset() {
    const currentResultSnapshot = getCurrentResultSnapshot?.();
    const ratio = getActiveMode() === APP_MODES.BOOK
      ? BOOK_LAYOUT.ratio
      : currentResultSnapshot?.canvas_mode === APP_MODES.SKETCHBOOK && typeof currentResultSnapshot?.ratio === "string"
        ? currentResultSnapshot.ratio
        : ratioInput?.value;
    const precision = getActiveMode() === APP_MODES.BOOK
      ? BOOK_LAYOUT.precision
      : currentResultSnapshot?.canvas_mode === APP_MODES.SKETCHBOOK && Number.isFinite(Number(currentResultSnapshot?.precision))
        ? Number(currentResultSnapshot.precision)
        : Number(precisionInput?.value);
    if (precision === 4 && (ratio === "16:9" || ratio === "4:3")) {
      return 4;
    }
    return 5;
  }

  function drawHoveredCell(cellSize) {
    if (viewerState.hoverColumn === null || viewerState.hoverRow === null) {
      return;
    }

    const x = viewerState.panX + (viewerState.hoverColumn * cellSize);
    const y = viewerState.panY + (viewerState.hoverRow * cellSize);
    guideContext.save();
    guideContext.lineWidth = Math.max(2, cellSize * 0.12);
    guideContext.strokeStyle = "rgba(228,111,67,.95)";
    guideContext.strokeRect(x, y, cellSize, cellSize);
    guideContext.restore();
  }

  function drawBookOverlay(cellSize, startRow, endRow) {
    const gridHeight = Math.max(0, (endRow - startRow) * cellSize);
    if (gridHeight <= 0) {
      return;
    }

    const gridLeft = viewerState.panX;
    const gridWidth = BOOK_LAYOUT.width * cellSize;
    const topBlockedStartRow = Math.max(startRow, 0);
    const topBlockedEndRow = Math.min(endRow, BOOK_LAYOUT.topBlockedRows);
    const topBlockedHeight = Math.max(0, (topBlockedEndRow - topBlockedStartRow) * cellSize);
    const lowerStartRow = Math.max(startRow, BOOK_LAYOUT.topBlockedRows);
    const lowerHeight = Math.max(0, (endRow - lowerStartRow) * cellSize);
    const leftBlockedWidth = BOOK_LAYOUT.leftBlockedColumns * cellSize;
    const rightBlockedWidth = BOOK_LAYOUT.rightBlockedColumns * cellSize;
    const spine = getBookSegment("spine");
    const spineX = viewerState.panX + (spine.startColumn * cellSize);
    const leftBlockedX = viewerState.panX;
    const rightBlockedX = viewerState.panX + ((BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns) * cellSize);

    guideContext.save();
    if (topBlockedHeight > 0) {
      guideContext.fillStyle = "rgba(183, 54, 54, .16)";
      guideContext.fillRect(gridLeft, viewerState.panY + (topBlockedStartRow * cellSize), gridWidth, topBlockedHeight);
    }

    if (lowerHeight > 0) {
      guideContext.fillStyle = "rgba(183, 54, 54, .16)";
      guideContext.fillRect(leftBlockedX, viewerState.panY + (lowerStartRow * cellSize), leftBlockedWidth, lowerHeight);
      guideContext.fillRect(rightBlockedX, viewerState.panY + (lowerStartRow * cellSize), rightBlockedWidth, lowerHeight);

      guideContext.fillStyle = "rgba(112, 84, 62, .14)";
      guideContext.fillRect(spineX, viewerState.panY + (lowerStartRow * cellSize), spine.width * cellSize, lowerHeight);
    }
    guideContext.restore();
  }

  function drawBookBoundaryLines(cellSize, startRow, endRow) {
    const y1 = viewerState.panY + (Math.max(startRow, BOOK_LAYOUT.topBlockedRows) * cellSize);
    const y2 = viewerState.panY + (endRow * cellSize);
    const boundaryColumns = [
      BOOK_LAYOUT.leftBlockedColumns,
      BOOK_LAYOUT.segments.spine.startColumn,
      BOOK_LAYOUT.segments.spine.startColumn + BOOK_LAYOUT.segments.spine.width,
      BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns,
    ];

    guideContext.save();
    if (y2 > y1) {
      for (const column of boundaryColumns) {
        const x = viewerState.panX + (column * cellSize);
        guideContext.beginPath();
        guideContext.moveTo(x, y1);
        guideContext.lineTo(x, y2);
        guideContext.lineWidth = Math.max(2, cellSize * 0.1);
        guideContext.strokeStyle = "rgba(96, 68, 51, .62)";
        guideContext.stroke();
      }
    }
    if (startRow <= BOOK_LAYOUT.topBlockedRows && endRow > 0) {
      const y = viewerState.panY + (BOOK_LAYOUT.topBlockedRows * cellSize);
      guideContext.beginPath();
      guideContext.moveTo(viewerState.panX, y);
      guideContext.lineTo(viewerState.panX + (BOOK_LAYOUT.width * cellSize), y);
      guideContext.lineWidth = Math.max(2, cellSize * 0.1);
      guideContext.strokeStyle = "rgba(96, 68, 51, .62)";
      guideContext.stroke();
    }
    guideContext.restore();
  }

  function getCellFromClientPoint(clientX, clientY) {
    if (!guideViewport || !viewerState.rows || !viewerState.columns) {
      return null;
    }

    const rect = guideViewport.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const column = Math.floor((localX - viewerState.panX) / viewerState.scale);
    const row = Math.floor((localY - viewerState.panY) / viewerState.scale);

    if (column < 0 || row < 0 || column >= viewerState.columns || row >= viewerState.rows) {
      return null;
    }
    if (isBookCanvasMode() && (isBookBlockedColumn(column) || isBookBlockedRow(row))) {
      return null;
    }

    return { column, row };
  }

  function isBookBlockedRow(row) {
    return row < BOOK_LAYOUT.topBlockedRows;
  }

  function isBookBlockedColumn(column) {
    return column < BOOK_LAYOUT.leftBlockedColumns || column >= BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns;
  }

  return {
    clampGuidePan,
    clearGuideCanvas,
    drawGuideCanvas,
    fitGuideToViewport,
    getCellFromClientPoint,
    loadGuideGrid,
    scheduleGuideViewportFit,
    zoomGuide,
    zoomGuideAtViewportCenter,
  };
}

export { createGuideCanvasController };
