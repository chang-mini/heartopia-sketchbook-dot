# 멀티스케치북(MULTI_SKETCHBOOK) 모드 추가 — 구현 계획서

**Last Updated: 2026-04-21**

---

## 1. Executive Summary

기존 **SKETCHBOOK / BOOK** 2개 모드 옆에 **MULTI_SKETCHBOOK**(멀티스케치북) 모드를 추가한다. 사진 1장을 N(짝수)개 조각으로 분할해 각 조각을 **독립된 도안**으로 변환·출력하는 기능이다.

- **BOOK 모드**와의 핵심 차이: 결과를 하나의 그리드로 **병합하지 않음**. N개의 개별 도안이 각각 뷰어·저장·팔레트 진행도를 가진다.
- **SKETCHBOOK**의 비율/정밀도 UI를 그대로 재사용하되, **각 조각 기준**으로 적용된다. 전체 크롭 박스는 `(cols × piece_w) : (rows × piece_h)` 비율로 자동 계산된다.
- 크롭 박스 위에 **분할선 오버레이**가 실시간으로 표시되어 사용자가 어떻게 잘릴지 즉시 확인할 수 있다.

---

## 2. Current State Analysis

### 2.1 모드 구조
- `APP_MODES`는 `config/app-constants.js:15`에 `SKETCHBOOK`, `BOOK` 두 개만 정의.
- 모드 탭 UI는 `index.html:148-153`에 하드코딩 (`data-mode-tab` 속성).
- 모드 전환/상태 관리는 `application/mode-workspace-controller.js`의 `setActiveMode`, `applyModeUi`가 담당.

### 2.2 변환 파이프라인
- `application/submission-controller.js`의 `startConversion`이 단일 크롭을 만들어 `convertImageLocally` 호출 → snapshot 1개 수신.
- `application/conversion-session-controller.js::handleSnapshot`은 완료 시 `APP_MODES.BOOK`인 경우 기존 그리드에 `mergeBookSegmentIntoGrid`로 병합, 그 외는 단일 스케치북 snapshot으로 교체.
- Pyodide 런타임(`infrastructure/pyodide/runtime.js`)은 파일 하나를 받아 변환하는 단건 호출 구조. **루프로 N번 호출**하면 재사용 가능.

### 2.3 크롭 geometry
- `domain/crop/selection.js::createCropSelection`이 `getTargetCropRatio()`를 받아 크롭 박스 비율을 결정.
- `application/crop-ratio-controller.js`는 SKETCHBOOK(프리셋 비율)과 BOOK(세그먼트 width / usableHeight) 두 분기만 갖는다.
- 크롭 박스 내부는 `index.html`의 `.crop-guides` div로 기본 3등분 가이드라인만 그린다. **N분할 오버레이는 새로 만들어야** 한다.
- BOOK 모드의 세그먼트 오버레이(`domain/crop/book-overlays.js`)가 **크롭 박스 위에 그리는 구조의 레퍼런스**로 쓰기 좋다.

### 2.4 스냅샷/저장 포맷
- `snapshot.canvas_mode`가 `"sketchbook" | "book"`을 받는다 (`conversion-session-controller.js:66`).
- 저장 파일 `.dudot.json` 구조는 단일 `snapshot` 객체 + `ui_state`. **MULTI 모드는 `snapshot.multi_pieces: [snapshot1, snapshot2, ...]` 같은 배열이 필요**하고, `isPortableSnapshot`/`extractPortableSnapshot`(`domain/snapshot/portable.js`)도 확장해야 한다.

### 2.5 뷰어
- `result-view-controller.js`, `guide-canvas`는 snapshot 1개를 그려주는 구조. **조각 선택 탭 (1분면·2분면·…) UI가 새로 필요**하고, 선택된 조각 snapshot을 뷰어에 로드하는 전환 로직이 필요하다.

---

## 3. Proposed Future State

### 3.1 모드 동작 사양

