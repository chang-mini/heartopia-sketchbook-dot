import {
  APP_MODES,
  BOOK_LAYOUT,
  DEFAULT_GUIDE_GRID_COLOR,
  DEFAULT_PALETTE_ITEMS,
  GUIDE_GRID_COLOR_STORAGE_KEY,
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
let pendingConversionContext = { mode: APP_MODES.SKETCHBOOK, bookSegmentId: null, bookSegmentCrop: null };
let sketchbookSnapshot = null;
let bookSnapshot = null;
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
};
const renderSelectedFile = () => {};
const startConversion = (event) => submissionController?.startConversion(event);
const saveCurrentConversion = () => submissionController?.saveCurrentConversion();
let selectedBookSegmentId = bookSegmentInput?.value || "back_cover";
const cropResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(() => {
    scheduleCropLayoutRefresh();
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
  persistCurrentSnapshotByMode: () => persistCurrentSnapshotByMode(),
  persistCurrentModeUiState: () => persistCurrentModeUiState(),
  applyModeSnapshot: (snapshot) => applyModeSnapshot(snapshot),
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
  persistCurrentSnapshotByMode: () => persistCurrentSnapshotByMode(),
  persistCurrentModeUiState: () => persistCurrentModeUiState(),
  buildPortableSnapshot,
  applyModeSnapshot: (snapshot) => applyModeSnapshot(snapshot),
  setStatus,
  setActiveModeValue: (nextMode) => {
    activeMode = nextMode;
  },
});
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

// ─── OBSERVERS ───────────────────────────────────────────────────────────────

cropResizeObserver?.observe(cropFrame);
cropResizeObserver?.observe(cropImage);
cropResizeObserver?.observe(expandedCropFrame);
cropResizeObserver?.observe(expandedCropImage);

// ─── BOOT ────────────────────────────────────────────────────────────────────

loadStoredGuideGridColor();
applyGuideGridColor(guideGridColor, { persist: false, redraw: false });
renderSelectedFile();
renderCropSelection();
resetResultArea();
applyModeUi();

