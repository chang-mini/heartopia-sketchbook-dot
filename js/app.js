import { PALETTE, getPreset } from "./config.js";

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
const statusPill = document.getElementById("status-pill");
const progressBar = document.getElementById("progress-bar");
const viewerNote = document.getElementById("viewer-note");
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
const paletteSidebar = document.getElementById("palette-sidebar");
const palette = document.getElementById("palette");
const palettePreview = document.getElementById("palette-preview");
const paletteFamilyTrack = document.getElementById("palette-family-track");
const palettePrevButton = document.getElementById("palette-prev");
const paletteNextButton = document.getElementById("palette-next");
const paletteMultiToggleButton = document.getElementById("palette-multi-toggle");
const paletteResetButton = document.getElementById("palette-reset");
const paletteFilterNote = document.getElementById("palette-filter-note");
const guideContext = guideCanvas?.getContext("2d");

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

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
const PYTHON_MODULE_DIR = "../python";
const PYTHON_MODULE_FILES = ["palette.py", "presets.py", "converter.py"];

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

let selectedFile = null;
let sourceImageUrl = null;
let cropSelection = null;
let cropInteraction = null;
let guideInteraction = null;
let currentResultSnapshot = null;
let lastViewportLayoutMode = getViewportLayoutMode();
let pyodideReadyPromise = null;

imageInput?.addEventListener("change", handleImageSelection);
ratioInput?.addEventListener("change", handleRatioChange);
form?.addEventListener("submit", startConversion);
submitButton?.addEventListener("click", startConversion);
resetCropButton?.addEventListener("click", resetCropSelection);
fullCropButton?.addEventListener("click", selectFullCropSelection);
cropImage?.addEventListener("load", handleCropImageLoaded);
cropImage?.addEventListener("error", handleCropImageError);
cropImage?.addEventListener("dragstart", preventDefault);
cropBox?.addEventListener("pointerdown", handleCropPointerDown);
cropFrame?.addEventListener("dblclick", resetCropSelection);
guideViewport?.addEventListener("wheel", handleGuideWheel, { passive: false });
guideViewport?.addEventListener("pointerdown", handleGuidePointerDown);
guideViewport?.addEventListener("pointermove", handleGuideHover);
guideViewport?.addEventListener("pointerleave", clearGuideHover);
zoomOutButton?.addEventListener("click", () => zoomGuideAtViewportCenter(1 / 1.2));
zoomResetButton?.addEventListener("click", () => fitGuideToViewport(true));
zoomInButton?.addEventListener("click", () => zoomGuideAtViewportCenter(1.2));
saveCurrentButton?.addEventListener("click", saveCurrentConversion);
savedFileInput?.addEventListener("change", handleSavedFileSelection);
paletteMultiToggleButton?.addEventListener("click", togglePaletteMultiSelect);
paletteResetButton?.addEventListener("click", resetPaletteFilter);
palettePrevButton?.addEventListener("click", () => shiftPalettePage(-1));
paletteNextButton?.addEventListener("click", () => shiftPalettePage(1));
window.addEventListener("pointermove", handleCropPointerMove);
window.addEventListener("pointerup", handleCropPointerEnd);
window.addEventListener("pointercancel", handleCropPointerEnd);
window.addEventListener("pointermove", handleGuidePointerMove);
window.addEventListener("pointerup", handleGuidePointerEnd);
window.addEventListener("pointercancel", handleGuidePointerEnd);
window.addEventListener("resize", handleWindowResize);
window.addEventListener("beforeunload", releaseSourceImage);

renderSelectedFile();
renderCropSelection();
resetResultArea();

