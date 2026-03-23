from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None


ROOT = Path(__file__).resolve().parents[1]
EARTH_DIR = ROOT / "aresh_rebuild" / "GEBCO_BATHY_TOPO_EARTH62"
PLATE_DIR = ROOT / "region_exports" / "aresh_arctic_azgaar_crop"

EARTH_META_PATH = EARTH_DIR / "GEBCO_BATHY_TOPO_EARTH62_metadata.json"
EARTH_IMAGE_PATH = EARTH_DIR / "GEBCO_BATHY_TOPO_EARTH62_render.png"
PLATE_META_PATH = PLATE_DIR / "aresh_arctic_16x9_metadata.json"
PLATE_IMAGE_PATH = PLATE_DIR / "aresh_arctic_16x9_topobathy_current_coast_reference_cities.png"

EARTH_OUT = ROOT / "output" / "map_renders" / "earth62_minus62m_reference_cities.png"
PLATE_OUT = PLATE_DIR / "aresh_arctic_16x9_reference_cities_from_earth62_basis.png"
REPORT_OUT = ROOT / "output" / "map_renders" / "earth62_to_aresh_reference_report.txt"

# Expanded practical analog set.
CITIES = {
    "Nome": (64.5011, -165.4064),
    "St. Lawrence / Gambell": (63.7797, -171.7328),
    "Hooper Bay": (61.5314, -166.0967),
    "Anchorage": (61.2181, -149.9003),
    "Yakutat": (59.5469444, -139.7272222),
    "Ambler": (67.0872, -157.8575),
    "Dutch Harbor": (53.8897, -166.5419),
    "Anadyr": (64.7333, 177.5167),
    "Okha": (53.5892, 142.9497),
    "Magadan": (59.5600, 150.8000),
}


def solve_affine(anchors_earth: dict[str, dict[str, float]], anchors_aresh: dict[str, dict[str, float]]) -> np.ndarray:
    src_rows = []
    dst_lon = []
    dst_lat = []
    for key, earth in anchors_earth.items():
        aresh = anchors_aresh[key]
        src_rows.append([earth["lon"], earth["lat"], 1.0])
        dst_lon.append(aresh["lon"])
        dst_lat.append(aresh["lat"])
    src = np.array(src_rows, dtype=np.float64)
    lon_coeff, *_ = np.linalg.lstsq(src, np.array(dst_lon, dtype=np.float64), rcond=None)
    lat_coeff, *_ = np.linalg.lstsq(src, np.array(dst_lat, dtype=np.float64), rcond=None)
    return np.vstack([lon_coeff, lat_coeff])


def project_city(transform: np.ndarray, lat: float, lon: float) -> tuple[float, float]:
    inp = np.array([lon, lat, 1.0], dtype=np.float64)
    aresh_lon = float(transform[0] @ inp)
    aresh_lat = float(transform[1] @ inp)
    return aresh_lat, aresh_lon


def earth_to_px(lat: float, lon: float, width: int, height: int) -> tuple[float, float]:
    x = ((lon + 180.0) / 360.0) * width
    y = ((90.0 - lat) / 180.0) * height
    return x, y


def aresh_to_px(lat: float, lon: float, meta: dict) -> tuple[float, float]:
    bounds = meta["crop_bounds_aresh"]
    width = int(meta["render_size"]["width"])
    height = int(meta["render_size"]["height"])
    x = (lon - bounds["west"]) / (bounds["east"] - bounds["west"]) * width
    y = (bounds["north"] - lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def draw_marker(draw: ImageDraw.ImageDraw, x: float, y: float, label: str, color: tuple[int, int, int, int], font: ImageFont.ImageFont) -> None:
    draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=color, outline=(20, 18, 18, 255), width=2)
    draw.text((x + 14, y - 10), label, fill=(248, 245, 235, 255), stroke_width=3, stroke_fill=(18, 18, 18, 220), font=font)


def main() -> None:
    earth_meta = json.loads(EARTH_META_PATH.read_text(encoding="utf-8"))
    plate_meta = json.loads(PLATE_META_PATH.read_text(encoding="utf-8"))
    transform = solve_affine(plate_meta["anchors_earth"], plate_meta["anchors_aresh"])

    earth_image = Image.open(EARTH_IMAGE_PATH).convert("RGBA")
    plate_image = Image.open(PLATE_IMAGE_PATH).convert("RGBA")
    earth_draw = ImageDraw.Draw(earth_image, "RGBA")
    plate_draw = ImageDraw.Draw(plate_image, "RGBA")
    font = ImageFont.load_default()

    earth_draw.rounded_rectangle((22, 22, 390, 96), radius=14, fill=(12, 18, 28, 190), outline=(235, 221, 181, 220), width=2)
    earth_draw.text((36, 36), "Earth62 GEBCO Reference", fill=(248, 242, 224, 255), font=font)
    earth_draw.text((36, 56), "-62 m sea-level basis with Earth city anchors", fill=(220, 210, 184, 255), font=font)

    plate_draw.rounded_rectangle((22, 22, 428, 98), radius=14, fill=(12, 18, 28, 190), outline=(235, 221, 181, 220), width=2)
    plate_draw.text((36, 36), "Aresh Plate from Earth62 Basis", fill=(248, 242, 224, 255), font=font)
    plate_draw.text((36, 56), "Same Earth cities after Earth->Aresh transform", fill=(220, 210, 184, 255), font=font)

    lines = [
        "Earth62 to Aresh reference report",
        "================================",
        "",
        "Earth62 source basis",
        "--------------------",
        f"Render image: {EARTH_IMAGE_PATH}",
        f"Sea level adjustment in metadata: {earth_meta['sea_level_adjustment_m']} m",
        f"Render size: {earth_image.width} x {earth_image.height}",
        "",
        "Earth->Aresh affine",
        "-------------------",
        f"aresh_lon = {transform[0,0]:.10f} * earth_lon + {transform[0,1]:.10f} * earth_lat + {transform[0,2]:.10f}",
        f"aresh_lat = {transform[1,0]:.10f} * earth_lon + {transform[1,1]:.10f} * earth_lat + {transform[1,2]:.10f}",
        "",
        "City projections",
        "----------------",
    ]

    for name, (lat, lon) in CITIES.items():
        ex, ey = earth_to_px(lat, lon, earth_image.width, earth_image.height)
        draw_marker(earth_draw, ex, ey, name, (255, 217, 102, 255), font)

        aresh_lat, aresh_lon = project_city(transform, lat, lon)
        px, py = aresh_to_px(aresh_lat, aresh_lon, plate_meta)
        in_bounds = 0 <= px < plate_image.width and 0 <= py < plate_image.height
        if in_bounds:
            draw_marker(plate_draw, px, py, name, (255, 217, 102, 255), font)

        lines.append(
            f"{name}: Earth ({lat:+.4f}, {lon:+.4f}) -> Earth px ({ex:.1f}, {ey:.1f}) -> "
            f"Aresh ({aresh_lat:+.4f}, {aresh_lon:+.4f}) -> Aresh px ({px:.1f}, {py:.1f})"
            + (" [in bounds]" if in_bounds else " [out of bounds]")
        )

    EARTH_OUT.parent.mkdir(parents=True, exist_ok=True)
    earth_image.save(EARTH_OUT, format="PNG", optimize=True)
    plate_image.save(PLATE_OUT, format="PNG", optimize=True)
    REPORT_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(EARTH_OUT)
    print(PLATE_OUT)
    print(REPORT_OUT)


if __name__ == "__main__":
    main()
