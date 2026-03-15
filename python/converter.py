from __future__ import annotations

import json
from collections import Counter
from functools import lru_cache

from PIL import Image, ImageOps

from palette import PALETTE
from presets import get_custom_preset

RESAMPLING = getattr(Image, "Resampling", Image)


def convert_dot_snapshot(payload_json: str) -> str:
    payload = json.loads(payload_json)
    width, height = get_custom_preset(
        payload["ratio"],
        int(payload["precision"]),
        payload.get("canvas_width"),
        payload.get("canvas_height"),
    )

    @lru_cache(maxsize=65536)
    def nearest_palette_color(red: int, green: int, blue: int) -> dict[str, object]:
        return min(
            PALETTE,
            key=lambda candidate: (
                ((red - candidate["rgb"][0]) ** 2)
                + ((green - candidate["rgb"][1]) ** 2)
                + ((blue - candidate["rgb"][2]) ** 2)
            ),
        )

    with Image.open(payload["path"]) as original:
        corrected = ImageOps.exif_transpose(original)
        image = corrected.convert("RGBA")
        background = Image.new("RGBA", image.size, "white")
        composed = Image.alpha_composite(background, image).convert("RGB")
        # The browser crop box already defines the exact framing.
        # Resize directly so the selected area is preserved without a second crop.
        fitted = composed.resize((width, height), resample=RESAMPLING.LANCZOS)
        source_pixels = list(fitted.getdata())

    usage: Counter[str] = Counter()
    grid_codes: list[list[str]] = []

    for row_index in range(height):
        row_codes: list[str] = []
        start = row_index * width
        for column_index in range(width):
            red, green, blue = source_pixels[start + column_index]
            color = nearest_palette_color(red, green, blue)
            row_codes.append(str(color["code"]))
            usage[str(color["code"])] += 1
        grid_codes.append(row_codes)

    used_colors = [
        {
            "code": color["code"],
            "group": color["group"],
            "hex_value": color["hex_value"],
            "count": usage[str(color["code"])],
        }
        for color in PALETTE
        if usage[str(color["code"])] > 0
    ]

    return json.dumps(
        {
            "width": width,
            "height": height,
            "used_colors": used_colors,
            "grid_codes": grid_codes,
        },
        ensure_ascii=False,
    )
