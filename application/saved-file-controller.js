/*
Module: saved file controller
Description: Saved snapshot file loading, validation, and application orchestration.
Domain: application
Dependencies: browser File API
Usage:
  const savedFileController = createSavedFileController({...});
  savedFileInput.addEventListener("change", savedFileController.handleSavedFileSelection);
*/

function createSavedFileController({
  APP_MODES,
  savedStatus,
  savedFileInput,
  extractPortableSnapshot,
  isPortableSnapshot,
  primeModeUiStateForSnapshot,
  extractSavedUiState,
  stopTracking,
  persistCurrentSnapshotByMode,
  persistCurrentModeUiState,
  buildPortableSnapshot,
  applyModeSnapshot,
  setStatus,
  setActiveModeValue,
}) {
  function handleSavedFileSelection(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    clearSavedStatus();
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
      primeModeUiStateForSnapshot(snapshot, extractSavedUiState(payload));
      applyImportedConversion(snapshot, file.name);
    } catch {
      clearSavedStatus();
      if (savedFileInput) {
        savedFileInput.value = "";
      }
      window.alert("잘못된 파일형식입니다.");
    }
  }

  function applyImportedConversion(snapshot, sourceName) {
    if (!isPortableSnapshot(snapshot)) {
      return;
    }

    stopTracking();
    persistCurrentSnapshotByMode();
    persistCurrentModeUiState();
    const portableSnapshot = buildPortableSnapshot(snapshot);
    setActiveModeValue(portableSnapshot.canvas_mode === APP_MODES.BOOK ? APP_MODES.BOOK : APP_MODES.SKETCHBOOK);
    applyModeSnapshot(portableSnapshot);
    setStatus("저장본 불러옴", `"${sourceName}" 파일을 불러왔습니다.`, 100);
    clearSavedStatus();
  }

  function clearSavedStatus() {
    if (savedStatus) {
      savedStatus.hidden = true;
      savedStatus.textContent = "";
    }
  }

  return {
    applyImportedConversion,
    handleSavedFileSelection,
  };
}

export { createSavedFileController };
