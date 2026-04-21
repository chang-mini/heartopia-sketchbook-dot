# 멀티스케치북 모드 — 태스크 체크리스트

**Last Updated: 2026-04-21**

진행 규칙: 각 태스크 완료 시 `[ ]` → `[x]`. 블로커 발생 시 해당 줄 아래에 `> 🚧 메모` 추가.

---

## Phase A — 기반 데이터/상수 (S) ✅ 완료

- [x] **A1** `config/app-constants.js`에 `APP_MODES.MULTI_SKETCHBOOK = "multi_sketchbook"` 추가.
- [x] **A2** `config/app-constants.js`에 `MULTI_SPLIT_OPTIONS`, `MULTI_LAYOUTS` 맵 export.

---

## Phase B — 크롭 geometry (M) ✅ 완료 + node 단위 테스트 통과

- [x] **B1** `domain/multi/layout.js` 생성. `getLayoutOptionsForCount`·`computeOverallCropRatio`·`computePieceRects`·`isValidSplitCount`·`normalizeLayout`·`getDefaultLayoutForCount` 구현 및 테스트 통과 (`/tmp/test-multi.mjs` 전 항목 PASS).
- [x] **B2** `crop-ratio-controller.js::getTargetCropRatio` MULTI 분기 추가. `getMultiLayout` deps 주입.
- [x] **B3** `domain/crop/multi-overlays.js` 생성. `createMultiSplitOverlayRenderer` — 크롭 박스 안에 `cols-1`개의 세로선 + `rows-1`개의 가로선 렌더.

---

## Phase C — UI/DOM + CSS (M) ✅ 완료 + Playwright 검증

- [x] **C1** `index.html` 모드 탭 바에 멀티스케치북 버튼 추가.
- [x] **C2** `index.html` 사이드바 form에 `#multi-split-count`, `#multi-layout` select 추가 (`.multi-range-field` 컨테이너).
- [x] **C3** `index.html` 확대 모달에도 `#expanded-multi-split-count`, `#expanded-multi-layout` 추가 (`.expanded-multi-options`).
- [x] **C4** 두 크롭 프레임 안에 `.multi-split-overlay-layer` div 추가.
- [x] **C5** `viewer-shell` 상단에 `#multi-piece-tab-bar` 추가 (역할: tablist).
- [x] **C6** guide-viewport 내부에 `#multi-mosaic-view` div 추가 (모자이크 뷰 컨테이너).
- [x] **C7** `styles/multi.css` 생성 + `styles/main.css`에 import.
- [x] **C8** `infrastructure/browser/dom-elements.js`에 신규 쿼리 12개 export.
- [x] **C9** 캐시 버스터 `20260421-multi-1`로 교체.

---

## Phase D — 멀티 컨트롤러 + 모드 통합 (L) ✅ 완료 + 브라우저 검증

- [x] **D1** `application/multi-sketchbook-controller.js` 생성. `getActiveLayout`·`handleSplitCountChange`·`handleLayoutChange`·`refreshLayoutOptions`·`syncExpandedControls`·`renderPieceTabs`·`handlePieceTabBarClick`·`hidePieceTabs`·`setSplitCountAndLayout`.
  - **수용 통과**: N=4 → `['2×2']` + `disabled=true`. N=6 → `['2×3','3×2']` + `disabled=false`. N=2 → `['1×2','2×1']` + `disabled=false`.
- [x] **D2** `state.js::createDefaultModeUiState` 확장: `pieces: []`, `activePieceIndex: null` 필드.
- [x] **D3** `mode-workspace-controller.js::applyModeUi` MULTI 분기: `multi-range-field`·`multi-layout-field`·`expanded-multi-options` 토글.
- [x] **D4** `mode-workspace-controller.js::setActiveMode` MULTI 분기 + `renderEmptyMultiWorkspace()` 헬퍼.
- [x] **D5** `main.js`에서 `createMultiSketchbookController` 인스턴스화 + 이벤트 리스너 바인딩.
- [x] **D6** 확대 모달 동기화 — `syncExpandedControls`로 처리.
- [x] **D7** `cropResizeObserver`에서 `renderMultiSplitOverlays` 호출 (TDZ 가드 포함).

---

## Phase E — 변환 파이프라인 (L) ⚙ 코드 작성 완료, 수동 E2E 테스트 대기

- [x] **E1** `submission-controller.js::startConversion`에 MULTI 분기 추가. 진행 시 `startMultiConversion(file)` 호출.
- [x] **E2** `submission-controller.js::buildMultiPieceUploadFile(file, pieceRect)` 신설. 조각 rect를 자연 이미지 좌표로 변환 후 캔버스에서 추출.
- [x] **E3** `submission-controller.js::startMultiConversion` 신설. N개 조각 순차 변환, `setPendingConversionContext` 갱신, `onMultiPieceCompleted`/`onMultiConversionFinished` 콜백 호출.
- [x] **E4** `domain/multi/bundle.js` 신설 — `buildMultiBundleSnapshot` (인메모리 → 디스크 포맷).
- [x] **E5** 진행률 status pill 업데이트 — `"2/6 조각 처리 중"` 형태.
- [x] **E6** 에러 시 `onMultiConversionFailed` 콜백 → `currentMultiSnapshot` 폐기 + UI 리셋.

