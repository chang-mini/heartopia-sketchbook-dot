/*
Module: app constants
Description: Shared application constants and static layout metadata.
Domain: config
Dependencies: ./catalog.js
Usage:
  import { APP_MODES, BOOK_LAYOUT } from "./app-constants.js";
*/

import { PALETTE } from "./catalog.js";

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
const PYTHON_MODULE_DIR = "../../domain/conversion";
const PYTHON_MODULE_FILES = ["palette.py", "presets.py", "converter.py"];
const PYTHON_MODULE_VERSION = "20260421-tuning-3";

export {
  APP_MODES,
  BOOK_LAYOUT,
  DEFAULT_GUIDE_GRID_COLOR,
  DEFAULT_PALETTE_ITEMS,
  GROUP_DISPLAY_ORDER,
  GROUP_MAIN_COLORS,
  GUIDE_GRID_COLOR_STORAGE_KEY,
  PALETTE_BY_CODE,
  PYODIDE_INDEX_URL,
  PYTHON_MODULE_DIR,
  PYTHON_MODULE_FILES,
  PYTHON_MODULE_VERSION,
};
