def _hex_to_rgb(hex_value: str) -> tuple[int, int, int]:
    clean = hex_value.lstrip("#")
    return tuple(int(clean[index:index + 2], 16) for index in (0, 2, 4))


_PALETTE_ROWS: list[tuple[str, str, str]] = [
    ("B1", "Black", "#051616"), ("B2", "Black", "#414545"), ("B3", "Black", "#808282"), ("B4", "Black", "#bebfbf"), ("B5", "Black", "#feffff"),
    ("Re1", "Red", "#cf354d"), ("Re2", "Red", "#ee6f72"), ("Re3", "Red", "#a6263d"), ("Re4", "Red", "#f5aca6"), ("Re5", "Red", "#c98483"),
    ("Re6", "Red", "#a35d5e"), ("Re7", "Red", "#682f39"), ("Re8", "Red", "#e7d5d5"), ("Re9", "Red", "#c0acab"), ("Re10", "Red", "#755e5e"),
    ("Or1", "Orange", "#e95e2b"), ("Or2", "Orange", "#f98358"), ("Or3", "Orange", "#ab4226"), ("Or4", "Orange", "#feba9f"), ("Or5", "Orange", "#d9937c"),
    ("Or6", "Orange", "#af6c58"), ("Or7", "Orange", "#753b31"), ("Or8", "Orange", "#e9d5d0"), ("Or9", "Orange", "#c1aca6"), ("Or10", "Orange", "#755e59"),
    ("Am1", "Amber", "#f49e16"), ("Am2", "Amber", "#feae3b"), ("Am3", "Amber", "#b16f16"), ("Am4", "Amber", "#fece92"), ("Am5", "Amber", "#daa76d"),
    ("Am6", "Amber", "#b3814b"), ("Am7", "Amber", "#795126"), ("Am8", "Amber", "#f5e4ce"), ("Am9", "Amber", "#cdbca9"), ("Am10", "Amber", "#806f5e"),
    ("Ye1", "Yellow", "#edca16"), ("Ye2", "Yellow", "#f9d838"), ("Ye3", "Yellow", "#b39416"), ("Ye4", "Yellow", "#f9e690"), ("Ye5", "Yellow", "#d4be6f"),
    ("Ye6", "Yellow", "#ab954b"), ("Ye7", "Yellow", "#756326"), ("Ye8", "Yellow", "#eee7c7"), ("Ye9", "Yellow", "#c6bfa2"), ("Ye10", "Yellow", "#787259"),
    ("Pi1", "Pistachio", "#a7bb16"), ("Pi2", "Pistachio", "#b6c833"), ("Pi3", "Pistachio", "#758616"), ("Pi4", "Pistachio", "#d8df93"), ("Pi5", "Pistachio", "#acb66c"),
    ("Pi6", "Pistachio", "#85914b"), ("Pi7", "Pistachio", "#535e2b"), ("Pi8", "Pistachio", "#e6e9c7"), ("Pi9", "Pistachio", "#bcc2a3"), ("Pi10", "Pistachio", "#6e745d"),
    ("Gr1", "Green", "#05a25d"), ("Gr2", "Green", "#41b97b"), ("Gr3", "Green", "#057447"), ("Gr4", "Green", "#9cdaad"), ("Gr5", "Green", "#76b28b"),
    ("Gr6", "Green", "#4f8969"), ("Gr7", "Green", "#245640"), ("Gr8", "Green", "#c3e0cc"), ("Gr9", "Green", "#9db7a6"), ("Gr10", "Green", "#53695d"),
    ("Aq1", "Aqua", "#058781"), ("Aq2", "Aqua", "#05aba0"), ("Aq3", "Aqua", "#056966"), ("Aq4", "Aqua", "#7ecdc2"), ("Aq5", "Aqua", "#55a49c"),
    ("Aq6", "Aqua", "#2b7e78"), ("Aq7", "Aqua", "#054b4b"), ("Aq8", "Aqua", "#bee0da"), ("Aq9", "Aqua", "#98b7b2"), ("Aq10", "Aqua", "#4e6b66"),
    ("Bl1", "Blue", "#05729c"), ("Bl2", "Blue", "#0599ba"), ("Bl3", "Blue", "#055878"), ("Bl4", "Blue", "#79bbca"), ("Bl5", "Blue", "#5193a5"),
    ("Bl6", "Blue", "#246d7f"), ("Bl7", "Blue", "#05495b"), ("Bl8", "Blue", "#c6dde2"), ("Bl9", "Blue", "#9eb5ba"), ("Bl10", "Blue", "#4f676f"),
    ("In1", "Indigo", "#055ea6"), ("In2", "Indigo", "#2b83c1"), ("In3", "Indigo", "#054782"), ("In4", "Indigo", "#83a8c9"), ("In5", "Indigo", "#5d80a1"),
    ("In6", "Indigo", "#365b7f"), ("In7", "Indigo", "#193b56"), ("In8", "Indigo", "#c1cdd5"), ("In9", "Indigo", "#9ba6b0"), ("In10", "Indigo", "#4c5967"),
    ("Pu1", "Purple", "#534da1"), ("Pu2", "Purple", "#7577bd"), ("Pu3", "Purple", "#3e387e"), ("Pu4", "Purple", "#a2a0c7"), ("Pu5", "Purple", "#787aa1"),
    ("Pu6", "Purple", "#55567e"), ("Pu7", "Purple", "#333555"), ("Pu8", "Purple", "#c9cad5"), ("Pu9", "Purple", "#a2a3b0"), ("Pu10", "Purple", "#565869"),
    ("Ma1", "Magenta", "#813d8b"), ("Ma2", "Magenta", "#a167a9"), ("Ma3", "Magenta", "#602b6c"), ("Ma4", "Magenta", "#b89bb9"), ("Ma5", "Magenta", "#907395"),
    ("Ma6", "Magenta", "#6c4d73"), ("Ma7", "Magenta", "#432e4b"), ("Ma8", "Magenta", "#cfc9d1"), ("Ma9", "Magenta", "#aba1ac"), ("Ma10", "Magenta", "#605664"),
    ("P1", "Pink", "#ad356f"), ("P2", "Pink", "#cf6b8f"), ("P3", "Pink", "#862658"), ("P4", "Pink", "#d9a1b4"), ("P5", "Pink", "#b3798b"),
    ("P6", "Pink", "#8b5367"), ("P7", "Pink", "#60354b"), ("P8", "Pink", "#e4d5da"), ("P9", "Pink", "#bcadb1"), ("P10", "Pink", "#725e66"),
]

PALETTE = [
    {
        "code": code,
        "group": group,
        "hex_value": hex_value,
        "rgb": _hex_to_rgb(hex_value),
    }
    for code, group, hex_value in _PALETTE_ROWS
]
