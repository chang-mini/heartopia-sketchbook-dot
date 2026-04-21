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
  getTuningValues,
  getMultiActiveLayout = () => null,
  computeMultiPieceRects = () => [],
  onMultiConversionStart = () => {},
  onMultiPieceCompleted = () => {},
  onMultiConversionFinished = () => {},
  onMultiConversionFailed = () => {},
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

    if (getActiveMode() === APP_MODES.MULTI_SKETCHBOOK) {
      return startMultiConversion(file);
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
        tuning: getTuningValues?.() ?? null,
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

  async function startMultiConversion(file) {
    const layout = getMultiActiveLayout();
    if (!layout || layout.count <= 0) {
      renderError("멀티스케치북 배치 정보를 확인할 수 없습니다.");
      return;
    }

    const cropSelection = getCropSelection();
    const pieceRects = computeMultiPieceRects(cropSelection, layout);
    if (!Array.isArray(pieceRects) || pieceRects.length !== layout.count) {
      renderError("조각 영역을 계산할 수 없습니다.");
      return;
    }

    setSelectedFile(file);
    renderSelectedFile();
    stopTracking();
    submitButton.disabled = true;
    resetResultArea("멀티스케치북 도안 생성 결과를 준비하는 중입니다.");
    setStatus("멀티 변환 준비 중", `총 ${layout.count}개 조각을 순차로 변환합니다.`, 4);

    const ratio = ratioInput.value;
    const precision = Number(precisionInput.value);
    const tuning = getTuningValues?.() ?? null;
    const collectedPieces = [];

    onMultiConversionStart({
      layout,
      totalPieces: layout.count,
      sourceFilename: file.name,
      ratio,
      precision,
    });

    try {
      for (let i = 0; i < pieceRects.length; i += 1) {
        const pieceRect = pieceRects[i];
        const pieceIndex = i;
        setPendingConversionContext({
          mode: APP_MODES.MULTI_SKETCHBOOK,
          pieceIndex,
          totalPieces: layout.count,
          multiLayout: layout,
          bookSegmentId: null,
          bookSegmentCrop: null,
        });
        setStatus(
          "조각 변환 중",
          `${pieceIndex + 1}/${layout.count} 조각을 처리하고 있습니다.`,
          Math.round(((pieceIndex) / layout.count) * 95) + 5,
        );

        const uploadFile = await buildMultiPieceUploadFile(file, pieceRect);
        const snapshot = await convertImageLocally({
          file: uploadFile,
          originalName: `${stripExt(file.name)}_p${pieceIndex + 1}`,
          ratio,
          precision,
          canvasWidth: null,
          canvasHeight: null,
          tuning,
        });
        setActiveJobId(snapshot.job_id);
        collectedPieces.push(snapshot);
        onMultiPieceCompleted({ pieceIndex, snapshot });
      }

      setStatus("완료", `${layout.count}개 조각 변환이 모두 끝났습니다.`, 100);
      onMultiConversionFinished({
        layout,
        pieces: collectedPieces,
        sourceFilename: file.name,
        ratio,
        precision,
      });
      finishTracking();
    } catch (error) {
      if (savedStatus) {
        savedStatus.hidden = true;
        savedStatus.textContent = "";
      }
      if (savedFileInput) {
        savedFileInput.value = "";
      }
      renderError(error instanceof Error ? error.message : "멀티 변환에 실패했습니다. 다시 시도해 주세요.");
      onMultiConversionFailed(error);
      finishTracking();
    }
  }

  function stripExt(name) {
    if (typeof name !== "string") return "piece";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  }

  async function buildMultiPieceUploadFile(file, pieceRect) {
    const cropPixels = getCropPixels();
    const naturalImage = getNaturalCropImageElement();
    if (!cropPixels) {
      throw new Error("크롭 영역을 계산할 수 없습니다.");
    }
    if (!naturalImage?.naturalWidth) {
      throw new Error("원본 이미지를 찾을 수 없습니다.");
    }

    const cropSelection = getCropSelection();
    if (!cropSelection) {
      throw new Error("크롭 선택 영역이 없습니다.");
    }

    const naturalWidth = naturalImage.naturalWidth;
    const naturalHeight = naturalImage.naturalHeight;

    let sourceLeft = Math.round(pieceRect.x * naturalWidth);
    let sourceTop = Math.round(pieceRect.y * naturalHeight);
    let sourceWidth = Math.max(1, Math.round(pieceRect.width * naturalWidth));
    let sourceHeight = Math.max(1, Math.round(pieceRect.height * naturalHeight));
    if (sourceLeft + sourceWidth > naturalWidth) sourceWidth = naturalWidth - sourceLeft;
    if (sourceTop + sourceHeight > naturalHeight) sourceHeight = naturalHeight - sourceTop;
    sourceWidth = Math.max(1, sourceWidth);
    sourceHeight = Math.max(1, sourceHeight);

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("조각 캔버스를 만들 수 없습니다.");
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      naturalImage,
      sourceLeft,
      sourceTop,
      sourceWidth,
      sourceHeight,
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
      throw new Error("조각을 잘라내는 데 실패했습니다.");
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
