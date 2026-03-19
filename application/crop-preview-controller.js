/*
Module: crop preview controller
Description: Crop preview loading, modal expansion, and crop-stage UI orchestration.
Domain: application
Dependencies: browser URL API
Usage:
  const cropPreviewController = createCropPreviewController({...});
  imageInput.addEventListener("change", cropPreviewController.handleImageSelection);
*/

function createCropPreviewController({
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
  renderEmptyBookWorkspace,
  resetResultArea,
  stopTracking,
  setStatus,
  startConversion,
  applyDefaultCropSelection,
  cloneCropSelection,
  createCropSelection,
  syncExpandedSelectionToSidebar,
  scheduleCropLayoutRefresh,
  renderCropSelection,
  getActiveMode,
  getBookSnapshot,
  getCurrentResultSnapshot,
  getSelectedFile,
  setSelectedFile,
  getSourceImageUrl,
  setSourceImageUrl,
  getIsCropStageExpanded,
  setIsCropStageExpanded,
  getCropSelection,
  setCropSelection,
  getExpandedCropSelection,
  setExpandedCropSelection,
  setExpandedCropDraft,
}) {
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
      setSelectedFile(null);
      if (imageInput) {
        imageInput.value = "";
      }
      renderSelectedFile();
      submitButton.disabled = false;
      clearCropPreview();
      if (!getCurrentResultSnapshot()) {
        stopTracking();
        setStatus("대기 중", "이미지를 업로드하면 변환이 시작됩니다.", 0);
        if (getActiveMode() === APP_MODES.BOOK) {
          renderEmptyBookWorkspace();
        } else {
          resetResultArea();
        }
      }
      window.alert("잘못된 파일형식입니다.");
      return;
    }

    setSelectedFile(nextFile);
    if (getSelectedFile() && savedFileInput) {
      savedFileInput.value = "";
    }
    if (getSelectedFile() && savedStatus) {
      savedStatus.hidden = true;
      savedStatus.textContent = "";
    }
    renderSelectedFile();
    stopTracking();
    submitButton.disabled = false;
    setStatus(
      "대기 중",
      getSelectedFile()
        ? getActiveMode() === APP_MODES.BOOK
          ? "책 범위를 고른 뒤 선택한 영역에 이미지를 적용하세요."
          : "비율에 맞는 범위를 고른 뒤 변환을 시작하세요."
        : "이미지를 업로드하면 변환이 시작됩니다.",
      0,
    );
    if (getActiveMode() === APP_MODES.BOOK) {
      const bookSnapshot = getBookSnapshot();
      if (bookSnapshot) {
        renderCompleted(bookSnapshot);
      } else {
        renderEmptyBookWorkspace();
      }
    } else {
      resetResultArea();
    }

    if (!getSelectedFile()) {
      clearCropPreview();
      return;
    }

    loadCropPreview(getSelectedFile());
  }

  function handleRatioChange() {
    syncExpandedSketchbookControls();
    if (getActiveMode() !== APP_MODES.SKETCHBOOK) {
      return;
    }
    if (!getSelectedFile()) {
      return;
    }

    if (cropImage?.naturalWidth) {
      const targetViewKey = getIsCropStageExpanded() ? "expanded" : "sidebar";
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
    cropImage.alt = getSelectedFile() ? `업로드한 사진 미리보기: ${getSelectedFile().name}` : "업로드한 사진 미리보기";
    applyDefaultCropSelection("sidebar");
    cropStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setStatus("대기 중", "비율에 맞는 범위를 고른 뒤 변환을 시작하세요.", 0);
  }

  function handleExpandedCropImageLoaded() {
    expandedCropImage.alt = getSelectedFile() ? `업로드한 사진 확대 미리보기: ${getSelectedFile().name}` : "업로드한 사진 확대 미리보기";
    if (getIsCropStageExpanded() && !getExpandedCropSelection()) {
      setExpandedCropSelection(cloneCropSelection(getCropSelection()) || createCropSelection(0.9, "expanded"));
    }
    setExpandedCropDraft(null);
    scheduleCropLayoutRefresh();
  }

  function handleCropImageError() {
    setCropSelection(null);
    setCropStageExpanded(false);
    renderCropSelection();
    cropStage.hidden = true;
    renderError("업로드한 이미지를 미리보기로 불러오지 못했습니다.");
  }

  function handleExpandedCropImageError() {
    if (expandedCropModal) {
      expandedCropModal.hidden = true;
    }
    setExpandedCropSelection(null);
    setExpandedCropDraft(null);
  }

  function loadCropPreview(file) {
    releaseSourceImage();
    setCropSelection(null);
    setExpandedCropSelection(null);
    setExpandedCropDraft(null);
    renderCropSelection();
    cropStage.hidden = false;
    cropStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    cropMeta.textContent = "원본 이미지를 불러오는 중입니다.";
    setSourceImageUrl(URL.createObjectURL(file));
    cropImage.src = getSourceImageUrl();
    if (expandedCropImage) {
      expandedCropImage.src = getSourceImageUrl();
    }
  }

  function clearCropPreview() {
    releaseSourceImage();
    setCropSelection(null);
    setExpandedCropSelection(null);
    setExpandedCropDraft(null);
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
    if (getSourceImageUrl()) {
      URL.revokeObjectURL(getSourceImageUrl());
      setSourceImageUrl(null);
    }
  }

  function toggleCropStageExpanded() {
    setCropStageExpanded(!getIsCropStageExpanded());
  }

  function setCropStageExpanded(nextExpanded) {
    const isExpanded = Boolean(nextExpanded) && !cropStage?.hidden;
    setIsCropStageExpanded(isExpanded);
    if (expandedCropModal) {
      expandedCropModal.hidden = !getIsCropStageExpanded();
      expandedCropModal.classList.toggle("is-book-mode", getActiveMode() === APP_MODES.BOOK);
    }
    if (expandedSketchbookOptions) {
      expandedSketchbookOptions.hidden = getActiveMode() !== APP_MODES.SKETCHBOOK;
    }
    if (expandedBookSegmentWrap) {
      expandedBookSegmentWrap.hidden = getActiveMode() !== APP_MODES.BOOK;
    }
    if (getIsCropStageExpanded()) {
      setExpandedCropSelection(cloneCropSelection(getCropSelection()) || createCropSelection(0.9, "expanded"));
      setExpandedCropDraft(null);
      if (expandedCropImage && getSourceImageUrl()) {
        expandedCropImage.src = getSourceImageUrl();
      }
    } else {
      setExpandedCropSelection(null);
      setExpandedCropDraft(null);
    }
    document.body.classList.toggle("crop-stage-expanded", getIsCropStageExpanded());
    if (expandCropButton) {
      expandCropButton.textContent = getIsCropStageExpanded() ? "닫기" : "확대";
      expandCropButton.setAttribute("aria-pressed", getIsCropStageExpanded() ? "true" : "false");
      expandCropButton.title = getIsCropStageExpanded() ? "큰 범위선택 화면 닫기" : "범위선택 크게 보기";
    }
    if (getIsCropStageExpanded()) {
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
    if (event.key === "Escape" && getIsCropStageExpanded()) {
      closeExpandedCropModal();
    }
  }

  return {
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
  };
}

export { createCropPreviewController };
