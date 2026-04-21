# 멀티스케치북 모드 — 컨텍스트 & 핵심 의사결정

**Last Updated: 2026-04-21**

---

## 1. 확정된 제품 결정사항 (사용자 합의)

| 항목 | 결정 |
|------|------|
| 모드 이름 | **멀티스케치북** (`MULTI_SKETCHBOOK`, 문자열 값 `"multi_sketchbook"`) |
| 입력 이미지 | 1장 |
| 분할 수 N | 짝수 **2, 4, 6, 8, 10**만 |
| 비율 선택 | 기존 `CANVAS_PRESETS`(16:9, 4:3, 1:1, 3:4, 9:16) 재사용 |
| 정밀도 | 1~4 (기존 SKETCHBOOK과 동일) |
| 비율·정밀도 해석 | **각 조각 기준**. 조각 하나하나가 선택한 크기의 독립 도안이 됨 |
| 배치 | N=4는 2×2 고정 + 드롭다운 disabled. N=2/6/8/10은 2가지 선택지 중 사용자 선택 |
| 배치 표기 | `rows × cols` (예: `2×3` = 2행 3열) |
| 크롭 박스 비율 | 자동 = `(cols × piece_w) : (rows × piece_h)` |
| "전체선택" 버튼 | 위 비율로 원본 이미지에 자동 스냅 (기존 `createFullCropSelection` 동작 재활용) |
| 크롭 박스 내부 | **분할선 오버레이 실시간 표시** (드래그/리사이즈 중에도 유지) |
| 결과 | **독립 도안 N개**. BOOK처럼 병합 X |
| 조각 전환 | viewer-shell 상단에 **N+1개 탭** (`1 · 2 · … · N · 전체`) |
| "전체" 탭 | 선택한 배치대로 조각을 타일처럼 이어붙인 **모자이크 프리뷰**. 타일 클릭 시 해당 조각 탭으로 점프. 기본 활성 탭. |
| 저장 | **번들 1개 + 개별 N개 = 총 N+1개 파일** 다운로드. 번들은 MULTI 전용 포맷, 개별은 표준 스케치북 포맷. |
| 불러오기 | **번들 파일** 업로드 → MULTI 모드로 복원. **개별 조각 파일** 업로드 → SKETCHBOOK 모드로 열림. |
| 에러 시 | **전체 롤백**. 부분 보존/재시도 없음. |

### 배치 선택지 테이블 (확정)

| N | 선택지 | N=4 락 여부 |
|---|-------|-----------|
| 2 | 1×2, 2×1 | — |
| 4 | 2×2 | ✅ disabled |
| 6 | 2×3, 3×2 | — |
| 8 | 2×4, 4×2 | — |
| 10 | 2×5, 5×2 | — |

---

## 2. 핵심 파일 & 역할

### 2.1 수정 대상 (확장)

| 파일 | 변경 성격 |
|------|----------|
| `config/app-constants.js` | `APP_MODES.MULTI_SKETCHBOOK` 추가, `MULTI_SPLIT_OPTIONS`/`MULTI_LAYOUTS` 상수 |
| `application/crop-ratio-controller.js` | `getTargetCropRatio`에 MULTI 분기 추가 |
| `application/mode-workspace-controller.js` | 모드 분기(`applyModeUi`, `setActiveMode`) 확장 + `renderEmptyMultiWorkspace` 헬퍼 |
| `application/submission-controller.js` | MULTI 분기: N번 `convertImageLocally` 순차 호출 |
| `application/conversion-session-controller.js` | `handleSnapshot`에 MULTI 분기, `pendingConversionContext`에 `pieceIndex` 추가 |
| `application/result-view-controller.js` | MULTI 완료 시 조각 탭 바 + 1번 조각 기본 로드 |
| `application/mode-snapshot.js` | MULTI 전용 조각별 UI state 캡처·복원 |
| `application/saved-file-controller.js` | MULTI 번들(`canvas_mode === "multi_sketchbook"`) 분기 추가: 모드 전환 + `currentMultiSnapshot` 복원 + 조각 탭 재렌더. 개별 조각 파일은 기존 경로 그대로. |
| `application/state.js` | `createDefaultModeUiState`에 `pieces[]`, `activePieceIndex` 필드 |
| `application/viewer-info-controller.js` | 조각 레이블 표시 |
| `application/main.js` | 신규 컨트롤러 바인딩, 이벤트 리스너 |
| `domain/snapshot/portable.js` | MULTI 번들 포맷 판별·추출 분기 추가. `isPortableSnapshot`/`extractPortableSnapshot`에 `canvas_mode === "multi_sketchbook"` 케이스. 기존 SKETCHBOOK/BOOK 로직은 그대로. |
| `infrastructure/browser/dom-elements.js` | 신규 DOM 쿼리 |
| `index.html` | 모드 탭, 입력칸(2곳), 분할 오버레이 레이어, 조각 탭 바, 캐시 버스터 |
| `styles/main.css` | `@import "./multi.css"` |

