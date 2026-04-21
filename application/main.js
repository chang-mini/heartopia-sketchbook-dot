import {
  APP_MODES,
  BOOK_LAYOUT,
  DEFAULT_GUIDE_GRID_COLOR,
  DEFAULT_PALETTE_ITEMS,
  GUIDE_GRID_COLOR_STORAGE_KEY,
  PALETTE_BY_CODE,
} from "../config/app-constants.js";
import { CANVAS_PRESETS } from "../config/catalog.js";
import {
  bookRangeField,
  bookSegmentInput,
  canvasFullscreenButton,
  cropBox,
  cropFrame,
  cropImage,
  cropMeta,
  cropStage,
  expandCropButton,
  expandedBookSegmentInput,
  expandedBookSegmentWrap,
  expandedCloseCropButton,
  expandedCropBox,
  expandedCropFrame,
  expandedCropImage,
  expandedCropMeta,
  expandedCropModal,
  expandedFullCropButton,
  expandedPrecisionInput,
  expandedRatioInput,
  expandedResetCropButton,
  expandedSketchbookOptions,
  expandedSubmitCropButton,
  form,
  fullCropButton,
  gridColorChip,
  gridColorControl,
  gridColorInput,
  gridColorPanel,
  gridColorResetButton,
  gridColorSample,
  gridColorToggleButton,
  gridColorValue,
  guideCanvas,
  guideContext,
  guideEmpty,
  guideEmptyText,
  guideFullscreenClose,
  guideViewport,
  imageInput,
  mainShell,
  modeLockedNote,
  modeSummary,
  modeTabButtons,
  palette,
  paletteCompleteButton,
  paletteFamilyTrack,
  paletteFilterNote,
  paletteModeIndicator,
  paletteMultiToggleButton,
  paletteNextButton,
  palettePreview,
  palettePrevButton,
  paletteSidebar,
  precisionInput,
  progressBar,
  ratioInput,
  resetCropButton,
  saveCurrentButton,
  savedFileInput,
  savedStatus,
  statusPill,
  submitButton,
  viewerNote,
  viewerShell,
  zoomInButton,
  zoomOutButton,
  zoomResetButton,
  gridToggleButton,
  sidebar,
  sidebarToggleButton,
  tuningSaturation,
  tuningSaturationValue,
  tuningContrast,
  tuningContrastValue,
  tuningBrightness,
  tuningBrightnessValue,
  tuningReset,
  multiRangeField,
  multiLayoutField,
  multiSplitCountInput,
  multiLayoutSelect,
  expandedMultiOptions,
  expandedMultiSplitCountInput,
  expandedMultiLayoutSelect,
  multiPieceTabBar,
  multiMosaicView,
  multiSplitOverlayLayer,
  expandedMultiSplitOverlayLayer,
} from "../infrastructure/browser/dom-elements.js";
import { buildCroppedFilename, canvasToBlob, getPreferredUploadType, triggerFileDownload } from "../infrastructure/browser/files.js";
import { createPyodideConverter } from "../infrastructure/pyodide/runtime.js";
import { createDefaultModeUiState, cropViews, paletteState, viewerState } from "./state.js";
import {
  cloneGridCodes,
  createEmptyGridCodes,
  getBookFullGuideSegments,
  getBookSegment,
  mergeBookSegmentIntoGrid,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
  normalizeStoredBookCrop,
} from "../domain/book/grid.js";
import { createBookCropOverlayRenderer } from "../domain/crop/book-overlays.js";
import { createMultiSplitOverlayRenderer } from "../domain/crop/multi-overlays.js";
import { createMosaicRenderer } from "../domain/multi/mosaic.js";
import { computePieceRects, getDefaultLayoutForCount } from "../domain/multi/layout.js";
import { buildMultiBundleFilename, buildMultiPieceFilename } from "../domain/multi/filename.js";
import { buildMultiBundleSnapshot } from "../domain/multi/bundle.js";
import { createMultiSketchbookController } from "./multi-sketchbook-controller.js";
import { createCropInteractionController } from "../domain/crop/interactions.js";
import { createCropSelectionController } from "../domain/crop/selection.js";
import { createCropWorkspaceController } from "../domain/crop/workspace.js";
import {
  buildUsedColorsFromGrid,
  getGuideLabelColor,
  mixHexColors,
  normalizeHexColor,
  rgbaFromHexColor,
} from "../domain/palette/color-utils.js";
import { createGuideCanvasController } from "../domain/guide/canvas.js";
import { createGuideInteractionController } from "../domain/guide/interactions.js";
import { buildSavedFilename, extractPortableSnapshot, isPortableSnapshot } from "../domain/snapshot/portable.js";
import { clamp } from "../domain/shared/math.js";
import { createCropPreviewController } from "./crop-preview-controller.js";
import { formatConversionStatus } from "./conversion-status.js";
import { createConversionSessionController } from "./conversion-session-controller.js";
import { createCropRatioController } from "./crop-ratio-controller.js";
import { createGridColorController } from "./grid-color-controller.js";
import { createModeWorkspaceController } from "./mode-workspace-controller.js";
import { createModeSnapshotController } from "./mode-snapshot.js";
import { createPaletteController } from "./palette-controller.js";
import { createResultViewController } from "./result-view-controller.js";
import { createSavedFileController } from "./saved-file-controller.js";
import { createSubmissionController } from "./submission-controller.js";
import { createViewerInfoController } from "./viewer-info-controller.js";
import { createViewportController, getViewportLayoutMode } from "./viewport-controller.js";
import { buildPaletteGroups } from "../domain/palette/groups.js";

// ─── STATE ───────────────────────────────────────────────────────────────────

