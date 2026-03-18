import { CANVAS_PRESETS, PALETTE } from "./config.js";

const form = document.getElementById("conversion-form");
const imageInput = document.getElementById("image");
const ratioInput = document.getElementById("ratio");
const precisionInput = document.getElementById("precision");
const submitButton = document.getElementById("submit-button");
const resetCropButton = document.getElementById("reset-crop");
const fullCropButton = document.getElementById("full-crop");
const cropStage = document.getElementById("crop-stage");
const cropFrame = document.getElementById("crop-frame");
const cropImage = document.getElementById("crop-image");
const cropBox = document.getElementById("crop-box");
const cropMeta = document.getElementById("crop-meta");
const expandCropButton = document.getElementById("expand-crop");
const expandedCropModal = document.getElementById("expanded-crop-modal");
const expandedCropFrame = document.getElementById("expanded-crop-frame");
const expandedCropImage = document.getElementById("expanded-crop-image");
const expandedCropBox = document.getElementById("expanded-crop-box");
const expandedCropMeta = document.getElementById("expanded-crop-meta");
const expandedResetCropButton = document.getElementById("expanded-reset-crop");
const expandedFullCropButton = document.getElementById("expanded-full-crop");
const expandedCloseCropButton = document.getElementById("expanded-close-crop");
const expandedSubmitCropButton = document.getElementById("expanded-submit-crop");
const expandedSketchbookOptions = document.getElementById("expanded-sketchbook-options");
const expandedRatioInput = document.getElementById("expanded-ratio");
const expandedPrecisionInput = document.getElementById("expanded-precision");
const expandedBookSegmentWrap = document.getElementById("expanded-book-segment-wrap");
const expandedBookSegmentInput = document.getElementById("expanded-book-segment");
const bookSegmentOverlays = document.getElementById("book-segment-overlays");
const expandedBookSegmentOverlays = document.getElementById("expanded-book-segment-overlays");
const statusPill = document.getElementById("status-pill");
const progressBar = document.getElementById("progress-bar");
const viewerNote = document.getElementById("viewer-note");
const gridColorControl = document.getElementById("grid-color-control");
const gridColorToggleButton = document.getElementById("grid-color-toggle");
const gridColorPanel = document.getElementById("grid-color-panel");
const gridColorInput = document.getElementById("grid-color-input");
const gridColorValue = document.getElementById("grid-color-value");
const gridColorChip = document.getElementById("grid-color-chip");
const gridColorSample = document.getElementById("grid-color-sample");
const gridColorResetButton = document.getElementById("grid-color-reset");
const saveCurrentButton = document.getElementById("save-current");
const savedFileInput = document.getElementById("saved-file");
const savedStatus = document.getElementById("saved-status");
const guideViewport = document.getElementById("guide-viewport");
const guideCanvas = document.getElementById("guide-canvas");
const guideEmpty = document.getElementById("guide-empty");
const guideEmptyText = document.getElementById("guide-empty-text");
const mainShell = document.querySelector("main");
const viewerShell = document.querySelector(".viewer-shell");
const zoomOutButton = document.getElementById("zoom-out");
const zoomResetButton = document.getElementById("zoom-reset");
const zoomInButton = document.getElementById("zoom-in");
const paletteSidebar = document.getElementById("palette-sidebar");
const palette = document.getElementById("palette");
const palettePreview = document.getElementById("palette-preview");
const paletteFamilyTrack = document.getElementById("palette-family-track");
const palettePrevButton = document.getElementById("palette-prev");
const paletteNextButton = document.getElementById("palette-next");
const paletteMultiToggleButton = document.getElementById("palette-multi-toggle");
const paletteCompleteButton = document.getElementById("palette-complete");
const paletteFilterNote = document.getElementById("palette-filter-note");
const paletteModeIndicator = document.getElementById("palette-mode-indicator");
const modeSummary = document.getElementById("mode-summary");
const modeLockedNote = document.getElementById("mode-locked-note");
const bookRangeField = document.getElementById("book-range-field");
const bookSegmentInput = document.getElementById("book-segment");
const modeTabButtons = [...document.querySelectorAll("[data-mode-tab]")];
const guideContext = guideCanvas?.getContext("2d");
const DEFAULT_GUIDE_GRID_COLOR = "#5b4736";
const GUIDE_GRID_COLOR_STORAGE_KEY = "dudot-guide-grid-color";

const APP_MODES = {
  SKETCHBOOK: "sketchbook",
  BOOK: "book",
};

const BOOK_LAYOUT = (() => {
  const width = 150;
  const height = 84;
  const topBlockedRows = 1;
  const leftBlockedColumns = 5;
  const rightBlockedColumns = 6;
  const fadedColumns = 2;
  const spineLeftColumns = 8;
  const spineRightColumns = 7;
  const usableHeight = height - topBlockedRows;
  const fullWidth = width - leftBlockedColumns - rightBlockedColumns;
  const spineWidth = spineLeftColumns + spineRightColumns;
  const coverWidth = Math.floor((fullWidth - spineWidth) / 2);
  const spineStartColumn = leftBlockedColumns + coverWidth;

  return {
    width,
    height,
    ratio: "16:9",
    precision: 4,
    topBlockedRows,
    leftBlockedColumns,
    rightBlockedColumns,
    fadedColumns,
    spineLeftColumns,
    spineRightColumns,
    usableHeight,
    segments: {
      full: {
        id: "full",
        label: "전체",
        startColumn: leftBlockedColumns,
        width: fullWidth,
      },
      back_cover: {
        id: "back_cover",
        label: "뒷면표지",
        startColumn: leftBlockedColumns,
        width: coverWidth,
      },
      spine: {
        id: "spine",
        label: "책등",
        startColumn: spineStartColumn,
        width: spineWidth,
      },
      front_cover: {
        id: "front_cover",
        label: "앞면표지",
        startColumn: spineStartColumn + spineWidth,
        width: coverWidth,
      },
    },
  };
})();

const viewerState = {
  gridCodes: [],
  paletteByCode: new Map(),
  columns: 0,
  rows: 0,
  fitScale: 1,
  scale: 1,
  minScale: 1,
  maxScale: 1,
  panX: 0,
  panY: 0,
  hoverColumn: null,
  hoverRow: null,
  activeColorCode: null,
  activeColorCodes: [],
  completedCells: new Set(),
};

const paletteState = {
  groups: [],
  page: 0,
  activeGroup: null,
  multiSelectEnabled: false,
  rememberedMultiColorCodes: [],
};

const GROUP_MAIN_COLORS = {
  Black: "#000000",
  Red: "#ea696d",
  Orange: "#f77f54",
  Amber: "#fdab34",
  Yellow: "#f7d230",
  Pistachio: "#b5c728",
  Green: "#40b678",
  Aqua: "#01aa9f",
  Blue: "#0094b5",
  Indigo: "#2981c0",
  Purple: "#7474bb",
  Magenta: "#a164a7",
  Pink: "#cd638b",
};

const GROUP_DISPLAY_ORDER = [
  "Black",
  "Red",
  "Orange",
  "Amber",
  "Yellow",
  "Pistachio",
  "Green",
  "Aqua",
  "Blue",
  "Indigo",
  "Purple",
  "Magenta",
  "Pink",
];

const DEFAULT_PALETTE_ITEMS = PALETTE.map((item) => ({
  ...item,
  count: 0,
}));

const PALETTE_BY_CODE = new Map(PALETTE.map((item) => [item.code, item]));
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
const PYTHON_MODULE_DIR = "../python";
const PYTHON_MODULE_FILES = ["palette.py", "presets.py", "converter.py"];
const PYTHON_MODULE_VERSION = "20260315-2";

let activeSocket = null;
let activeJobId = null;
let pollingHandle = null;
let selectedFile = null;
let sourceImageUrl = null;
let cropSelection = null;
let expandedCropSelection = null;
let expandedCropDraft = null;
let cropInteraction = null;
let guideInteraction = null;
let currentResultSnapshot = null;
let lastViewportLayoutMode = getViewportLayoutMode();
let activeMode = APP_MODES.SKETCHBOOK;
let isCropStageExpanded = false;
let guideGridColor = DEFAULT_GUIDE_GRID_COLOR;
let pendingConversionContext = { mode: APP_MODES.SKETCHBOOK, bookSegmentId: null, bookSegmentCrop: null };
let sketchbookSnapshot = null;
let bookSnapshot = null;
let pyodideReadyPromise = null;
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
let selectedBookSegmentId = bookSegmentInput?.value || "back_cover";
let cropLayoutRefreshHandle = null;
const cropResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(() => {
    scheduleCropLayoutRefresh();
  })
  : null;
const cropViews = {
  sidebar: {
    key: "sidebar",
    stage: cropStage,
    frame: cropFrame,
    image: cropImage,
    box: cropBox,
    meta: cropMeta,
    overlays: bookSegmentOverlays,
  },
  expanded: {
    key: "expanded",
    stage: expandedCropModal,
    frame: expandedCropFrame,
    image: expandedCropImage,
    box: expandedCropBox,
    meta: expandedCropMeta,
    overlays: expandedBookSegmentOverlays,
  },
};

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
cropImage?.addEventListener("dragstart", preventDefault);
expandedCropImage?.addEventListener("dragstart", preventDefault);
cropBox?.addEventListener("pointerdown", handleCropPointerDown);
expandedCropBox?.addEventListener("pointerdown", handleCropPointerDown);
cropFrame?.addEventListener("dblclick", () => resetCropSelection("sidebar"));
expandedCropFrame?.addEventListener("dblclick", () => resetCropSelection("expanded"));
guideViewport?.addEventListener("wheel", handleGuideWheel, { passive: false });
guideViewport?.addEventListener("pointerdown", handleGuidePointerDown);
guideViewport?.addEventListener("pointermove", handleGuideHover);
guideViewport?.addEventListener("pointerleave", clearGuideHover);
zoomOutButton?.addEventListener("click", () => zoomGuideAtViewportCenter(1 / 1.2));
zoomResetButton?.addEventListener("click", () => fitGuideToViewport(true));
zoomInButton?.addEventListener("click", () => zoomGuideAtViewportCenter(1.2));
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

cropResizeObserver?.observe(cropFrame);
cropResizeObserver?.observe(cropImage);
cropResizeObserver?.observe(expandedCropFrame);
cropResizeObserver?.observe(expandedCropImage);

loadStoredGuideGridColor();
applyGuideGridColor(guideGridColor, { persist: false, redraw: false });
renderSelectedFile();
renderCropSelection();
resetResultArea();
applyModeUi();

function toggleGridColorPanel() {
  setGridColorPanelOpen(gridColorPanel?.hidden ?? true);
}