async function startConversion(event) {
  event?.preventDefault();
  const file = selectedFile ?? imageInput.files?.[0];
  if (!file) {
    renderError("이미지 파일을 먼저 선택해 주세요.");
    return;
  }

  if (!cropImage?.naturalWidth || !cropSelection) {
    renderError("원본 이미지를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  selectedFile = file;
  renderSelectedFile();
  stopTracking();
  submitButton.disabled = true;
  resetResultArea("도안 생성 결과를 준비하는 중입니다.");
  setStatus("준비 중", "선택한 영역을 브라우저 안에서 정리하고 있습니다.", 8);

  try {
    const uploadFile = await buildUploadFile(file);
    const snapshot = await convertImageLocally({
      file: uploadFile,
      originalName: file.name,
      ratio: ratioInput.value,
      precision: Number(precisionInput.value),
    });
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

function handleImageSelection() {
  const nextFile = imageInput.files?.[0] ?? null;
  const isValidImageFile = nextFile
    ? ["image/png", "image/jpeg", "image/webp"].includes(nextFile.type)
      || /\.(png|jpe?g|webp)$/i.test(nextFile.name)
    : false;

  if (nextFile && !isValidImageFile) {
    selectedFile = null;
    if (imageInput) {
      imageInput.value = "";
    }
    renderSelectedFile();
    submitButton.disabled = false;
    clearCropPreview();
    if (!currentResultSnapshot) {
      stopTracking();
      setStatus("대기 중", "이미지를 업로드하면 변환이 시작됩니다.", 0);
      resetResultArea();
    }
    window.alert("잘못된 파일형식입니다.");
    return;
  }

  selectedFile = nextFile;
  if (selectedFile && savedFileInput) {
    savedFileInput.value = "";
  }
  if (selectedFile && savedStatus) {
    savedStatus.hidden = true;
    savedStatus.textContent = "";
  }
  renderSelectedFile();
  stopTracking();
  submitButton.disabled = false;
  setStatus("대기 중", selectedFile ? "비율에 맞는 범위를 고른 뒤 변환을 시작하세요." : "이미지를 업로드하면 변환이 시작됩니다.", 0);
  resetResultArea();

  if (!selectedFile) {
    clearCropPreview();
    return;
  }

  loadCropPreview(selectedFile);
}

function handleRatioChange() {
  if (!selectedFile) {
    return;
  }

  if (cropImage?.naturalWidth) {
    resetCropSelection();
  }
}

function handleCropImageLoaded() {
  cropStage.hidden = false;
  cropImage.alt = selectedFile ? `업로드한 사진 미리보기: ${selectedFile.name}` : "업로드한 사진 미리보기";
  resetCropSelection();
  cropStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setStatus("대기 중", "비율에 맞는 범위를 고른 뒤 변환을 시작하세요.", 0);
}

function handleCropImageError() {
  cropSelection = null;
  renderCropSelection();
  cropStage.hidden = true;
  renderError("업로드한 이미지를 미리보기로 불러오지 못했습니다.");
}

function loadCropPreview(file) {
  releaseSourceImage();
  cropSelection = null;
  renderCropSelection();
  cropStage.hidden = false;
  cropStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  cropMeta.textContent = "원본 이미지를 불러오는 중입니다.";
  sourceImageUrl = URL.createObjectURL(file);
  cropImage.src = sourceImageUrl;
}

function clearCropPreview() {
  releaseSourceImage();
  cropSelection = null;
  cropStage.hidden = true;
  renderCropSelection();
  cropMeta.textContent = "사진을 올리면 여기서 변환할 범위를 선택할 수 있습니다.";
}

function releaseSourceImage() {
  if (sourceImageUrl) {
    URL.revokeObjectURL(sourceImageUrl);
    sourceImageUrl = null;
  }
}

function resetCropSelection() {
  if (!cropImage?.naturalWidth || !cropImage?.naturalHeight) {
    return;
  }

  cropSelection = createCenteredCropSelection();
  renderCropSelection();
}

function selectFullCropSelection() {
  if (!cropImage?.naturalWidth || !cropImage?.naturalHeight) {
    return;
  }

  cropSelection = createFullCropSelection();
  renderCropSelection();
}

function createCenteredCropSelection() {
  return createCropSelection(0.9);
}

function createFullCropSelection() {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
}

function createCropSelection(maxCoverage) {
  const imageRatio = cropImage.naturalWidth / cropImage.naturalHeight;
  const targetRatio = getTargetCropRatio();
  const normalizedRatio = targetRatio / imageRatio;
  let width = maxCoverage;
  let height = width / normalizedRatio;

  if (!Number.isFinite(height) || height > maxCoverage) {
    height = maxCoverage;
    width = height * normalizedRatio;
  }

  width = clamp(width, 0.08, 1);
  height = clamp(height, 0.08, 1);

  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}

function renderCropSelection() {
  if (!cropBox || !cropSelection) {
    if (cropBox) {
      cropBox.hidden = true;
      cropBox.classList.remove("is-dragging");
    }
    if (cropMeta && !selectedFile) {
      cropMeta.textContent = "사진을 올리면 여기서 변환할 범위를 선택할 수 있습니다.";
    }
    return;
  }

  cropBox.hidden = false;
  cropBox.style.left = `${cropSelection.x * 100}%`;
  cropBox.style.top = `${cropSelection.y * 100}%`;
  cropBox.style.width = `${cropSelection.width * 100}%`;
  cropBox.style.height = `${cropSelection.height * 100}%`;
  cropMeta.textContent = formatCropMeta();
}

function formatCropMeta() {
  const cropPixels = getCropPixels();
  if (!cropPixels) {
    return "사진을 올리면 여기서 변환할 범위를 선택할 수 있습니다.";
  }

  return `선택 영역 ${cropPixels.width} x ${cropPixels.height}px | 비율 ${ratioInput.value} | 드래그로 이동, 모서리로 크기 조절`;
}

function handleCropPointerDown(event) {
  if (!cropSelection || !cropFrame) {
    return;
  }

  const frameRect = cropFrame.getBoundingClientRect();
  if (!frameRect.width || !frameRect.height) {
    return;
  }

  const handle = event.target.closest("[data-handle]")?.dataset.handle ?? null;
  cropInteraction = {
    pointerId: event.pointerId,
    mode: handle ? "resize" : "move",
    handle,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    frameLeft: frameRect.left,
    frameTop: frameRect.top,
    frameWidth: frameRect.width,
    frameHeight: frameRect.height,
    startSelection: { ...cropSelection },
  };

  cropBox.classList.add("is-dragging");
  cropBox.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleCropPointerMove(event) {
  if (!cropInteraction || event.pointerId !== cropInteraction.pointerId) {
    return;
  }

  const nextSelection = cropInteraction.mode === "move"
    ? computeMovedSelection(cropInteraction, event)
    : computeResizedSelection(cropInteraction, event);

  if (!nextSelection) {
    return;
  }

  cropSelection = nextSelection;
  renderCropSelection();
  event.preventDefault();
}

function handleCropPointerEnd(event) {
  if (!cropInteraction || event.pointerId !== cropInteraction.pointerId) {
    return;
  }

  cropBox.classList.remove("is-dragging");
  cropBox.releasePointerCapture?.(event.pointerId);
  cropInteraction = null;
}

function computeMovedSelection(session, event) {
  const dx = (event.clientX - session.startPointerX) / session.frameWidth;
  const dy = (event.clientY - session.startPointerY) / session.frameHeight;

  return {
    ...session.startSelection,
    x: clamp(session.startSelection.x + dx, 0, 1 - session.startSelection.width),
    y: clamp(session.startSelection.y + dy, 0, 1 - session.startSelection.height),
  };
}

function computeResizedSelection(session, event) {
  const pointerX = clamp(event.clientX - session.frameLeft, 0, session.frameWidth);
  const pointerY = clamp(event.clientY - session.frameTop, 0, session.frameHeight);
  const startLeft = session.startSelection.x * session.frameWidth;
  const startTop = session.startSelection.y * session.frameHeight;
  const startWidth = session.startSelection.width * session.frameWidth;
  const startHeight = session.startSelection.height * session.frameHeight;
  const targetRatio = getTargetCropRatio();
  const minWidth = getMinimumCropWidth(session.frameWidth, session.frameHeight, targetRatio);

  let anchorX = startLeft;
  let anchorY = startTop;
  let widthToPointer = 0;
  let heightToPointer = 0;
  let maxWidth = session.frameWidth;
  let maxHeight = session.frameHeight;

  switch (session.handle) {
    case "nw":
      anchorX = startLeft + startWidth;
      anchorY = startTop + startHeight;
      widthToPointer = anchorX - pointerX;
      heightToPointer = anchorY - pointerY;
      maxWidth = anchorX;
      maxHeight = anchorY;
      break;
    case "ne":
      anchorX = startLeft;
      anchorY = startTop + startHeight;
      widthToPointer = pointerX - anchorX;
      heightToPointer = anchorY - pointerY;
      maxWidth = session.frameWidth - anchorX;
      maxHeight = anchorY;
      break;
    case "sw":
      anchorX = startLeft + startWidth;
      anchorY = startTop;
      widthToPointer = anchorX - pointerX;
      heightToPointer = pointerY - anchorY;
      maxWidth = anchorX;
      maxHeight = session.frameHeight - anchorY;
      break;
    case "se":
    default:
      anchorX = startLeft;
      anchorY = startTop;
      widthToPointer = pointerX - anchorX;
      heightToPointer = pointerY - anchorY;
      maxWidth = session.frameWidth - anchorX;
      maxHeight = session.frameHeight - anchorY;
      break;
  }

  const maxAllowedWidth = Math.max(1, Math.min(maxWidth, maxHeight * targetRatio));
  const lowerBound = Math.min(minWidth, maxAllowedWidth);
  const baseWidth = Math.max(widthToPointer, heightToPointer * targetRatio, lowerBound);
  const width = clamp(baseWidth, lowerBound, maxAllowedWidth);
  const height = width / targetRatio;

  let left = anchorX;
  let top = anchorY;

  if (session.handle?.includes("w")) {
    left = anchorX - width;
  }
  if (session.handle?.includes("n")) {
    top = anchorY - height;
  }

  return normalizeCropSelection(left, top, width, height, session.frameWidth, session.frameHeight);
}

function normalizeCropSelection(left, top, width, height, frameWidth, frameHeight) {
  const normalizedWidth = clamp(width / frameWidth, 0.02, 1);
  const normalizedHeight = clamp(height / frameHeight, 0.02, 1);
  const normalizedLeft = clamp(left / frameWidth, 0, 1 - normalizedWidth);
  const normalizedTop = clamp(top / frameHeight, 0, 1 - normalizedHeight);

  return {
    x: normalizedLeft,
    y: normalizedTop,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

function getMinimumCropWidth(frameWidth, frameHeight, targetRatio) {
  const minimumHeight = Math.max(48, Math.min(120, frameHeight * 0.18));
  const minimumWidth = Math.max(72, minimumHeight * targetRatio);
  return Math.min(minimumWidth, frameWidth);
}

function getCropPixels() {
  if (!cropSelection || !cropImage?.naturalWidth || !cropImage?.naturalHeight) {
    return null;
  }

  let left = Math.round(cropSelection.x * cropImage.naturalWidth);
  let top = Math.round(cropSelection.y * cropImage.naturalHeight);
  let width = Math.round(cropSelection.width * cropImage.naturalWidth);
  let height = Math.round(cropSelection.height * cropImage.naturalHeight);

  width = clamp(Math.max(width, 1), 1, cropImage.naturalWidth);
  height = clamp(Math.max(height, 1), 1, cropImage.naturalHeight);
  left = clamp(left, 0, cropImage.naturalWidth - width);
  top = clamp(top, 0, cropImage.naturalHeight - height);

  return { left, top, width, height };
}

function isFullCropSelection() {
  if (!cropSelection) {
    return false;
  }

  return cropSelection.x === 0
    && cropSelection.y === 0
    && cropSelection.width === 1
    && cropSelection.height === 1;
}

async function buildUploadFile(file) {
  const cropPixels = getCropPixels();
  if (!cropPixels) {
    return file;
  }

  const canvas = document.createElement("canvas");
  const targetRatio = getTargetCropRatio();
  const cropRatio = cropPixels.width / cropPixels.height;

  if (isFullCropSelection() && Number.isFinite(targetRatio) && targetRatio > 0) {
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

  context.drawImage(
    cropImage,
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

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, 0.95);
  });
}

function getPreferredUploadType(fileType) {
  return ["image/png", "image/jpeg", "image/webp"].includes(fileType) ? fileType : "image/png";
}

function buildCroppedFilename(filename, mimeType) {
  const extension = mimeType === "image/jpeg"
    ? ".jpg"
    : mimeType === "image/webp"
      ? ".webp"
      : ".png";
  const baseName = filename.replace(/\.[^.]+$/, "") || "upload";
  return `${baseName}-crop${extension}`;
}

async function convertImageLocally({ file, originalName, ratio, precision }) {
  const preset = getPreset(ratio, precision);
  const pyodide = await ensurePythonRuntime();
  await nextFrame();
  setStatus("파이썬 처리 중", `${preset.width} x ${preset.height} 도안을 같은 로직으로 변환하는 중입니다.`, 32);
  const mapped = await convertWithPythonRuntime(pyodide, {
    file,
    originalName,
    ratio,
    precision,
    preset,
  });

  return {
    job_id: `local-${Date.now()}`,
    filename: originalName,
    ratio,
    precision,
    status: "completed",
    progress: 100,
    message: "브라우저에서 도트 도안 생성을 완료했습니다.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    width: preset.width,
    height: preset.height,
    used_colors: mapped.used_colors,
    grid_codes: mapped.grid_codes,
  };
}

async function ensurePythonRuntime() {
  if (pyodideReadyPromise) {
    return pyodideReadyPromise;
  }

  pyodideReadyPromise = (async () => {
    if (typeof globalThis.loadPyodide !== "function") {
      throw new Error("Pyodide 런타임을 불러오지 못했습니다.");
    }

    setStatus("런타임 준비 중", "Python 엔진을 불러오는 중입니다.", 6);
    const pyodide = await globalThis.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    setStatus("런타임 준비 중", "Pillow 패키지를 불러오는 중입니다.", 12);
    await pyodide.loadPackage("pillow");
    await syncPythonModules(pyodide);
    pyodide.runPython("from converter import convert_dot_snapshot");
    return pyodide;
  })();

  return pyodideReadyPromise;
}

async function convertWithPythonRuntime(pyodide, { file, originalName, ratio, precision, preset }) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeName = buildPythonSafeFilename(file.name || originalName || "upload.png");
  const inputPath = `/tmp/${Date.now()}-${safeName}`;
  pyodide.FS.writeFile(inputPath, bytes);

  try {
    const payload = JSON.stringify({
      path: inputPath,
      filename: originalName,
      ratio,
      precision,
    });

    pyodide.globals.set("conversion_payload_json", payload);
    const resultJson = await pyodide.runPythonAsync("convert_dot_snapshot(conversion_payload_json)");
    pyodide.globals.delete("conversion_payload_json");
    await nextFrame();
    setStatus("정리 중", "파이썬 변환 결과를 화면에 적용하는 중입니다.", 90);
    return JSON.parse(resultJson);
  } finally {
    try {
      pyodide.FS.unlink(inputPath);
    } catch {
    }
  }
}

function buildPythonSafeFilename(filename) {
  return filename.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function syncPythonModules(pyodide) {
  const workspaceDir = "/workspace";
  try {
    pyodide.FS.mkdir(workspaceDir);
  } catch {
  }

  for (const moduleFile of PYTHON_MODULE_FILES) {
    const moduleUrl = new URL(`${PYTHON_MODULE_DIR}/${moduleFile}`, import.meta.url);
    const response = await fetch(moduleUrl);
    if (!response.ok) {
      throw new Error(`Python 모듈을 불러오지 못했습니다: ${moduleFile}`);
    }
    const source = await response.text();
    pyodide.FS.writeFile(`${workspaceDir}/${moduleFile}`, source);
  }

  pyodide.runPython(`
import sys
if "/workspace" not in sys.path:
    sys.path.insert(0, "/workspace")
`);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function saveCurrentConversion() {
  if (!isPortableSnapshot(currentResultSnapshot)) {
    return;
  }

  const filename = buildSavedFilename(currentResultSnapshot);
  const payload = {
    type: "duduta-dot-save",
    version: 2,
    exported_at: new Date().toISOString(),
    snapshot: buildPortableSnapshot(currentResultSnapshot),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerFileDownload(blob, filename);
}

function handleSavedFileSelection(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (savedStatus) {
    savedStatus.hidden = true;
    savedStatus.textContent = "";
  }

  void loadSavedFile(file);
}

async function loadSavedFile(file) {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const snapshot = extractPortableSnapshot(payload);
    if (!isPortableSnapshot(snapshot)) {
      throw new Error("지원하지 않는 저장 파일 형식입니다.");
    }
    applyImportedConversion(snapshot, file.name);
  } catch (error) {
    if (savedStatus) {
      savedStatus.hidden = true;
      savedStatus.textContent = "";
    }
    if (savedFileInput) {
      savedFileInput.value = "";
    }
    window.alert("잘못된 파일형식입니다.");
  }
}

function buildSavedFilename(snapshot) {
  const baseName = (snapshot.filename || "duduta-dot").replace(/\.[^.]+$/, "") || "duduta-dot";
  return `${baseName}-${snapshot.ratio}-p${snapshot.precision}.dudot.json`;
}

function buildPortableSnapshot(snapshot, options = {}) {
  const { preserveExistingUiState = false } = options;
  return {
    job_id: snapshot.job_id || `local-${Date.now()}`,
    filename: snapshot.filename || "saved-dot-guide",
    ratio: snapshot.ratio,
    precision: snapshot.precision,
    status: "completed",
    progress: 100,
    message: snapshot.message || "저장된 도안 파일",
    created_at: snapshot.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    width: snapshot.width,
    height: snapshot.height,
    used_colors: Array.isArray(snapshot.used_colors) ? snapshot.used_colors : [],
    grid_codes: Array.isArray(snapshot.grid_codes) ? snapshot.grid_codes : [],
    ui_state: preserveExistingUiState
      ? buildPortableUiState(snapshot.ui_state)
      : buildPortableUiState(),
  };
}

function buildPortableUiState(existingUiState) {
  if (existingUiState && typeof existingUiState === "object") {
    return {
      completed_cells: sanitizeCompletedCells(existingUiState.completed_cells),
      multi_select_enabled: Boolean(existingUiState.multi_select_enabled),
      active_color_code: typeof existingUiState.active_color_code === "string" ? existingUiState.active_color_code : null,
      active_color_codes: Array.isArray(existingUiState.active_color_codes)
        ? existingUiState.active_color_codes.filter((code) => typeof code === "string")
        : [],
      remembered_multi_color_codes: Array.isArray(existingUiState.remembered_multi_color_codes)
        ? existingUiState.remembered_multi_color_codes.filter((code) => typeof code === "string")
        : [],
    };
  }

  return {
    completed_cells: [...viewerState.completedCells],
    multi_select_enabled: paletteState.multiSelectEnabled,
    active_color_code: viewerState.activeColorCode,
    active_color_codes: [...getActivePaletteCodes()],
    remembered_multi_color_codes: [...paletteState.rememberedMultiColorCodes],
  };
}

function sanitizeCompletedCells(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter((entry) => typeof entry === "string" && /^\d+:\d+$/.test(entry));
}

function extractPortableSnapshot(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.type === "duduta-dot-save" && payload.snapshot) {
    return payload.snapshot;
  }

  if (payload.job && payload.job.grid_codes) {
    return payload.job;
  }

  return payload.grid_codes ? payload : null;
}

function isPortableSnapshot(snapshot) {
  return Boolean(
    snapshot
      && Array.isArray(snapshot.grid_codes)
      && snapshot.grid_codes.length > 0
      && Array.isArray(snapshot.used_colors),
  );
}

function applyImportedConversion(snapshot, sourceName) {
  if (!isPortableSnapshot(snapshot)) {
    return;
  }

  stopTracking();
  currentResultSnapshot = buildPortableSnapshot(snapshot, { preserveExistingUiState: true });
  submitButton.disabled = false;
  setStatus("저장본 불러옴", `"${sourceName}" 파일을 불러왔습니다.`, 100);
  renderCompleted(currentResultSnapshot);
  restoreImportedUiState(currentResultSnapshot.ui_state);
  updateSaveButtonState(true);
  if (savedStatus) {
    savedStatus.hidden = true;
    savedStatus.textContent = "";
  }
}

function restoreImportedUiState(uiState) {
  if (!uiState || typeof uiState !== "object") {
    return;
  }

  const validCodes = new Set(viewerState.paletteByCode.keys());
  const activeCodes = Array.isArray(uiState.active_color_codes)
    ? uiState.active_color_codes.filter((code) => validCodes.has(code))
    : [];
  const rememberedCodes = Array.isArray(uiState.remembered_multi_color_codes)
    ? uiState.remembered_multi_color_codes.filter((code) => validCodes.has(code))
    : [];
  const activeCode = typeof uiState.active_color_code === "string" && validCodes.has(uiState.active_color_code)
    ? uiState.active_color_code
    : activeCodes[activeCodes.length - 1] || null;

  viewerState.completedCells = new Set(
    sanitizeCompletedCells(uiState.completed_cells).filter((entry) => {
      const [rowText, columnText] = entry.split(":");
      const row = Number(rowText);
      const column = Number(columnText);
      return row >= 0
        && column >= 0
        && row < viewerState.rows
        && column < viewerState.columns;
    }),
  );
  paletteState.multiSelectEnabled = Boolean(uiState.multi_select_enabled);
  viewerState.activeColorCodes = activeCodes;
  viewerState.activeColorCode = activeCode;
  paletteState.rememberedMultiColorCodes = rememberedCodes;

  if (viewerState.activeColorCode) {
    paletteState.activeGroup = getPaletteGroupNameByCode(viewerState.activeColorCode);
  }

  ensurePalettePageForActiveGroup();
  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();
  drawGuideCanvas();
  updateViewerNote();
  updateViewerDetail();
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleSnapshot(snapshot) {
  setStatus(formatStatus(snapshot.status), snapshot.message, snapshot.progress);
  if (snapshot.status === "completed") {
    currentResultSnapshot = snapshot;
    updateSaveButtonState(true);
    renderCompleted(snapshot);
    finishTracking();
    return;
  }

  if (snapshot.status === "failed") {
    renderError(snapshot.error || snapshot.message || "변환에 실패했습니다.");
    finishTracking();
  }
}

function startPolling(jobId) {
  void jobId;
}

function stopPolling() {
}

function stopTracking() {
  stopPolling();
}

function finishTracking() {
  stopPolling();
  submitButton.disabled = false;
}

function setStatus(label, message, progress) {
  if (statusPill) {
    statusPill.textContent = label;
    statusPill.title = message;
  }
  if (progressBar) {
    progressBar.style.width = `${Math.max(0, Math.min(progress || 0, 100))}%`;
  }
}

function renderCompleted(snapshot) {
  if (!Array.isArray(snapshot.grid_codes) || snapshot.grid_codes.length === 0 || !Array.isArray(snapshot.grid_codes[0])) {
    renderError("도안 칸 데이터를 불러오지 못했습니다.");
    return;
  }

  renderPalette(snapshot.used_colors || []);
  loadGuideGrid(snapshot.grid_codes, snapshot.used_colors || []);
  scheduleGuideViewportFit();
}

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

function renderError(message) {
  if (statusPill) {
    statusPill.textContent = "실패";
    statusPill.title = message;
  }
  prepareGuideViewer(message);
  renderPalette([]);
}

function resetResultArea(message = "도안 생성 후 여기서 바로 확대하고 이동할 수 있습니다.") {
  prepareGuideViewer(message);
  renderPalette([]);
}

function prepareGuideViewer(message) {
  setGuideMessage(message);
  guideEmpty.hidden = false;
  guideViewport?.classList.remove("is-ready", "is-dragging");
  setGuideControlsEnabled(false);
  currentResultSnapshot = null;
  viewerState.gridCodes = [];
  viewerState.paletteByCode = new Map();
  viewerState.columns = 0;
  viewerState.rows = 0;
  viewerState.fitScale = 1;
  viewerState.scale = 1;
  viewerState.minScale = 1;
  viewerState.maxScale = 1;
  viewerState.panX = 0;
  viewerState.panY = 0;
  viewerState.hoverColumn = null;
  viewerState.hoverRow = null;
  viewerState.activeColorCode = null;
  viewerState.activeColorCodes = [];
  viewerState.completedCells = new Set();
  guideInteraction = null;
  clearGuideCanvas();
  updateSaveButtonState(false);
}

function setGuideMessage(message) {
  viewerNote.textContent = message;
  guideEmptyText.textContent = message;
}

function setGuideControlsEnabled(enabled) {
  zoomOutButton.disabled = !enabled;
  zoomResetButton.disabled = !enabled;
  zoomInButton.disabled = !enabled;
}

function updateSaveButtonState(enabled) {
  if (!saveCurrentButton) {
    return;
  }
  saveCurrentButton.disabled = !enabled;
  saveCurrentButton.textContent = "저장";
}

function loadGuideGrid(gridCodes, usedColors) {
  viewerState.gridCodes = gridCodes;
  viewerState.rows = gridCodes.length;
  viewerState.columns = gridCodes[0]?.length ?? 0;
  viewerState.paletteByCode = new Map(usedColors.map((item) => [item.code, item]));
  viewerState.completedCells = new Set();
  syncActivePaletteSelection(new Set(viewerState.paletteByCode.keys()));
  viewerState.hoverColumn = null;
  viewerState.hoverRow = null;
  guideEmpty.hidden = true;
  guideViewport.classList.add("is-ready");
  setGuideControlsEnabled(true);
  fitGuideToViewport(true);
}

function clearGuideCanvas() {
  if (!guideContext) {
    return;
  }

  const size = resizeGuideCanvas();
  if (!size) {
    return;
  }

  guideContext.clearRect(0, 0, size.width, size.height);
}

function resizeGuideCanvas() {
  if (!guideCanvas || !guideContext || !guideViewport) {
    return null;
  }

  const rect = guideViewport.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;
  const scaledWidth = Math.max(1, Math.floor(width * dpr));
  const scaledHeight = Math.max(1, Math.floor(height * dpr));

  if (guideCanvas.width !== scaledWidth || guideCanvas.height !== scaledHeight) {
    guideCanvas.width = scaledWidth;
    guideCanvas.height = scaledHeight;
    guideCanvas.style.width = `${width}px`;
    guideCanvas.style.height = `${height}px`;
  }

  guideContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function handleGuideWheel(event) {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  event.preventDefault();
  const rect = guideViewport.getBoundingClientRect();
  const originX = event.clientX - rect.left;
  const originY = event.clientY - rect.top;
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomGuide(factor, originX, originY);
}

function handleGuidePointerDown(event) {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }
  if (event.pointerType !== "touch" && event.button !== 0) {
    return;
  }

  guideInteraction = {
    pointerId: event.pointerId,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startPanX: viewerState.panX,
    startPanY: viewerState.panY,
    didDrag: false,
  };

  guideViewport.classList.add("is-dragging");
  guideViewport.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleGuidePointerMove(event) {
  if (!guideInteraction || event.pointerId !== guideInteraction.pointerId) {
    return;
  }

  const deltaX = event.clientX - guideInteraction.startPointerX;
  const deltaY = event.clientY - guideInteraction.startPointerY;

  if (!guideInteraction.didDrag && Math.hypot(deltaX, deltaY) > 6) {
    guideInteraction.didDrag = true;
  }

  if (guideInteraction.didDrag) {
    viewerState.panX = guideInteraction.startPanX + deltaX;
    viewerState.panY = guideInteraction.startPanY + deltaY;
    clampGuidePan();
  }

  updateHoveredCellFromClientPoint(event.clientX, event.clientY);
  drawGuideCanvas();
  updateViewerNote();
  event.preventDefault();
}

function handleGuidePointerEnd(event) {
  if (!guideInteraction || event.pointerId !== guideInteraction.pointerId) {
    return;
  }

  const wasDrag = guideInteraction.didDrag;
  guideViewport.classList.remove("is-dragging");
  guideViewport.releasePointerCapture?.(event.pointerId);
  guideInteraction = null;

  if (event.type !== "pointercancel" && !wasDrag) {
    toggleCompletedCellFromClientPoint(event.clientX, event.clientY);
  }
}

function handleGuideHover(event) {
  if (!viewerState.rows || !viewerState.columns || guideInteraction) {
    return;
  }

  updateHoveredCellFromClientPoint(event.clientX, event.clientY);
}

function clearGuideHover() {
  if (viewerState.hoverColumn === null && viewerState.hoverRow === null) {
    return;
  }

  viewerState.hoverColumn = null;
  viewerState.hoverRow = null;
  updateViewerDetail();
  drawGuideCanvas();
}

function fitGuideToViewport(resetPan) {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const size = resizeGuideCanvas();
  if (!size) {
    return;
  }

  const padding = 28;
  const availableWidth = Math.max(120, size.width - (padding * 2));
  const availableHeight = Math.max(120, size.height - (padding * 2));
  const fitScale = Math.max(2, Math.min(availableWidth / viewerState.columns, availableHeight / viewerState.rows));

  viewerState.fitScale = fitScale;
  viewerState.minScale = Math.max(2, fitScale * 0.75);
  viewerState.maxScale = Math.max(96, fitScale * 18);
  viewerState.scale = resetPan ? fitScale : clamp(viewerState.scale, viewerState.minScale, viewerState.maxScale);

  if (resetPan) {
    viewerState.panX = (size.width - (viewerState.columns * viewerState.scale)) / 2;
    viewerState.panY = (size.height - (viewerState.rows * viewerState.scale)) / 2;
  }

  clampGuidePan();
  drawGuideCanvas();
  updateViewerNote();
  updateViewerDetail();
}

function scheduleGuideViewportFit() {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      fitGuideToViewport(true);
    });
  });
}

function zoomGuideAtViewportCenter(factor) {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const rect = guideViewport.getBoundingClientRect();
  zoomGuide(factor, rect.width / 2, rect.height / 2);
}

function zoomGuide(factor, originX, originY) {
  const currentScale = viewerState.scale;
  const nextScale = clamp(currentScale * factor, viewerState.minScale, viewerState.maxScale);
  if (Math.abs(nextScale - currentScale) < 0.001) {
    return;
  }

  const gridX = (originX - viewerState.panX) / currentScale;
  const gridY = (originY - viewerState.panY) / currentScale;

  viewerState.scale = nextScale;
  viewerState.panX = originX - (gridX * nextScale);
  viewerState.panY = originY - (gridY * nextScale);

  clampGuidePan();
  drawGuideCanvas();
  updateViewerNote();
  updateViewerDetail();
}

function clampGuidePan() {
  const size = resizeGuideCanvas();
  if (!size || !viewerState.rows || !viewerState.columns) {
    return;
  }

  const worldWidth = viewerState.columns * viewerState.scale;
  const worldHeight = viewerState.rows * viewerState.scale;

  if (worldWidth <= size.width) {
    viewerState.panX = (size.width - worldWidth) / 2;
  } else {
    viewerState.panX = clamp(viewerState.panX, size.width - worldWidth, 0);
  }

  if (worldHeight <= size.height) {
    viewerState.panY = (size.height - worldHeight) / 2;
  } else {
    viewerState.panY = clamp(viewerState.panY, size.height - worldHeight, 0);
  }
}

function drawGuideCanvas() {
  if (!guideContext) {
    return;
  }

  const size = resizeGuideCanvas();
  if (!size) {
    return;
  }

  guideContext.clearRect(0, 0, size.width, size.height);
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const cellSize = viewerState.scale;
  const activeColorCodes = getActivePaletteCodes();
  const selectedCodeSet = new Set(activeColorCodes);
  const activeColorCode = viewerState.activeColorCode || activeColorCodes[activeColorCodes.length - 1] || null;
  const isFiltering = selectedCodeSet.size > 0;
  const startColumn = Math.max(0, Math.floor(-viewerState.panX / cellSize) - 1);
  const endColumn = Math.min(viewerState.columns, Math.ceil((size.width - viewerState.panX) / cellSize) + 1);
  const startRow = Math.max(0, Math.floor(-viewerState.panY / cellSize) - 1);
  const endRow = Math.min(viewerState.rows, Math.ceil((size.height - viewerState.panY) / cellSize) + 1);

  for (let row = startRow; row < endRow; row += 1) {
    const y = viewerState.panY + (row * cellSize);
    const gridRow = viewerState.gridCodes[row];
    for (let column = startColumn; column < endColumn; column += 1) {
      const x = viewerState.panX + (column * cellSize);
      const code = gridRow[column];
      const color = viewerState.paletteByCode.get(code);
      const isCompleted = viewerState.completedCells.has(`${row}:${column}`);
      const isCurrentMatch = Boolean(activeColorCode) && code === activeColorCode;
      const isPreviousMatch = !isCurrentMatch && selectedCodeSet.has(code);
      const isMatch = !isFiltering || isCurrentMatch || isPreviousMatch;
      const baseFill = !isFiltering
        ? color?.hex_value || "#ffffff"
        : isCurrentMatch
          ? color?.hex_value || "#ffffff"
          : isPreviousMatch
            ? mixHexColors(color?.hex_value || "#ffffff", "#f8f0e7", 0.86)
            : "rgba(248,240,231,.82)";
      guideContext.fillStyle = isCompleted ? mixHexColors(baseFill, "#f8f0e7", 0.72) : baseFill;
      guideContext.fillRect(x, y, cellSize + 0.6, cellSize + 0.6);

      if (isMatch && cellSize >= 16) {
        guideContext.save();
        if (isCompleted) {
          guideContext.globalAlpha = 0.28;
        } else if (isPreviousMatch) {
          guideContext.globalAlpha = 0.24;
        }
        const fontSize = clamp(cellSize * (code.length >= 4 ? 0.34 : 0.46), 8, 28);
        const labelColor = getGuideLabelColor(color?.hex_value || "#ffffff");
        guideContext.font = `700 ${fontSize}px Consolas, "Courier New", monospace`;
        guideContext.textAlign = "center";
        guideContext.textBaseline = "middle";
        guideContext.lineWidth = Math.max(1, fontSize * 0.12);
        guideContext.strokeStyle = labelColor === "#2d241c" ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.85)";
        guideContext.fillStyle = labelColor;
        guideContext.strokeText(code, x + (cellSize / 2), y + (cellSize / 2));
        guideContext.fillText(code, x + (cellSize / 2), y + (cellSize / 2));
        guideContext.restore();
      }

      if (isCompleted && isCurrentMatch && cellSize >= 10) {
        guideContext.save();
        guideContext.strokeStyle = "rgba(86, 69, 55, .34)";
        guideContext.lineWidth = Math.max(1.5, cellSize * 0.08);
        guideContext.beginPath();
        guideContext.moveTo(x + (cellSize * 0.22), y + (cellSize * 0.54));
        guideContext.lineTo(x + (cellSize * 0.42), y + (cellSize * 0.72));
        guideContext.lineTo(x + (cellSize * 0.78), y + (cellSize * 0.3));
        guideContext.stroke();
        guideContext.restore();
      }
    }
  }

  drawGuideGridLines(startColumn, endColumn, startRow, endRow, cellSize, size.width, size.height);
  drawHoveredCell(cellSize);
}

function drawGuideGridLines(startColumn, endColumn, startRow, endRow, cellSize, viewportWidth, viewportHeight) {
  for (let column = startColumn; column <= endColumn; column += 1) {
    const x = viewerState.panX + (column * cellSize);
    guideContext.beginPath();
    guideContext.moveTo(x, Math.max(0, viewerState.panY + (startRow * cellSize)));
    guideContext.lineTo(x, Math.min(viewportHeight, viewerState.panY + (endRow * cellSize)));
    guideContext.lineWidth = column % 5 === 0 ? Math.max(1.5, cellSize * 0.08) : 1;
    guideContext.strokeStyle = column % 5 === 0 ? "rgba(91,71,54,.58)" : "rgba(122,100,83,.18)";
    guideContext.stroke();
  }

  for (let row = startRow; row <= endRow; row += 1) {
    const y = viewerState.panY + (row * cellSize);
    guideContext.beginPath();
    guideContext.moveTo(Math.max(0, viewerState.panX + (startColumn * cellSize)), y);
    guideContext.lineTo(Math.min(viewportWidth, viewerState.panX + (endColumn * cellSize)), y);
    guideContext.lineWidth = row % 5 === 0 ? Math.max(1.5, cellSize * 0.08) : 1;
    guideContext.strokeStyle = row % 5 === 0 ? "rgba(91,71,54,.58)" : "rgba(122,100,83,.18)";
    guideContext.stroke();
  }
}

function drawHoveredCell(cellSize) {
  if (viewerState.hoverColumn === null || viewerState.hoverRow === null) {
    return;
  }

  const x = viewerState.panX + (viewerState.hoverColumn * cellSize);
  const y = viewerState.panY + (viewerState.hoverRow * cellSize);
  guideContext.save();
  guideContext.lineWidth = Math.max(2, cellSize * 0.12);
  guideContext.strokeStyle = "rgba(228,111,67,.95)";
  guideContext.strokeRect(x, y, cellSize, cellSize);
  guideContext.restore();
}

function getCellFromClientPoint(clientX, clientY) {
  if (!guideViewport || !viewerState.rows || !viewerState.columns) {
    return null;
  }

  const rect = guideViewport.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const column = Math.floor((localX - viewerState.panX) / viewerState.scale);
  const row = Math.floor((localY - viewerState.panY) / viewerState.scale);

  if (column < 0 || row < 0 || column >= viewerState.columns || row >= viewerState.rows) {
    return null;
  }

  return { column, row };
}

function toggleCompletedCellFromClientPoint(clientX, clientY) {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const activeColorCodes = getActivePaletteCodes();
  if (activeColorCodes.length === 0) {
    return;
  }

  const cell = getCellFromClientPoint(clientX, clientY);
  if (!cell) {
    return;
  }

  const code = viewerState.gridCodes[cell.row]?.[cell.column];
  if (!code || !activeColorCodes.includes(code)) {
    return;
  }

  const key = `${cell.row}:${cell.column}`;
  if (viewerState.completedCells.has(key)) {
    viewerState.completedCells.delete(key);
  } else {
    viewerState.completedCells.add(key);
  }

  drawGuideCanvas();
  updateViewerNote();
  updateViewerDetail();
}

function updateHoveredCellFromClientPoint(clientX, clientY) {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const cell = getCellFromClientPoint(clientX, clientY);
  if (!cell) {
    if (viewerState.hoverColumn !== null || viewerState.hoverRow !== null) {
      viewerState.hoverColumn = null;
      viewerState.hoverRow = null;
      updateViewerDetail();
      drawGuideCanvas();
    }
    return;
  }

  const { column, row } = cell;
  if (viewerState.hoverColumn === column && viewerState.hoverRow === row) {
    return;
  }

  viewerState.hoverColumn = column;
  viewerState.hoverRow = row;
  updateViewerDetail();
  drawGuideCanvas();
}

function updateViewerNote() {
  if (!viewerState.rows || !viewerState.columns) {
    return;
  }

  const activeColorCodes = getActivePaletteCodes();
  const activeColorProgress = getActiveColorProgressText();
  const spacer = "\u00A0\u00A0";
  if (activeColorCodes.length > 1 && viewerState.activeColorCode) {
    viewerNote.textContent = `마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.\n${activeColorCodes.length}색 표시 중${spacer}현재 ${viewerState.activeColorCode}${activeColorProgress}\n클릭해서 흐리게 체크할 수 있습니다.`;
    return;
  }

  if (viewerState.activeColorCode) {
    const color = viewerState.paletteByCode.get(viewerState.activeColorCode);
    viewerNote.textContent = `마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.\n현재 ${color?.code || viewerState.activeColorCode}${activeColorProgress}\n클릭해서 흐리게 체크할 수 있습니다.`;
    return;
  }

  viewerNote.textContent = "마우스 휠이나 버튼으로 확대하고, 드래그로 이동하세요.";
}

function updateViewerDetail() {
}

function getActiveColorProgressText() {
  const activeCode = viewerState.activeColorCode;
  if (!activeCode) {
    return "";
  }

  const totalCount = Number(viewerState.paletteByCode.get(activeCode)?.count || 0);
  const completedCount = countCompletedCellsForCode(activeCode);
  const remainingCount = Math.max(0, totalCount - completedCount);

  if (totalCount <= 0) {
    return "";
  }

  return `\u00A0\u00A0${totalCount}칸 중 ${remainingCount}칸 남음`;
}

function countCompletedCellsForCode(targetCode) {
  if (!targetCode || viewerState.completedCells.size === 0) {
    return 0;
  }

  let completedCount = 0;
  viewerState.completedCells.forEach((key) => {
    const [rowText, columnText] = key.split(":");
    const row = Number(rowText);
    const column = Number(columnText);
    if (viewerState.gridCodes[row]?.[column] === targetCode) {
      completedCount += 1;
    }
  });

  return completedCount;
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
    if (getActivePaletteCodes().length === 0 && paletteState.rememberedMultiColorCodes.length > 0) {
      const restoredCodes = paletteState.rememberedMultiColorCodes.filter((code) => viewerState.paletteByCode.has(code));
      viewerState.activeColorCodes = [...restoredCodes];
      viewerState.activeColorCode = restoredCodes[restoredCodes.length - 1] || null;
    }
  }

  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
}

function resetPaletteFilter() {
  if (getActivePaletteCodes().length > 0) {
    paletteState.rememberedMultiColorCodes = [...getActivePaletteCodes()];
  }
  paletteState.multiSelectEnabled = false;
  viewerState.activeColorCodes = [];
  viewerState.activeColorCode = null;

  renderPaletteGroups();
  renderPaletteDetails();
  updatePaletteFilterUi();

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
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

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
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
    paletteMultiToggleButton.title = paletteState.multiSelectEnabled
      ? "여러 상세 색을 함께 표시 중입니다."
      : "한 번에 한 상세 색만 표시합니다.";
  }

  if (paletteResetButton) {
    paletteResetButton.hidden = activeCodeSet.size === 0;
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
  if (!viewerState.rows || !viewerState.columns) {
    paletteFilterNote.textContent = "도안을 생성하면 사용 색상 기준으로 자동 정리됩니다.";
    return;
  }
  paletteFilterNote.textContent = "";
}

function buildPaletteGroups(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!map.has(item.group)) {
      map.set(item.group, {
        name: item.group,
        items: [],
        totalCount: 0,
        mainColor: GROUP_MAIN_COLORS[item.group] || item.hex_value,
      });
    }
    const group = map.get(item.group);
    group.items.push(item);
    group.totalCount += Number(item.count || 0);
  });

  map.forEach((group) => {
    group.items.sort((left, right) => getPaletteCodeOrder(left.code) - getPaletteCodeOrder(right.code));
  });

  return [...map.values()].sort(
    (left, right) => GROUP_DISPLAY_ORDER.indexOf(left.name) - GROUP_DISPLAY_ORDER.indexOf(right.name),
  );
}