let activeSocket = null;
let activeJobId = null;
let pollingHandle = null;
let selectedFile = null;
let sourceImageUrl = null;
let cropSelection = null;
let expandedCropSelection = null;
let expandedCropDraft = null;
let guideInteraction = null;
let currentResultSnapshot = null;
let lastViewportLayoutMode = getViewportLayoutMode();
let activeMode = APP_MODES.SKETCHBOOK;
let isCropStageExpanded = false;
let guideGridColor = DEFAULT_GUIDE_GRID_COLOR;
let pendingConversionContext = { mode: APP_MODES.SKETCHBOOK, bookSegmentId: null, bookSegmentCrop: null, pieceIndex: null, totalPieces: null, multiLayout: null };
let sketchbookSnapshot = null;
let bookSnapshot = null;
let currentMultiSnapshot = null;
let multiController = null;
let submissionController = null;
const modeUiStates = {
  [APP_MODES.SKETCHBOOK]: {
    snapshotKey: null,
    state: createDefaultModeUiState(),
  },
  [APP_MODES.BOOK]: {
    snapshotKey: null,
    state: createDefaultModeUiState(),
  },
  [APP_MODES.MULTI_SKETCHBOOK]: {
    snapshotKey: null,
    state: createDefaultModeUiState(),
  },
};
const renderSelectedFile = () => {};
const startConversion = (event) => submissionController?.startConversion(event);
const saveCurrentConversion = () => {
  if (activeMode === APP_MODES.MULTI_SKETCHBOOK) {
    return saveMultiSketchbookSnapshot();
  }
  return submissionController?.saveCurrentConversion();
};
let selectedBookSegmentId = bookSegmentInput?.value || "back_cover";
const cropResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(() => {
    scheduleCropLayoutRefresh();
    try { renderMultiSplitOverlays(); } catch (_) { /* TDZ guard during init */ }
  })
  : null;
// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

  // -- Crop workspace & geometry --
const {
  getCropSelectionForView,
  getCropViewByKey,
  getNaturalCropImageElement,
  getReferenceCropView,
  getVisibleCropViews,
  setCropSelectionForView,
  syncExpandedSelectionToSidebar,
} = createCropWorkspaceController({
  cropViews,
  getIsCropStageExpanded: () => isCropStageExpanded,
  getCropSelection: () => cropSelection,
  setCropSelection: (selection) => {
    cropSelection = selection;
  },
  getExpandedCropSelection: () => expandedCropSelection,
  setExpandedCropSelection: (selection) => {
    expandedCropSelection = selection;
  },
  setExpandedCropDraft: (draft) => {
    expandedCropDraft = draft;
  },
});
const {
  getTargetCropRatio,
  getTargetCropRatioLabel,
} = createCropRatioController({
  APP_MODES,
  BOOK_LAYOUT,
  CANVAS_PRESETS,
  ratioInput,
  precisionInput,
  getBookSegment,
  getActiveMode: () => activeMode,
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  getMultiLayout: () => multiController?.getActiveLayout() || null,
});
const {
  buildDisplayCropRect,
  cloneCropSelection,
  cloneDisplayCropRect,
  computeMovedDisplayRect,
  computeMovedSelection,
  computeResizedDisplayRect,
  computeResizedSelection,
  createCenteredCropSelection,
  createCropSelection,
  createFullCropSelection,
  getCropDisplayMetrics,
  getCropPixelsForSelection,
  isDisplayCropRectAligned,
  isFullCropSelection,
  normalizeDisplayCropRect,
} = createCropSelectionController({
  cropViews,
  cropImage,
  getCropViewByKey,
  getReferenceCropView,
  getNaturalCropImageElement,
  getTargetCropRatio,
  clamp,
});
const { renderBookCropOverlays } = createBookCropOverlayRenderer({
  APP_MODES,
  getVisibleCropViews,
  getNaturalCropImageElement,
  getActiveMode: () => activeMode,
  getCropDisplayMetrics,
  getCurrentResultSnapshot: () => currentResultSnapshot,
  getBookSnapshot: () => bookSnapshot,
  getSelectedFileName: () => selectedFile?.name || null,
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  getCropSelectionForView,
  getCropSelection: () => cropSelection,
  getBookSegment,
  getBookFullGuideSegments,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
});
const { renderMultiSplitOverlays } = createMultiSplitOverlayRenderer({
  APP_MODES,
  getActiveMode: () => activeMode,
  getVisibleCropViews,
  getActiveLayout: () => multiController?.getActiveLayout() || null,
  getCropSelectionForView,
  getCropDisplayMetrics,
});
const { renderMosaicView, clearMosaicView } = createMosaicRenderer({
  container: multiMosaicView,
  getPaletteByCode: () => PALETTE_BY_CODE,
  isMultiModeActive: () => activeMode === APP_MODES.MULTI_SKETCHBOOK,
});
multiController = createMultiSketchbookController({
  APP_MODES,
  multiSplitCountInput,
  multiLayoutSelect,
  multiLayoutField,
  expandedMultiSplitCountInput,
  expandedMultiLayoutSelect,
  multiPieceTabBar,
  getActiveMode: () => activeMode,
  getCurrentMultiSnapshot: () => currentMultiSnapshot,
  setCurrentMultiSnapshot: (snapshot) => {
    currentMultiSnapshot = snapshot;
  },
  onLayoutChanged: () => {
    if (activeMode === APP_MODES.MULTI_SKETCHBOOK) {
      if (cropImage?.naturalWidth) {
        applyDefaultCropSelection();
      }
      renderMultiSplitOverlays();
    }
  },
  onSplitCountChanged: () => {
    if (activeMode === APP_MODES.MULTI_SKETCHBOOK) {
      if (cropImage?.naturalWidth) {
        applyDefaultCropSelection();
      }
      renderMultiSplitOverlays();
    }
  },
  onPieceTabChanged: (nextIndex) => {
    handleMultiPieceTabChange(nextIndex);
  },
});
const {
  applyDefaultCropSelection,
  getCropPixels,
  handleCropPointerDown,
  handleCropPointerEnd,
  handleCropPointerMove,
  renderCropSelection,
  resetCropSelection,
  scheduleCropLayoutRefresh,
  selectFullCropSelection,
} = createCropInteractionController({
  getVisibleCropViews,
  getCropViewByKey,
  getCropSelectionForView,
  setCropSelectionForView,
  getCropSelection: () => cropSelection,
  getExpandedCropSelection: () => expandedCropSelection,
  setExpandedCropSelection: (selection) => {
    expandedCropSelection = selection;
  },
  getExpandedCropDraft: () => expandedCropDraft,
  setExpandedCropDraft: (draft) => {
    expandedCropDraft = draft;
  },
  getNaturalCropImageElement,
  getSelectedFile: () => selectedFile,
  getTargetCropRatioLabel,
  createCenteredCropSelection,
  createFullCropSelection,
  getCropDisplayMetrics,
  buildDisplayCropRect,
  isDisplayCropRectAligned,
  cloneDisplayCropRect,
  normalizeDisplayCropRect,
  computeMovedDisplayRect,
  computeMovedSelection,
  computeResizedDisplayRect,
  computeResizedSelection,
  getCropPixelsForSelection,
  renderBookCropOverlays,
  renderMultiSplitOverlays,
});
  // -- Palette --
