# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**뜌타 스케치북** — a static, single-page web app that converts images into dot-art patterns (도안) for the game "두근두근타운". Deployed to GitHub Pages via push to `main`. There is no build step, no bundler, and no package manager; the app runs entirely in the browser using native ES modules.

## Deployment

Pushing to `main` automatically triggers GitHub Actions (`.github/workflows/deploy-pages.yml`) to deploy the entire repo root to GitHub Pages. The app is live immediately after the workflow completes.

**Cache-busting:** CSS and JS assets use `?v=YYYYMMDD-tag-N` query strings in `index.html` links. Update these manually when changing assets.

## Architecture

The codebase follows a layered architecture:

```
config/          ← Static data: palette catalog (PALETTE, CANVAS_PRESETS), app constants (APP_MODES, BOOK_LAYOUT)
domain/          ← Pure business logic, no DOM access
  book/          ← Book grid structure and segment management
  conversion/    ← Python image → dot-code conversion (converter.py, palette.py, presets.py)
  crop/          ← Crop selection geometry and interaction math
  guide/         ← Guide canvas rendering and interaction
  palette/       ← Color math and palette group logic
  shared/        ← Math utilities (clamp, etc.)
  snapshot/      ← Save-file format detection and naming
infrastructure/  ← Browser and external runtime adapters
  browser/       ← DOM element queries (dom-elements.js) and file I/O helpers
  pyodide/       ← Pyodide runtime bootstrap; runs Python modules in-browser via WASM
  vendor/        ← Bundled pyodide.js
application/     ← App orchestration and controller factories
  main.js        ← Entry point: wires all controllers together, owns shared state, attaches event listeners
  state.js       ← Shared mutable state containers (viewerState, paletteState, cropViews)
styles/          ← Component-scoped CSS files, imported via styles/main.css
```

### Key patterns

- **Controller factory pattern:** every subsystem is a `createXxxController({ deps })` factory returning named functions. State is passed as getter/setter closures; controllers do not share mutable state directly.
- **Dependency injection:** `main.js` instantiates all controllers, providing getters/setters for shared state. Cross-controller calls go through `main.js` closures, not module-level imports.
- **No build step:** All JS uses native ES module `import/export`. No TypeScript, no transpilation.
- **Python in browser:** Image conversion runs in Pyodide (WASM Python). The runtime fetches `domain/conversion/*.py` at runtime and mounts them in `/workspace`. Python modules are versioned via `PYTHON_MODULE_VERSION` in `app-constants.js`.

### Three app modes

- **SKETCHBOOK** (`APP_MODES.SKETCHBOOK`): single-image conversion with user-chosen ratio and precision.
- **BOOK** (`APP_MODES.BOOK`): fixed 16:9 / precision 4, split into book segments (`back_cover`, `spine`, `front_cover`, `full`). Each segment is converted separately and merged into a single 150×84 grid.
- **MULTI_SKETCHBOOK** (`APP_MODES.MULTI_SKETCHBOOK`): one image split into N independent sketchbook pieces (N ∈ {2, 4, 6, 8, 10}). User picks ratio/precision (per-piece) and layout (e.g., 2×2 for N=4, 2×3/3×2 for N=6). Overall crop ratio auto-computed as `(cols × piece_w):(rows × piece_h)`. Each piece is a fully independent dot-art; viewer has N+1 tabs (N pieces + "전체" mosaic preview). Save exports 1 bundle file (`*_bundle.dudot.json`, restores to MULTI mode) + N per-piece files (`*_multi_{N}x{i}.dudot.json`, each opens as standalone SKETCHBOOK).

### Save file format

Files are saved as `.dudot.json` (MIME: `application/json`). The root object has `type: "duduta-dot-save"` and a `snapshot` key. A valid snapshot has `grid_codes` (array of color-code strings) and `used_colors`.

### Canvas presets

Defined in `config/catalog.js` as `CANVAS_PRESETS[ratio][precision] = [width, height]`. The book mode is always 150×84.

## CSS structure

`styles/main.css` imports all component CSS files. To add new styles, create a new file under `styles/` and `@import` it in `main.css`. Update the `?v=` cache-buster in `index.html` after any CSS change.

## Python modules

`domain/conversion/converter.py` is the entry point (`convert_dot_snapshot(payload_json)`). It uses Pillow for image resizing and nearest-neighbor palette matching. Changes to Python files require bumping `PYTHON_MODULE_VERSION` in `config/app-constants.js` to bust the browser's fetch cache.

## File Structure