| 항목 | SKETCHBOOK | BOOK | **MULTI_SKETCHBOOK (신규)** |
|------|-----------|------|------------------------------|
| 입력 이미지 수 | 1장 | 1장 (세그먼트별 반복) | **1장** |
| 비율·정밀도 | 사용자 선택 | 16:9 / 4 고정 | **사용자 선택 (조각 기준)** |
| 크롭 박스 비율 | 조각과 동일 | 세그먼트 폭 비율 | **`(cols × piece_w):(rows × piece_h)`** |
| 분할 오버레이 | 없음 | 세그먼트 가이드 | **N분할 격자선** |
| 결과 | 도안 1개 | 하나로 병합 | **독립 N개** |
| 저장 파일 | `snapshot` | `snapshot` (병합 그리드) | **`multi_pieces[]`** |

### 3.2 입력 UI (SKETCHBOOK 대비 추가분)
- **분할 수** number input (짝수 2/4/6/8/10만 허용, 기본 4)
- **배치** select dropdown (N=4는 `2×2` 고정 + `disabled`)
- 사이드바와 확대 모달 양쪽 모두 추가

### 3.3 배치 옵션 테이블

| N | 선택지 | 전체 크롭 박스 비율(16:9 기준) |
|---|-------|---------------------------|
| 2 | `1×2` / `2×1` | 32:9 / 8:9 |
| 4 | `2×2` (고정) | 16:9 |
| 6 | `2×3` / `3×2` | 8:3 / 32:27 |
| 8 | `2×4` / `4×2` | 32:9 / 8:9 |
| 10 | `2×5` / `5×2` | 40:9 / 32:45 |

`rows × cols` 표기 (예: `2×3` = 2행 3열).

### 3.4 변환 파이프라인
1. 사용자가 크롭 박스를 선택 → **N개 조각 rect** 계산 (`domain/multi/layout.js::computePieceRects`).
2. 각 조각별로 `buildUploadFile(file, pieceRect)` 생성 → **N번 `convertImageLocally` 호출**. 순차 실행 (Pyodide 단일 워커).
3. 각 호출 완료 시 `handleSnapshot` 루트가 `canvas_mode === "multi_sketchbook"` 분기로 들어가 `multiSnapshot.multi_pieces[i] = snapshot`으로 누적.
4. 모든 조각 완료 → `currentResultSnapshot` = `multiSnapshot`, 뷰어에 기본값(1번 조각) 로드.

### 3.5 뷰어 조각 전환 + "전체" 탭
- `viewer-shell` 상단(viewer head 아래)에 **조각 탭 바** 추가. **N+1개 버튼**: `1 / 2 / … / N / 전체`.
- 기본 선택: **"전체" 탭**. 변환 완료 즉시 전체 모자이크 뷰 표시.
- **조각 탭(1~N)** 클릭: 해당 조각 snapshot을 `loadGuideGrid`로 로드. 팔레트·완료 셀 등 상호작용 상태는 조각별로 분리.
- **"전체" 탭** 클릭: 선택한 배치(rows × cols)대로 N개 도안을 타일처럼 이어붙인 **모자이크 미리보기**를 guide-viewport에 렌더. 타일 클릭 시 해당 조각 탭으로 점프. 상호작용(팔레트/완료 체크)은 비활성 — 순수 프리뷰.
- `modeUiStates[MULTI_SKETCHBOOK].state`에 `pieces[]`(각 조각별 UI 상태)와 `activePieceIndex`(-1 또는 null = 전체 탭) 보관.

### 3.6 저장 포맷 — 번들 1개 + 개별 N개

MULTI 모드의 저장 버튼을 누르면 **총 N+1개 파일**이 다운로드된다:
- **번들 파일 1개**: MULTI 세션 전체(레이아웃 + 모든 조각 + 조각별 UI 상태)를 담아, 다시 MULTI 모드로 복원 가능.
- **개별 조각 파일 N개**: 각 조각을 표준 스케치북 스냅샷으로 분리 저장. SKETCHBOOK 모드에서 독립적으로 열림.

#### 파일명 템플릿
```
번들: {원본이름}_multi_{rows}x{cols}_bundle.dudot.json
개별: {원본이름}_multi_{N}x{pieceIndex}.dudot.json  (pieceIndex는 1-based)
```

예시 — `photo.jpg`를 16:9 정밀도 4, 2×2 배치(N=4)로 변환 후 저장 → 5개 파일 다운로드:
- `photo_multi_2x2_bundle.dudot.json` (번들)
- `photo_multi_4x1.dudot.json`
- `photo_multi_4x2.dudot.json`
- `photo_multi_4x3.dudot.json`
- `photo_multi_4x4.dudot.json`