const {
  ensurePalettePageForActiveGroup,
  getActivePaletteCodes,
  getPaletteGroupNameByCode,
  renderPalette,
  renderPaletteDetails,
  renderPaletteGroups,
  setPaletteFilter,
  setPaletteGroup,
  shiftPalettePage,
  syncActivePaletteSelection,
  togglePaletteMultiSelect,
  updatePaletteFilterUi,
} = createPaletteController({
  DEFAULT_PALETTE_ITEMS,
  paletteState,
  viewerState,
  palette,
  paletteFamilyTrack,
  palettePreview,
  paletteSidebar,
  mainShell,
  paletteMultiToggleButton,
  paletteCompleteButton,
  palettePrevButton,
  paletteNextButton,
  paletteFilterNote,
  paletteModeIndicator,
  buildPaletteGroups,
  clamp,
  isCodeCompleted: (code) => isCodeCompleted(code),
  onPaletteSelectionVisualChange: () => {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  },
});
  // -- Viewer info --
const {
  getActiveColorProgressText,
  isBookCanvasMode,
  updateViewerDetail,
  updateViewerNote,
} = createViewerInfoController({
  APP_MODES,
  viewerState,
  viewerNote,
  getBookSegment,
  normalizeBookAppliedSegments,
  getActivePaletteCodes,
  getTotalCountForCode: (code) => getTotalCountForCode(code),
  countCompletedCellsForCode: (code) => countCompletedCellsForCode(code),
  getActiveMode: () => activeMode,
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  getCurrentResultSnapshot: () => currentResultSnapshot,
  getCurrentMultiSnapshot: () => currentMultiSnapshot,
});
  // -- Result view --
const {
  prepareGuideViewer,
  renderCompleted,
  renderError,
  resetResultArea,
  setGuideControlsEnabled,
  setGuideMessage,
  setStatus,
  updateSaveButtonState,
} = createResultViewController({
  statusPill,
  progressBar,
  guideEmpty,
  guideEmptyText,
  guideViewport,
  viewerNote,
  zoomOutButton,
  zoomResetButton,
  zoomInButton,
  gridToggleButton,
  sidebarToggleButton,
  canvasFullscreenButton,
  saveCurrentButton,
  viewerState,
  renderPalette,
  loadGuideGrid: (gridCodes, usedColors) => loadGuideGrid(gridCodes, usedColors),
  clearGuideCanvas: () => clearGuideCanvas(),
  renderBookCropOverlays: () => renderBookCropOverlays(),
  scheduleGuideViewportFit: () => scheduleGuideViewportFit(),
  restoreModeUiStateForSnapshot: (snapshot) => restoreModeUiStateForSnapshot(snapshot),
  setPaletteVisibility: (visible) => setPaletteVisibility(visible),
  getCurrentResultSnapshot: () => currentResultSnapshot,
  setCurrentResultSnapshot: (snapshot) => {
    currentResultSnapshot = snapshot;
  },
  setGuideInteraction: (nextInteraction) => {
    guideInteraction = nextInteraction;
  },
});
  // -- Conversion session --
const {
  buildPortableSnapshot,
  finishTracking,
  handleSnapshot,
  stopTracking,
} = createConversionSessionController({
  APP_MODES,
  BOOK_LAYOUT,
  normalizeBookAppliedSegments,
  normalizeBookSegmentCrops,
  createEmptyGridCodes,
  cloneGridCodes,
  mergeBookSegmentIntoGrid,
  buildBookSnapshotFromGrid: (...args) => buildBookSnapshotFromGrid(...args),
  buildCurrentBookSegmentCrop: () => buildCurrentBookSegmentCrop(),
  formatStatus: formatConversionStatus,
  setStatus,
  renderCompleted,
  renderError,
  updateSaveButtonState,
  getActiveMode: () => activeMode,
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  getSelectedFile: () => selectedFile,
  getCurrentResultSnapshot: () => currentResultSnapshot,
  setCurrentResultSnapshot: (snapshot) => {
    currentResultSnapshot = snapshot;
  },
  getBookSnapshot: () => bookSnapshot,
  setBookSnapshot: (snapshot) => {
    bookSnapshot = snapshot;
  },
  getSketchbookSnapshot: () => sketchbookSnapshot,
  setSketchbookSnapshot: (snapshot) => {
    sketchbookSnapshot = snapshot;
  },
  getPendingConversionContext: () => pendingConversionContext,
  setPendingConversionContext: (nextContext) => {
    pendingConversionContext = nextContext;
  },
  getActiveSocket: () => activeSocket,
  setActiveSocket: (socket) => {
    activeSocket = socket;
  },
  setActiveJobId: (jobId) => {
    activeJobId = jobId;
  },
  setPollingHandle: (handle) => {
    pollingHandle = handle;
  },
  setSubmitEnabled: (enabled) => {
    submitButton.disabled = !enabled;
  },
});
  // -- Pyodide converter --
const { convertImageLocally } = createPyodideConverter({ setStatus });

  // -- Guide canvas --
const {
  clampGuidePan,
  clearGuideCanvas,
  drawGuideCanvas,
  fitGuideToViewport,
  getCellFromClientPoint,
  loadGuideGrid,
  scheduleGuideViewportFit,
  zoomGuide,
  zoomGuideAtViewportCenter,
} = createGuideCanvasController({
  guideCanvas,
  guideContext,
  guideEmpty,
  guideViewport,
  viewerState,
  getGuideGridColor: () => guideGridColor,
  getActiveMode: () => activeMode,
  getCurrentResultSnapshot: () => currentResultSnapshot,
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
});
  // -- Grid color --
