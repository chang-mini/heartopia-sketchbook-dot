CANVAS_PRESETS: dict[str, dict[int, tuple[int, int]]] = {
    "16:9": {1: (30, 18), 2: (50, 28), 3: (100, 56), 4: (150, 84)},
    "4:3": {1: (30, 24), 2: (50, 38), 3: (100, 76), 4: (150, 114)},
    "1:1": {1: (30, 30), 2: (50, 50), 3: (100, 100), 4: (150, 150)},
    "3:4": {1: (24, 30), 2: (38, 50), 3: (76, 100), 4: (114, 150)},
    "9:16": {1: (18, 30), 2: (28, 50), 3: (56, 100), 4: (84, 150)},
}


def get_preset(ratio: str, precision: int) -> tuple[int, int]:
    ratio_presets = CANVAS_PRESETS.get(ratio)
    if ratio_presets is None:
        raise ValueError(f"Unsupported ratio: {ratio}")

    size = ratio_presets.get(precision)
    if size is None:
        raise ValueError(f"Unsupported precision: {precision}")

    return size
