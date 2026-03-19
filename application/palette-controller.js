/*
Module: palette controller
Description: Palette sidebar state, grouping, filtering, and rendering orchestration.
Domain: application
Dependencies: none
Usage:
  const paletteController = createPaletteController({...});
  paletteController.renderPalette(items);
*/

function createPaletteController({
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
  isCodeCompleted,
  onPaletteSelectionVisualChange,
}) {
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
    triggerPaletteSelectionVisualChange();
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
    triggerPaletteSelectionVisualChange();
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
    triggerPaletteSelectionVisualChange();
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
    triggerPaletteSelectionVisualChange();
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

  function triggerPaletteSelectionVisualChange() {
    if (viewerState.rows && viewerState.columns) {
      onPaletteSelectionVisualChange();
    }
  }

  return {
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
  };
}

export { createPaletteController };
