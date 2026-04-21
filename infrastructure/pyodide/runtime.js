/*
Module: pyodide runtime
Description: Browser-side Python runtime bootstrap and image conversion orchestration.
Domain: infrastructure/pyodide
Dependencies: ../../config/catalog.js, ../../config/app-constants.js
Usage:
  const { convertImageLocally } = createPyodideConverter({ setStatus });
*/

import { CANVAS_PRESETS } from "../../config/catalog.js";
import {
  PYODIDE_INDEX_URL,
  PYTHON_MODULE_DIR,
  PYTHON_MODULE_FILES,
  PYTHON_MODULE_VERSION,
} from "../../config/app-constants.js";

function createPyodideConverter({ setStatus }) {
  let pyodideReadyPromise = null;

  async function ensurePythonRuntime() {
    if (pyodideReadyPromise) {
      return pyodideReadyPromise;
    }

    pyodideReadyPromise = (async () => {
      if (typeof globalThis.loadPyodide !== "function") {
        throw new Error("Pyodide 엔진을 불러오지 못했습니다.");
      }

      setStatus("파이썬 준비 중", "브라우저용 Python 엔진을 불러오는 중입니다.", 6);
      const pyodide = await globalThis.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
      setStatus("파이썬 준비 중", "이미지 처리를 위한 Pillow를 불러오는 중입니다.", 12);
      await pyodide.loadPackage("pillow");
      await syncPythonModules(pyodide);
      pyodide.runPython("from converter import convert_dot_snapshot");
      return pyodide;
    })();

    return pyodideReadyPromise;
  }

  async function convertWithPythonRuntime(pyodide, {
    file,
    originalName,
    ratio,
    precision,
    canvasWidth,
    canvasHeight,
    tuning,
  }) {
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
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        saturation: tuning?.saturation ?? 1.0,
        contrast: tuning?.contrast ?? 1.0,
        brightness: tuning?.brightness ?? 1.0,
      });

      pyodide.globals.set("conversion_payload_json", payload);
      const resultJson = await pyodide.runPythonAsync("convert_dot_snapshot(conversion_payload_json)");
      pyodide.globals.delete("conversion_payload_json");
      await nextFrame();
      setStatus("정리 중", "도안 결과를 화면에 적용하는 중입니다.", 90);
      return JSON.parse(resultJson);
    } finally {
      try {
        pyodide.FS.unlink(inputPath);
      } catch {
      }
    }
  }

  async function convertImageLocally({
    file,
    originalName,
    ratio,
    precision,
    canvasWidth = null,
    canvasHeight = null,
    tuning = null,
  }) {
    const preset = getCanvasPreset(ratio, precision, canvasWidth, canvasHeight);
    const pyodide = await ensurePythonRuntime();
    await nextFrame();
    setStatus("로컬 변환 중", `${preset.width} x ${preset.height} 도안을 브라우저 안에서 생성하고 있습니다.`, 32);
    const mapped = await convertWithPythonRuntime(pyodide, {
      file,
      originalName,
      ratio,
      precision,
      canvasWidth: preset.width,
      canvasHeight: preset.height,
      tuning,
    });

    const timestamp = new Date().toISOString();
    return {
      job_id: `local-${Date.now()}`,
      filename: originalName,
      ratio,
      precision,
      status: "completed",
      progress: 100,
      message: "브라우저 안에서 도안 생성이 완료되었습니다.",
      created_at: timestamp,
      updated_at: timestamp,
      width: preset.width,
      height: preset.height,
      used_colors: mapped.used_colors,
      grid_codes: mapped.grid_codes,
    };
  }

  return {
    convertImageLocally,
  };
}

function getCanvasPreset(ratio, precision, canvasWidth = null, canvasHeight = null) {
  if (Number.isFinite(canvasWidth) && Number.isFinite(canvasHeight)) {
    return {
      ratio,
      precision,
      width: Number(canvasWidth),
      height: Number(canvasHeight),
    };
  }

  const ratioPresets = CANVAS_PRESETS[ratio];
  const size = ratioPresets?.[precision];
  if (!size) {
    throw new Error(`지원하지 않는 비율 또는 정밀도입니다: ${ratio} / ${precision}`);
  }

  return {
    ratio,
    precision,
    width: size[0],
    height: size[1],
  };
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
    const moduleUrl = new URL(`${PYTHON_MODULE_DIR}/${moduleFile}?v=${PYTHON_MODULE_VERSION}`, import.meta.url);
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

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export { createPyodideConverter };