### 2.2 신규 파일

| 파일 | 책임 |
|------|------|
| `application/multi-sketchbook-controller.js` | 분할 수/배치 입력 상태, 확대 모달 동기화, 조각 탭 클릭 핸들러, 전체 탭 토글 |
| `domain/multi/layout.js` | `getLayoutOptionsForCount(n)`, `computeOverallCropRatio(pieceRatio, layout)`, `computePieceRects(selection, layout)` — DOM 의존 없는 순수 로직 |
| `domain/multi/mosaic.js` | 전체 탭 모자이크 렌더러. `renderMosaicView({ pieces, layout, container, onTileClick })` |
| `domain/multi/filename.js` | `buildMultiPieceFilename(baseName, totalCount, pieceIndex1Based)`, `buildMultiBundleFilename(baseName, rows, cols)`, `stripExtension(name)` |
| `domain/multi/bundle.js` | `buildMultiBundleSnapshot(multiSnapshot)` — 인메모리 → 디스크 번들 포맷 변환 |
| `domain/crop/multi-overlays.js` | 크롭 박스 내부에 N분할 격자선을 렌더링 |
| `styles/multi.css` | 분할 오버레이, 조각 탭 바(N+1), 모자이크 타일, 분할 수 입력, 배치 드롭다운 스타일 |

---

## 3. 아키텍처 의사결정

### 3.1 BOOK 모드와의 코드 공유 수준
- **공유**: 크롭 박스·상단 모드 탭·Pyodide 런타임·팔레트 로직.
- **분리**: MULTI는 `book_applied_segments`/`book_segment_crops` 필드를 **사용하지 않음**.
  - **개별 조각 파일**은 `canvas_mode: "sketchbook"`으로 저장되어 기존 SKETCHBOOK 경로로 로딩.
  - **번들 파일**은 `canvas_mode: "multi_sketchbook"`으로 저장되어 `portable.js`의 MULTI 분기를 타고 MULTI 모드로 복원.
  - `buildPortableSnapshot`은 SKETCHBOOK/BOOK 케이스는 그대로 유지, MULTI 번들용 별도 헬퍼(`buildMultiBundleSnapshot`)는 `domain/multi/bundle.js`에 분리.
- **레퍼런스만**: `domain/crop/book-overlays.js`의 view-loop + metrics 계산 패턴을 `multi-overlays.js`에서 참고만 하고, DOM은 별도 레이어(`multi-split-overlay-layer`) 사용.

### 3.2 조각별 상태 격리
- `modeUiStates[MULTI_SKETCHBOOK].state` 안에 `pieces: [<perPieceState>, ...]`와 `activePieceIndex`(숫자 = 해당 조각 탭 / `null` = 전체 탭)를 둔다.
- 탭 전환 시퀀스 (조각→조각): **flush(현재 조각) → read(`pieces[next]`) → apply → `activePieceIndex = next`**.
- 탭 전환 시퀀스 (조각→전체): **flush(현재 조각) → renderMosaicView → `activePieceIndex = null`**.
- 탭 전환 시퀀스 (전체→조각): **read(`pieces[next]`) → apply → `activePieceIndex = next`**.
- 기존 `captureCurrentModeUiState`/`restoreModeUiStateForSnapshot`에 MULTI 분기만 추가하고, 다른 조각 데이터는 건드리지 않는다.

### 3.3 변환 순차 vs 병렬
- **순차 고정**. Pyodide는 단일 Python 인터프리터에서 동기 실행되며, 현재 구조는 파일 하나를 올려 변환한다. N번 await 루프로 처리.
- 진행률 표시: `n/N` 기준. 각 조각 완료 시 status pill 업데이트.

### 3.4 크롭 박스 비율 강제
- 기존 크롭 박스는 `getTargetCropRatio()`가 강제한다. MULTI에서도 동일하게 유지하되 비율값만 `(cols × pw):(rows × ph)`로 교체한다.
- "전체선택" 버튼은 `createFullCropSelection`을 그대로 쓰고, submission 단계에서 `isFullCropSelection`이 true면 `buildUploadFile`가 자동으로 타겟 비율에 맞춰 이미지를 잘라낸다(기존 로직 `submission-controller.js:142-149`).

