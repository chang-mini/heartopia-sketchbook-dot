/*
Module: mode snapshot
Description: Capture, restore, and persist per-mode UI state for imported/generated snapshots.
Domain: application
Dependencies: none
Usage:
  const modeSnapshot = createModeSnapshotController({...});
  modeSnapshot.persistCurrentModeUiState();
*/

function createModeSnapshotController({
  APP_MODES,
  viewerState,
  paletteState,
  modeUiStates,
  createDefaultModeUiState,
  isPortableSnapshot,
  buildPortableSnapshot,
  getActivePaletteCodes,
  getPaletteGroupNameByCode,
  ensurePalettePageForActiveGroup,
  clamp,
  renderPaletteGroups,
  renderPaletteDetails,
  updatePaletteFilterUi,
  drawGuideCanvas,
  updateViewerNote,
  updateViewerDetail,
  getCurrentResultSnapshot,
  setCurrentResultSnapshot,
  getSelectedBookSegmentId,
  setSelectedBookSegmentId,
  setBookSnapshot,
  setSketchbookSnapshot,
  applyModeUi,
  renderCompleted,
  updateSaveButtonState,
  setSubmitEnabled,
}) {
  function normalizeModeUiState(state) {
    if (!state || typeof state !== "object") {
      return createDefaultModeUiState();
    }

    return {
      activeColorCode: typeof state.activeColorCode === "string" && state.activeColorCode.trim()
        ? state.activeColorCode.trim()
        : null,
      activeColorCodes: Array.isArray(state.activeColorCodes)
        ? [...new Set(state.activeColorCodes.filter((code) => typeof code === "string" && code.trim()).map((code) => code.trim()))]
        : [],
      completedCells: Array.isArray(state.completedCells)
        ? [...new Set(state.completedCells.filter((key) => typeof key === "string" && key.includes(":")))]
        : [],
      palettePage: Number.isFinite(state.palettePage) ? state.palettePage : 0,
      activeGroup: typeof state.activeGroup === "string" && state.activeGroup.trim()
        ? state.activeGroup.trim()
        : null,
      multiSelectEnabled: Boolean(state.multiSelectEnabled),
      rememberedMultiColorCodes: Array.isArray(state.rememberedMultiColorCodes)
        ? [...new Set(state.rememberedMultiColorCodes.filter((code) => typeof code === "string" && code.trim()).map((code) => code.trim()))]
        : [],
    };
  }

  function getSnapshotUiKey(snapshot) {
    if (!isPortableSnapshot(snapshot)) {
      return null;
    }

    const mode = snapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK;
    return `${mode}|${snapshot.job_id || ""}|${snapshot.filename || ""}|${snapshot.width || 0}x${snapshot.height || 0}`;
  }

  function captureCurrentModeUiState() {
    return normalizeModeUiState({
      activeColorCode: viewerState.activeColorCode || null,
      activeColorCodes: [...getActivePaletteCodes()],
      completedCells: [...viewerState.completedCells],
      palettePage: Number.isFinite(paletteState.page) ? paletteState.page : 0,
      activeGroup: paletteState.activeGroup || null,
      multiSelectEnabled: Boolean(paletteState.multiSelectEnabled),
      rememberedMultiColorCodes: [...paletteState.rememberedMultiColorCodes],
    });
  }

  function persistCurrentModeUiState() {
    const currentResultSnapshot = getCurrentResultSnapshot();
    const snapshotKey = getSnapshotUiKey(currentResultSnapshot);
    if (!snapshotKey) {
      return;
    }

    const modeKey = currentResultSnapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK;
    modeUiStates[modeKey] = {
      snapshotKey,
      state: captureCurrentModeUiState(),
    };
  }

  function restoreModeUiStateForSnapshot(snapshot) {
    const snapshotKey = getSnapshotUiKey(snapshot);
    if (!snapshotKey) {
      return;
    }

    const modeKey = snapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK;
    const stored = modeUiStates[modeKey];
    const nextState = stored?.snapshotKey === snapshotKey ? stored.state : createDefaultModeUiState();
    const validCodes = new Set(viewerState.paletteByCode.keys());
    const filteredCodes = [...new Set((nextState.activeColorCodes || []).filter((code) => validCodes.has(code)))];
    const primaryCode = nextState.activeColorCode && validCodes.has(nextState.activeColorCode)
      ? nextState.activeColorCode
      : filteredCodes[filteredCodes.length - 1] || null;

    paletteState.multiSelectEnabled = Boolean(nextState.multiSelectEnabled);
    paletteState.rememberedMultiColorCodes = (nextState.rememberedMultiColorCodes || []).filter((code) => validCodes.has(code));
    viewerState.activeColorCode = primaryCode;
    viewerState.activeColorCodes = paletteState.multiSelectEnabled
      ? filteredCodes
      : primaryCode ? [primaryCode] : [];

    const activeGroupExists = paletteState.groups.some((group) => group.name === nextState.activeGroup);
    paletteState.activeGroup = activeGroupExists
      ? nextState.activeGroup
      : getPaletteGroupNameByCode(viewerState.activeColorCode) || paletteState.groups[0]?.name || null;

    const pageCount = Math.max(1, Math.ceil(paletteState.groups.length / 5));
    paletteState.page = clamp(Number.isFinite(nextState.palettePage) ? nextState.palettePage : 0, 0, pageCount - 1);
    if (!paletteState.groups.slice(paletteState.page * 5, (paletteState.page * 5) + 5).some((group) => group.name === paletteState.activeGroup)) {
      ensurePalettePageForActiveGroup();
    }

    viewerState.completedCells = new Set((nextState.completedCells || []).filter((key) => {
      if (typeof key !== "string") {
        return false;
      }
      const [rowToken, columnToken] = key.split(":");
      const row = Number(rowToken);
      const column = Number(columnToken);
      return Number.isInteger(row)
        && Number.isInteger(column)
        && row >= 0
        && column >= 0
        && row < viewerState.rows
        && column < viewerState.columns;
    }));

    renderPaletteGroups();
    renderPaletteDetails();
    updatePaletteFilterUi();
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }

  function extractSavedUiState(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return normalizeModeUiState(payload.ui_state);
  }

  function primeModeUiStateForSnapshot(snapshot, uiState) {
    if (!isPortableSnapshot(snapshot)) {
      return;
    }

    const snapshotKey = getSnapshotUiKey(snapshot);
    if (!snapshotKey) {
      return;
    }

    const modeKey = snapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK;
    modeUiStates[modeKey] = {
      snapshotKey,
      state: normalizeModeUiState(uiState),
    };
  }

  function persistCurrentSnapshotByMode() {
    const currentResultSnapshot = getCurrentResultSnapshot();
    if (!isPortableSnapshot(currentResultSnapshot)) {
      return;
    }

    const portableSnapshot = buildPortableSnapshot(currentResultSnapshot);
    if (portableSnapshot.canvas_mode === APP_MODES.BOOK) {
      setBookSnapshot(portableSnapshot);
      return;
    }
    setSketchbookSnapshot(portableSnapshot);
  }

  function applyModeSnapshot(snapshot) {
    if (!isPortableSnapshot(snapshot)) {
      return;
    }

    const portableSnapshot = buildPortableSnapshot(snapshot);
    setCurrentResultSnapshot(portableSnapshot);
    if (portableSnapshot.canvas_mode === APP_MODES.BOOK) {
      setSelectedBookSegmentId(portableSnapshot.book_selected_segment || getSelectedBookSegmentId());
      setBookSnapshot(portableSnapshot);
    } else {
      setSketchbookSnapshot(portableSnapshot);
    }
    setSubmitEnabled(true);
    applyModeUi();
    renderCompleted(portableSnapshot);
    updateSaveButtonState(true);
  }

  return {
    applyModeSnapshot,
    captureCurrentModeUiState,
    extractSavedUiState,
    persistCurrentModeUiState,
    persistCurrentSnapshotByMode,
    primeModeUiStateForSnapshot,
    restoreModeUiStateForSnapshot,
  };
}

export { createModeSnapshotController };