#### 번들 파일 구조
```json
{
  "type": "duduta-dot-save",
  "version": 1,
  "snapshot": {
    "canvas_mode": "multi_sketchbook",
    "multi_layout": { "rows": 2, "cols": 2, "count": 4 },
    "multi_pieces": [
      { "grid_codes": [...], "used_colors": [...], "width": 150, "height": 84,
        "ratio": "16:9", "precision": 4, "filename": "photo_multi_4x1.png" },
      ... (조각 N개)
    ],
    "active_piece_index": null,
    "source_filename": "photo.jpg",
    "ratio": "16:9",
    "precision": 4,
    "created_at": "...",
    "updated_at": "..."
  },
  "ui_state": {
    "pieces": [
      { "activeColorCode": ..., "completedCells": [...], "palettePage": ..., ... },
      ...
    ],
    "activePieceIndex": null
  }
}
```

#### 개별 조각 파일 구조
```json
{
  "type": "duduta-dot-save",
  "version": 1,
  "snapshot": {
    "canvas_mode": "sketchbook",
    "grid_codes": [...],
    "used_colors": [...],
    "width": 150,
    "height": 84,
    "ratio": "16:9",
    "precision": 4,
    "filename": "photo_multi_4x1.png"
  },
  "ui_state": { ... (해당 조각만) ... }
}
```

#### 불러오기 분기
파일을 업로드하면 `snapshot.canvas_mode` 필드로 분기:
- `"multi_sketchbook"` + `multi_pieces` 존재 → **MULTI 모드로 전환**, `currentMultiSnapshot` 복원, 조각 탭 재렌더, `activePieceIndex`(저장 시점) 복원.
- `"sketchbook"` (또는 `"book"`) → 기존 경로.

#### 인메모리 상태
변환 세션 동안 `currentMultiSnapshot = { sessionId, sourceFilename, layout, pieces, activePieceIndex, pieceRatio, piecePrecision }`를 애플리케이션 메모리에 유지. 페이지 이탈 시 소실되나, **저장된 번들 파일로 언제든 복구 가능**.

---

## 4. Implementation Phases

### Phase A — 기반 데이터/상수 (S)
상수·타입·기본 레이아웃 테이블 정의. UI 변경 없음.

### Phase B — 크롭 geometry 확장 (M)
`getTargetCropRatio`가 MULTI 모드의 전체 비율을 반환하게 수정 + N분할 오버레이 렌더러 신설. 이 단계까지 마치면 모드가 없어도 레이아웃 계산 단위 테스트가 가능하다.

### Phase C — UI/DOM 추가 (M)
`index.html`에 모드 탭·입력칸·분할 오버레이 컨테이너·조각 탭 바 추가. CSS 신설.

### Phase D — 멀티 컨트롤러 + 모드 워크스페이스 통합 (L)
`multi-sketchbook-controller.js` 신설. `mode-workspace-controller.js`에 MULTI 분기 추가. 입력값 상태 관리, 배치 드롭다운 동적 갱신 로직 포함.

### Phase E — 변환 파이프라인 (L)
`submission-controller.js`에 MULTI 분기: N개 조각 순차 변환. `conversion-session-controller.js`에 `multi_sketchbook` 스냅샷 누적·완료 처리.

### Phase F — 뷰어 조각 전환 + 팔레트/완료 격리 (L)
조각 탭 UI 연결, `loadGuideGrid` 재호출, 조각별 `modeUiStates` 확장.

### Phase G — 저장/불러오기 (M)
`portable.js`와 `saved-file-controller.js`에서 `multi_pieces` 포맷 판별·추출·복원.

### Phase H — 다듬기 + 배포 (S)
캐시 버스터 업데이트, `PYTHON_MODULE_VERSION` 유지(파이썬은 수정 없음), 브라우저 실수동 테스트.

---

## 5. Detailed Tasks

각 태스크는 `multi-sketchbook-mode-tasks.md`에서 체크리스트로 추적한다.

### Phase A: 기반 데이터

1. **[S]** `config/app-constants.js`에 `APP_MODES.MULTI_SKETCHBOOK = "multi_sketchbook"` 추가.
2. **[S]** `config/app-constants.js`에 `MULTI_SPLIT_OPTIONS = [2, 4, 6, 8, 10]` 상수, `MULTI_LAYOUTS` 맵(분할 수→배치 옵션 리스트) 추가.
   - 수용 기준: `MULTI_LAYOUTS[4]`가 `[{ rows: 2, cols: 2, label: "2×2", locked: true }]` 반환.