function setGridColorPanelOpen(isOpen) {
  if (!gridColorPanel || !gridColorToggleButton) {
    return;
  }
  gridColorPanel.hidden = !isOpen;
  gridColorToggleButton.setAttribute("aria-expanded", String(isOpen));
}

function handleGridColorInput(event) {
  applyGuideGridColor(event.target?.value || DEFAULT_GUIDE_GRID_COLOR);
}

function resetGuideGridColor() {
  applyGuideGridColor(DEFAULT_GUIDE_GRID_COLOR);
}

function handleGridColorPointerDown(event) {
  if (!gridColorControl || gridColorPanel?.hidden) {
    return;
  }
  if (gridColorControl.contains(event.target)) {
    return;
  }
  setGridColorPanelOpen(false);
}

function handleGridColorKeyDown(event) {
  if (event.key !== "Escape" || gridColorPanel?.hidden) {
    return;
  }
  setGridColorPanelOpen(false);
  gridColorToggleButton?.focus();
}

function loadStoredGuideGridColor() {
  try {
    const storedColor = window.localStorage.getItem(GUIDE_GRID_COLOR_STORAGE_KEY);
    const normalized = normalizeHexColor(storedColor);
    if (normalized) {
      guideGridColor = normalized;
    }
  } catch {
  }
}

function applyGuideGridColor(nextColor, { persist = true, redraw = true } = {}) {
  const normalized = normalizeHexColor(nextColor) || DEFAULT_GUIDE_GRID_COLOR;
  guideGridColor = normalized;
  updateGuideGridColorUi();
  guideViewport?.style.setProperty("--grid-fade", rgbaFromHexColor(guideGridColor, 0.16));
  if (persist) {
    try {
      window.localStorage.setItem(GUIDE_GRID_COLOR_STORAGE_KEY, guideGridColor);
    } catch {
    }
  }
  if (redraw && viewerState.rows > 0) {
    drawGuideCanvas();
  }
}

function updateGuideGridColorUi() {
  const displayValue = guideGridColor.toUpperCase();
  if (gridColorInput) {
    gridColorInput.value = guideGridColor;
  }
  if (gridColorValue) {
    gridColorValue.textContent = displayValue;
  }
  if (gridColorChip) {
    gridColorChip.style.background = guideGridColor;
  }
  if (gridColorSample) {
    gridColorSample.style.setProperty("--sample-color", guideGridColor);
  }
}

function handleModeTabClick(event) {
  const nextMode = event.currentTarget?.dataset.modeTab;
  if (!nextMode || nextMode === activeMode) {
    return;
  }
  setActiveMode(nextMode);
}

function handleBookSegmentChange(event) {
  selectedBookSegmentId = event.target.value;
  if (bookSegmentInput && event.target !== bookSegmentInput) {
    bookSegmentInput.value = selectedBookSegmentId;
  }
  if (expandedBookSegmentInput && event.target !== expandedBookSegmentInput) {
    expandedBookSegmentInput.value = selectedBookSegmentId;
  }
  if (activeMode === APP_MODES.BOOK) {
    const targetViewKey = event.target === expandedBookSegmentInput && isCropStageExpanded ? "expanded" : "sidebar";
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
  if (!Object.values(APP_MODES).includes(nextMode) || nextMode === activeMode) {
    return;
  }

  persistCurrentSnapshotByMode();
  persistCurrentModeUiState();

  activeMode = nextMode;
  stopTracking();
  submitButton.disabled = false;
  applyModeUi();

  if (cropImage?.naturalWidth) {
    applyDefaultCropSelection();
  }

  if (activeMode === APP_MODES.SKETCHBOOK) {
    if (sketchbookSnapshot) {
      applyModeSnapshot(sketchbookSnapshot);
    } else {
      resetResultArea();
    }
    return;
  }

  if (bookSnapshot) {
    applyModeSnapshot(bookSnapshot);
  } else {
    renderEmptyBookWorkspace();
  }
}

function applyModeUi() {
  const isBookMode = activeMode === APP_MODES.BOOK;
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
    bookSegmentInput.value = selectedBookSegmentId;
  }
  if (expandedBookSegmentInput) {
    expandedBookSegmentInput.value = selectedBookSegmentId;
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
    const isActive = button.dataset.modeTab === activeMode;
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
  currentResultSnapshot = {
    canvas_mode: APP_MODES.BOOK,
    book_selected_segment: selectedBookSegmentId,
    book_applied_segments: [],
    book_segment_crops: {},
  };
  updateSaveButtonState(false);
  setPaletteVisibility(false);
  updateViewerNote();
  renderBookCropOverlays();
}

function createEmptyGridCodes(width, height, fillCode = "") {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fillCode));
}

function cloneGridCodes(gridCodes) {
  return gridCodes.map((row) => [...row]);
}

function getBookSegment(segmentId) {
  return BOOK_LAYOUT.segments[segmentId] || BOOK_LAYOUT.segments.back_cover;
}

function getBookFullGuideSegments() {
  return [
    BOOK_LAYOUT.segments.back_cover,
    BOOK_LAYOUT.segments.spine,
    BOOK_LAYOUT.segments.front_cover,
  ];
}

function buildBookSnapshotFromGrid(gridCodes, sourceFilename = null, appliedSegments = [], segmentCrops = {}) {
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
    book_selected_segment: selectedBookSegmentId,
    book_applied_segments: normalizeBookAppliedSegments(appliedSegments),
    book_segment_crops: normalizeBookSegmentCrops(segmentCrops),
  };
}

function normalizeBookAppliedSegments(segments) {
  if (!Array.isArray(segments)) {
    return [];
  }
  const seen = new Set();
  return segments.filter((segmentId) => {
    if (!BOOK_LAYOUT.segments[segmentId] || seen.has(segmentId)) {
      return false;
    }
    seen.add(segmentId);
    return true;
  });
}

function normalizeBookSegmentCrops(crops) {
  if (!crops || typeof crops !== "object") {
    return {};
  }

  const normalized = {};
  for (const [segmentId, crop] of Object.entries(crops)) {
    if (!BOOK_LAYOUT.segments[segmentId]) {
      continue;
    }
    const normalizedCrop = normalizeStoredBookCrop(crop);
    if (!normalizedCrop) {
      continue;
    }
    normalized[segmentId] = normalizedCrop;
  }
  return normalized;
}

function normalizeStoredBookCrop(crop) {
  if (!crop || typeof crop !== "object") {
    return null;
  }

  const x = Number(crop.x);
  const y = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  if (x < 0 || y < 0 || width <= 0 || height <= 0) {
    return null;
  }

  const normalizedWidth = clamp(width, 0.02, 1);
  const normalizedHeight = clamp(height, 0.02, 1);
  return {
    x: clamp(x, 0, 1 - normalizedWidth),
    y: clamp(y, 0, 1 - normalizedHeight),
    width: normalizedWidth,
    height: normalizedHeight,
    source_filename: typeof crop.source_filename === "string" && crop.source_filename.trim()
      ? crop.source_filename.trim()
      : null,
  };
}

function buildCurrentBookSegmentCrop() {
  if (!cropSelection) {
    return null;
  }

  return normalizeStoredBookCrop({
    ...cropSelection,
    source_filename: selectedFile?.name || null,
  });
}

