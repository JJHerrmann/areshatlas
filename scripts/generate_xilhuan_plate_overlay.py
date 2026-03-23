from __future__ import annotations

import json
import math
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLATE_DIR = ROOT / "region_exports" / "aresh_arctic_azgaar_crop"
PLATE_IMAGE = "aresh_arctic_16x9_topobathy_current_coast_reference_cities.png"
SOURCE_SVG = ROOT / "output" / "azgaar" / "states" / "xilhuan.svg"
MAP_DATA = ROOT / "public" / "azgaar" / "areshnaat-map-data.json"
METADATA = PLATE_DIR / "aresh_arctic_16x9_metadata.json"
OUTPUT_SVG = PLATE_DIR / "aresh_arctic_16x9_xilhuan_placement_attempt.svg"
OUTPUT_REPORT = PLATE_DIR / "aresh_arctic_16x9_xilhuan_placement_attempt_report.txt"


EARTH_TO_ARESH = (
    (0.0157525938, -1.2146822204, 148.1090017670),
    (-0.1256462088, 0.2933334560, -16.7860820144),
)

REFERENCE_POINTS = {
    "Hooper Bay": (61.5314, -166.0967),
    "Nome": (64.5011, -165.4064),
    "Ambler": (67.0872, -157.8575),
    "Dutch Harbor": (53.8897, -166.5419),
    "Anchorage": (61.2181, -149.9003),
    "St. Lawrence / Gambell": (63.7797, -171.7328),
}

# First-pass coastline-fit tuning.
ROTATE_DEG = -80.0
SCALE_X = 0.48
SCALE_Y = 1.12


def earth_to_aresh(lat: float, lon: float) -> tuple[float, float]:
    aresh_lon = EARTH_TO_ARESH[0][0] * lon + EARTH_TO_ARESH[0][1] * lat + EARTH_TO_ARESH[0][2]
    aresh_lat = EARTH_TO_ARESH[1][0] * lon + EARTH_TO_ARESH[1][1] * lat + EARTH_TO_ARESH[1][2]
    return aresh_lat, aresh_lon