const {
  applyGuideGridColor,
  handleGridColorInput,
  handleGridColorKeyDown,
  handleGridColorPointerDown,
  loadStoredGuideGridColor,
  resetGuideGridColor,
  toggleGridColorPanel,
} = createGridColorController({
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
  getGuideGridColor: () => guideGridColor,
  setGuideGridColor: (nextColor) => {
    guideGridColor = nextColor;
  },
});
  // -- Guide interaction --
const {
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
} = createGuideInteractionController({
  guideViewport,
  viewerState,
  getGuideInteraction: () => guideInteraction,
  setGuideInteraction: (nextInteraction) => {
    guideInteraction = nextInteraction;
  },
  getCellFromClientPoint,
  getActivePaletteCodes,
  zoomGuide,
  clampGuidePan,
  drawGuideCanvas,
  renderPaletteDetails,
  updatePaletteFilterUi,
  updateViewerNote,
  updateViewerDetail,
});
  // -- Crop preview --
const {
  applyExpandedCropSelectionAndConvert,
  clearCropPreview,
  closeExpandedCropModal,
  handleCropImageError,
  handleCropImageLoaded,
  handleExpandedCropImageError,
  handleExpandedCropImageLoaded,
  handleExpandedPrecisionChange,
  handleExpandedRatioChange,
  handleImageSelection,
  handlePrecisionChange,
  handleRatioChange,
  handleWindowKeyDown,
  loadCropPreview,
  releaseSourceImage,
  setCropStageExpanded,
  syncExpandedSketchbookControls,
  toggleCropStageExpanded,
} = createCropPreviewController({
  APP_MODES,
  imageInput,
  savedFileInput,
  savedStatus,
  submitButton,
  ratioInput,
  precisionInput,
  expandedRatioInput,
  expandedPrecisionInput,
  cropStage,
  cropImage,
  cropMeta,
  expandedCropImage,
  expandedCropMeta,
  expandedCropModal,
  expandedSketchbookOptions,
  expandedBookSegmentWrap,
  expandCropButton,
  renderSelectedFile,
  renderError,
  renderCompleted,
  renderEmptyBookWorkspace: () => renderEmptyBookWorkspace(),
  resetResultArea,
  stopTracking,
  setStatus,
  startConversion: (event) => startConversion(event),
  applyDefaultCropSelection,
  cloneCropSelection,
  createCropSelection,
  syncExpandedSelectionToSidebar,
  scheduleCropLayoutRefresh,
  renderCropSelection,
  getActiveMode: () => activeMode,
  getBookSnapshot: () => bookSnapshot,
  getCurrentResultSnapshot: () => currentResultSnapshot,
  getSelectedFile: () => selectedFile,
  setSelectedFile: (file) => {
    selectedFile = file;
  },
  getSourceImageUrl: () => sourceImageUrl,
  setSourceImageUrl: (nextUrl) => {
    sourceImageUrl = nextUrl;
  },
  getIsCropStageExpanded: () => isCropStageExpanded,
  setIsCropStageExpanded: (nextExpanded) => {
    isCropStageExpanded = nextExpanded;
  },
  getCropSelection: () => cropSelection,
  setCropSelection: (selection) => {
    cropSelection = selection;
  },
  getExpandedCropSelection: () => expandedCropSelection,
  setExpandedCropSelection: (selection) => {
    expandedCropSelection = selection;
  },
  setExpandedCropDraft: (draft) => {
    expandedCropDraft = draft;
  },
});
  // -- Mode workspace --
const {
  applyModeUi,
  buildBookSnapshotFromGrid,
  buildCurrentBookSegmentCrop,
  handleBookSegmentChange,
  handleModeTabClick,
  renderEmptyBookWorkspace,
  renderEmptyMultiWorkspace,
  setActiveMode,
  setPaletteVisibility,
  updateModeSummary,
} = createModeWorkspaceController({
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
  multiRangeField,
  multiLayoutField,
  expandedMultiOptions,
  multiPieceTabBar,
  multiMosaicView,
  multiSplitOverlayLayer,
  expandedMultiSplitOverlayLayer,
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
  renderMultiSplitOverlays,
  prepareGuideViewer,
  updateSaveButtonState,
  updateViewerNote,
  syncExpandedSketchbookControls,
  resetResultArea,
  stopTracking,
  persistCurrentSnapshotByMode: () => {
    // MULTI pieces are tagged canvas_mode="sketchbook" for viewer compat,
    // but they must NOT overwrite the real sketchbookSnapshot. Multi keeps
    // its own state in currentMultiSnapshot, so simply skip the persist.
    if (activeMode === APP_MODES.MULTI_SKETCHBOOK) return;
    persistCurrentSnapshotByMode();
  },
  persistCurrentModeUiState: () => persistCurrentModeUiState(),
  applyModeSnapshot: (snapshot) => applyModeSnapshot(snapshot),
  hideMultiPieceTabs: () => multiController?.hidePieceTabs?.(),
  clearMultiMosaicView: () => {
    clearMosaicView();
    // loadOverviewIntoViewer hides the guide canvas so the mosaic can own
    // the viewport. Restore it now that we're leaving the overview so that
    // sketchbook/book conversions remain visible.
    if (guideCanvas) guideCanvas.style.display = "";
  },
  syncMultiControlsFromSnapshot: (snapshot) => syncMultiControlsFromMultiSnapshot(snapshot),
  restoreMultiViewFromSnapshot: () => restoreMultiViewFromSnapshot(),
  getActiveMode: () => activeMode,
  setActiveModeValue: (nextMode) => {
    activeMode = nextMode;
  },
  getIsCropStageExpanded: () => isCropStageExpanded,
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  setSelectedBookSegmentId: (segmentId) => {
    selectedBookSegmentId = segmentId;
  },
  getCurrentResultSnapshot: () => currentResultSnapshot,
  setCurrentResultSnapshot: (snapshot) => {
    currentResultSnapshot = snapshot;
  },
  getSelectedFile: () => selectedFile,
  getSketchbookSnapshot: () => sketchbookSnapshot,
  getBookSnapshot: () => bookSnapshot,
  getCurrentMultiSnapshot: () => currentMultiSnapshot,
  setCurrentMultiSnapshot: (snapshot) => {
    currentMultiSnapshot = snapshot;
  },
  getCropSelection: () => cropSelection,
});
  // -- Mode snapshot --