### Phase B: 크롭 geometry

3. **[S]** `domain/multi/layout.js` 신설.
   - `getLayoutOptionsForCount(n)` → 배치 옵션 배열
   - `computeOverallCropRatio(pieceRatio, layout)` → `(cols × pw):(rows × ph)`
   - `computePieceRects(cropSelection, layout)` → 조각 N개의 normalized rect 배열
   - 수용 기준: `computePieceRects({ x:0, y:0, width:1, height:1 }, { rows:2, cols:2 })` → 길이 4, 각 0.25 넓이.
4. **[M]** `application/crop-ratio-controller.js::getTargetCropRatio` 확장: MULTI 모드면 `computeOverallCropRatio` 호출.
   - 추가 입력: `getMultiLayout`, `getMultiPieceRatio` getter.
5. **[M]** `domain/crop/multi-overlays.js` 신설 — `renderMultiSplitOverlays({view, layout, cropSelection, metrics})`.
   - `book-overlays.js` 구조 참고: `view.overlays` 재사용 아닌 **별도 DOM** (`.multi-split-overlay-layer`) 사용.
   - 수용 기준: 2×3 선택 시 크롭 박스 위에 세로선 2개, 가로선 1개가 그려진다.

### Phase C: UI/DOM

6. **[S]** `index.html` 모드 탭에 `<button data-mode-tab="multi_sketchbook">멀티스케치북</button>` 추가.
7. **[M]** `index.html` 사이드바 form에 분할 수 input(`#multi-split-count`) + 배치 select(`#multi-layout`) 추가. 확대 모달도 동일하게 추가.
8. **[S]** `index.html` 크롭 프레임 2곳(`#crop-frame`, `#expanded-crop-frame`)에 `.multi-split-overlay-layer` div 추가.
9. **[S]** `index.html` guide-viewport 위에 `<div id="multi-piece-tabs" hidden>` 추가.
10. **[M]** `styles/multi.css` 신설 + `styles/main.css`에 `@import`. 분할 오버레이(점선 가이드), 조각 탭 바, 드롭다운 disabled 회색 처리.
11. **[S]** `infrastructure/browser/dom-elements.js`에 신규 DOM 쿼리 추가: `multiSplitCountInput`, `multiLayoutSelect`, `expandedMultiSplitCountInput`, `expandedMultiLayoutSelect`, `multiSplitOverlayLayer`, `expandedMultiSplitOverlayLayer`, `multiPieceTabs`.
12. **[S]** `index.html` 캐시 버스터 `?v=` 업데이트 (CSS·main.js).

### Phase D: 멀티 컨트롤러

13. **[L]** `application/multi-sketchbook-controller.js` 신설.
    - 상태: `currentSplitCount`, `currentLayout`.
    - 메서드: `handleSplitCountChange`, `handleLayoutChange`, `refreshLayoutOptions(splitCount)`, `syncExpandedControls`, `getActiveLayout`, `isActive`.
    - 분할 수 변경 시 배치 드롭다운을 `MULTI_LAYOUTS[n]` 기반으로 재채움. N=4면 `disabled=true`.
14. **[M]** `application/mode-workspace-controller.js::applyModeUi` 확장: MULTI 분기에서 `multi-range-field` 표시, `book-range-field` 숨김, 비율·정밀도는 SKETCHBOOK처럼 활성.
15. **[M]** `mode-workspace-controller.js::setActiveMode`의 모드 전환 분기에 MULTI 추가. `renderEmptyMultiWorkspace()` 헬퍼 신설 (뷰어 빈 상태 + 조각 탭 숨김).
16. **[M]** `application/state.js::createDefaultModeUiState`에 멀티 전용 중첩 상태 `pieces: [{ activeColorCode, completedCells, palettePage, ... }, ...]`, `activePieceIndex` 필드 추가.
17. **[M]** `application/main.js`에서 multi-controller 인스턴스화 + 이벤트 리스너 바인딩.

### Phase E: 변환 파이프라인

