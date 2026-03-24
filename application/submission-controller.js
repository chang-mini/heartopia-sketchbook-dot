/*
Module: submission controller
Description: Conversion submission, cropped upload creation, and local save export orchestration.
Domain: application
Dependencies: browser canvas and File APIs
Usage:
  const submissionController = createSubmissionController({...});
  form.addEventListener("submit", submissionController.startConversion);
*/

function createSubmissionController({
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
  getActiveMode,
  getSelectedFile,
  setSelectedFile,
  getCropSelection,
  getBookSnapshot,
  getSelectedBookSegmentId,
  setPendingConversionContext,
  setActiveJobId,
  buildCurrentBookSegmentCrop,
  getCurrentResultSnapshot,
  getIsCropStageExpanded,
  setCropStageExpanded,
}) {
  async function startConversion(event) {
    event?.preventDefault();
    if (getIsCropStageExpanded()) {
      setCropStageExpanded(false);
    }
    const file = getSelectedFile() ?? imageInput.files?.[0];
    if (!file) {
      renderError("이미지 파일을 먼저 선택해 주세요.");
      return;
    }

    if (!cropImage?.naturalWidth || !getCropSelection()) {
      renderError("원본 이미지를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setSelectedFile(file);
    renderSelectedFile();
    stopTracking();
    submitButton.disabled = true;
    setPendingConversionContext({
      mode: getActiveMode(),
      bookSegmentId: getActiveMode() === APP_MODES.BOOK ? getSelectedBookSegmentId() : null,
      bookSegmentCrop: getActiveMode() === APP_MODES.BOOK ? buildCurrentBookSegmentCrop() : null,
    });
    if (getActiveMode() === APP_MODES.BOOK && getBookSnapshot()) {
      setGuideMessage("선택한 책 범위를 새 이미지로 덮어쓰는 중입니다.");
    } else if (getActiveMode() === APP_MODES.BOOK) {
      renderEmptyBookWorkspace();
      setGuideMessage("책 범위를 변환하는 중입니다.");
    } else {
      resetResultArea("도안 생성 결과를 준비하는 중입니다.");
    }
    setStatus("범위 처리 중", "선택한 영역을 잘라 브라우저 안에서 도안을 생성하고 있습니다.", 8);

    try {
      const uploadFile = await buildUploadFile(file);
      const ratio = getActiveMode() === APP_MODES.BOOK ? BOOK_LAYOUT.ratio : ratioInput.value;
      const precision = getActiveMode() === APP_MODES.BOOK ? BOOK_LAYOUT.precision : Number(precisionInput.value);
      let canvasWidth = null;
      let canvasHeight = null;
      if (getActiveMode() === APP_MODES.BOOK) {
        const bookSegment = getBookSegment(getSelectedBookSegmentId());
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
      setActiveJobId(snapshot.job_id);
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

    if (isFullCropSelection(getCropSelection()) && Number.isFinite(targetRatio) && targetRatio > 0) {
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
    // Disable smoothing to preserve exact pixel colors (critical for pixel art).
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
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

  async function saveCurrentConversion() {
    const currentResultSnapshot = getCurrentResultSnapshot();
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

  return {
    saveCurrentConversion,
    startConversion,
  };
}

export { createSubmissionController };
