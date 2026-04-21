/*
Module: multi mosaic renderer
Description: Renders the "전체" overview tab — tiles each piece's dot-art grid in the chosen layout.
Domain: domain/multi
Dependencies: none
Usage:
  const { renderMosaicView, clearMosaicView } = createMosaicRenderer({...});
*/

function createMosaicRenderer({
  getPaletteByCode,
  container,
  isMultiModeActive = () => true,
}) {
  function clearMosaicView() {
    if (!container) return;
    container.hidden = true;
    container.style.gridTemplateRows = "";
    container.style.gridTemplateColumns = "";
    container.innerHTML = "";
  }

  function renderMosaicView({ pieces, layout, onTileClick }) {
    if (!container) return;
    // Safety: never render mosaic outside multi mode
    if (!isMultiModeActive()) {
      clearMosaicView();
      return;
    }
    if (!Array.isArray(pieces) || !layout || pieces.length === 0) {
      clearMosaicView();
      return;
    }

    const rows = Number(layout.rows);
    const cols = Number(layout.cols);
    if (!(rows > 0) || !(cols > 0)) {
      clearMosaicView();
      return;
    }

    container.hidden = false;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.innerHTML = "";

    // Make the overall mosaic respect the (cols × piece_w) : (rows × piece_h)
    // aspect so that each 1fr × 1fr cell naturally lands on the piece aspect —
    // then the tile canvas can fill it without letterboxing.
    const firstPiece = pieces.find((pc) => pc?.width && pc?.height) || pieces[0];
    const pieceW = Number(firstPiece?.width);
    const pieceH = Number(firstPiece?.height);
    if (pieceW > 0 && pieceH > 0) {
      container.style.aspectRatio = `${cols * pieceW} / ${rows * pieceH}`;
    } else {
      container.style.aspectRatio = "";
    }

    const paletteByCode = typeof getPaletteByCode === "function" ? getPaletteByCode() : new Map();

    pieces.forEach((piece, index) => {
      const tile = document.createElement("div");
      tile.className = "multi-mosaic-tile";
      tile.setAttribute("data-piece-index", String(index));
      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");
      if (piece?.width && piece?.height) {
        tile.style.aspectRatio = `${piece.width} / ${piece.height}`;
      }

      const canvas = document.createElement("canvas");
      drawPieceToCanvas(piece, canvas, paletteByCode);
      tile.appendChild(canvas);

      const label = document.createElement("span");
      label.className = "multi-mosaic-tile-label";
      label.textContent = String(index + 1);
      tile.appendChild(label);

      if (typeof onTileClick === "function") {
        tile.addEventListener("click", () => onTileClick(index));
        tile.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTileClick(index);
          }
        });
      }

      container.appendChild(tile);
    });
  }

  function drawPieceToCanvas(piece, canvas, paletteByCode) {
    const width = Number(piece?.width);
    const height = Number(piece?.height);
    const gridCodes = Array.isArray(piece?.grid_codes) ? piece.grid_codes : [];
    if (!(width > 0) || !(height > 0) || gridCodes.length === 0) {
      canvas.width = 1;
      canvas.height = 1;
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const imageData = ctx.createImageData(width, height);

    // grid_codes can arrive as either a flat Array<code> (length = w*h) or
    // a 2D Array<Array<code>> (length = h, inner length = w). Handle both.
    const is2D = gridCodes.length > 0 && Array.isArray(gridCodes[0]);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const code = is2D ? gridCodes[y]?.[x] : gridCodes[y * width + x];
        const entry = code ? paletteByCode.get(code) : null;
        const rgb = entry?.rgb || [255, 255, 255];
        const pixelIdx = (y * width + x) * 4;
        imageData.data[pixelIdx] = rgb[0];
        imageData.data[pixelIdx + 1] = rgb[1];
        imageData.data[pixelIdx + 2] = rgb[2];
        imageData.data[pixelIdx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return {
    clearMosaicView,
    renderMosaicView,
  };
}

export { createMosaicRenderer };