const {
  applyModeSnapshot,
  captureCurrentModeUiState,
  extractSavedUiState,
  persistCurrentModeUiState,
  persistCurrentSnapshotByMode,
  primeModeUiStateForSnapshot,
  restoreModeUiStateForSnapshot,
} = createModeSnapshotController({
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
  getCurrentResultSnapshot: () => currentResultSnapshot,
  setCurrentResultSnapshot: (snapshot) => {
    currentResultSnapshot = snapshot;
  },
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  setSelectedBookSegmentId: (segmentId) => {
    selectedBookSegmentId = segmentId;
  },
  setBookSnapshot: (snapshot) => {
    bookSnapshot = snapshot;
  },
  setSketchbookSnapshot: (snapshot) => {
    sketchbookSnapshot = snapshot;
  },
  applyModeUi,
  renderCompleted,
  updateSaveButtonState,
  setSubmitEnabled: (enabled) => {
    submitButton.disabled = !enabled;
  },
});
  // -- Saved file --
const {
  handleSavedFileSelection,
} = createSavedFileController({
  APP_MODES,
  savedStatus,
  savedFileInput,
  extractPortableSnapshot,
  isPortableSnapshot,
  primeModeUiStateForSnapshot,
  extractSavedUiState,
  stopTracking: () => stopTracking(),
  persistCurrentSnapshotByMode: () => {
    // MULTI pieces are tagged canvas_mode="sketchbook" for viewer compat,
    // but they must NOT overwrite the real sketchbookSnapshot. Multi keeps
    // its own state in currentMultiSnapshot, so simply skip the persist.
    if (activeMode === APP_MODES.MULTI_SKETCHBOOK) return;
    persistCurrentSnapshotByMode();
  },
  persistCurrentModeUiState: () => persistCurrentModeUiState(),
  buildPortableSnapshot,
  applyModeSnapshot: (snapshot) => applyModeSnapshot(snapshot),
  setStatus,
  setActiveModeValue: (nextMode) => {
    activeMode = nextMode;
  },
  applyMultiBundleSnapshot: (snapshot, savedUiState, sourceName) => applyMultiBundleSnapshot(snapshot, savedUiState, sourceName),
});
  // -- Color tuning --
const TUNING_DEFAULTS = { saturation: 1.0, contrast: 1.0, brightness: 1.0 };
const TUNING_MIN = 0;
const TUNING_MAX = 2;
function formatTuningValue(value) {
  return Number(value).toFixed(2);
}
function clampTuningValue(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (num < TUNING_MIN) return TUNING_MIN;
  if (num > TUNING_MAX) return TUNING_MAX;
  return num;
}
function getTuningValues() {
  return {
    saturation: tuningSaturation ? Number(tuningSaturation.value) : TUNING_DEFAULTS.saturation,
    contrast: tuningContrast ? Number(tuningContrast.value) : TUNING_DEFAULTS.contrast,
    brightness: tuningBrightness ? Number(tuningBrightness.value) : TUNING_DEFAULTS.brightness,
  };
}
function pushSliderToInput(slider, valueInput) {
  if (slider && valueInput) {
    valueInput.value = formatTuningValue(slider.value);
  }
}
function pushInputToSlider(slider, valueInput) {
  if (!slider || !valueInput) return;
  const clamped = clampTuningValue(valueInput.value);
  if (clamped === null) return;
  slider.value = String(clamped);
}
function commitInputDisplay(valueInput) {
  if (!valueInput) return;
  const clamped = clampTuningValue(valueInput.value);
  if (clamped === null) {
    valueInput.value = formatTuningValue(TUNING_DEFAULTS.saturation);
  } else {
    valueInput.value = formatTuningValue(clamped);
  }
}
function resetTuningToDefaults() {
  if (tuningSaturation) tuningSaturation.value = String(TUNING_DEFAULTS.saturation);
  if (tuningContrast) tuningContrast.value = String(TUNING_DEFAULTS.contrast);
  if (tuningBrightness) tuningBrightness.value = String(TUNING_DEFAULTS.brightness);
  pushSliderToInput(tuningSaturation, tuningSaturationValue);
  pushSliderToInput(tuningContrast, tuningContrastValue);
  pushSliderToInput(tuningBrightness, tuningBrightnessValue);
}
pushSliderToInput(tuningSaturation, tuningSaturationValue);
pushSliderToInput(tuningContrast, tuningContrastValue);
pushSliderToInput(tuningBrightness, tuningBrightnessValue);
  // -- Submission --