```
githubiotest/
├── index.html                              # App shell — HTML structure, asset <script>/<link> with cache-busting
├── favicon.png                             # App favicon
├── .nojekyll                               # Disables Jekyll processing on GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy-pages.yml               # GitHub Actions: deploys repo root to GitHub Pages on push to main
├── config/
│   ├── app-constants.js                   # APP_MODES, BOOK_LAYOUT geometry, DEFAULT_PALETTE_ITEMS, shared constants
│   └── catalog.js                         # CANVAS_PRESETS (ratio×precision→size) and full PALETTE color catalog
├── domain/
│   ├── book/
│   │   └── grid.js                        # Book grid helpers: empty grid, segment lookup, merge + crop normalize
│   ├── conversion/
│   │   ├── converter.py                   # Entry: convert_dot_snapshot — Pillow resize + nearest-neighbor palette match
│   │   ├── palette.py                     # Nearest-color lookup helpers (hex→rgb, closest match)
│   │   └── presets.py                     # Python mirror of CANVAS_PRESETS for in-WASM use
│   ├── crop/
│   │   ├── book-overlays.js               # Book-mode overlay renderer for applied segments and full-range guides
│   │   ├── interactions.js                # Crop pointer events, drag/resize interaction, layout refresh scheduling
│   │   ├── multi-overlays.js              # Multi mode split-line overlay renderer (cols-1 vertical, rows-1 horizontal)
│   │   ├── selection.js                   # Crop geometry: normalized rect, display-rect, full-crop check
│   │   └── workspace.js                   # Sidebar vs expanded crop view state helpers
│   ├── guide/
│   │   ├── canvas.js                      # Guide canvas render, viewport math, fit-to-viewport, cell lookup
│   │   └── interactions.js                # Guide pointer handling, hover highlight, cell completion tracking
│   ├── multi/
│   │   ├── bundle.js                      # buildMultiBundleSnapshot — in-memory session → disk bundle format
│   │   ├── filename.js                    # buildMultiPieceFilename, buildMultiBundleFilename, stripExtension
│   │   ├── layout.js                      # Layout options, overall ratio math, piece rect computation
│   │   └── mosaic.js                      # Mosaic "전체" tab renderer — draws each piece as pixel-perfect mini canvas
│   ├── palette/
│   │   ├── color-utils.js                 # hex↔rgba conversion, buildUsedColorsFromGrid, normalizeHexColor
│   │   └── groups.js                      # buildPaletteGroups, GROUP_DISPLAY_ORDER sorting
│   ├── shared/
│   │   └── math.js                        # clamp — single shared numeric utility
│   └── snapshot/
│       └── portable.js                    # .dudot.json detection, extraction, buildSavedFilename
├── infrastructure/
│   ├── browser/
│   │   ├── dom-elements.js                # Centralized getElementById queries for all UI elements
│   │   └── files.js                       # canvasToBlob and triggerFileDownload browser helpers
│   ├── pyodide/
│   │   └── runtime.js                     # Pyodide WASM bootstrap; fetches .py modules and runs conversion
│   └── vendor/
│       └── pyodide.js                     # Bundled third-party Pyodide runtime
├── application/
│   ├── main.js                            # Entry point: wires all controllers, owns shared state, attaches listeners. Includes MULTI save/restore helpers
│   ├── state.js                           # Shared mutable state: viewerState, paletteState, cropViews (incl. splitOverlay refs)
│   ├── multi-sketchbook-controller.js     # Multi mode split-count / layout input state, piece tab rendering & click handling
│   ├── conversion-session-controller.js   # Snapshot normalization, book segment merge, session tracking
│   ├── conversion-status.js               # formatConversionStatus — queued/processing/completed/failed labels
│   ├── crop-preview-controller.js         # Image load, modal expansion, crop-stage UI orchestration
│   ├── crop-ratio-controller.js           # getTargetCropRatio for sketchbook (preset) and book (segment) modes
│   ├── grid-color-controller.js           # Guide grid color UI panel, localStorage persistence, redraw trigger
│   ├── mode-snapshot.js                   # Per-mode UI state capture, restore, and cross-mode persistence
│   ├── mode-workspace-controller.js       # Mode tab switching, book workspace bootstrap, book snapshot helpers
│   ├── palette-controller.js              # Palette sidebar: grouping, group pagination, multi-select, rendering
│   ├── result-view-controller.js          # Status pill, progress bar, renderCompleted/renderError, viewer reset
│   ├── saved-file-controller.js           # .dudot.json file load, validation, and apply-as-conversion
│   ├── submission-controller.js           # Conversion start, cropped canvas upload, local .dudot.json export
│   ├── viewer-info-controller.js          # Viewer note text: segment label, applied count, color progress
│   └── viewport-controller.js            # Window resize: crop layout refresh and guide viewport refit
└── styles/
    ├── main.css                           # Root — @imports all component CSS files
    ├── base.css                           # CSS reset and :root variable definitions
    ├── brand.css                          # Brand color tokens and typography scale
    ├── controls.css                       # Button, toggle, and icon-button styles
    ├── crop.css                           # Crop stage, crop box, and overlay styles
    ├── forms.css                          # Form layout, input, and select styles
    ├── layout.css                         # Page shell, section, and sidebar layout
    ├── mode-bar.css                       # Mode tab bar and active-tab indicator
    ├── multi.css                          # Multi mode styles: split-line overlay, piece tab bar, mosaic tiles
    ├── palette.css                        # Palette sidebar, family track, color chip styles
    ├── responsive.css                     # Breakpoint rules for stacked (≤1180px) layout
    ├── status.css                         # Status pill and conversion progress bar
    ├── viewer.css                         # Guide viewer, fullscreen overlay, zoom controls
    └── viewport.css                       # Guide viewport scroll container and canvas sizing
```

> **참고:** `옷 경계선/` — 두두타운 의류 영역 경계선 참고 PNG 이미지 모음 (앱 코드와 무관한 참고 자료).
