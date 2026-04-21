/*
Module: dom elements
Description: Centralized browser DOM queries for the sketchbook UI.
Domain: infrastructure/browser
Dependencies: browser DOM
Usage:
  import { form, guideCanvas } from "./dom-elements.js";
*/

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
const gridToggleButton = document.getElementById("grid-toggle");
const sidebarToggleButton = document.getElementById("sidebar-toggle");
const canvasFullscreenButton = document.getElementById("canvas-fullscreen");
const guideFullscreenClose = document.getElementById("guide-fullscreen-close");
const sidebar = document.querySelector(".sidebar");
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
const tuningSaturation = document.getElementById("tuning-saturation");
const tuningSaturationValue = document.getElementById("tuning-saturation-value");
const tuningContrast = document.getElementById("tuning-contrast");
const tuningContrastValue = document.getElementById("tuning-contrast-value");
const tuningBrightness = document.getElementById("tuning-brightness");
const tuningBrightnessValue = document.getElementById("tuning-brightness-value");
const tuningReset = document.getElementById("tuning-reset");

export {
  bookRangeField,
  canvasFullscreenButton,
  bookSegmentInput,
  bookSegmentOverlays,
  cropBox,
  cropFrame,
  cropImage,
  cropMeta,
  cropStage,
  expandCropButton,
  expandedBookSegmentInput,
  expandedBookSegmentOverlays,
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
};