def aresh_to_plate_px(lat: float, lon: float, meta: dict) -> tuple[float, float]:
    bounds = meta["crop_bounds_aresh"]
    width = meta["render_size"]["width"]
    height = meta["render_size"]["height"]
    x = (lon - bounds["west"]) / (bounds["east"] - bounds["west"]) * width
    y = (bounds["north"] - lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def svg_inner_content(text: str) -> str:
    text = re.sub(r"<\?xml[^>]*\?>\s*", "", text, count=1)
    match = re.match(r"\s*<svg\b[^>]*>(.*)</svg>\s*$", text, re.DOTALL)
    if not match:
        raise ValueError("Could not extract SVG body from source state export.")
    return match.group(1).strip()


def build_matrix(anchor_x: float, anchor_y: float, pole_x: float, pole_y: float) -> tuple[float, float, float, float, float, float]:
    theta = math.radians(ROTATE_DEG)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    a = cos_t * SCALE_X
    b = sin_t * SCALE_X
    c = -sin_t * SCALE_Y
    d = cos_t * SCALE_Y
    e = anchor_x - (a * pole_x + c * pole_y)
    f = anchor_y - (b * pole_x + d * pole_y)
    return a, b, c, d, e, f


def main() -> None:
    meta = json.loads(METADATA.read_text(encoding="utf-8"))
    map_data = json.loads(MAP_DATA.read_text(encoding="utf-8"))
    state = next(item for item in map_data["states"] if item["name"] == "Xilhuan")
    pole_x, pole_y = state["pole"]

    anchor_lat, anchor_lon = earth_to_aresh(*REFERENCE_POINTS["Hooper Bay"])
    anchor_px_x, anchor_px_y = aresh_to_plate_px(anchor_lat, anchor_lon, meta)
    matrix = build_matrix(anchor_px_x, anchor_px_y, pole_x, pole_y)

    source_body = svg_inner_content(SOURCE_SVG.read_text(encoding="utf-8"))
    plate_width = meta["render_size"]["width"]
    plate_height = meta["render_size"]["height"]

    markers = []
    report_lines = [
        "Aresh Arctic 16x9 Xilhuan placement attempt",
        "===========================================",
        "",
        "Source state: Xilhuan",
        f"Source pole: ({pole_x}, {pole_y})",
        f"Source bbox: {state['bbox']}",
        "",
        "Placement tuning",
        "----------------",
        f"rotation_deg = {ROTATE_DEG}",
        f"scale_x = {SCALE_X}",
        f"scale_y = {SCALE_Y}",
        "",
        "Anchor",
        "------",
        f"Hooper Bay Earth = {REFERENCE_POINTS['Hooper Bay']}",
        f"Hooper Bay Aresh = ({anchor_lat:.4f}, {anchor_lon:.4f})",
        f"Hooper Bay plate px = ({anchor_px_x:.1f}, {anchor_px_y:.1f})",
        "",
        "SVG matrix",
        "----------",
        f"matrix({matrix[0]:.6f} {matrix[1]:.6f} {matrix[2]:.6f} {matrix[3]:.6f} {matrix[4]:.2f} {matrix[5]:.2f})",
        "",
        "Reference points",
        "----------------",
    ]

    colors = {
        "Hooper Bay": "#ffd166",
        "Nome": "#ef476f",
        "Ambler": "#06d6a0",
        "Dutch Harbor": "#118ab2",
        "Anchorage": "#f78c6b",
        "St. Lawrence / Gambell": "#c77dff",
    }

    for name, (earth_lat, earth_lon) in REFERENCE_POINTS.items():
        aresh_lat, aresh_lon = earth_to_aresh(earth_lat, earth_lon)
        px_x, px_y = aresh_to_plate_px(aresh_lat, aresh_lon, meta)
        color = colors[name]
        markers.append(
            f'<g id="marker-{name.lower().replace(" ", "-").replace("/", "")}">'
            f'<circle cx="{px_x:.2f}" cy="{px_y:.2f}" r="8" fill="{color}" stroke="#111" stroke-width="2" />'
            f'<text x="{px_x + 14:.2f}" y="{px_y - 10:.2f}" font-family="Raleway, Arial, sans-serif" '
            f'font-size="26" font-weight="700" fill="{color}" stroke="#111" stroke-width="4" paint-order="stroke">{name}</text>'
            f"</g>"
        )
        report_lines.append(
            f"{name}: Earth ({earth_lat:+.4f}, {earth_lon:+.4f}) -> "
            f"Aresh ({aresh_lat:+.4f}, {aresh_lon:+.4f}) -> px ({px_x:.1f}, {px_y:.1f})"
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{plate_width}" height="{plate_height}" viewBox="0 0 {plate_width} {plate_height}">
  <rect width="{plate_width}" height="{plate_height}" fill="#081826" />
  <image href="{PLATE_IMAGE}" x="0" y="0" width="{plate_width}" height="{plate_height}" />
  <g id="xilhuan-placement" opacity="0.62" transform="matrix({matrix[0]:.6f} {matrix[1]:.6f} {matrix[2]:.6f} {matrix[3]:.6f} {matrix[4]:.2f} {matrix[5]:.2f})">
    {source_body}
  </g>
  <g id="anchor-highlight">
    <circle cx="{anchor_px_x:.2f}" cy="{anchor_px_y:.2f}" r="14" fill="none" stroke="#ffe082" stroke-width="4" />
  </g>
  {' '.join(markers)}
</svg>
"""

    OUTPUT_SVG.write_text(svg, encoding="utf-8")
    OUTPUT_REPORT.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_SVG}")
    print(f"Wrote {OUTPUT_REPORT}")


if __name__ == "__main__":
    main()