### 잔여 (E 관련):
- [x] **E7** 실제 이미지 업로드 + MULTI 변환 E2E 자동 테스트 — **Playwright 통과** (`C:/tmp/e2e-multi-test.py`).
  - 400×225 테스트 이미지(4분면 색상) → 16:9 + N=4 2×2 → 4조각 모두 변환 완료.
  - 모자이크 뷰 4타일 렌더, 조각 탭 5개(1·2·3·4·전체), 전체 탭 기본 활성.
  - 조각/전체 탭 왕복 → 모자이크 토글 정상.
  - JS 에러 0건.
  - `computePieceRects(cropSelection, activeLayout)`로 rect 배열 획득.
  - `for (i of pieces) await convertOne(pieceRect, pieceIndex=i)` 순차 실행.
  - 각 루프 시작 전 `setPendingConversionContext({ mode, pieceIndex, totalPieces, multiLayout })`.
- [ ] **E2** `submission-controller.js::buildUploadFile`에 선택적 `pieceRect` 인자 추가 → 전달 시 해당 rect만 캔버스에 그리기.
  - 수용: `pieceRect = { u:0.5, v:0, w:0.5, h:0.5 }` + 16:9 크롭 → 오른쪽 위 1/4가 업로드 이미지로 생성.
- [ ] **E3** `application/conversion-session-controller.js::handleSnapshot` MULTI 분기:
  - `pendingConversionContext.pieceIndex`로 `multi_pieces[index]` 채움.
  - 마지막 조각이면 `buildMultiSketchbookSnapshot`으로 최종 snapshot 구축 + `setCurrentResultSnapshot`.
- [ ] **E4** `conversion-session-controller.js`에 `buildMultiSketchbookSnapshot(pieces, layout, filename)` 내부 헬퍼 추가.
- [ ] **E5** 진행률 표시: status pill에 `"2/6 조각 변환 중…"` 형식 텍스트. `formatConversionStatus` 또는 submission에서 직접 `setStatus` 호출.
- [ ] **E6** 조각 변환 중 에러: 기존 `catch` 블록에서 지금까지 쌓인 부분 snapshot 폐기 + 에러 메시지 (계획서 Q3는 "전체 롤백" 기본 채택).

---

## Phase F — 뷰어 조각 전환 + "전체" 모자이크 (L) ⚙ 코드 작성 완료, 수동 E2E 테스트 대기

- [x] **F1** `main.js::loadOverviewIntoViewer` — 변환 완료 즉시 전체 탭 + 모자이크 뷰로 진입.
- [x] **F2** `multi-sketchbook-controller.js::renderPieceTabs(pieces, layout, activeIndex)` — N+1개 탭 렌더, `activeIndex === null`이면 "전체" 활성.
- [x] **F3** `main.js::handleMultiPieceTabChange(nextIndex)` — 조각↔조각, 조각↔전체, 전체↔조각 전환 처리.
- [x] **F4** `domain/multi/mosaic.js` 생성. `renderMosaicView`가 각 조각을 mini-canvas(pixel-perfect, imageSmoothingEnabled=false)에 팔레트 색상으로 그려서 grid로 배치. 타일 click/Enter/Space로 `onTileClick` 트리거.
- [ ] **F5** `mode-snapshot.js::captureCurrentModeUiState` MULTI 분기 — **보류**. 현재는 조각별 완료 셀 영속성이 번들 저장 시점에만 기록됨. 탭 전환 시 상태 격리는 인메모리 `viewerState`가 단일 인스턴스라 미구현. 후속 개선 여지.
- [ ] **F6** `mode-snapshot.js::restoreModeUiStateForSnapshot` MULTI 복원 — **보류**. F5와 함께 후속 작업.
- [x] **F7** `viewer-info-controller.js::updateViewerNote` MULTI 레이블 — 조각 탭 / 전체 탭 구분 메시지.
- [x] **F8** `styles/multi.css`에 모자이크 타일 grid/hover 스타일 추가.

> **F5·F6 보류 이유**: 현재 구현은 조각 탭 클릭 시 `currentResultSnapshot`을 해당 조각으로 교체 + `loadGuideGrid` 재호출로 작동한다. `viewerState.completedCells`가 단일 Set이라 탭 전환 시 다른 조각의 완료 셀이 보이지 않는 문제가 있을 수 있음. 수동 E2E 테스트에서 문제 확인되면 별도 티켓으로.

---

## Phase G — 저장(번들+개별) & 번들 불러오기 (M) ⚙ 코드 완료, 수동 E2E 대기

### G.1 파일명/번들 빌드 헬퍼