18. **[L]** `submission-controller.js::startConversion`에 MULTI 분기: `computePieceRects`로 조각 rect 계산 → for-loop로 조각별 `buildUploadFile(file, pieceRect)` + `convertImageLocally` 순차 호출.
    - 진행률: `(i+1)/N * 100`으로 표시.
    - 조각 하나 실패 시: 전체 실패로 롤백하고 에러 메시지.
19. **[M]** `conversion-session-controller.js::handleSnapshot`에 MULTI 분기: `pendingConversionContext.pieceIndex`를 보고 해당 인덱스에 snapshot 누적.
20. **[S]** `pendingConversionContext` 구조 확장: `{ mode, pieceIndex, totalPieces, multiLayout }` 필드 추가.
21. **[M]** `buildMultiSketchbookSnapshot(pieces, layout, sourceFile)` 헬퍼 신설 (`conversion-session-controller.js` 내부).
22. **[M]** submission에서 모든 조각 완료 시 `setCurrentResultSnapshot(multiSnapshot)` 호출 후 `renderCompleted`.

### Phase F: 뷰어 전환 + "전체" 탭

23. **[M]** `application/result-view-controller.js::renderCompleted`에서 MULTI면 조각 탭 바(N+1개) 표시 + 기본 "전체" 탭 활성.
24. **[M]** `multi-sketchbook-controller.js::renderPieceTabs(pieces, layout, activeIndex)` — N개 조각 버튼 + "전체" 버튼 렌더. 활성 상태 토글.
25. **[M]** `multi-sketchbook-controller.js::handlePieceTabClick(index)`: `index ∈ [0, N-1]`이면 해당 조각 로드, `index === null`이면 전체 모자이크 로드.
26. **[L]** `domain/multi/mosaic.js` 신설 — `renderMosaicView({ pieces, layout, container })`. 각 조각을 그리드 셀로 배치, 작은 dot-art 미리보기 렌더링. 타일 클릭 이벤트 → `handlePieceTabClick(tileIndex)` 호출.
27. **[M]** `mode-snapshot.js::captureCurrentModeUiState` 확장: MULTI 모드면 현재 조각의 UI 상태를 `pieces[activePieceIndex]`에 기록, 다른 조각은 보존. 전체 탭일 때는 flush 스킵.
28. **[S]** `viewer-info-controller.js::updateViewerNote`에 "1분면 · 10/30 완료" 또는 "전체 미리보기" 레이블 추가.

### Phase G: 저장(번들 + 개별) & 번들 불러오기

29. **[S]** 파일명 헬퍼 `domain/multi/filename.js` 신설:
    - `buildMultiPieceFilename(baseName, totalCount, pieceIndex1Based)` → `{baseName}_multi_{N}x{i}.dudot.json`
    - `buildMultiBundleFilename(baseName, rows, cols)` → `{baseName}_multi_{rows}x{cols}_bundle.dudot.json`
    - 공통 `stripExtension(baseName)` 유틸 (예: `photo.jpg` → `photo`).
30. **[M]** `application/submission-controller.js::saveCurrentConversion` MULTI 분기:
    - (1) 번들 빌드: `buildMultiBundleSnapshot(currentMultiSnapshot)` → payload → 다운로드.
    - (2) 개별 N개 루프: 각 조각을 표준 스케치북 snapshot으로 정규화 → 다운로드.
    - 연속 다운로드 차단 방지를 위해 각 호출 사이에 `await new Promise(r => setTimeout(r, 50))`.
31. **[M]** `application/conversion-session-controller.js`에 `buildMultiBundleSnapshot(multiSnapshot)` 헬퍼 추가 — 인메모리 형식을 디스크 포맷(`canvas_mode: "multi_sketchbook"`)으로 변환. 각 조각에 `canvas_mode`·`job_id`·`status` 등 필수 필드 주입.
32. **[M]** `domain/snapshot/portable.js::isPortableSnapshot` 확장:
    - MULTI 번들 판별 분기 추가 — `canvas_mode === "multi_sketchbook"` + `Array.isArray(multi_pieces)` + `multi_pieces.length === multi_layout.count`.
    - 기존 SKETCHBOOK/BOOK 판별은 그대로 유지.
