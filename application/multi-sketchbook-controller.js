/*
Module: multi sketchbook controller
Description: Handles split count/layout input state, piece tab rendering, and piece-tab switching for MULTI mode.
Domain: application
Dependencies: ../domain/multi/layout.js
Usage:
  const multiController = createMultiSketchbookController({...});
*/

import { getLayoutOptionsForCount, getDefaultLayoutForCount, isValidSplitCount, normalizeLayout } from "../domain/multi/layout.js";

function createMultiSketchbookController({
  APP_MODES,
  multiSplitCountInput,
  multiLayoutSelect,
  multiLayoutField,
  expandedMultiSplitCountInput,
  expandedMultiLayoutSelect,
  multiPieceTabBar,
  getActiveMode,
  getCurrentMultiSnapshot,
  setCurrentMultiSnapshot,
  onLayoutChanged = () => {},
  onSplitCountChanged = () => {},
  onPieceTabChanged = () => {},
}) {
  let currentSplitCount = multiSplitCountInput ? Number(multiSplitCountInput.value) : 4;
  let currentLayout = getDefaultLayoutForCount(currentSplitCount);

  function getActiveLayout() {
    return currentLayout ? normalizeLayout(currentLayout) : null;
  }

  function getActiveSplitCount() {
    return currentSplitCount;
  }

  function populateLayoutSelect(select, options, selectedLabel) {
    if (!select) return;
    select.innerHTML = "";
    options.forEach((opt) => {
      const el = document.createElement("option");
      el.value = opt.label;
      el.textContent = opt.label;
      select.appendChild(el);
    });
    if (selectedLabel && options.some((o) => o.label === selectedLabel)) {
      select.value = selectedLabel;
    } else if (options.length > 0) {
      select.value = options[0].label;
    }
    const locked = options.length <= 1 || options.every((o) => o.locked);
    select.disabled = locked;
  }

  function refreshLayoutOptions(splitCount, preferredLabel = null) {
    const options = getLayoutOptionsForCount(splitCount);
    const chosenLabel = preferredLabel && options.some((o) => o.label === preferredLabel)
      ? preferredLabel
      : (options[0]?.label || null);
    populateLayoutSelect(multiLayoutSelect, options, chosenLabel);
    populateLayoutSelect(expandedMultiLayoutSelect, options, chosenLabel);
    const next = options.find((o) => o.label === chosenLabel) || options[0] || null;
    currentLayout = next;
    return next;
  }

  function handleSplitCountChange(event) {
    const raw = Number(event?.target?.value ?? multiSplitCountInput?.value);
    if (!isValidSplitCount(raw)) return;
    currentSplitCount = raw;
    if (multiSplitCountInput && multiSplitCountInput.value !== String(raw)) {
      multiSplitCountInput.value = String(raw);
    }
    if (expandedMultiSplitCountInput && expandedMultiSplitCountInput.value !== String(raw)) {
      expandedMultiSplitCountInput.value = String(raw);
    }
    refreshLayoutOptions(raw);
    onSplitCountChanged(raw);
    onLayoutChanged(getActiveLayout());
  }

  function handleLayoutChange(event) {
    const label = event?.target?.value ?? multiLayoutSelect?.value;
    const options = getLayoutOptionsForCount(currentSplitCount);
    const next = options.find((o) => o.label === label);
    if (!next) return;
    currentLayout = next;
    if (multiLayoutSelect && multiLayoutSelect.value !== label) {
      multiLayoutSelect.value = label;
    }
    if (expandedMultiLayoutSelect && expandedMultiLayoutSelect.value !== label) {
      expandedMultiLayoutSelect.value = label;
    }
    onLayoutChanged(getActiveLayout());
  }

  function syncExpandedControls() {
    if (expandedMultiSplitCountInput) {
      expandedMultiSplitCountInput.value = String(currentSplitCount);
    }
    refreshLayoutOptions(currentSplitCount, currentLayout?.label);
  }

  function setSplitCountAndLayout(splitCount, layoutLabel) {
    if (!isValidSplitCount(splitCount)) return;
    currentSplitCount = splitCount;
    if (multiSplitCountInput) multiSplitCountInput.value = String(splitCount);
    if (expandedMultiSplitCountInput) expandedMultiSplitCountInput.value = String(splitCount);
    refreshLayoutOptions(splitCount, layoutLabel);
  }

  // ── Piece tab rendering ────────────────────────────────────────────────────
  function renderPieceTabs(pieces, layout, activeIndex) {
    if (!multiPieceTabBar) return;
    // Safety: never show piece tabs outside multi mode
    if (getActiveMode() !== APP_MODES.MULTI_SKETCHBOOK) {
      multiPieceTabBar.hidden = true;
      multiPieceTabBar.innerHTML = "";
      return;
    }
    if (!Array.isArray(pieces) || pieces.length === 0 || !layout) {
      multiPieceTabBar.hidden = true;
      multiPieceTabBar.innerHTML = "";
      return;
    }

    multiPieceTabBar.hidden = false;
    const buttons = pieces.map((_, i) => {
      const isActive = activeIndex === i;
      return `<button type="button" class="multi-piece-tab${isActive ? " is-active" : ""}" data-piece-index="${i}" role="tab" aria-selected="${isActive}">${i + 1}</button>`;
    });
    const overviewActive = activeIndex === null || activeIndex === undefined;
    buttons.push(`<button type="button" class="multi-piece-tab is-overview${overviewActive ? " is-active" : ""}" data-piece-index="overview" role="tab" aria-selected="${overviewActive}">전체</button>`);
    multiPieceTabBar.innerHTML = buttons.join("");
  }

  function handlePieceTabBarClick(event) {
    const target = event.target?.closest?.("[data-piece-index]");
    if (!target) return;
    const raw = target.dataset.pieceIndex;
    const nextIndex = raw === "overview" ? null : Number(raw);
    onPieceTabChanged(nextIndex);
  }

  function hidePieceTabs() {
    if (multiPieceTabBar) {
      multiPieceTabBar.hidden = true;
      multiPieceTabBar.innerHTML = "";
    }
  }

  function isActive() {
    return getActiveMode() === APP_MODES.MULTI_SKETCHBOOK;
  }

  // Initial layout options population
  refreshLayoutOptions(currentSplitCount);

  return {
    getActiveLayout,
    getActiveSplitCount,
    getCurrentMultiSnapshot,
    setCurrentMultiSnapshot,
    handleSplitCountChange,
    handleLayoutChange,
    handlePieceTabBarClick,
    hidePieceTabs,
    isActive,
    refreshLayoutOptions,
    renderPieceTabs,
    setSplitCountAndLayout,
    syncExpandedControls,
  };
}

export { createMultiSketchbookController };