submissionController = createSubmissionController({
  APP_MODES,
  BOOK_LAYOUT,
  imageInput,
  cropImage,
  ratioInput,
  precisionInput,
  submitButton,
  savedStatus,
  savedFileInput,
  buildCroppedFilename,
  canvasToBlob,
  getPreferredUploadType,
  triggerFileDownload,
  buildSavedFilename,
  isPortableSnapshot,
  captureCurrentModeUiState,
  buildPortableSnapshot,
  getCropPixels,
  getNaturalCropImageElement,
  isFullCropSelection,
  getTargetCropRatio,
  renderSelectedFile,
  renderError,
  stopTracking,
  finishTracking,
  setStatus,
  renderEmptyBookWorkspace,
  resetResultArea,
  setGuideMessage,
  handleSnapshot,
  convertImageLocally,
  getBookSegment,
  getActiveMode: () => activeMode,
  getSelectedFile: () => selectedFile,
  setSelectedFile: (file) => {
    selectedFile = file;
  },
  getCropSelection: () => cropSelection,
  getBookSnapshot: () => bookSnapshot,
  getSelectedBookSegmentId: () => selectedBookSegmentId,
  setPendingConversionContext: (nextContext) => {
    pendingConversionContext = nextContext;
  },
  setActiveJobId: (jobId) => {
    activeJobId = jobId;
  },
  buildCurrentBookSegmentCrop: () => buildCurrentBookSegmentCrop(),
  getCurrentResultSnapshot: () => currentResultSnapshot,
  getIsCropStageExpanded: () => isCropStageExpanded,
  setCropStageExpanded,
  getTuningValues,
  getMultiActiveLayout: () => multiController?.getActiveLayout() || null,
  computeMultiPieceRects: (selection, layout) => computePieceRects(selection, layout),
  onMultiConversionStart: ({ layout, totalPieces, sourceFilename, ratio, precision }) => {
    currentMultiSnapshot = {
      sessionId: `multi-${Date.now()}`,
      sourceFilename,
      layout: { rows: layout.rows, cols: layout.cols, count: layout.count },
      pieceRatio: ratio,
      piecePrecision: precision,
      pieces: [],
      activePieceIndex: null,
      createdAt: new Date().toISOString(),
    };
  },
  onMultiPieceCompleted: ({ pieceIndex, snapshot }) => {
    if (!currentMultiSnapshot) return;
    currentMultiSnapshot.pieces[pieceIndex] = {
      grid_codes: Array.isArray(snapshot.grid_codes) ? snapshot.grid_codes : [],
      used_colors: Array.isArray(snapshot.used_colors) ? snapshot.used_colors : [],
      width: snapshot.width,
      height: snapshot.height,
      ratio: snapshot.ratio,
      precision: snapshot.precision,
      filename: snapshot.filename,
      created_at: snapshot.created_at,
      updated_at: snapshot.updated_at,
    };
  },
  onMultiConversionFinished: () => {
    if (!currentMultiSnapshot) return;
    loadOverviewIntoViewer();
  },
  onMultiConversionFailed: () => {
    currentMultiSnapshot = null;
    currentResultSnapshot = null;
    multiController?.hidePieceTabs();
    clearMosaicView();
    updateSaveButtonState(false);
  },
});
  // -- Viewport --
const { handleWindowResize } = createViewportController({
  viewerState,
  viewerShell,
  scheduleCropLayoutRefresh,
  fitGuideToViewport,
  clearGuideCanvas,
  getCropSelection: () => cropSelection,
  getExpandedCropSelection: () => expandedCropSelection,
  getLastViewportLayoutMode: () => lastViewportLayoutMode,
  setLastViewportLayoutMode: (nextMode) => {
    lastViewportLayoutMode = nextMode;
  },
});

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────

