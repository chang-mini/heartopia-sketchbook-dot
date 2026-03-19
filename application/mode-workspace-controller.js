/*
Module: mode workspace controller
Description: Mode switching, book workspace bootstrapping, and book snapshot helpers.
Domain: application
Dependencies: none
Usage:
  const modeWorkspaceController = createModeWorkspaceController({...});
  modeWorkspaceController.applyModeUi();
*/

function createModeWorkspaceController({
  APP_MODES,
  BOOK_LAYOUT,
  cropImage,
  submitButton,
  ratioInput,
  precisionInput,
  modeLockedNote,
  bookRangeField,
  bookSegmentInput,
  expandedBookSegmentInput,
  expandedBookSegmentWrap,
  expandedSketchbookOptions,
  expandedCropModal,
  modeSummary,
  modeTabButtons,
  paletteSidebar,
  mainShell,
  createEmptyGridCodes,
  buildUsedColorsFromGrid,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
  normalizeStoredBookCrop,
  applyDefaultCropSelection,
  syncExpandedSelectionToSidebar,
  getNaturalCropImageElement,
  loadGuideGrid,
  renderBookCropOverlays,
  prepareGuideViewer,
  updateSaveButtonState,
  updateViewerNote,
  syncExpandedSketchbookControls,
  resetResultArea,
  stopTracking,
  persistCurrentSnapshotByMode,
  persistCurrentModeUiState,
  applyModeSnapshot,
  getActiveMode,
  setActiveModeValue,
  getIsCropStageExpanded,
  getSelectedBookSegmentId,
  setSelectedBookSegmentId,
  getCurrentResultSnapshot,
  setCurrentResultSnapshot,
  getSelectedFile,
  getSketchbookSnapshot,
  getBookSnapshot,
  getCropSelection,
}) {
  function handleModeTabClick(event) {
    const nextMode = event.currentTarget?.dataset.modeTab;
    if (!nextMode || nextMode === getActiveMode()) {
      return;
    }
    setActiveMode(nextMode);
  }

  function handleBookSegmentChange(event) {
    const nextSegmentId = event.target.value;
    setSelectedBookSegmentId(nextSegmentId);

    if (bookSegmentInput && event.target !== bookSegmentInput) {
      bookSegmentInput.value = nextSegmentId;
    }
    if (expandedBookSegmentInput && event.target !== expandedBookSegmentInput) {
      expandedBookSegmentInput.value = nextSegmentId;
    }
    if (getActiveMode() === APP_MODES.BOOK) {
      const targetViewKey = event.target === expandedBookSegmentInput && getIsCropStageExpanded() ? "expanded" : "sidebar";
      if (getNaturalCropImageElement()?.naturalWidth) {
        applyDefaultCropSelection(targetViewKey);
        if (targetViewKey === "expanded") {
          syncExpandedSelectionToSidebar();
        }
      }
      updateViewerNote();
      updateModeSummary();
    }
  }

  function setActiveMode(nextMode) {
    if (!Object.values(APP_MODES).includes(nextMode) || nextMode === getActiveMode()) {
      return;
    }

    persistCurrentSnapshotByMode();
    persistCurrentModeUiState();

    setActiveModeValue(nextMode);
    stopTracking();
    if (submitButton) {
      submitButton.disabled = false;
    }
    applyModeUi();

    if (cropImage?.naturalWidth) {
      applyDefaultCropSelection();
    }

    if (getActiveMode() === APP_MODES.SKETCHBOOK) {
      const sketchbookSnapshot = getSketchbookSnapshot();
      if (sketchbookSnapshot) {
        applyModeSnapshot(sketchbookSnapshot);
      } else {
        resetResultArea();
      }
      return;
    }

    const bookSnapshot = getBookSnapshot();
    if (bookSnapshot) {
      applyModeSnapshot(bookSnapshot);
    } else {
      renderEmptyBookWorkspace();
    }
  }

  function applyModeUi() {
    const isBookMode = getActiveMode() === APP_MODES.BOOK;
    if (submitButton) {
      submitButton.textContent = "도안 생성 시작";
    }
    if (ratioInput) {
      ratioInput.disabled = isBookMode;
      if (isBookMode) {
        ratioInput.value = BOOK_LAYOUT.ratio;
      }
    }
    if (precisionInput) {
      precisionInput.disabled = isBookMode;
      if (isBookMode) {
        precisionInput.value = String(BOOK_LAYOUT.precision);
      }
    }
    if (modeLockedNote) {
      modeLockedNote.hidden = !isBookMode;
    }
    if (bookRangeField) {
      bookRangeField.hidden = !isBookMode;
    }
    if (bookSegmentInput) {
      bookSegmentInput.value = getSelectedBookSegmentId();
    }
    if (expandedBookSegmentInput) {
      expandedBookSegmentInput.value = getSelectedBookSegmentId();
    }
    if (expandedBookSegmentWrap) {
      expandedBookSegmentWrap.hidden = !isBookMode;
    }
    if (expandedSketchbookOptions) {
      expandedSketchbookOptions.hidden = isBookMode;
    }
    syncExpandedSketchbookControls();
    expandedCropModal?.classList.toggle("is-book-mode", isBookMode);

    modeTabButtons.forEach((button) => {
      const isActive = button.dataset.modeTab === getActiveMode();
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    updateModeSummary();
  }

  function updateModeSummary() {
    if (!modeSummary) {
      renderBookCropOverlays();
      return;
    }
    modeSummary.textContent = "";
    renderBookCropOverlays();
  }

  function renderEmptyBookWorkspace() {
    prepareGuideViewer("책 모드 작업을 시작할 수 있습니다. 왼쪽에서 범위를 고른 뒤 이미지를 적용하세요.");
    loadGuideGrid(createEmptyGridCodes(BOOK_LAYOUT.width, BOOK_LAYOUT.height, ""), []);
    setCurrentResultSnapshot({
      canvas_mode: APP_MODES.BOOK,
      book_selected_segment: getSelectedBookSegmentId(),
      book_applied_segments: [],
      book_segment_crops: {},
    });
    updateSaveButtonState(false);
    setPaletteVisibility(false);
    updateViewerNote();
    renderBookCropOverlays();
  }

  function buildBookSnapshotFromGrid(gridCodes, sourceFilename = null, appliedSegments = [], segmentCrops = {}) {
    const currentResultSnapshot = getCurrentResultSnapshot();
    const selectedFile = getSelectedFile();

    return {
      job_id: `book-${Date.now()}`,
      filename: sourceFilename || currentResultSnapshot?.filename || selectedFile?.name || "book-cover.png",
      ratio: BOOK_LAYOUT.ratio,
      precision: BOOK_LAYOUT.precision,
      width: BOOK_LAYOUT.width,
      height: BOOK_LAYOUT.height,
      status: "completed",
      progress: 100,
      message: "책 작업 도안",
      created_at: currentResultSnapshot?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      used_colors: buildUsedColorsFromGrid(gridCodes),
      grid_codes: gridCodes,
      canvas_mode: APP_MODES.BOOK,
      book_selected_segment: getSelectedBookSegmentId(),
      book_applied_segments: normalizeBookAppliedSegments(appliedSegments),
      book_segment_crops: normalizeBookSegmentCrops(segmentCrops),
    };
  }

  function buildCurrentBookSegmentCrop() {
    const cropSelection = getCropSelection();
    if (!cropSelection) {
      return null;
    }

    return normalizeStoredBookCrop({
      ...cropSelection,
      source_filename: getSelectedFile()?.name || null,
    });
  }

  function setPaletteVisibility(visible) {
    if (paletteSidebar) {
      paletteSidebar.hidden = false;
    }
    mainShell?.classList.add("has-palette-sidebar");
  }

  return {
    applyModeUi,
    buildBookSnapshotFromGrid,
    buildCurrentBookSegmentCrop,
    handleBookSegmentChange,
    handleModeTabClick,
    renderEmptyBookWorkspace,
    setActiveMode,
    setPaletteVisibility,
    updateModeSummary,
  };
}

export { createModeWorkspaceController };