function getPaletteCodeOrder(code) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(code || "");
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, prefix, numberPart] = match;
  const groupName = getPaletteGroupNameFromCodePrefix(prefix);
  const groupIndex = GROUP_DISPLAY_ORDER.indexOf(groupName);
  return (Math.max(groupIndex, 0) * 100) + Number(numberPart);
}

function getPaletteGroupNameFromCodePrefix(prefix) {
  const prefixMap = {
    B: "Black",
    Re: "Red",
    Or: "Orange",
    Am: "Amber",
    Ye: "Yellow",
    Pi: "Pistachio",
    Gr: "Green",
    Aq: "Aqua",
    Bl: "Blue",
    In: "Indigo",
    Pu: "Purple",
    Ma: "Magenta",
    P: "Pink",
  };

  return prefixMap[prefix] || "";
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

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
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

  if (viewerState.rows && viewerState.columns) {
    drawGuideCanvas();
    updateViewerNote();
    updateViewerDetail();
  }
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
    button.dataset.code = item.code;
    button.title = `${item.code} ${item.group} ${item.count}칸`;
    button.style.setProperty("--swatch", item.hex_value);
    button.innerHTML = `
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

function handleWindowResize() {
  const nextViewportLayoutMode = getViewportLayoutMode();
  const layoutModeChanged = nextViewportLayoutMode !== lastViewportLayoutMode;
  lastViewportLayoutMode = nextViewportLayoutMode;

  if (cropSelection) {
    renderCropSelection();
  }
  if (viewerState.rows && viewerState.columns) {
    if (layoutModeChanged) {
      fitGuideToViewport(true);
      if (nextViewportLayoutMode === "desktop") {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          viewerShell?.scrollIntoView({ block: "start" });
        });
      }
      return;
    }
    fitGuideToViewport(false);
  } else {
    clearGuideCanvas();
  }
}

function getViewportLayoutMode() {
  return window.innerWidth <= 1180 ? "stacked" : "desktop";
}

function renderSelectedFile() {
}

function getTargetCropRatio() {
  const [width, height] = ratioInput.value.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

function preventDefault(event) {
  event.preventDefault();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatStatus(status) {
  if (status === "queued") return "대기 중";
  if (status === "processing") return "변환 중";
  if (status === "completed") return "완료";
  if (status === "failed") return "실패";
  return status;
}
