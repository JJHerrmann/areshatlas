from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DATA_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-map-data.json"
TOPO_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-topo-dem.webp"
OUTPUT_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-azgaar-state-overlay.svg"


def get_webp_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def main() -> None:
    data = json.loads(MAP_DATA_PATH.read_text(encoding="utf8"))
    topo_width, topo_height = get_webp_size(TOPO_PATH)
    source_width = data["metadata"]["width"]
    source_height = data["metadata"]["height"]

    scale_x = topo_width / source_width
    scale_y = topo_height / source_height

    states_body = data["paths"].get("statesBody")
    province_borders = data["paths"].get("provinceBorders")
    state_borders = data["paths"].get("stateBorders")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {topo_width} {topo_height}" width="{topo_width}" height="{topo_height}" preserveAspectRatio="none">
  <g id="azgaar-overlay" transform="scale({scale_x:.12f} {scale_y:.12f})">
    {'<path d="' + states_body + '" fill="#f6e9a4" fill-opacity="0.08" stroke="none"/>' if states_body else ''}
    {'<path d="' + province_borders + '" fill="none" stroke="#8c7a4d" stroke-opacity="0.42" stroke-width="0.8" stroke-dasharray="0 3" stroke-linecap="round"/>' if province_borders else ''}
    {'<path d="' + state_borders + '" fill="none" stroke="#2d1d13" stroke-opacity="0.90" stroke-width="1.6" stroke-linecap="round"/>' if state_borders else ''}
  </g>
</svg>
"""

    OUTPUT_PATH.write_text(svg, encoding="utf8")
    print(f"[azgaar-overlay] wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
