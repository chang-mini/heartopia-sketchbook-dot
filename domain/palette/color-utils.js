/*
Module: palette color utils
Description: Palette aggregation and color formatting helpers.
Domain: domain/palette
Dependencies: ../../config/catalog.js, ../../config/app-constants.js, ../shared/math.js
Usage:
  import { buildUsedColorsFromGrid, rgbaFromHexColor } from "./color-utils.js";
*/

import { PALETTE } from "../../config/catalog.js";
import { DEFAULT_GUIDE_GRID_COLOR, PALETTE_BY_CODE } from "../../config/app-constants.js";
import { clamp } from "../shared/math.js";

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

export {
  buildUsedColorsFromGrid,
  getGuideLabelColor,
  hexToRgb,
  mixHexColors,
  normalizeHexColor,
  rgbaFromHexColor,
};