33. **[M]** `portable.js::extractPortableSnapshot` MULTI 번들 추출 로직 추가 — 번들의 `multi_pieces`·`multi_layout`·`ui_state.pieces`·`activePieceIndex`를 반환.
34. **[M]** `application/saved-file-controller.js::handleSavedFileSelection` MULTI 번들 분기:
    - `snapshot.canvas_mode === "multi_sketchbook"`이면 모드를 MULTI로 전환 → `currentMultiSnapshot` 복원 → 조각 탭 재렌더 → 저장 시점의 `activePieceIndex`(null이면 전체 탭) 로드.
    - 그 외(sketchbook/book)는 기존 경로 그대로.
35. **[S]** MULTI 번들 불러오기 시 `mode-snapshot.js::primeModeUiStateForSnapshot`·`restoreModeUiStateForSnapshot`이 `ui_state.pieces[]`를 조각별로 분배해 복원하도록 분기 추가.
36. **[S]** 저장 버튼 활성 조건: `currentMultiSnapshot != null && pieces.length === layout.count` (모든 조각 변환 완료). 미완료 시 비활성.

### Phase H: 마무리

37. **[S]** `styles/main.css`·`index.html`의 `?v=` 캐시 버스터를 `20260421-multi-1` 같은 값으로 갱신.
38. **[S]** 수동 테스트 스모크:
    - 16:9 정밀도 4, N=4 → 2×2 자동 락 + 변환 완료 후 5개 탭(`1·2·3·4·전체`) 표시.
    - 4:3 정밀도 2, N=6 → 2×3/3×2 드롭다운 전환.
    - 저장 클릭 → **N+1개 파일** 순차 다운로드 (번들 1개 + 개별 N개).
    - **번들 파일** 다시 업로드 → MULTI 모드로 복원, 조각 탭·완료 셀 그대로.
    - **개별 조각 파일** 다시 업로드 → 스케치북 모드에서 정상 로드.
    - 모드 간 전환 왕복 (스케치북↔멀티↔책).
    - "전체" 탭 타일 클릭 → 해당 조각 탭으로 점프.
39. **[S]** `CLAUDE.md` "File Structure" 갱신 (`domain/multi/`, `domain/crop/multi-overlays.js`, `application/multi-sketchbook-controller.js`, `styles/multi.css`).

---

## 6. Risk Assessment and Mitigation

| # | 리스크 | 영향 | 완화 |
|---|-------|------|------|
| R1 | 조각 N개 순차 변환으로 **처리 시간 N배** 증가. Pyodide 호출이 무거움. | UX(대기) | 진행 바를 조각 단위로 갱신해 체감 시간 완화. 취소 버튼은 1.5 스코프. |
| R2 | 각 조각의 pixel rect를 자연 이미지 좌표로 변환할 때 rounding 오류로 **경계에 픽셀 누락/중복** 가능. | 정합성 | `computePieceRects`에서 `Math.round` + 인접 조각과 경계 공유. 단위 테스트로 경계 합 = 원본 크기 보장. |
| R3 | BOOK용 `book_applied_segments`/`book_segment_crops` 구조가 `buildPortableSnapshot`에 깊게 얽혀 있어, **MULTI에서 false 유발 가능**. | 저장 포맷 깨짐 | `buildPortableSnapshot`을 `canvas_mode` 기준으로 분기. MULTI는 book_* 필드 미포함. 기존 테스트 파일 열어봐서 하위호환 유지. |
| R4 | `modeUiStates`의 flat 구조에 `pieces[]`를 중첩시키면 **기존 `captureCurrentModeUiState`가 덮어씀**. | 조각별 완료 상태 소실 | MULTI 전용 분기에서 read-modify-write 패턴 엄수. 코드 리뷰 체크포인트로 명시. |
| R5 | 분할 오버레이가 크롭 박스 크기 변경/리사이즈에 따라 **재렌더 타이밍 놓칠 수 있음**. | 시각적 버그 | `cropResizeObserver`에서 `renderMultiSplitOverlays` 호출. `renderCropSelection` 내부에서도 항상 동기 호출. |
| R6 | 조각 탭 전환 시 **팔레트 다중 선택/완료 셀 상태가 뒤섞일 수 있음**. | 작업 내용 손상 | 탭 전환 순간 현재 조각 state를 `pieces[index]`에 flush → 새 조각 state를 restore. 탭 전환 함수에 tests written (수동 수준). |
| R7 | 저장 포맷 변경이 **기존 `.dudot.json`과 충돌**. | 하위호환 | `canvas_mode` 필드를 반드시 존재하게 하고, 없거나 SKETCHBOOK/BOOK이면 기존 경로로. MULTI 파일은 신규 버전으로 `version: 1` 유지하되 `multi_pieces` 유무로 판별. |
| R8 | Pyodide 모듈 버전 캐시가 **조각 변환을 막지 않음**. | 로딩 실패 | 이번 작업은 `.py` 파일 수정 없음 → `PYTHON_MODULE_VERSION` 유지. 그래도 테스트 시 강제 새로고침 1회. |