### 3.5 조각 Rect 좌표계
- `computePieceRects`는 **크롭 박스 내부 정규화 좌표 (0~1)가 아닌, 크롭 박스 영역 자체의 상대 좌표**로 N개 rect를 반환한다 (`{ u, v, w, h }` 형식, u+v+w+h 모두 0~1).
- `buildUploadFile`에서 이 상대 rect를 **크롭된 natural pixel 영역**에 매핑해 조각별 업로드 이미지를 생성한다.

### 3.6 snapshot 구조

**디스크 포맷은 2종**:

1. **번들 파일** (MULTI 복원 가능) — `{name}_multi_{rows}x{cols}_bundle.dudot.json`
   - `snapshot.canvas_mode = "multi_sketchbook"`
   - `snapshot.multi_layout = { rows, cols, count }`
   - `snapshot.multi_pieces = [ <piece snapshot>, ... ]` (각 조각은 스케치북 snapshot 모양)
   - `snapshot.active_piece_index = null | number`
   - `ui_state.pieces = [ <per-piece UI state>, ... ]` + `ui_state.activePieceIndex`

2. **개별 조각 파일** (SKETCHBOOK 호환) — `{name}_multi_{N}x{i}.dudot.json`
   - `snapshot.canvas_mode = "sketchbook"`
   - 일반 스케치북 snapshot과 100% 동일 구조

**인메모리 세션 포맷** (JS 변수):
```js
currentMultiSnapshot = {
  sessionId: "multi-1735000000",
  sourceFilename: "photo.jpg",
  layout: { rows: 2, cols: 2, count: 4 },
  pieceRatio: "16:9",
  piecePrecision: 4,
  pieces: [
    { grid_codes: [...], used_colors: [...], width: 150, height: 84, ratio: "16:9", precision: 4 },
    ...
  ],
  activePieceIndex: null, // null = 전체 탭, 0..N-1 = 조각 탭
}
```

각 조각 snapshot은 `result-view-controller`와 `loadGuideGrid`가 요구하는 스케치북 snapshot 모양을 그대로 만족한다 → 탭 전환 시 `setCurrentResultSnapshot(pieces[i])` 하면 기존 파이프라인이 그대로 작동.

**포맷 변환 흐름**:
- 저장 시: `currentMultiSnapshot` → `buildMultiBundleSnapshot` → 번들 디스크 포맷 + N개 개별 스케치북 포맷.
- 불러오기 시: 번들 디스크 포맷 → `extractPortableSnapshot`(MULTI 분기) → `currentMultiSnapshot` 재구성.

### 3.7 Python 모듈 불변
- `domain/conversion/*.py`는 수정 없음. 각 조각의 크롭된 이미지를 기존 단건 파이프라인에 태워 처리.
- `PYTHON_MODULE_VERSION` 갱신 불필요. CSS/JS 캐시 버스터만 업데이트.

---

## 4. 주요 Getter/Setter 의존성 흐름

```
main.js
  │
  ├─ cropRatioController
  │    getTargetCropRatio()  ← 신규 deps: getMultiLayout, getMultiPieceRatio
  │
  ├─ multiSketchbookController (NEW)
  │    상태: currentSplitCount, currentLayout
  │    노출: getActiveLayout, getActivePieceIndex, setActivePieceIndex,
  │          getCurrentMultiSnapshot, setCurrentMultiSnapshot,
  │          handleSplitCountChange, handleLayoutChange, handlePieceTabClick,
  │          refreshLayoutOptions
  │
  ├─ modeWorkspaceController
  │    setActiveMode  ← MULTI 분기 + renderEmptyMultiWorkspace
  │    applyModeUi     ← multi input 표시/숨김
  │
  ├─ submissionController
  │    startConversion  ← MULTI면 N번 loop, pieceIndex 주입
  │
  └─ conversionSessionController
       handleSnapshot  ← MULTI면 multi_pieces[pieceIndex]에 누적
       buildMultiSketchbookSnapshot (NEW internal)
```

---

## 5. 테스트 체크포인트

### 5.1 단위 수준 (수동 콘솔 또는 ad-hoc)
- `getLayoutOptionsForCount(4)` 길이 1 & `locked=true`.
- `getLayoutOptionsForCount(6)` 길이 2 (2×3, 3×2).
- `computeOverallCropRatio(16/9, {rows:2, cols:2})` === `16/9`.
- `computeOverallCropRatio(16/9, {rows:2, cols:3})` === `48/18` = `8/3`.
- `computePieceRects(fullSelection, {rows:2, cols:2})` 길이 4, 모든 조각 width/height `0.5`.

