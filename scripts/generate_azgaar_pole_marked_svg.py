from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_SVG_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-world-raw.svg"
MAP_DATA_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-map-data.json"
OUTPUT_SVG_PATH = REPO_ROOT / "output" / "azgaar" / "areshnaat-world-raw-with-poles.svg"


def build_overlay(map_data: dict[str, object]) -> str:
    states: list[dict[str, object]] = map_data["states"]  # type: ignore[assignment]
    parts: list[str] = []
    parts.append('  <g id="state-poles">')
    parts.append('    <rect x="18" y="18" width="330" height="68" rx="10" fill="#0b111acc" stroke="#d7c58f" stroke-width="1.5"/>')
    parts.append('    <text x="34" y="48" font-family="Raleway, Arial, sans-serif" font-size="22" font-weight="700" fill="#f7f1de">Azgaar State Poles</text>')
    parts.append('    <text x="34" y="71" font-family="Raleway, Arial, sans-serif" font-size="14" fill="#e4d8b8">Dots show the state pole / label-anchor coordinates</text>')

    for state in states:
        pole = state.get("pole")
        if not pole:
            continue
        x, y = pole
        name = str(state.get("name", "Unknown"))
        atlas_color = state.get("atlasColor") or state.get("color") or "#d9c27a"
        label_x = x + 12
        label_y = y - 10
        safe_name = (
            name.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

        parts.append(f'    <g id="pole-{state["id"]}">')
        parts.append(
            f'      <circle cx="{x}" cy="{y}" r="10" fill="#111418cc" stroke="{atlas_color}" stroke-width="3"/>'
        )
        parts.append(
            f'      <circle cx="{x}" cy="{y}" r="3.2" fill="#fff7d6"/>'
        )
        parts.append(
            f'      <text x="{label_x}" y="{label_y}" font-family="Times New Roman, serif" font-size="22" font-weight="700" '
            f'paint-order="stroke" stroke="#0e1218" stroke-width="4" fill="#f5efdc">{safe_name}</text>'
        )
        parts.append("    </g>")

    parts.append("  </g>")
    return "\n".join(parts)


def main() -> None:
    raw_svg = RAW_SVG_PATH.read_text(encoding="utf8")
    map_data = json.loads(MAP_DATA_PATH.read_text(encoding="utf8"))
    overlay = build_overlay(map_data)

    if "</svg>" not in raw_svg:
        raise RuntimeError("Raw SVG is missing closing </svg> tag")

    marked_svg = raw_svg.replace("</svg>", f"{overlay}\n</svg>")
    OUTPUT_SVG_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_SVG_PATH.write_text(marked_svg, encoding="utf8")
    print(OUTPUT_SVG_PATH)


if __name__ == "__main__":
    main()