---

## 7. Success Metrics

- **기능**: 16:9 정밀도 4, N=4 입력 → 2×2로 잘린 150×84 도안 4개가 조각 탭으로 전환 가능.
- **기능**: 저장 후 다시 불러오기 → 조각 4개와 각 조각의 완료 셀이 모두 복원.
- **기능**: 크롭 박스 드래그 중 분할선이 실시간으로 따라붙음 (drop 없이 60fps 유지).
- **회귀 방지**: 기존 SKETCHBOOK/BOOK 동작 변화 0건. 기존 저장 파일 정상 로딩.
- **코드 품질**: 신규 파일은 100줄 이하 모듈 단위 유지. 컨트롤러 팩토리 패턴 준수.

---

## 8. Required Resources and Dependencies

### 기술 의존성
- 변경 없음. Pyodide/Pillow/기존 팔레트 로직 그대로 사용.

### 내부 의존성
- `CANVAS_PRESETS` (`config/catalog.js`) 재사용.
- `book-overlays.js`를 `multi-overlays.js`의 구조 레퍼런스로.
- `mode-workspace-controller.js`/`conversion-session-controller.js` 확장 포인트는 이미 팩토리 패턴 + getter/setter DI 구조라 의존성 주입으로 깔끔히 연결 가능.

### 문서/커뮤니케이션
- 작업 완료 시 `CLAUDE.md`의 File Structure에 `domain/multi/`, `application/multi-sketchbook-controller.js`, `styles/multi.css` 반영.

---

## 9. Timeline Estimates

| Phase | 항목 | 예상 규모 | 누적 |
|-------|------|---------|------|
| A | 상수/레이아웃 테이블 | S (0.5h) | 0.5h |
| B | 크롭 geometry + 오버레이 | M (1.5h) | 2.0h |
| C | UI/DOM/CSS | M (1.5h) | 3.5h |
| D | 멀티 컨트롤러 + 모드 통합 | L (3.0h) | 6.5h |
| E | 변환 파이프라인 | L (3.0h) | 9.5h |
| F | 뷰어 전환 + 전체 모자이크 | L (3.0h) | 12.5h |
| G | 저장(번들+개별) & 번들 불러오기 | M (2.0h) | 14.5h |
| H | 캐시 버스터/수동 QA/문서 | S (1.0h) | 15.5h |

> **총 예상**: 15~17시간. 난이도 리스크 버퍼 20% 포함 시 최대 약 20시간. 중간 커밋 7~9개 권장.
>
> ※ Phase G는 번들 저장·번들 불러오기가 추가되어 규모가 M으로 돌아옴. `portable.js`와 `saved-file-controller.js`에 MULTI 분기 추가 필요.

---

## 10. Out of Scope (이번 작업 제외)

- 홀수 분할 (3, 5, 7…) — 사용자 요구 짝수만.
- 조각별 **서로 다른 비율** 선택 — 전체 동일 비율만.
- **병렬** 조각 변환 — Pyodide 단일 워커 구조상 순차 처리. 웹 워커 분리는 후속 작업.
- **개별 조각 파일 N개를 묶어서 MULTI로 재조합 로딩** — N개 조각 파일을 한번에 선택해 MULTI 모드로 재구성하는 기능은 없음. MULTI 복원은 **번들 파일 1개**로만 가능. 개별 조각 파일은 스케치북 모드에서 각자 열림.
- **부분 재시도** — 변환 실패 시 전체 롤백만. 실패한 조각만 다시 변환하는 옵션 없음.
- 크롭 박스 **가로/세로 고정이 아닌 사용자 자유 비율** — 현재 구조상 항상 `getTargetCropRatio`가 강제함. 이번 스코프에서도 강제 유지.
