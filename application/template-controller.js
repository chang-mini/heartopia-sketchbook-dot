/*
Module: template controller
Description: Clothes/furniture template mode controller — item selection, canvas (part) switching,
             snapshot management, and mask application after conversion.
Domain: application
Dependencies: ../config/template-catalog.js
Usage:
  const templateController = createTemplateController({...});
  templateController.handleItemChange(event);
*/

import {
  getTemplatePreset,
  getTemplateCanvas,
  getTemplatesByCategory,
  TEMPLATE_CATEGORIES,
} from "../config/template-catalog.js";
import { computeMaskBBox } from "../domain/template/grid.js";

function createTemplateController({
  APP_MODES,
  clothesItemInput,
  clothesCanvasInput,
  furnitureItemInput,
  furnitureCanvasInput,
  expandedClothesCanvasInput,
  expandedFurnitureCanvasInput,
  getActiveMode,
  onCanvasChanged,
}) {
  function isClothesMode() {
    return getActiveMode() === APP_MODES.CLOTHES;
  }

  function isFurnitureMode() {
    return getActiveMode() === APP_MODES.FURNITURE;
  }

  function isTemplateMode() {
    return isClothesMode() || isFurnitureMode();
  }

  function getItemInput() {
    return isClothesMode() ? clothesItemInput : furnitureItemInput;
  }

  function getCanvasInput() {
    return isClothesMode() ? clothesCanvasInput : furnitureCanvasInput;
  }

  function getExpandedCanvasInput() {
    return isClothesMode() ? expandedClothesCanvasInput : expandedFurnitureCanvasInput;
  }

  function getSelectedItemId() {
    const input = getItemInput();
    return input?.value || null;
  }

  function getSelectedCanvasId() {
    const input = getCanvasInput();
    return input?.value || null;
  }

  function getSelectedPreset() {
    const itemId = getSelectedItemId();
    return itemId ? getTemplatePreset(itemId) : null;
  }

  function getSelectedCanvas() {
    const itemId = getSelectedItemId();
    const canvasId = getSelectedCanvasId();
    if (!itemId || !canvasId) return null;
    return getTemplateCanvas(itemId, canvasId);
  }

  function populateCanvasOptions(preset) {
    const canvasInputs = isClothesMode()
      ? [clothesCanvasInput, expandedClothesCanvasInput]
      : [furnitureCanvasInput, expandedFurnitureCanvasInput];

    canvasInputs.forEach((select) => {
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = "";
      if (!preset) return;
      preset.canvases.forEach((canvas) => {
        const option = document.createElement("option");
        option.value = canvas.id;
        option.textContent = `${canvas.label} (${canvas.w}×${canvas.h})`;
        select.appendChild(option);
      });
      if (preset.canvases.some((c) => c.id === currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function handleItemChange(event) {
    const preset = getSelectedPreset();
    populateCanvasOptions(preset);
    onCanvasChanged?.();
  }

  function handleCanvasChange(event) {
    const canvasInput = getCanvasInput();
    const expandedInput = getExpandedCanvasInput();
    if (canvasInput && event.target !== canvasInput) {
      canvasInput.value = event.target.value;
    }
    if (expandedInput && event.target !== expandedInput) {
      expandedInput.value = event.target.value;
    }
    onCanvasChanged?.();
  }

  function syncCanvasInputs() {
    const preset = getSelectedPreset();
    populateCanvasOptions(preset);
  }

  function getSelectedCanvasBBox() {
    const canvas = getSelectedCanvas();
    if (!canvas) return null;
    return computeMaskBBox(canvas.maskLines, canvas.w, canvas.h);
  }

  function getTemplateCropRatio() {
    const bbox = getSelectedCanvasBBox();
    if (!bbox) return 1;
    return bbox.w / bbox.h;
  }

  function getTemplateCropRatioLabel() {
    const bbox = getSelectedCanvasBBox();
    if (!bbox) return "1:1";
    return `${bbox.w}:${bbox.h}`;
  }

  return {
    getSelectedCanvas,
    getSelectedCanvasBBox,
    getSelectedCanvasId,
    getSelectedItemId,
    getSelectedPreset,
    getTemplateCropRatio,
    getTemplateCropRatioLabel,
    handleCanvasChange,
    handleItemChange,
    isClothesMode,
    isFurnitureMode,
    isTemplateMode,
    syncCanvasInputs,
  };
}

export { createTemplateController };