imageInput?.addEventListener("change", handleImageSelection);
ratioInput?.addEventListener("change", handleRatioChange);
precisionInput?.addEventListener("change", handlePrecisionChange);
form?.addEventListener("submit", startConversion);
submitButton?.addEventListener("click", startConversion);
expandedSubmitCropButton?.addEventListener("click", applyExpandedCropSelectionAndConvert);
resetCropButton?.addEventListener("click", () => resetCropSelection("sidebar"));
fullCropButton?.addEventListener("click", () => selectFullCropSelection("sidebar"));
expandedResetCropButton?.addEventListener("click", () => resetCropSelection("expanded"));
expandedFullCropButton?.addEventListener("click", () => selectFullCropSelection("expanded"));
expandCropButton?.addEventListener("click", toggleCropStageExpanded);
expandedCloseCropButton?.addEventListener("click", closeExpandedCropModal);
cropImage?.addEventListener("load", handleCropImageLoaded);
cropImage?.addEventListener("error", handleCropImageError);
expandedCropImage?.addEventListener("load", handleExpandedCropImageLoaded);
expandedCropImage?.addEventListener("error", handleExpandedCropImageError);
cropImage?.addEventListener("dragstart", (event) => event.preventDefault());
expandedCropImage?.addEventListener("dragstart", (event) => event.preventDefault());
cropBox?.addEventListener("pointerdown", handleCropPointerDown);
expandedCropBox?.addEventListener("pointerdown", handleCropPointerDown);
cropFrame?.addEventListener("dblclick", () => resetCropSelection("sidebar"));
expandedCropFrame?.addEventListener("dblclick", () => resetCropSelection("expanded"));
guideViewport?.addEventListener("wheel", handleGuideWheel, { passive: false });
guideViewport?.addEventListener("pointerdown", handleGuidePointerDown);
guideViewport?.addEventListener("touchstart", handleGuideTouchStart, { passive: false });
guideViewport?.addEventListener("touchmove", handleGuideTouchMove, { passive: false });
guideViewport?.addEventListener("touchend", handleGuideTouchEnd);
guideViewport?.addEventListener("pointermove", handleGuideHover);
guideViewport?.addEventListener("pointerleave", clearGuideHover);
zoomOutButton?.addEventListener("click", () => zoomGuideAtViewportCenter(1 / 1.2));
zoomResetButton?.addEventListener("click", () => fitGuideToViewport(true));
zoomInButton?.addEventListener("click", () => zoomGuideAtViewportCenter(1.2));
gridToggleButton?.addEventListener("click", () => {
  viewerState.showGrid = !viewerState.showGrid;
  gridToggleButton.setAttribute("aria-pressed", String(viewerState.showGrid));
  drawGuideCanvas();
});
sidebarToggleButton?.addEventListener("click", () => {
  const isHidden = sidebar.classList.toggle("is-hidden");
  mainShell.classList.toggle("sidebar-hidden", isHidden);
  sidebarToggleButton.setAttribute("aria-pressed", String(isHidden));
  sidebarToggleButton.textContent = isHidden ? "사이드바 보이기" : "사이드바 숨기기";
  mainShell.addEventListener("transitionend", () => {
    window.requestAnimationFrame(() => fitGuideToViewport(true));
  }, { once: true });
});
let fullscreenPreviousParent = null;
let fullscreenPreviousSibling = null;
function enterCanvasFullscreen() {
  fullscreenPreviousParent = guideViewport.parentNode;
  fullscreenPreviousSibling = guideViewport.nextSibling;
  document.body.appendChild(guideViewport);
  guideViewport.classList.add("is-fullscreen");
  document.body.classList.add("canvas-fullscreen");
  window.requestAnimationFrame(() => fitGuideToViewport(true));
}
function exitCanvasFullscreen() {
  guideViewport.classList.remove("is-fullscreen");
  document.body.classList.remove("canvas-fullscreen");
  if (fullscreenPreviousParent) {
    fullscreenPreviousParent.insertBefore(guideViewport, fullscreenPreviousSibling);
  }
  fullscreenPreviousParent = null;
  fullscreenPreviousSibling = null;
  window.requestAnimationFrame(() => fitGuideToViewport(true));
}
canvasFullscreenButton?.addEventListener("click", enterCanvasFullscreen);
guideFullscreenClose?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});
guideFullscreenClose?.addEventListener("click", exitCanvasFullscreen);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && guideViewport.classList.contains("is-fullscreen")) {
    exitCanvasFullscreen();
  }
});
saveCurrentButton?.addEventListener("click", saveCurrentConversion);
gridColorToggleButton?.addEventListener("click", toggleGridColorPanel);
gridColorInput?.addEventListener("input", handleGridColorInput);
gridColorResetButton?.addEventListener("click", resetGuideGridColor);
savedFileInput?.addEventListener("change", handleSavedFileSelection);
paletteMultiToggleButton?.addEventListener("click", togglePaletteMultiSelect);
paletteCompleteButton?.addEventListener("click", completeActiveColorCells);
palettePrevButton?.addEventListener("click", () => shiftPalettePage(-1));
paletteNextButton?.addEventListener("click", () => shiftPalettePage(1));
bookSegmentInput?.addEventListener("change", handleBookSegmentChange);
expandedBookSegmentInput?.addEventListener("change", handleBookSegmentChange);
expandedRatioInput?.addEventListener("change", handleExpandedRatioChange);
expandedPrecisionInput?.addEventListener("change", handleExpandedPrecisionChange);
modeTabButtons.forEach((button) => button.addEventListener("click", handleModeTabClick));
multiSplitCountInput?.addEventListener("change", (event) => multiController?.handleSplitCountChange(event));
multiLayoutSelect?.addEventListener("change", (event) => multiController?.handleLayoutChange(event));
expandedMultiSplitCountInput?.addEventListener("change", (event) => multiController?.handleSplitCountChange(event));
expandedMultiLayoutSelect?.addEventListener("change", (event) => multiController?.handleLayoutChange(event));
multiPieceTabBar?.addEventListener("click", (event) => multiController?.handlePieceTabBarClick(event));
ratioInput?.addEventListener("change", () => {
  if (activeMode === APP_MODES.MULTI_SKETCHBOOK && cropImage?.naturalWidth) {
    applyDefaultCropSelection();
    renderMultiSplitOverlays();
  }
});
precisionInput?.addEventListener("change", () => {
  if (activeMode === APP_MODES.MULTI_SKETCHBOOK && cropImage?.naturalWidth) {
    applyDefaultCropSelection();
    renderMultiSplitOverlays();
  }
});
window.addEventListener("pointermove", handleCropPointerMove);
window.addEventListener("pointerup", handleCropPointerEnd);
window.addEventListener("pointercancel", handleCropPointerEnd);
window.addEventListener("pointermove", handleGuidePointerMove);
window.addEventListener("pointerup", handleGuidePointerEnd);
window.addEventListener("pointercancel", handleGuidePointerEnd);
window.addEventListener("resize", handleWindowResize);
window.addEventListener("keydown", handleWindowKeyDown);
window.addEventListener("beforeunload", releaseSourceImage);
document.addEventListener("pointerdown", handleGridColorPointerDown);
document.addEventListener("keydown", handleGridColorKeyDown);
tuningSaturation?.addEventListener("input", () => pushSliderToInput(tuningSaturation, tuningSaturationValue));
tuningContrast?.addEventListener("input", () => pushSliderToInput(tuningContrast, tuningContrastValue));
tuningBrightness?.addEventListener("input", () => pushSliderToInput(tuningBrightness, tuningBrightnessValue));
tuningSaturationValue?.addEventListener("input", () => pushInputToSlider(tuningSaturation, tuningSaturationValue));
tuningContrastValue?.addEventListener("input", () => pushInputToSlider(tuningContrast, tuningContrastValue));
tuningBrightnessValue?.addEventListener("input", () => pushInputToSlider(tuningBrightness, tuningBrightnessValue));
tuningSaturationValue?.addEventListener("change", () => { commitInputDisplay(tuningSaturationValue); pushInputToSlider(tuningSaturation, tuningSaturationValue); });
tuningContrastValue?.addEventListener("change", () => { commitInputDisplay(tuningContrastValue); pushInputToSlider(tuningContrast, tuningContrastValue); });
tuningBrightnessValue?.addEventListener("change", () => { commitInputDisplay(tuningBrightnessValue); pushInputToSlider(tuningBrightness, tuningBrightnessValue); });
tuningReset?.addEventListener("click", resetTuningToDefaults);

// ─── OBSERVERS ───────────────────────────────────────────────────────────────

cropResizeObserver?.observe(cropFrame);
cropResizeObserver?.observe(cropImage);
cropResizeObserver?.observe(expandedCropFrame);
cropResizeObserver?.observe(expandedCropImage);

// ─── MULTI SKETCHBOOK HELPERS ────────────────────────────────────────────────

function syncMultiControlsFromMultiSnapshot(snapshot) {
  if (!snapshot || !multiController) return;
  const count = Number(snapshot.layout?.count ?? (snapshot.layout?.rows * snapshot.layout?.cols));
  const label = snapshot.layout ? `${snapshot.layout.rows}×${snapshot.layout.cols}` : null;
  if (Number.isFinite(count) && count > 0) {
    multiController.setSplitCountAndLayout(count, label);
  }
  if (ratioInput && snapshot.pieceRatio) ratioInput.value = snapshot.pieceRatio;
  if (precisionInput && snapshot.piecePrecision != null) precisionInput.value = String(snapshot.piecePrecision);
}