### 5.2 통합 (브라우저 수동)
1. 이미지 업로드 → 멀티스케치북 탭 클릭 → 분할 수 6 → 배치 2×3 선택 → 크롭 박스가 8:3으로 변형.
2. 전체선택 클릭 → 이미지 전체를 8:3으로 꽉 채움.
3. 크롭 박스 안에 세로선 2개 + 가로선 1개 표시 확인.
4. 도안 생성 시작 → 진행률 `1/6 … 6/6` 순차 표시 → 상단 탭 7개(`1·2·3·4·5·6·전체`) 등장 → **기본 "전체" 탭** 활성.
5. "전체" 탭에 6개 타일이 2×3 배치로 표시. 타일 1 클릭 → 탭 `1`로 점프 + 해당 조각 로드.
6. 탭 `1`에서 몇 개 셀 완료 체크 → 탭 `3`으로 이동 → 탭 `1`로 복귀 → 완료 상태 유지.
7. 저장 버튼 → **7개 파일** 순차 다운로드: 번들 `photo_multi_2x3_bundle.dudot.json` + 개별 6개 `photo_multi_6x1~6x6.dudot.json`.
8. 새로고침 후 **번들 파일** 업로드 → **MULTI 모드로 복원**, 조각 탭·완료 셀 그대로.
9. 개별 조각 파일 하나 업로드 → **스케치북 모드**에서 정상 로드 (재조합 없음, 의도된 동작).
10. 모드 전환 회귀: 스케치북 ↔ 멀티 ↔ 책 왕복해도 각 모드 세션 유지.

---

## 6. 작업 중 참고할 기존 코드 지점

| 패턴 | 참고 위치 |
|------|---------|
| 모드 탭 핸들러 | `application/mode-workspace-controller.js::handleModeTabClick` (line 123~129) |
| 모드 UI 토글 | `application/mode-workspace-controller.js::applyModeUi` (line 191~239) |
| 크롭 오버레이 렌더링 | `domain/crop/book-overlays.js::renderBookCropOverlaysOnView` (line 31~83) |
| 크롭 영역 픽셀 계산 | `domain/crop/selection.js::getCropPixelsForSelection` (line 260~277) |
| 변환 세션 진행 | `application/conversion-session-controller.js::handleSnapshot` (line 73~130) |
| 업로드 파일 생성 | `application/submission-controller.js::buildUploadFile` (line 128~188) |
| snapshot 포맷 정규화 | `application/conversion-session-controller.js::buildPortableSnapshot` (line 51~71) |
| 모드별 snapshot 분기 | `application/conversion-session-controller.js` 전반, `canvas_mode` 필드 기준 |

---

## 7. 확정된 UX 결정 (이전 미해결 질문)

| # | 질문 | 결정 |
|---|------|------|
| Q1 | 조각 탭 위치·구성 | viewer-shell **상단**, **N+1개 탭** (`1 · 2 · … · N · 전체`). "전체"는 기본 활성 탭. |
| Q1a | "전체" 탭 렌더링 | 선택한 배치(rows × cols)대로 N개 조각을 **모자이크 프리뷰**. 타일 클릭 시 해당 조각 탭으로 점프. 상호작용(팔레트/완료 체크) 없음. |
| Q2 | 저장 형식 | **번들 1개 + 개별 N개 = N+1개 파일**. 저장 버튼 1회 클릭 → N+1개 다운로드. 번들명 `{원본}_multi_{rows}x{cols}_bundle.dudot.json`, 개별명 `{원본}_multi_{N}x{i}.dudot.json`. |
| Q2a | 불러오기 | **번들 파일** → MULTI 모드 복원. **개별 조각 파일** → 스케치북 모드. 개별 N개를 묶어 MULTI로 재구성하는 기능은 out of scope. |
| Q3 | 변환 에러 처리 | **전체 롤백**. 지금까지 성공한 조각도 폐기. 부분 재시도 없음. |

## 8. 알려진 제약

- **Pyodide 단일 워커** → 조각 N개 순차 처리, 6조각 기준 ~30초 체감 예상.
- **크롭 박스 최소 크기**(`minDimension = 0.02`)가 N=10 + 세로 배치(5×2)에서 조각 하나가 너무 작아질 수 있음. 9:16 정밀도 1 × 10분할 5×2 → 각 조각 최종 픽셀이 최소 정밀도에서 유의미한지 검증 필요. 이번 스코프는 기능 제공까지만, UX 경고는 후속 작업.
- **브라우저 다중 다운로드 차단**: 저장 버튼이 N개 파일을 연속 다운로드할 때 브라우저가 "여러 파일 다운로드 허용" 프롬프트를 띄울 수 있음. 정상 동작이므로 사용자 안내로 해결.
