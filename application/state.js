/*
Module: application state
Description: Shared UI state containers used by the application orchestrator.
Domain: application
Dependencies: ../infrastructure/browser/dom-elements.js
Usage:
  import { viewerState, paletteState } from "./state.js";
*/

import {
  bookSegmentOverlays,
  cropBox,
  cropFrame,
  cropImage,
  cropMeta,
  cropStage,
  expandedBookSegmentOverlays,
  expandedCropBox,
  expandedCropFrame,
  expandedCropImage,
  expandedCropMeta,
  expandedCropModal,
} from "../infrastructure/browser/dom-elements.js";

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

export {
  createDefaultModeUiState,
  cropViews,
  paletteState,
  viewerState,
};