function loadPieceIntoViewer(index) {
  if (!currentMultiSnapshot) return;
  const piece = currentMultiSnapshot.pieces?.[index];
  if (!piece) return;
  // Hide mosaic, show canvas + piece grid.
  clearMosaicView();
  if (guideEmpty) guideEmpty.hidden = true;
  if (guideCanvas) guideCanvas.style.display = "";
  const pieceSnapshot = {
    ...piece,
    canvas_mode: APP_MODES.SKETCHBOOK,
  };
  currentResultSnapshot = pieceSnapshot;
  currentMultiSnapshot.activePieceIndex = index;
  loadGuideGrid(piece.grid_codes, piece.used_colors || []);
  setPaletteVisibility(true);
  updateViewerNote();
  updateSaveButtonState(true);
  multiController?.renderPieceTabs(currentMultiSnapshot.pieces, currentMultiSnapshot.layout, index);
}

function loadOverviewIntoViewer() {
  if (!currentMultiSnapshot) return;
  currentMultiSnapshot.activePieceIndex = null;
  // Hide canvas + empty placeholder so the mosaic owns the viewport area.
  clearGuideCanvas();
  if (guideCanvas) guideCanvas.style.display = "none";
  if (guideEmpty) guideEmpty.hidden = true;
  renderMosaicView({
    pieces: currentMultiSnapshot.pieces,
    layout: currentMultiSnapshot.layout,
    onTileClick: (tileIndex) => loadPieceIntoViewer(tileIndex),
  });
  setPaletteVisibility(false);
  multiController?.renderPieceTabs(currentMultiSnapshot.pieces, currentMultiSnapshot.layout, null);
  updateViewerNote();
  updateSaveButtonState(true);
}

function handleMultiPieceTabChange(nextIndex) {
  if (activeMode !== APP_MODES.MULTI_SKETCHBOOK || !currentMultiSnapshot) return;
  if (nextIndex === null || nextIndex === undefined) {
    loadOverviewIntoViewer();
  } else {
    loadPieceIntoViewer(Number(nextIndex));
  }
}

function restoreMultiViewFromSnapshot() {
  // Re-enters multi mode from a preserved in-memory session
  // (mode switch back, not a fresh conversion).
  if (!currentMultiSnapshot) return false;
  const pieces = currentMultiSnapshot.pieces;
  const layout = currentMultiSnapshot.layout;
  if (!Array.isArray(pieces) || !layout) return false;
  if (pieces.length !== layout.count) return false;

  const idx = currentMultiSnapshot.activePieceIndex;
  if (idx === null || idx === undefined) {
    loadOverviewIntoViewer();
  } else {
    loadPieceIntoViewer(Number(idx));
  }
  return true;
}

function applyMultiBundleSnapshot(snapshot, savedUiState, sourceName) {
  if (!snapshot || !Array.isArray(snapshot.multi_pieces)) return;

  activeMode = APP_MODES.MULTI_SKETCHBOOK;
  const layout = snapshot.multi_layout || null;
  currentMultiSnapshot = {
    sessionId: snapshot.job_id || `multi-${Date.now()}`,
    sourceFilename: snapshot.source_filename || snapshot.filename || sourceName || null,
    layout: layout ? { rows: layout.rows, cols: layout.cols, count: layout.count ?? (layout.rows * layout.cols) } : null,
    pieceRatio: snapshot.ratio || null,
    piecePrecision: snapshot.precision ?? null,
    pieces: snapshot.multi_pieces.map((piece) => ({
      grid_codes: piece.grid_codes || [],
      used_colors: piece.used_colors || [],
      width: piece.width,
      height: piece.height,
      ratio: piece.ratio,
      precision: piece.precision,
      filename: piece.filename,
      created_at: piece.created_at,
      updated_at: piece.updated_at,
    })),
    activePieceIndex: snapshot.active_piece_index ?? null,
    createdAt: snapshot.created_at || new Date().toISOString(),
  };

  syncMultiControlsFromMultiSnapshot(currentMultiSnapshot);
  applyModeUi();

  if (currentMultiSnapshot.activePieceIndex === null || currentMultiSnapshot.activePieceIndex === undefined) {
    loadOverviewIntoViewer();
  } else {
    loadPieceIntoViewer(Number(currentMultiSnapshot.activePieceIndex));
  }
}

async function saveMultiSketchbookSnapshot() {
  if (!currentMultiSnapshot) return;
  const { sourceFilename, layout, pieces } = currentMultiSnapshot;
  if (!layout || !Array.isArray(pieces) || pieces.length !== layout.count) return;

  const bundlePayload = {
    type: "duduta-dot-save",
    version: 1,
    exported_at: new Date().toISOString(),
    snapshot: buildMultiBundleSnapshot(currentMultiSnapshot),
    ui_state: captureCurrentModeUiState(),
  };
  const bundleBlob = new Blob([JSON.stringify(bundlePayload, null, 2)], { type: "application/json" });
  triggerFileDownload(bundleBlob, buildMultiBundleFilename(sourceFilename, layout.rows, layout.cols));

  for (let i = 0; i < pieces.length; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const piece = pieces[i];
    const pieceIndex1Based = i + 1;
    const pieceSnapshot = buildPortableSnapshot({
      ...piece,
      canvas_mode: APP_MODES.SKETCHBOOK,
      filename: `${(sourceFilename || "piece").replace(/\.[^.]+$/, "")}_multi_${layout.count}x${pieceIndex1Based}.png`,
    });
    const piecePayload = {
      type: "duduta-dot-save",
      version: 1,
      exported_at: new Date().toISOString(),
      snapshot: pieceSnapshot,
      ui_state: captureCurrentModeUiState(),
    };
    const pieceBlob = new Blob([JSON.stringify(piecePayload, null, 2)], { type: "application/json" });
    triggerFileDownload(pieceBlob, buildMultiPieceFilename(sourceFilename, layout.count, pieceIndex1Based));
  }
}

// ─── BOOT ────────────────────────────────────────────────────────────────────

loadStoredGuideGridColor();
applyGuideGridColor(guideGridColor, { persist: false, redraw: false });
renderSelectedFile();
renderCropSelection();
resetResultArea();
applyModeUi();