function buildUsedColorsFromGrid(gridCodes) {
  const counts = new Map();
  for (const row of gridCodes) {
    for (const code of row) {
      if (!code || !PALETTE_BY_CODE.has(code)) {
        continue;
      }
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([code, count]) => ({ ...PALETTE_BY_CODE.get(code), count }))
    .sort((left, right) => {
      const leftIndex = PALETTE.findIndex((item) => item.code === left.code);
      const rightIndex = PALETTE.findIndex((item) => item.code === right.code);
      return leftIndex - rightIndex;
    });
}

function mergeBookSegmentIntoGrid(baseGridCodes, segmentId, segmentGridCodes) {
  const segment = getBookSegment(segmentId);
  const nextGridCodes = cloneGridCodes(baseGridCodes);
  for (let row = 0; row < BOOK_LAYOUT.usableHeight; row += 1) {
    const targetRow = BOOK_LAYOUT.topBlockedRows + row;
    for (let offset = 0; offset < segment.width; offset += 1) {
      nextGridCodes[targetRow][segment.startColumn + offset] = segmentGridCodes[row]?.[offset] || "";
    }
  }
  return nextGridCodes;
}

function setPaletteVisibility(visible) {
  if (paletteSidebar) {
    paletteSidebar.hidden = false;
  }
  mainShell?.classList.add("has-palette-sidebar");
}

function getVisibleCropViews() {
  return isCropStageExpanded ? [cropViews.sidebar, cropViews.expanded] : [cropViews.sidebar];
}

function getReferenceCropView() {
  return isCropStageExpanded ? cropViews.expanded : cropViews.sidebar;
}

function getCropViewByKey(viewKey) {
  return cropViews[viewKey] || cropViews.sidebar;
}

function getCropSelectionForView(viewKey) {
  return viewKey === "expanded" ? expandedCropSelection : cropSelection;
}

function setCropSelectionForView(viewKey, selection) {
  if (viewKey === "expanded") {
    expandedCropSelection = selection ? { ...selection } : null;
    expandedCropDraft = null;
    return;
  }
  cropSelection = selection ? { ...selection } : null;
}

function cloneCropSelection(selection) {
  return selection ? { ...selection } : null;
}

function cloneDisplayCropRect(rect) {
  return rect ? { ...rect } : null;
}

function syncExpandedSelectionToSidebar() {
  if (!expandedCropSelection) {
    return;
  }
  cropSelection = { ...expandedCropSelection };
}

function getNaturalCropImageElement() {
  if (cropViews.sidebar.image?.naturalWidth) {
    return cropViews.sidebar.image;
  }
  if (cropViews.expanded.image?.naturalWidth) {
    return cropViews.expanded.image;
  }
  return null;
}

function getCropDisplayMetrics(view = cropViews.sidebar) {
  if (!view?.frame || !view?.image) {
    return null;
  }

  const frameRect = view.frame.getBoundingClientRect();
  const imageRect = view.image.getBoundingClientRect();
  if (!frameRect.width || !frameRect.height || !imageRect.width || !imageRect.height) {
    return null;
  }

  return {
    viewportLeft: imageRect.left,
    viewportTop: imageRect.top,
    width: imageRect.width,
    height: imageRect.height,
    offsetLeft: imageRect.left - frameRect.left,
    offsetTop: imageRect.top - frameRect.top,
  };
}

function buildDisplayCropRect(selection, view) {
  const metrics = getCropDisplayMetrics(view);
  if (!selection || !metrics) {
    return null;
  }

  return {
    left: selection.x * metrics.width,
    top: selection.y * metrics.height,
    width: selection.width * metrics.width,
    height: selection.height * metrics.height,
    frameWidth: metrics.width,
    frameHeight: metrics.height,
  };
}

function isDisplayCropRectAligned(rect, metrics) {
  if (!rect || !metrics) {
    return false;
  }

  return Math.abs((rect.frameWidth || 0) - metrics.width) < 0.5
    && Math.abs((rect.frameHeight || 0) - metrics.height) < 0.5;
}

function normalizeDisplayCropRect(rect, frameWidth = rect?.frameWidth, frameHeight = rect?.frameHeight) {
  if (!rect || !frameWidth || !frameHeight) {
    return null;
  }

  return normalizeCropSelection(rect.left, rect.top, rect.width, rect.height, frameWidth, frameHeight);
}

function scheduleCropLayoutRefresh() {
  if (cropLayoutRefreshHandle) {
    window.cancelAnimationFrame(cropLayoutRefreshHandle);
  }
  cropLayoutRefreshHandle = window.requestAnimationFrame(() => {
    cropLayoutRefreshHandle = null;
    renderCropSelection();
  });
}

function renderBookCropOverlays() {
  getVisibleCropViews().forEach((view) => renderBookCropOverlaysOnView(view));
}

function renderBookCropOverlaysOnView(view) {
  if (!view?.overlays) {
    return;
  }

  const naturalImage = getNaturalCropImageElement();
  if (activeMode !== APP_MODES.BOOK || !naturalImage?.naturalWidth) {
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

  const appliedSegments = normalizeBookAppliedSegments(currentResultSnapshot?.book_applied_segments || bookSnapshot?.book_applied_segments || []);
  const segmentCrops = normalizeBookSegmentCrops(currentResultSnapshot?.book_segment_crops || bookSnapshot?.book_segment_crops);
  const currentSourceFilename = selectedFile?.name || null;
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
    const selection = getCropSelectionForView(view.key) || (view.key === "expanded" ? cropSelection : null);
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
        <span class="book-segment-overlay-label">${segment.label.replace("표지", "")}</span>
      </div>
    `;
  });
}

async function startConversion(event) {
  event?.preventDefault();
  if (isCropStageExpanded) {
    setCropStageExpanded(false);
  }
  const file = selectedFile ?? imageInput.files?.[0];
  if (!file) {
    renderError("이미지 파일을 먼저 선택해 주세요.");
    return;
  }

  if (!cropImage?.naturalWidth || !cropSelection) {
    renderError("원본 이미지를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  selectedFile = file;
  renderSelectedFile();
  stopTracking();
  submitButton.disabled = true;
  pendingConversionContext = {
    mode: activeMode,
    bookSegmentId: activeMode === APP_MODES.BOOK ? selectedBookSegmentId : null,
    bookSegmentCrop: activeMode === APP_MODES.BOOK ? buildCurrentBookSegmentCrop() : null,
  };
  if (activeMode === APP_MODES.BOOK && bookSnapshot) {
    setGuideMessage("선택한 책 범위를 새 이미지로 덮어쓰는 중입니다.");
  } else if (activeMode === APP_MODES.BOOK) {
    renderEmptyBookWorkspace();
    setGuideMessage("책 범위를 변환하는 중입니다.");
  } else {
    resetResultArea("도안 생성 결과를 준비하는 중입니다.");
  }
  setStatus("범위 처리 중", "선택한 영역을 잘라 브라우저 안에서 도안을 생성하고 있습니다.", 8);

  try {
    const uploadFile = await buildUploadFile(file);
    const ratio = activeMode === APP_MODES.BOOK ? BOOK_LAYOUT.ratio : ratioInput.value;
    const precision = activeMode === APP_MODES.BOOK ? BOOK_LAYOUT.precision : Number(precisionInput.value);
    let canvasWidth = null;
    let canvasHeight = null;
    if (activeMode === APP_MODES.BOOK) {
      const bookSegment = getBookSegment(selectedBookSegmentId);
      canvasWidth = bookSegment.width;
      canvasHeight = BOOK_LAYOUT.usableHeight;
    }
    const snapshot = await convertImageLocally({
      file: uploadFile,
      originalName: file.name,
      ratio,
      precision,
      canvasWidth,
      canvasHeight,
    });
    activeJobId = snapshot.job_id;
    handleSnapshot(snapshot);
  } catch (error) {
    if (savedStatus) {
      savedStatus.hidden = true;
      savedStatus.textContent = "";
    }
    if (savedFileInput) {
      savedFileInput.value = "";
    }
    renderError(error instanceof Error ? error.message : "도안 생성에 실패했습니다.");
    finishTracking();
  }
}

function handleImageSelection() {
  const nextFile = imageInput.files?.[0] ?? null;
  if (!nextFile) {
    return;
  }
  const isValidImageFile = nextFile
    ? ["image/png", "image/jpeg", "image/webp"].includes(nextFile.type)
    || /\.(png|jpe?g|webp)$/i.test(nextFile.name)
    : false;

  if (nextFile && !isValidImageFile) {
    selectedFile = null;
    if (imageInput) {
      imageInput.value = "";
    }
    renderSelectedFile();
    submitButton.disabled = false;
    clearCropPreview();
    if (!currentResultSnapshot) {
      stopTracking();
      setStatus("대기 중", "이미지를 업로드하면 변환이 시작됩니다.", 0);
      if (activeMode === APP_MODES.BOOK) {
        renderEmptyBookWorkspace();
      } else {
        resetResultArea();
      }
    }
    window.alert("잘못된 파일형식입니다.");
    return;
  }

  selectedFile = nextFile;
  if (selectedFile && savedFileInput) {
    savedFileInput.value = "";
  }
  if (selectedFile && savedStatus) {
    savedStatus.hidden = true;
    savedStatus.textContent = "";
  }
  renderSelectedFile();
  stopTracking();
  submitButton.disabled = false;
  setStatus(
    "대기 중",
    selectedFile
      ? activeMode === APP_MODES.BOOK
        ? "책 범위를 고른 뒤 선택한 영역에 이미지를 적용하세요."
        : "비율에 맞는 범위를 고른 뒤 변환을 시작하세요."
      : "이미지를 업로드하면 변환이 시작됩니다.",
    0,
  );
  if (activeMode === APP_MODES.BOOK) {
    if (bookSnapshot) {
      renderCompleted(bookSnapshot);
    } else {
      renderEmptyBookWorkspace();
    }
  } else {
    resetResultArea();
  }

  if (!selectedFile) {
    clearCropPreview();
    return;
  }

  loadCropPreview(selectedFile);
}

function handleRatioChange() {
  syncExpandedSketchbookControls();
  if (activeMode !== APP_MODES.SKETCHBOOK) {
    return;
  }
  if (!selectedFile) {
    return;
  }

  if (cropImage?.naturalWidth) {
    const targetViewKey = isCropStageExpanded ? "expanded" : "sidebar";
    applyDefaultCropSelection(targetViewKey);
    if (targetViewKey === "expanded") {
      syncExpandedSelectionToSidebar();
    }
  }
}

function handlePrecisionChange() {
  syncExpandedSketchbookControls();
}

function handleExpandedRatioChange(event) {
  if (ratioInput) {
    ratioInput.value = event.target.value;
  }
  handleRatioChange();
}

function handleExpandedPrecisionChange(event) {
  if (precisionInput) {
    precisionInput.value = event.target.value;
  }
  handlePrecisionChange();
}

function syncExpandedSketchbookControls() {
  if (expandedRatioInput && ratioInput) {
    expandedRatioInput.value = ratioInput.value;
  }
  if (expandedPrecisionInput && precisionInput) {
    expandedPrecisionInput.value = precisionInput.value;
  }
}

function handleCropImageLoaded() {
  cropStage.hidden = false;
  cropImage.alt = selectedFile ? `업로드한 사진 미리보기: ${selectedFile.name}` : "업로드한 사진 미리보기";
  applyDefaultCropSelection("sidebar");
  cropStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setStatus("대기 중", "비율에 맞는 범위를 고른 뒤 변환을 시작하세요.", 0);
}

function handleExpandedCropImageLoaded() {
  expandedCropImage.alt = selectedFile ? `업로드한 사진 확대 미리보기: ${selectedFile.name}` : "업로드한 사진 확대 미리보기";
  if (isCropStageExpanded && !expandedCropSelection) {
    expandedCropSelection = cloneCropSelection(cropSelection) || createCropSelection(0.9, "expanded");
  }
  expandedCropDraft = null;
  scheduleCropLayoutRefresh();
}

function handleCropImageError() {
  cropSelection = null;
  setCropStageExpanded(false);
  renderCropSelection();
  cropStage.hidden = true;
  renderError("업로드한 이미지를 미리보기로 불러오지 못했습니다.");
}

function handleExpandedCropImageError() {
  if (expandedCropModal) {
    expandedCropModal.hidden = true;
  }
  expandedCropSelection = null;
  expandedCropDraft = null;
}

function loadCropPreview(file) {
  releaseSourceImage();
  cropSelection = null;
  expandedCropSelection = null;
  expandedCropDraft = null;
  renderCropSelection();
  cropStage.hidden = false;
  cropStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  cropMeta.textContent = "원본 이미지를 불러오는 중입니다.";
  sourceImageUrl = URL.createObjectURL(file);
  cropImage.src = sourceImageUrl;
  if (expandedCropImage) {
    expandedCropImage.src = sourceImageUrl;
  }
}

function clearCropPreview() {
  releaseSourceImage();
  cropSelection = null;
  expandedCropSelection = null;
  expandedCropDraft = null;
  setCropStageExpanded(false);
  cropStage.hidden = true;
  if (expandedCropModal) {
    expandedCropModal.hidden = true;
  }
  renderCropSelection();
  cropMeta.textContent = "사진을 올리면 여기서 변환할 범위를 선택할 수 있습니다.";
  if (expandedCropMeta) {
    expandedCropMeta.textContent = "사진을 올리면 확대 화면에서 범위를 조절할 수 있습니다.";
  }
}

function releaseSourceImage() {
  if (sourceImageUrl) {
    URL.revokeObjectURL(sourceImageUrl);
    sourceImageUrl = null;
  }
}

function toggleCropStageExpanded() {
  setCropStageExpanded(!isCropStageExpanded);
}

function setCropStageExpanded(nextExpanded) {
  isCropStageExpanded = Boolean(nextExpanded) && !cropStage?.hidden;
  if (expandedCropModal) {
    expandedCropModal.hidden = !isCropStageExpanded;
    expandedCropModal.classList.toggle("is-book-mode", activeMode === APP_MODES.BOOK);
  }
  if (isCropStageExpanded) {
    expandedCropSelection = cloneCropSelection(cropSelection) || createCropSelection(0.9, "expanded");
    expandedCropDraft = null;
    if (expandedCropImage && sourceImageUrl) {
      expandedCropImage.src = sourceImageUrl;
    }
  } else {
    expandedCropSelection = null;
    expandedCropDraft = null;
  }
  document.body.classList.toggle("crop-stage-expanded", isCropStageExpanded);
  if (expandCropButton) {
    expandCropButton.textContent = isCropStageExpanded ? "닫기" : "확대";
    expandCropButton.setAttribute("aria-pressed", isCropStageExpanded ? "true" : "false");
    expandCropButton.title = isCropStageExpanded ? "큰 범위선택 화면 닫기" : "범위선택 크게 보기";
  }
  if (isCropStageExpanded) {
    scheduleCropLayoutRefresh();
    window.setTimeout(() => scheduleCropLayoutRefresh(), 60);
  }
}

function closeExpandedCropModal() {
  syncExpandedSelectionToSidebar();
  setCropStageExpanded(false);
  renderCropSelection();
}

function applyExpandedCropSelectionAndConvert(event) {
  syncExpandedSelectionToSidebar();
  startConversion(event);
}

function handleWindowKeyDown(event) {
  if (event.key === "Escape" && isCropStageExpanded) {
    closeExpandedCropModal();
  }
}

function resetCropSelection(viewKey = "sidebar") {
  const view = getCropViewByKey(viewKey);
  const naturalImage = view.image?.naturalWidth ? view.image : getNaturalCropImageElement();
  if (!naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
    return;
  }

  setCropSelectionForView(viewKey, createCenteredCropSelection(viewKey));
  renderCropSelection();
}

function applyDefaultCropSelection(viewKey = "sidebar") {
  const view = getCropViewByKey(viewKey);
  const naturalImage = view.image?.naturalWidth ? view.image : getNaturalCropImageElement();
  if (!naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
    return;
  }

  setCropSelectionForView(viewKey, createCenteredCropSelection(viewKey));
  renderCropSelection();
}

function selectFullCropSelection(viewKey = "sidebar") {
  const view = getCropViewByKey(viewKey);
  const naturalImage = view.image?.naturalWidth ? view.image : getNaturalCropImageElement();
  if (!naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
    return;
  }

  setCropSelectionForView(viewKey, createFullCropSelection());
  renderCropSelection();
}

function createCenteredCropSelection(viewKey = "sidebar") {
  return createCropSelection(0.9, viewKey);
}

function createFullCropSelection() {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
}

function createCropSelection(maxCoverage, viewKey = getReferenceCropView().key) {
  const referenceView = getCropViewByKey(viewKey);
  const metrics = getCropDisplayMetrics(referenceView);
  const naturalImage = referenceView.image?.naturalWidth ? referenceView.image : getNaturalCropImageElement();
  const imageWidth = metrics?.width || naturalImage?.naturalWidth || cropImage.naturalWidth;
  const imageHeight = metrics?.height || naturalImage?.naturalHeight || cropImage.naturalHeight;
  const targetRatio = getTargetCropRatio();
  const minDimension = 0.02;
  let width = imageWidth * maxCoverage;
  let height = width / targetRatio;

  if (!Number.isFinite(height) || height > imageHeight * maxCoverage) {
    height = imageHeight * maxCoverage;
    width = height * targetRatio;
  }

  if (width < imageWidth * minDimension) {
    width = imageWidth * minDimension;
    height = width / targetRatio;
  }

  if (height < imageHeight * minDimension) {
    height = imageHeight * minDimension;
    width = height * targetRatio;
  }

  if (width > imageWidth) {
    width = imageWidth;
    height = width / targetRatio;
  }

  if (height > imageHeight) {
    height = imageHeight;
    width = height * targetRatio;
  }

  const left = (imageWidth - width) / 2;
  const top = (imageHeight - height) / 2;

  return normalizeCropSelection(left, top, width, height, imageWidth, imageHeight);
}

function renderCropSelection() {
  getVisibleCropViews().forEach((view) => renderCropSelectionOnView(view));
  renderBookCropOverlays();
}

function renderCropSelectionOnView(view) {
  if (!view?.box) {
    return;
  }

  const selection = getCropSelectionForView(view.key) || (view.key === "expanded" ? cropSelection : null);
  if (!selection) {
    view.box.hidden = true;
    view.box.classList.remove("is-dragging");
    if (view.meta && !selectedFile) {
      view.meta.textContent = view.key === "expanded"
        ? "사진을 올리면 확대 화면에서 범위를 조절할 수 있습니다."
        : "사진을 올리면 여기서 변환할 범위를 선택할 수 있습니다.";
    }
    return;
  }

  const metrics = getCropDisplayMetrics(view);
  if (!metrics) {
    view.box.hidden = true;
    return;
  }

  let displayRect = null;
  if (view.key === "expanded") {
    if (!isDisplayCropRectAligned(expandedCropDraft, metrics)) {
      expandedCropDraft = buildDisplayCropRect(selection, view);
    }
    displayRect = expandedCropDraft;
  } else {
    displayRect = buildDisplayCropRect(selection, view);
  }

  if (!displayRect) {
    view.box.hidden = true;
    return;
  }

  view.box.hidden = false;
  view.box.style.left = `${metrics.offsetLeft + displayRect.left}px`;
  view.box.style.top = `${metrics.offsetTop + displayRect.top}px`;
  view.box.style.width = `${displayRect.width}px`;
  view.box.style.height = `${displayRect.height}px`;
  if (view.meta) {
    view.meta.textContent = formatCropMeta(view.key);
  }
}

function formatCropMeta(viewKey = "sidebar") {
  const selection = getCropSelectionForView(viewKey) || (viewKey === "expanded" ? cropSelection : null);
  const cropPixels = getCropPixelsForSelection(selection);
  if (!cropPixels) {
    return viewKey === "expanded"
      ? "사진을 올리면 확대 화면에서 범위를 조절할 수 있습니다."
      : "사진을 올리면 여기서 변환할 범위를 선택할 수 있습니다.";
  }

  return `선택 영역 ${cropPixels.width} x ${cropPixels.height}px | 비율 ${getTargetCropRatioLabel()} | 드래그로 이동, 모서리로 크기 조절`;
}

function handleCropPointerDown(event) {
  const viewKey = event.currentTarget?.dataset.cropView || "sidebar";
  const view = getCropViewByKey(viewKey);
  const selection = getCropSelectionForView(viewKey) || (viewKey === "expanded" ? cropSelection : null);
  if (!selection || !view?.frame) {
    return;
  }

  const metrics = getCropDisplayMetrics(view);
  if (!metrics) {
    return;
  }
  let startRect = null;
  if (viewKey === "expanded" && isDisplayCropRectAligned(expandedCropDraft, metrics)) {
    startRect = cloneDisplayCropRect(expandedCropDraft);
  } else {
    startRect = buildDisplayCropRect(selection, view);
  }
  if (!startRect) {
    return;
  }
  if (viewKey === "expanded") {
    expandedCropDraft = cloneDisplayCropRect(startRect);
  }

  const startLeft = startRect.left;
  const startTop = startRect.top;
  const startWidth = startRect.width;
  const startHeight = startRect.height;
  const visibleSelection = normalizeDisplayCropRect(startRect, metrics.width, metrics.height);

  const handle = event.target.closest("[data-handle]")?.dataset.handle ?? null;
  const handleEdgeX = handle?.includes("w") ? startLeft : startLeft + startWidth;
  const handleEdgeY = handle?.includes("n") ? startTop : startTop + startHeight;
  const pointerOffsetX = handle ? (event.clientX - (metrics.viewportLeft + handleEdgeX)) : 0;
  const pointerOffsetY = handle ? (event.clientY - (metrics.viewportTop + handleEdgeY)) : 0;
  cropInteraction = {
    pointerId: event.pointerId,
    mode: handle ? "resize" : "move",
    handle,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    frameLeft: metrics.viewportLeft,
    frameTop: metrics.viewportTop,
    frameWidth: metrics.width,
    frameHeight: metrics.height,
    startLeft,
    startTop,
    startWidth,
    startHeight,
    startSelection: visibleSelection,
    startRect,
    viewKey,
    pointerOffsetX,
    pointerOffsetY,
  };

  view.box.classList.add("is-dragging");
  view.box.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleCropPointerMove(event) {
  if (!cropInteraction || event.pointerId !== cropInteraction.pointerId) {
    return;
  }

  if (cropInteraction.viewKey === "expanded") {
    const nextRect = cropInteraction.mode === "move"
      ? computeMovedDisplayRect(cropInteraction, event)
      : computeResizedDisplayRect(cropInteraction, event);
    if (!nextRect) {
      return;
    }
    expandedCropDraft = nextRect;
    expandedCropSelection = normalizeDisplayCropRect(nextRect, cropInteraction.frameWidth, cropInteraction.frameHeight);
  } else {
    const nextSelection = cropInteraction.mode === "move"
      ? computeMovedSelection(cropInteraction, event)
      : computeResizedSelection(cropInteraction, event);

    if (!nextSelection) {
      return;
    }

    setCropSelectionForView(cropInteraction.viewKey, nextSelection);
  }
  renderCropSelection();
  event.preventDefault();
}

function handleCropPointerEnd(event) {
  if (!cropInteraction || event.pointerId !== cropInteraction.pointerId) {
    return;
  }

  const view = getCropViewByKey(cropInteraction.viewKey);
  view.box?.classList.remove("is-dragging");
  view.box?.releasePointerCapture?.(event.pointerId);
  cropInteraction = null;
}

function computeMovedSelection(session, event) {
  const nextRect = computeMovedDisplayRect(session, event);
  return normalizeDisplayCropRect(nextRect, session.frameWidth, session.frameHeight);
}

function computeMovedDisplayRect(session, event) {
  const dx = (event.clientX - session.startPointerX) / session.frameWidth;
  const dy = (event.clientY - session.startPointerY) / session.frameHeight;

  return {
    left: clamp(session.startLeft + (dx * session.frameWidth), 0, session.frameWidth - session.startWidth),
    top: clamp(session.startTop + (dy * session.frameHeight), 0, session.frameHeight - session.startHeight),
    width: session.startWidth,
    height: session.startHeight,
    frameWidth: session.frameWidth,
    frameHeight: session.frameHeight,
  };
}

function computeResizedSelection(session, event) {
  const nextRect = computeResizedDisplayRect(session, event);
  return normalizeDisplayCropRect(nextRect, session.frameWidth, session.frameHeight);
}

function computeResizedDisplayRect(session, event) {
  const pointerX = clamp(event.clientX - session.frameLeft - (session.pointerOffsetX || 0), 0, session.frameWidth);
  const pointerY = clamp(event.clientY - session.frameTop - (session.pointerOffsetY || 0), 0, session.frameHeight);
  const startLeft = session.startLeft;
  const startTop = session.startTop;
  const startWidth = session.startWidth;
  const startHeight = session.startHeight;
  const targetRatio = getTargetCropRatio();
  const minWidth = getMinimumCropWidth(session.frameWidth, session.frameHeight, targetRatio);

  let anchorX = startLeft;
  let anchorY = startTop;
  let widthToPointer = 0;
  let heightToPointer = 0;
  let maxWidth = session.frameWidth;
  let maxHeight = session.frameHeight;

  switch (session.handle) {
    case "nw":
      anchorX = startLeft + startWidth;
      anchorY = startTop + startHeight;
      widthToPointer = anchorX - pointerX;
      heightToPointer = anchorY - pointerY;
      maxWidth = anchorX;
      maxHeight = anchorY;
      break;
    case "ne":
      anchorX = startLeft;
      anchorY = startTop + startHeight;
      widthToPointer = pointerX - anchorX;
      heightToPointer = anchorY - pointerY;
      maxWidth = session.frameWidth - anchorX;
      maxHeight = anchorY;
      break;
    case "sw":
      anchorX = startLeft + startWidth;
      anchorY = startTop;
      widthToPointer = anchorX - pointerX;
      heightToPointer = pointerY - anchorY;
      maxWidth = anchorX;
      maxHeight = session.frameHeight - anchorY;
      break;
    case "se":
    default:
      anchorX = startLeft;
      anchorY = startTop;
      widthToPointer = pointerX - anchorX;
      heightToPointer = pointerY - anchorY;
      maxWidth = session.frameWidth - anchorX;
      maxHeight = session.frameHeight - anchorY;
      break;
  }

  const maxAllowedWidth = Math.max(1, Math.min(maxWidth, maxHeight * targetRatio));
  const lowerBound = Math.min(minWidth, maxAllowedWidth);
  const baseWidth = Math.max(widthToPointer, heightToPointer * targetRatio, lowerBound);
  const width = clamp(baseWidth, lowerBound, maxAllowedWidth);
  const height = width / targetRatio;

  let left = anchorX;
  let top = anchorY;

  if (session.handle?.includes("w")) {
    left = anchorX - width;
  }
  if (session.handle?.includes("n")) {
    top = anchorY - height;
  }

  return {
    left,
    top,
    width,
    height,
    frameWidth: session.frameWidth,
    frameHeight: session.frameHeight,
  };
}

function normalizeCropSelection(left, top, width, height, frameWidth, frameHeight) {
  const normalizedWidth = clamp(width / frameWidth, 0.02, 1);
  const normalizedHeight = clamp(height / frameHeight, 0.02, 1);
  const normalizedLeft = clamp(left / frameWidth, 0, 1 - normalizedWidth);
  const normalizedTop = clamp(top / frameHeight, 0, 1 - normalizedHeight);

  return {
    x: normalizedLeft,
    y: normalizedTop,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

function getMinimumCropWidth(frameWidth, frameHeight, targetRatio) {
  const minimumHeight = frameHeight * 0.02;
  const minimumWidth = Math.max(frameWidth * 0.02, minimumHeight * targetRatio);
  return Math.min(minimumWidth, frameWidth);
}

function getCropPixels() {
  return getCropPixelsForSelection(cropSelection);
}

function getCropPixelsForSelection(selection) {
  const naturalImage = getNaturalCropImageElement();
  if (!selection || !naturalImage?.naturalWidth || !naturalImage?.naturalHeight) {
    return null;
  }

  let left = Math.round(selection.x * naturalImage.naturalWidth);
  let top = Math.round(selection.y * naturalImage.naturalHeight);
  let width = Math.round(selection.width * naturalImage.naturalWidth);
  let height = Math.round(selection.height * naturalImage.naturalHeight);

  width = clamp(Math.max(width, 1), 1, naturalImage.naturalWidth);
  height = clamp(Math.max(height, 1), 1, naturalImage.naturalHeight);
  left = clamp(left, 0, naturalImage.naturalWidth - width);
  top = clamp(top, 0, naturalImage.naturalHeight - height);

  return { left, top, width, height };
}

function isFullCropSelection() {
  if (!cropSelection) {
    return false;
  }

  return cropSelection.x === 0
    && cropSelection.y === 0
    && cropSelection.width === 1
    && cropSelection.height === 1;
}

async function buildUploadFile(file) {
  const cropPixels = getCropPixels();
  const naturalImage = getNaturalCropImageElement();
  if (!cropPixels) {
    return file;
  }
  if (!naturalImage) {
    throw new Error("원본 이미지를 찾을 수 없습니다.");
  }

  const canvas = document.createElement("canvas");
  const targetRatio = getTargetCropRatio();
  const cropRatio = cropPixels.width / cropPixels.height;

  if (isFullCropSelection() && Number.isFinite(targetRatio) && targetRatio > 0) {
    if (cropRatio > targetRatio) {
      canvas.width = cropPixels.width;
      canvas.height = Math.max(1, Math.round(cropPixels.width / targetRatio));
    } else {
      canvas.width = Math.max(1, Math.round(cropPixels.height * targetRatio));
      canvas.height = cropPixels.height;
    }
  } else {
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 크롭 캔버스를 만들 수 없습니다.");
  }
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (isFullCropSelection() && Number.isFinite(targetRatio) && targetRatio > 0) {
    context.drawImage(
      naturalImage,
      cropPixels.left,
      cropPixels.top,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  } else {
    context.drawImage(
      naturalImage,
      cropPixels.left,
      cropPixels.top,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  const preferredType = getPreferredUploadType(file.type);
  let blob = await canvasToBlob(canvas, preferredType);
  if (!blob && preferredType !== "image/png") {
    blob = await canvasToBlob(canvas, "image/png");
  }
  if (!blob) {
    throw new Error("선택한 범위를 잘라내는 데 실패했습니다.");
  }

  const mimeType = blob.type || preferredType || "image/png";
  return new File([blob], buildCroppedFilename(file.name, mimeType), {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, 0.95);
  });
}

function getPreferredUploadType(fileType) {
  return ["image/png", "image/jpeg", "image/webp"].includes(fileType) ? fileType : "image/png";
}

function buildCroppedFilename(filename, mimeType) {
  const extension = mimeType === "image/jpeg"
    ? ".jpg"
    : mimeType === "image/webp"
      ? ".webp"
      : ".png";
  const baseName = filename.replace(/\.[^.]+$/, "") || "upload";
  return `${baseName}-crop${extension}`;
}

function getCanvasPreset(ratio, precision, canvasWidth = null, canvasHeight = null) {
  if (Number.isFinite(canvasWidth) && Number.isFinite(canvasHeight)) {
    return {
      ratio,
      precision,
      width: Number(canvasWidth),
      height: Number(canvasHeight),
    };
  }

  const ratioPresets = CANVAS_PRESETS[ratio];
  const size = ratioPresets?.[precision];
  if (!size) {
    throw new Error(`지원하지 않는 비율 또는 정밀도입니다: ${ratio} / ${precision}`);
  }

  return {
    ratio,
    precision,
    width: size[0],
    height: size[1],
  };
}

async function convertImageLocally({
  file,
  originalName,
  ratio,
  precision,
  canvasWidth = null,
  canvasHeight = null,
}) {
  const preset = getCanvasPreset(ratio, precision, canvasWidth, canvasHeight);
  const pyodide = await ensurePythonRuntime();
  await nextFrame();
  setStatus("로컬 변환 중", `${preset.width} x ${preset.height} 도안을 브라우저 안에서 생성하고 있습니다.`, 32);
  const mapped = await convertWithPythonRuntime(pyodide, {
    file,
    originalName,
    ratio,
    precision,
    canvasWidth: preset.width,
    canvasHeight: preset.height,
  });

  const timestamp = new Date().toISOString();
  return {
    job_id: `local-${Date.now()}`,
    filename: originalName,
    ratio,
    precision,
    status: "completed",
    progress: 100,
    message: "브라우저 안에서 도안 생성이 완료되었습니다.",
    created_at: timestamp,
    updated_at: timestamp,
    width: preset.width,
    height: preset.height,
    used_colors: mapped.used_colors,
    grid_codes: mapped.grid_codes,
  };
}

async function ensurePythonRuntime() {
  if (pyodideReadyPromise) {
    return pyodideReadyPromise;
  }

  pyodideReadyPromise = (async () => {
    if (typeof globalThis.loadPyodide !== "function") {
      throw new Error("Pyodide 엔진을 불러오지 못했습니다.");
    }

    setStatus("파이썬 준비 중", "브라우저용 Python 엔진을 불러오는 중입니다.", 6);
    const pyodide = await globalThis.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    setStatus("파이썬 준비 중", "이미지 처리를 위한 Pillow를 불러오는 중입니다.", 12);
    await pyodide.loadPackage("pillow");
    await syncPythonModules(pyodide);
    pyodide.runPython("from converter import convert_dot_snapshot");
    return pyodide;
  })();

  return pyodideReadyPromise;
}

async function convertWithPythonRuntime(pyodide, {
  file,
  originalName,
  ratio,
  precision,
  canvasWidth,
  canvasHeight,
}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeName = buildPythonSafeFilename(file.name || originalName || "upload.png");
  const inputPath = `/tmp/${Date.now()}-${safeName}`;
  pyodide.FS.writeFile(inputPath, bytes);

  try {
    const payload = JSON.stringify({
      path: inputPath,
      filename: originalName,
      ratio,
      precision,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
    });

    pyodide.globals.set("conversion_payload_json", payload);
    const resultJson = await pyodide.runPythonAsync("convert_dot_snapshot(conversion_payload_json)");
    pyodide.globals.delete("conversion_payload_json");
    await nextFrame();
    setStatus("정리 중", "도안 결과를 화면에 적용하는 중입니다.", 90);
    return JSON.parse(resultJson);
  } finally {
    try {
      pyodide.FS.unlink(inputPath);
    } catch {
    }
  }
}

function buildPythonSafeFilename(filename) {
  return filename.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function syncPythonModules(pyodide) {
  const workspaceDir = "/workspace";
  try {
    pyodide.FS.mkdir(workspaceDir);
  } catch {
  }

  for (const moduleFile of PYTHON_MODULE_FILES) {
    const moduleUrl = new URL(`${PYTHON_MODULE_DIR}/${moduleFile}?v=${PYTHON_MODULE_VERSION}`, import.meta.url);
    const response = await fetch(moduleUrl);
    if (!response.ok) {
      throw new Error(`Python 모듈을 불러오지 못했습니다: ${moduleFile}`);
    }
    const source = await response.text();
    pyodide.FS.writeFile(`${workspaceDir}/${moduleFile}`, source);
  }

  pyodide.runPython(`
import sys
if "/workspace" not in sys.path:
    sys.path.insert(0, "/workspace")
`);
}

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function saveCurrentConversion() {
  if (!isPortableSnapshot(currentResultSnapshot)) {
    return;
  }

  const filename = buildSavedFilename(currentResultSnapshot);
  const payload = {
    type: "duduta-dot-save",
    version: 1,
    exported_at: new Date().toISOString(),
    snapshot: buildPortableSnapshot(currentResultSnapshot),
    ui_state: captureCurrentModeUiState(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerFileDownload(blob, filename);
}

function handleSavedFileSelection(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (savedStatus) {
    savedStatus.hidden = true;
    savedStatus.textContent = "";
  }

  void loadSavedFile(file);
}

async function loadSavedFile(file) {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const snapshot = extractPortableSnapshot(payload);
    if (!isPortableSnapshot(snapshot)) {
      throw new Error("지원하지 않는 저장 파일 형식입니다.");
    }
    primeModeUiStateForSnapshot(snapshot, extractSavedUiState(payload));
    applyImportedConversion(snapshot, file.name);
  } catch (error) {
    if (savedStatus) {
      savedStatus.hidden = true;
      savedStatus.textContent = "";
    }
    if (savedFileInput) {
      savedFileInput.value = "";
    }
    window.alert("잘못된 파일형식입니다.");
  }
}

function buildSavedFilename(snapshot) {
  const baseName = (snapshot.filename || "duduta-dot").replace(/\.[^.]+$/, "") || "duduta-dot";
  const modeLabel = snapshot.canvas_mode === APP_MODES.BOOK ? "book" : "sketchbook";
  return `${baseName}-${modeLabel}-${snapshot.ratio}-p${snapshot.precision}.dudot.json`;
}

function buildPortableSnapshot(snapshot) {
  return {
    job_id: snapshot.job_id || `local-${Date.now()}`,
    filename: snapshot.filename || "saved-dot-guide",
    ratio: snapshot.ratio,
    precision: snapshot.precision,
    status: "completed",
    progress: 100,
    message: snapshot.message || "저장된 도안 파일",
    created_at: snapshot.created_at || new Date().toISOString(),
    updated_at: snapshot.updated_at || snapshot.created_at || new Date().toISOString(),
    width: snapshot.width,
    height: snapshot.height,
    used_colors: Array.isArray(snapshot.used_colors) ? snapshot.used_colors : [],
    grid_codes: Array.isArray(snapshot.grid_codes) ? snapshot.grid_codes : [],
    canvas_mode: snapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK,
    book_selected_segment: snapshot.book_selected_segment || selectedBookSegmentId,
    book_applied_segments: normalizeBookAppliedSegments(snapshot.book_applied_segments),
    book_segment_crops: normalizeBookSegmentCrops(snapshot.book_segment_crops),
  };
}

function createDefaultModeUiState() {
  return {
    activeColorCode: null,
    activeColorCodes: [],
    completedCells: [],
    palettePage: 0,
    activeGroup: null,
    multiSelectEnabled: false,
    rememberedMultiColorCodes: [],
  };
}

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

function extractPortableSnapshot(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.type === "duduta-dot-save" && payload.snapshot) {
    return payload.snapshot;
  }

  if (payload.job && payload.job.grid_codes) {
    return payload.job;
  }

  return payload.grid_codes ? payload : null;
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
  if (!isPortableSnapshot(currentResultSnapshot)) {
    return;
  }

  const portableSnapshot = buildPortableSnapshot(currentResultSnapshot);
  if (portableSnapshot.canvas_mode === APP_MODES.BOOK) {
    bookSnapshot = portableSnapshot;
    return;
  }
  sketchbookSnapshot = portableSnapshot;
}

function applyModeSnapshot(snapshot) {
  if (!isPortableSnapshot(snapshot)) {
    return;
  }

  const portableSnapshot = buildPortableSnapshot(snapshot);
  currentResultSnapshot = portableSnapshot;
  if (portableSnapshot.canvas_mode === APP_MODES.BOOK) {
    selectedBookSegmentId = portableSnapshot.book_selected_segment || selectedBookSegmentId;
    bookSnapshot = portableSnapshot;
  } else {
    sketchbookSnapshot = portableSnapshot;
  }
  submitButton.disabled = false;
  applyModeUi();
  renderCompleted(currentResultSnapshot);
  updateSaveButtonState(true);
}

function isPortableSnapshot(snapshot) {
  return Boolean(
    snapshot
    && Array.isArray(snapshot.grid_codes)
    && snapshot.grid_codes.length > 0
    && Array.isArray(snapshot.used_colors),
  );
}

function applyImportedConversion(snapshot, sourceName) {
  if (!isPortableSnapshot(snapshot)) {
    return;
  }

  stopTracking();
  persistCurrentSnapshotByMode();
  persistCurrentModeUiState();
  const portableSnapshot = buildPortableSnapshot(snapshot);
  activeMode = portableSnapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK;
  applyModeSnapshot(portableSnapshot);
  setStatus("저장본 불러옴", `"${sourceName}" 파일을 불러왔습니다.`, 100);
  if (savedStatus) {
    savedStatus.hidden = true;
    savedStatus.textContent = "";
  }
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleSnapshot(snapshot) {
  setStatus(formatStatus(snapshot.status), snapshot.message, snapshot.progress);
  if (snapshot.status === "completed") {
    if (pendingConversionContext.mode === APP_MODES.BOOK) {
      const baseGridCodes = bookSnapshot?.grid_codes?.length
        ? cloneGridCodes(bookSnapshot.grid_codes)
        : createEmptyGridCodes(BOOK_LAYOUT.width, BOOK_LAYOUT.height, "");
      const nextAppliedSegments = normalizeBookAppliedSegments([
        ...(bookSnapshot?.book_applied_segments || []),
        pendingConversionContext.bookSegmentId,
      ]);
      const nextSegmentCrops = {
        ...normalizeBookSegmentCrops(bookSnapshot?.book_segment_crops || currentResultSnapshot?.book_segment_crops),
      };
      const currentSegmentCrop = pendingConversionContext.bookSegmentCrop || buildCurrentBookSegmentCrop();
      if (pendingConversionContext.bookSegmentId && currentSegmentCrop) {
        nextSegmentCrops[pendingConversionContext.bookSegmentId] = currentSegmentCrop;
      }
      const mergedGridCodes = mergeBookSegmentIntoGrid(baseGridCodes, pendingConversionContext.bookSegmentId, snapshot.grid_codes);
      bookSnapshot = buildBookSnapshotFromGrid(
        mergedGridCodes,
        selectedFile?.name || snapshot.filename,
        nextAppliedSegments,
        nextSegmentCrops,
      );
      if (activeMode === APP_MODES.BOOK) {
        currentResultSnapshot = bookSnapshot;
      }
    } else {
      sketchbookSnapshot = buildPortableSnapshot({
        ...snapshot,
        canvas_mode: APP_MODES.SKETCHBOOK,
      });
      if (activeMode === APP_MODES.SKETCHBOOK) {
        currentResultSnapshot = sketchbookSnapshot;
      }
    }
    updateSaveButtonState(pendingConversionContext.mode === activeMode && Boolean(currentResultSnapshot));
    if (pendingConversionContext.mode === activeMode && currentResultSnapshot) {
      renderCompleted(currentResultSnapshot);
    }
    finishTracking();
    return;
  }

  if (snapshot.status === "failed") {
    renderError(snapshot.error || snapshot.message || "변환에 실패했습니다.");
    finishTracking();
  }
}

function startPolling(jobId) {
  void jobId;
}

function stopPolling() {
  pollingHandle = null;
}

function stopTracking() {
  stopPolling();
  if (activeSocket) {
    activeSocket.close();
    activeSocket = null;
  }
  activeJobId = null;
  pendingConversionContext = { mode: activeMode, bookSegmentId: null, bookSegmentCrop: null };
}

function finishTracking() {
  stopPolling();
  activeJobId = null;
  pendingConversionContext = { mode: activeMode, bookSegmentId: null, bookSegmentCrop: null };
  submitButton.disabled = false;
}

function setStatus(label, message, progress) {
  if (statusPill) {
    statusPill.textContent = label;
    statusPill.title = message;
  }
  if (progressBar) {
    progressBar.style.width = `${Math.max(0, Math.min(progress || 0, 100))}%`;
  }
}

function renderCompleted(snapshot) {
  if (!Array.isArray(snapshot.grid_codes) || snapshot.grid_codes.length === 0 || !Array.isArray(snapshot.grid_codes[0])) {
    renderError("도안 칸 데이터를 불러오지 못했습니다.");
    return;
  }

  renderPalette(snapshot.used_colors || []);
  loadGuideGrid(snapshot.grid_codes, snapshot.used_colors || []);
  restoreModeUiStateForSnapshot(snapshot);
  setPaletteVisibility((snapshot.used_colors || []).length > 0);
  renderBookCropOverlays();
  scheduleGuideViewportFit();
}

function renderPalette(items) {
  if (!palette || !paletteFamilyTrack || !palettePreview) {
    return;
  }

  const paletteItems = Array.isArray(items) && items.length > 0
    ? items
    : DEFAULT_PALETTE_ITEMS;

  if (!Array.isArray(items) || items.length === 0) {
    viewerState.activeColorCode = null;
    viewerState.activeColorCodes = [];
    paletteState.page = 0;
    paletteState.activeGroup = null;
    paletteState.rememberedMultiColorCodes = [];
  }

  if (paletteSidebar) {
    paletteSidebar.hidden = false;
  }
  mainShell?.classList.add("has-palette-sidebar");

  paletteState.groups = buildPaletteGroups(paletteItems);
  syncActivePaletteSelection(new Set(paletteItems.map((item) => item.code)));
  if (!paletteState.groups.some((group) => group.name === paletteState.activeGroup)) {
    paletteState.activeGroup = getPaletteGroupNameByCode(viewerState.activeColorCode) || paletteState.groups[0]?.name || null;
  }
  ensurePalettePageForActiveGroup();
  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();
}

function renderError(message) {
  if (statusPill) {
    statusPill.textContent = "실패";
    statusPill.title = message;
  }
  prepareGuideViewer(message);
  renderPalette([]);
  setPaletteVisibility(false);
}

function resetResultArea(message = "도안 생성 후 여기서 바로 확대하고 이동할 수 있습니다.") {
  prepareGuideViewer(message);
  renderPalette([]);
  setPaletteVisibility(false);
}

function prepareGuideViewer(message) {
  setGuideMessage(message);
  guideEmpty.hidden = false;
  guideViewport?.classList.remove("is-ready", "is-dragging");
  setGuideControlsEnabled(false);
  currentResultSnapshot = null;
  viewerState.gridCodes = [];
  viewerState.paletteByCode = new Map();
  viewerState.columns = 0;
  viewerState.rows = 0;
  viewerState.fitScale = 1;
  viewerState.scale = 1;
  viewerState.minScale = 1;
  viewerState.maxScale = 1;
  viewerState.panX = 0;
  viewerState.panY = 0;
  viewerState.hoverColumn = null;
  viewerState.hoverRow = null;
  viewerState.activeColorCode = null;
  viewerState.activeColorCodes = [];
  viewerState.completedCells = new Set();
  guideInteraction = null;
  clearGuideCanvas();
  updateSaveButtonState(false);
}

function setGuideMessage(message) {
  viewerNote.textContent = message;
  guideEmptyText.textContent = message;
}

function setGuideControlsEnabled(enabled) {
  zoomOutButton.disabled = !enabled;
  zoomResetButton.disabled = !enabled;
  zoomInButton.disabled = !enabled;
}

function updateSaveButtonState(enabled) {
  if (!saveCurrentButton) {
    return;
  }
  saveCurrentButton.disabled = !enabled;
  saveCurrentButton.textContent = "저장";
}

function loadGuideGrid(gridCodes, usedColors) {
  viewerState.gridCodes = gridCodes;
  viewerState.rows = gridCodes.length;
  viewerState.columns = gridCodes[0]?.length ?? 0;
  viewerState.paletteByCode = new Map(usedColors.map((item) => [item.code, item]));
  viewerState.completedCells = new Set();
  syncActivePaletteSelection(new Set(viewerState.paletteByCode.keys()));
  viewerState.hoverColumn = null;
  viewerState.hoverRow = null;
  guideEmpty.hidden = true;
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

  guideInteraction = {
    pointerId: event.pointerId,
    mode,
    paintCompleted,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startPanX: viewerState.panX,
    startPanY: viewerState.panY,
    didDrag: false,
    lastPaintedKey: getCellKey(initialCell),
  };

  if (mode === "pan") {
    guideViewport.classList.add("is-dragging");
  } else if (setCompletedStateForCell(initialCell, paintCompleted)) {
    syncCompletedCellUi();
  }
  guideViewport.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleGuidePointerMove(event) {
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
  if (!guideInteraction || event.pointerId !== guideInteraction.pointerId) {
    return;
  }

  const wasDrag = guideInteraction.didDrag;
  const mode = guideInteraction.mode;
  const paintCompleted = guideInteraction.paintCompleted;
  guideViewport.classList.remove("is-dragging");
  guideViewport.releasePointerCapture?.(event.pointerId);
  guideInteraction = null;

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

function handleGuideHover(event) {
  if (!viewerState.rows || !viewerState.columns || guideInteraction) {
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
    viewerState.panX = (size.width - worldWidth) / 2;
  } else {
    viewerState.panX = clamp(viewerState.panX, size.width - worldWidth, 0);
  }

  if (worldHeight <= size.height) {
    viewerState.panY = (size.height - worldHeight) / 2;
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
  const ratio = activeMode === APP_MODES.BOOK ? BOOK_LAYOUT.ratio : ratioInput?.value;
  const precision = activeMode === APP_MODES.BOOK ? BOOK_LAYOUT.precision : Number(precisionInput?.value);
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

function isBookCanvasMode() {
  return activeMode === APP_MODES.BOOK;
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
  const fadedWidth = BOOK_LAYOUT.fadedColumns * cellSize;
  const spine = getBookSegment("spine");
  const spineX = viewerState.panX + (spine.startColumn * cellSize);
  const leftBlockedX = viewerState.panX;
  const rightBlockedX = viewerState.panX + ((BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns) * cellSize);
  const leftFadedX = viewerState.panX + (BOOK_LAYOUT.leftBlockedColumns * cellSize);
  const rightFadedX = viewerState.panX + ((BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns - BOOK_LAYOUT.fadedColumns) * cellSize);

  guideContext.save();
  if (topBlockedHeight > 0) {
    guideContext.fillStyle = "rgba(183, 54, 54, .16)";
    guideContext.fillRect(gridLeft, viewerState.panY + (topBlockedStartRow * cellSize), gridWidth, topBlockedHeight);
  }

  if (lowerHeight > 0) {
    guideContext.fillStyle = "rgba(183, 54, 54, .16)";
    guideContext.fillRect(leftBlockedX, viewerState.panY + (lowerStartRow * cellSize), leftBlockedWidth, lowerHeight);
    guideContext.fillRect(rightBlockedX, viewerState.panY + (lowerStartRow * cellSize), rightBlockedWidth, lowerHeight);

    guideContext.fillStyle = "rgba(255, 255, 255, .24)";
    guideContext.fillRect(leftFadedX, viewerState.panY + (lowerStartRow * cellSize), fadedWidth, lowerHeight);
    guideContext.fillRect(rightFadedX, viewerState.panY + (lowerStartRow * cellSize), fadedWidth, lowerHeight);

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
    BOOK_LAYOUT.leftBlockedColumns + BOOK_LAYOUT.fadedColumns,
    BOOK_LAYOUT.segments.spine.startColumn,
    BOOK_LAYOUT.segments.spine.startColumn + BOOK_LAYOUT.segments.spine.width,
    BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns - BOOK_LAYOUT.fadedColumns,
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

  const activeColorCodes = getActivePaletteCodes();
  if (activeColorCodes.length === 0) {
    return false;
  }

  const code = viewerState.gridCodes[cell.row]?.[cell.column];
  if (!code || !activeColorCodes.includes(code)) {
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

function isBookBlockedRow(row) {
  return row < BOOK_LAYOUT.topBlockedRows;
}

function isBookBlockedColumn(column) {
  return column < BOOK_LAYOUT.leftBlockedColumns || column >= BOOK_LAYOUT.width - BOOK_LAYOUT.rightBlockedColumns;
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

function updateViewerNote() {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const activeCode = viewerState.activeColorCode;
  if (isBookCanvasMode()) {
    const segment = getBookSegment(selectedBookSegmentId);
    const appliedCount = normalizeBookAppliedSegments(currentResultSnapshot?.book_applied_segments || []).length;
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
    viewerNote.textContent = `마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.\n${activeColorCodes.length}색 표시 중 · 현재 ${viewerState.activeColorCode}${activeColorProgress}\n클릭으로 체크하고, 휠 버튼을 누른 채 지나가면 연속 체크할 수 있습니다.`;
    return;
  }

  if (viewerState.activeColorCode) {
    const color = viewerState.paletteByCode.get(viewerState.activeColorCode);
    viewerNote.textContent = `마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.\n현재 ${color?.code || viewerState.activeColorCode}${activeColorProgress}\n클릭으로 체크하고, 휠 버튼을 누른 채 지나가면 연속 체크할 수 있습니다.`;
    return;
  }

  viewerNote.textContent = "마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.";
}

function updateViewerDetail() {
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

function togglePaletteMultiSelect() {
  if (paletteState.multiSelectEnabled) {
    if (getActivePaletteCodes().length > 0) {
      paletteState.rememberedMultiColorCodes = [...getActivePaletteCodes()];
    }
    paletteState.multiSelectEnabled = false;
    viewerState.activeColorCodes = [];
    viewerState.activeColorCode = null;
  } else {
    paletteState.multiSelectEnabled = true;
    const restoredCodes = paletteState.rememberedMultiColorCodes.filter((code) => viewerState.paletteByCode.has(code));
    if (restoredCodes.length > 0) {
      viewerState.activeColorCodes = [...restoredCodes];
      viewerState.activeColorCode = restoredCodes.includes(viewerState.activeColorCode)
        ? viewerState.activeColorCode
        : restoredCodes[restoredCodes.length - 1] || null;
    } else if (viewerState.activeColorCode && viewerState.paletteByCode.has(viewerState.activeColorCode)) {
      viewerState.activeColorCodes = [viewerState.activeColorCode];
    } else {
      viewerState.activeColorCodes = [];
      viewerState.activeColorCode = null;
    }
  }

  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
}

function setPaletteFilter(nextCode) {
  const normalizedCode = nextCode && viewerState.paletteByCode.has(nextCode) ? nextCode : null;
  if (!normalizedCode) {
    if (paletteState.multiSelectEnabled && getActivePaletteCodes().length > 0) {
      paletteState.rememberedMultiColorCodes = [...getActivePaletteCodes()];
    }
    viewerState.activeColorCode = null;
    viewerState.activeColorCodes = [];
  } else if (!paletteState.multiSelectEnabled) {
    const isSameSingleSelection = viewerState.activeColorCode === normalizedCode && getActivePaletteCodes().length === 1;
    viewerState.activeColorCode = isSameSingleSelection ? null : normalizedCode;
    viewerState.activeColorCodes = viewerState.activeColorCode ? [viewerState.activeColorCode] : [];
  } else {
    const nextCodes = [...getActivePaletteCodes()];
    const existingIndex = nextCodes.indexOf(normalizedCode);
    if (existingIndex === -1) {
      nextCodes.push(normalizedCode);
    } else if (viewerState.activeColorCode === normalizedCode) {
      nextCodes.splice(existingIndex, 1);
    } else {
      nextCodes.splice(existingIndex, 1);
      nextCodes.push(normalizedCode);
    }
    viewerState.activeColorCodes = nextCodes;
    viewerState.activeColorCode = nextCodes[nextCodes.length - 1] || null;
    paletteState.rememberedMultiColorCodes = [...nextCodes];
  }

  if (viewerState.activeColorCode) {
    paletteState.activeGroup = getPaletteGroupNameByCode(viewerState.activeColorCode);
  }
  ensurePalettePageForActiveGroup();
  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
}

function updatePaletteFilterUi() {
  const activeCode = viewerState.activeColorCode;
  const activeCodes = getActivePaletteCodes();
  const activeCodeSet = new Set(activeCodes);
  const activeCodeOrder = new Map(activeCodes.map((code, index) => [code, index + 1]));
  const activeGroup = paletteState.activeGroup;
  const selectedGroups = new Set(activeCodes.map((code) => getPaletteGroupNameByCode(code)).filter(Boolean));

  palette?.querySelectorAll(".palette-chip").forEach((button) => {
    const code = button.dataset.code;
    const isActiveCurrent = code === activeCode;
    const isActivePrevious = activeCodeSet.has(code) && !isActiveCurrent;
    const isSelected = isActiveCurrent || isActivePrevious;
    button.classList.toggle("is-active", isActiveCurrent);
    button.classList.toggle("is-active-current", isActiveCurrent);
    button.classList.toggle("is-active-previous", isActivePrevious);
    button.classList.toggle("is-dim", activeCodeSet.size > 0 && !isSelected);
    button.setAttribute("aria-pressed", String(isSelected));

    const orderBadge = button.querySelector(".palette-chip-order");
    if (orderBadge) {
      orderBadge.textContent = isActiveCurrent ? "현재" : isActivePrevious ? String(activeCodeOrder.get(code)) : "";
    }
  });

  paletteFamilyTrack?.querySelectorAll(".palette-family-button").forEach((button) => {
    const isActive = button.dataset.group === activeGroup;
    const isSelected = selectedGroups.has(button.dataset.group);
    const shouldDim = activeCodeSet.size > 0 && !isSelected && button.dataset.group !== activeGroup;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-dim", shouldDim);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (paletteMultiToggleButton) {
    paletteMultiToggleButton.classList.toggle("is-active", paletteState.multiSelectEnabled);
    paletteMultiToggleButton.setAttribute("aria-pressed", String(paletteState.multiSelectEnabled));
    paletteMultiToggleButton.textContent = paletteState.multiSelectEnabled ? "전체 보기" : "여러 색 보기";
    paletteMultiToggleButton.title = paletteState.multiSelectEnabled
      ? "여러 상세 색을 함께 표시 중입니다."
      : "한 번에 한 상세 색만 표시합니다.";
  }

  if (paletteModeIndicator) {
    paletteModeIndicator.textContent = paletteState.multiSelectEnabled ? "멀티모드" : "원본모드";
    paletteModeIndicator.classList.toggle("is-multi", paletteState.multiSelectEnabled);
  }

  if (paletteCompleteButton) {
    const canComplete = Boolean(viewerState.rows && viewerState.columns && activeCode);
    paletteCompleteButton.hidden = !activeCode;
    paletteCompleteButton.disabled = !canComplete;
    paletteCompleteButton.textContent = activeCode
      ? `${activeCode} ${isCodeCompleted(activeCode) ? "완료 해제" : "완료"}`
      : "완료";
  }

  if (palettePrevButton) {
    palettePrevButton.disabled = paletteState.page <= 0 || paletteState.groups.length <= 5;
  }

  if (paletteNextButton) {
    paletteNextButton.disabled = ((paletteState.page + 1) * 5) >= paletteState.groups.length;
  }

  if (!paletteFilterNote) {
    return;
  }
  paletteFilterNote.textContent = "";
}

function buildPaletteGroups(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!map.has(item.group)) {
      map.set(item.group, {
        name: item.group,
        items: [],
        totalCount: 0,
        mainColor: GROUP_MAIN_COLORS[item.group] || item.hex_value,
      });
    }
    const group = map.get(item.group);
    group.items.push(item);
    group.totalCount += Number(item.count || 0);
  });

  map.forEach((group) => {
    group.items.sort((left, right) => getPaletteCodeOrder(left.code) - getPaletteCodeOrder(right.code));
  });

  return [...map.values()].sort(
    (left, right) => GROUP_DISPLAY_ORDER.indexOf(left.name) - GROUP_DISPLAY_ORDER.indexOf(right.name),
  );
}

function getPaletteCodeOrder(code) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(code || "");
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, prefix, numberPart] = match;
  const groupName = getPaletteGroupNameFromCodePrefix(prefix);
  const groupIndex = GROUP_DISPLAY_ORDER.indexOf(groupName);
  return (Math.max(groupIndex, 0) * 100) + Number(numberPart);
}

function getPaletteGroupNameFromCodePrefix(prefix) {
  const prefixMap = {
    B: "Black",
    Re: "Red",
    Or: "Orange",
    Am: "Amber",
    Ye: "Yellow",
    Pi: "Pistachio",
    Gr: "Green",
    Aq: "Aqua",
    Bl: "Blue",
    In: "Indigo",
    Pu: "Purple",
    Ma: "Magenta",
    P: "Pink",
  };

  return prefixMap[prefix] || "";
}

function getPaletteGroupNameByCode(code) {
  if (!code) {
    return null;
  }

  return viewerState.paletteByCode.get(code)?.group
    || paletteState.groups.find((group) => group.items.some((item) => item.code === code))?.name
    || null;
}

function getActivePaletteGroup() {
  return paletteState.groups.find((group) => group.name === paletteState.activeGroup) || null;
}

function ensurePalettePageForActiveGroup() {
  if (!paletteState.groups.length || !paletteState.activeGroup) {
    paletteState.page = 0;
    return;
  }

  const groupIndex = paletteState.groups.findIndex((group) => group.name === paletteState.activeGroup);
  if (groupIndex === -1) {
    paletteState.page = 0;
    return;
  }

  paletteState.page = Math.floor(groupIndex / 5);
}

function shiftPalettePage(delta) {
  if (!paletteState.groups.length) {
    return;
  }

  const pageCount = Math.max(1, Math.ceil(paletteState.groups.length / 5));
  paletteState.page = clamp(paletteState.page + delta, 0, pageCount - 1);
  const visibleGroups = paletteState.groups.slice(paletteState.page * 5, (paletteState.page * 5) + 5);
  if (!visibleGroups.some((group) => group.name === paletteState.activeGroup)) {
    paletteState.activeGroup = visibleGroups[0]?.name || null;
    if (!paletteState.multiSelectEnabled && viewerState.activeColorCode && getPaletteGroupNameByCode(viewerState.activeColorCode) !== paletteState.activeGroup) {
      viewerState.activeColorCode = null;
      viewerState.activeColorCodes = [];
    }
    renderPaletteDetails();
  }
  renderPaletteGroups();
  updatePaletteFilterUi();

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
}

function setPaletteGroup(groupName) {
  if (!paletteState.groups.some((group) => group.name === groupName)) {
    return;
  }

  paletteState.activeGroup = groupName;
  if (!paletteState.multiSelectEnabled && viewerState.activeColorCode && getPaletteGroupNameByCode(viewerState.activeColorCode) !== groupName) {
    viewerState.activeColorCode = null;
    viewerState.activeColorCodes = [];
  }

  ensurePalettePageForActiveGroup();
  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
}

function renderPaletteGroups() {
  if (!paletteFamilyTrack) {
    return;
  }

  paletteFamilyTrack.innerHTML = "";

  if (!paletteState.groups.length) {
    paletteFamilyTrack.innerHTML = "";
    return;
  }

  const visibleGroups = paletteState.groups.slice(paletteState.page * 5, (paletteState.page * 5) + 5);
  visibleGroups.forEach((group) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-family-button";
    button.dataset.group = group.name;
    button.title = `${group.name} 그룹 · ${group.totalCount}칸`;
    button.style.setProperty("--swatch", group.mainColor);
    button.addEventListener("click", () => setPaletteGroup(group.name));
    paletteFamilyTrack.append(button);
  });
}

function renderPaletteDetails() {
  if (!palette) {
    return;
  }

  const group = getActivePaletteGroup();
  palette.innerHTML = "";

  if (!group) {
    palette.innerHTML = "";
    return;
  }

  group.items.forEach((item) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-chip";
    button.classList.toggle("is-complete", isCodeCompleted(item.code));
    button.dataset.code = item.code;
    button.title = `${item.code} ${item.group} ${item.count}칸`;
    button.style.setProperty("--swatch", item.hex_value);
    button.innerHTML = `
      <span class="palette-chip-complete" aria-hidden="true">✓</span>
      <span class="palette-chip-order" aria-hidden="true"></span>
      <span class="palette-blob" aria-hidden="true"></span>
      <span class="palette-meta">
        <strong>${item.code}</strong>
        <span>${item.group}</span>
        <span>${item.count}칸</span>
      </span>
    `;
    button.addEventListener("click", () => setPaletteFilter(item.code));
    li.append(button);
    palette.append(li);
  });
}

function getGuideLabelColor(hexValue) {
  const [red, green, blue] = hexToRgb(hexValue);
  const brightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  return brightness > 165 ? "#2d241c" : "#ffffff";
}

function mixHexColors(baseHex, overlayHex, overlayWeight = 0.5) {
  const weight = clamp(overlayWeight, 0, 1);
  const [baseRed, baseGreen, baseBlue] = hexToRgb(baseHex);
  const [overlayRed, overlayGreen, overlayBlue] = hexToRgb(overlayHex);
  const mixChannel = (base, overlay) => Math.round((base * (1 - weight)) + (overlay * weight));
  return `rgb(${mixChannel(baseRed, overlayRed)}, ${mixChannel(baseGreen, overlayGreen)}, ${mixChannel(baseBlue, overlayBlue)})`;
}

function hexToRgb(hexValue) {
  const clean = hexValue.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16));
}

function normalizeHexColor(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
    return null;
  }
  return `#${trimmed.slice(1).toLowerCase()}`;
}

function rgbaFromHexColor(hexValue, alpha = 1) {
  const [red, green, blue] = hexToRgb(normalizeHexColor(hexValue) || DEFAULT_GUIDE_GRID_COLOR);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

function getActivePaletteCodes() {
  if (Array.isArray(viewerState.activeColorCodes) && viewerState.activeColorCodes.length > 0) {
    return viewerState.activeColorCodes;
  }

  return viewerState.activeColorCode ? [viewerState.activeColorCode] : [];
}

function syncActivePaletteSelection(validCodes) {
  const nextCodes = getActivePaletteCodes().filter((code) => validCodes.has(code));
  viewerState.activeColorCodes = [...new Set(nextCodes)];
  viewerState.activeColorCode = viewerState.activeColorCodes[viewerState.activeColorCodes.length - 1] || null;
  paletteState.rememberedMultiColorCodes = paletteState.rememberedMultiColorCodes.filter((code) => validCodes.has(code));
}

function handleWindowResize() {
  const nextViewportLayoutMode = getViewportLayoutMode();
  const layoutModeChanged = nextViewportLayoutMode !== lastViewportLayoutMode;
  lastViewportLayoutMode = nextViewportLayoutMode;

  if (cropSelection || expandedCropSelection) {
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

function getViewportLayoutMode() {
  return window.innerWidth <= 1180 ? "stacked" : "desktop";
}

function renderSelectedFile() {
}

function getTargetCropRatio() {
  if (activeMode === APP_MODES.BOOK) {
    const segment = getBookSegment(selectedBookSegmentId);
    return segment.width / BOOK_LAYOUT.usableHeight;
  }
  const [width, height] = ratioInput.value.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

function getTargetCropRatioLabel() {
  if (activeMode === APP_MODES.BOOK) {
    const segment = getBookSegment(selectedBookSegmentId);
    return `${segment.width}:${BOOK_LAYOUT.usableHeight}`;
  }
  return ratioInput.value;
}

function preventDefault(event) {
  event.preventDefault();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatStatus(status) {
  if (status === "queued") return "대기 중";
  if (status === "processing") return "변환 중";
  if (status === "completed") return "완료";
  if (status === "failed") return "실패";
  return status;
}