- [x] **G1** `domain/multi/filename.js` 생성 — `stripExtension`·`buildMultiPieceFilename`·`buildMultiBundleFilename` 구현 및 node 단위 테스트 통과:
  - `stripExtension(name)` — `"photo.jpg"` → `"photo"`.
  - `buildMultiPieceFilename(baseName, totalCount, pieceIndex1Based)` → `{base}_multi_{N}x{i}.dudot.json`.
  - `buildMultiBundleFilename(baseName, rows, cols)` → `{base}_multi_{rows}x{cols}_bundle.dudot.json`.
  - 수용: `buildMultiPieceFilename("photo.jpg", 4, 1)` === `"photo_multi_4x1.dudot.json"`.
  - 수용: `buildMultiBundleFilename("photo.jpg", 2, 2)` === `"photo_multi_2x2_bundle.dudot.json"`.

- [x] **G2** `domain/multi/bundle.js` 생성 — `buildMultiBundleSnapshot(multiSnapshot)` 구현.

### G.2 저장 (main.js::saveMultiSketchbookSnapshot)

- [x] **G3** `main.js::saveMultiSketchbookSnapshot` 신설. 저장 버튼 클릭 시 `activeMode === MULTI_SKETCHBOOK`이면 이 함수가 호출됨. 번들 1개 다운로드 후 80ms 간격으로 N개 개별 조각 파일 순차 다운로드.
- [x] **G4** `save-current` 버튼 활성 조건 — MULTI 변환 완료 시 `loadOverviewIntoViewer` 안에서 `updateSaveButtonState(true)` 호출.
- [x] **G5** `ui_state` 포장 — 번들/개별 모두 `captureCurrentModeUiState()` 결과 포함.

### G.3 번들 불러오기

- [x] **G6** `portable.js::isMultiBundleSnapshot` + `isPortableSnapshot`에 MULTI 분기 추가.
- [x] **G7** `portable.js::buildSavedFilename` MULTI 분기 추가 (번들 파일명 변환).
- [x] **G8** `saved-file-controller.js` 수정 — `applyMultiBundleSnapshot` 콜백 경로 추가.
- [x] **G9** `main.js::applyMultiBundleSnapshot` 구현 — 모드 전환, `currentMultiSnapshot` 재구성, 조각 탭 렌더, 저장된 `active_piece_index` 복원.
- [x] **G10** `stopTracking` 유지 — 세션 진행 중에도 번들 로딩 시 정리됨.

---

## Phase G — E2E 검증 결과 (추가)

Playwright 자동 테스트에서 다음 순서로 전부 PASS:

1. 이미지 업로드 → 멀티 탭 전환 → N=4 기본값 + 2×2 disabled 확인.
2. "전체선택" 클릭 → 분할선 2개(세로1 + 가로1) 렌더.
3. 도안 생성 시작 → Pyodide 로딩 + 4조각 순차 변환 (약 30초).
4. 완료 후 **전체 탭 기본 활성** + 탭 바 `1·2·3·4·전체` 5개 렌더.
5. 모자이크 뷰 4타일 표시.
6. 조각 1 탭 클릭 → 모자이크 숨김 + 도안 로드.
7. 전체 탭 클릭 → 모자이크 다시 표시.
8. 저장 버튼 → **5개 파일 다운로드**:
   - `test-multi_multi_2x2_bundle.dudot.json` (번들)
   - `test-multi_multi_4x1.dudot.json` ~ `4x4.dudot.json` (개별)
9. 번들 파일 재업로드 → **MULTI 모드 자동 복원** + 탭 5개 재렌더.

**JS 에러 0건**. 전체 플로우 정상.

---

## Phase H — 마무리 (S)

- [x] **H1** `index.html`, `styles/main.css`의 `?v=` 캐시 버스터 `20260421-multi-1`로 교체 완료.
- [x] **H2** 자동 E2E 스모크 테스트 통과:
  - [x] 16:9, 정밀도 4, N=4 → 2×2 고정 락 + 변환 완료 후 탭 5개 + 기본 "전체" 탭 활성.
  - [x] "전체" 탭 타일 4개가 2×2로 배치.
  - [x] 전체선택 버튼 → 전체 비율 스냅 + 분할선 2개 렌더.
  - [x] 저장 → 5개 파일(번들 1개 + 개별 4개) 다운로드.
  - [x] 번들 파일 업로드 → MULTI 모드로 복원, 조각 탭 5개 재렌더.
  - [ ] ※ 브라우저 수동 추가 확인(추천): N=2/6/8/10 배치 전환, 조각 탭 간 완료 셀 격리, 개별 조각 파일 재업로드 시 스케치북 모드 로드, 변환 중 에러 롤백, 모드 왕복.
- [ ] **H3** `CLAUDE.md`의 "File Structure" 섹션에 `domain/multi/`, `domain/crop/multi-overlays.js`, `application/multi-sketchbook-controller.js`, `styles/multi.css` 엔트리 추가 + 최상단 개요에 MULTI 모드 설명 한 줄 삽입.
- [ ] **H4** 커밋: 각 Phase 단위로 분리 커밋 권장. 최소 Phase A+B, C+D, E, F, G, H 단위.

---

## 블로커/발견사항 로그

| 날짜 | 태스크 | 내용 |
|------|-------|------|
| — | — | — |

---

## 완료 판정

모든 태스크가 `[x]`이고 H2 스모크 테스트 전부 통과한 시점에 `dev/active/multi-sketchbook-mode/` 디렉터리를 `dev/completed/`로 이동한다 (수동).
