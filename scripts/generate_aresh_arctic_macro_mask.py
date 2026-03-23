from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None


ROOT = Path(__file__).resolve().parents[1]
PLATE_DIR = ROOT / "region_exports" / "aresh_arctic_azgaar_crop"
METADATA_PATH = PLATE_DIR / "aresh_arctic_16x9_metadata.json"
DEM_PATH = PLATE_DIR / "aresh_arctic_16x9_dem.tif"
BASE_IMAGE_PATH = PLATE_DIR / "aresh_arctic_16x9_topobathy_current_coast_reference_cities.png"
OUTPUT_PATH = PLATE_DIR / "aresh_arctic_16x9_xilhuan_procedural_mask.png"
REPORT_PATH = PLATE_DIR / "aresh_arctic_16x9_xilhuan_procedural_mask_report.txt"


EARTH_TO_ARESH = (
    (0.0157525938, -1.2146822204, 148.1090017670),
    (-0.1256462088, 0.2933334560, -16.7860820144),
)

# Coastal analog anchor chain for first-pass Xilhuan growth.
ANCHORS = {
    "Nome": (64.5011, -165.4064),
    "St. Lawrence / Gambell": (63.7797, -171.7328),
    "Hooper Bay": (61.5314, -166.0967),
    "Dutch Harbor": (53.8897, -166.5419),
}

# Each anchor contributes an anisotropic Gaussian influence field.
FIELD_PARAMS = {
    "Nome": {"sigma_x": 180.0, "sigma_y": 110.0, "weight": 1.00, "rotation_deg": -18.0},
    "St. Lawrence / Gambell": {"sigma_x": 160.0, "sigma_y": 95.0, "weight": 0.92, "rotation_deg": -24.0},
    "Hooper Bay": {"sigma_x": 250.0, "sigma_y": 140.0, "weight": 1.00, "rotation_deg": -18.0},
    "Dutch Harbor": {"sigma_x": 220.0, "sigma_y": 120.0, "weight": 0.80, "rotation_deg": -22.0},
}

THRESHOLD = 0.34
SEA_LEVEL_M = -62.0
FILL_COLOR = (112, 79, 214, 120)
OUTLINE_COLOR = (112, 79, 214, 255)


def earth_to_aresh(lat: float, lon: float) -> tuple[float, float]:
    aresh_lon = EARTH_TO_ARESH[0][0] * lon + EARTH_TO_ARESH[0][1] * lat + EARTH_TO_ARESH[0][2]
    aresh_lat = EARTH_TO_ARESH[1][0] * lon + EARTH_TO_ARESH[1][1] * lat + EARTH_TO_ARESH[1][2]
    return aresh_lat, aresh_lon


def aresh_to_px(lat: float, lon: float, meta: dict) -> tuple[float, float]:
    bounds = meta["crop_bounds_aresh"]
    width = meta["render_size"]["width"]
    height = meta["render_size"]["height"]
    x = (lon - bounds["west"]) / (bounds["east"] - bounds["west"]) * width
    y = (bounds["north"] - lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def gaussian_field(
    grid_x: np.ndarray,
    grid_y: np.ndarray,
    center_x: float,
    center_y: float,
    sigma_x: float,
    sigma_y: float,
    rotation_deg: float,
    weight: float,
) -> np.ndarray:
    theta = math.radians(rotation_deg)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    dx = grid_x - center_x
    dy = grid_y - center_y
    rx = cos_t * dx + sin_t * dy
    ry = -sin_t * dx + cos_t * dy
    return weight * np.exp(-0.5 * ((rx / sigma_x) ** 2 + (ry / sigma_y) ** 2))


def main() -> None:
    meta = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    width = int(meta["render_size"]["width"])
    height = int(meta["render_size"]["height"])

    dem_image = Image.open(DEM_PATH)
    if dem_image.size != (width, height):
        dem_image = dem_image.resize((width, height), resample=Image.Resampling.BILINEAR)
    dem = np.array(dem_image, dtype=np.float32)
    land_mask = dem > SEA_LEVEL_M

    yy, xx = np.indices((height, width), dtype=np.float32)
    field = np.zeros((height, width), dtype=np.float32)

    projected: dict[str, tuple[float, float, float, float]] = {}
    for name, (earth_lat, earth_lon) in ANCHORS.items():
        aresh_lat, aresh_lon = earth_to_aresh(earth_lat, earth_lon)
        px_x, px_y = aresh_to_px(aresh_lat, aresh_lon, meta)
        params = FIELD_PARAMS[name]
        field = np.maximum(
            field,
            gaussian_field(
                xx,
                yy,
                px_x,
                px_y,
                params["sigma_x"],
                params["sigma_y"],
                params["rotation_deg"],
                params["weight"],
            ),
        )
        projected[name] = (earth_lat, earth_lon, px_x, px_y)

    mask = (field >= THRESHOLD) & land_mask

    base = Image.open(BASE_IMAGE_PATH).convert("RGBA")
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_arr = np.array(overlay)
    overlay_arr[mask] = FILL_COLOR
    overlay = Image.fromarray(overlay_arr, mode="RGBA")

    # Simple edge detection for the mask outline.
    padded = np.pad(mask.astype(np.uint8), 1, mode="constant")
    center = padded[1:-1, 1:-1]
    edge = (
        (center == 1)
        & (
            (padded[:-2, 1:-1] == 0)
            | (padded[2:, 1:-1] == 0)
            | (padded[1:-1, :-2] == 0)
            | (padded[1:-1, 2:] == 0)
        )
    )
    edge_arr = np.zeros((height, width, 4), dtype=np.uint8)
    edge_arr[edge] = OUTLINE_COLOR
    edge_img = Image.fromarray(edge_arr, mode="RGBA")

    composite = Image.alpha_composite(base, overlay)
    composite = Image.alpha_composite(composite, edge_img)

    draw = ImageDraw.Draw(composite, "RGBA")
    font = ImageFont.load_default()
    draw.rounded_rectangle((26, 26, 410, 106), radius=16, fill=(18, 20, 30, 205), outline=(240, 230, 200, 235), width=2)
    draw.text((42, 42), "Procedural Xilhuan Macro Mask", fill=(248, 242, 224, 255), font=font)
    draw.text((42, 66), "Land-clipped analog influence field", fill=(223, 212, 186, 255), font=font)

    for name, (_, _, px_x, px_y) in projected.items():
        draw.ellipse((px_x - 7, px_y - 7, px_x + 7, px_y + 7), fill=(255, 214, 102, 255), outline=(24, 24, 24, 255), width=2)
        draw.text((px_x + 12, px_y - 10), name, fill=(255, 244, 220, 255), stroke_width=3, stroke_fill=(20, 20, 20, 220), font=font)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    composite.save(OUTPUT_PATH, format="PNG", optimize=True)

    report_lines = [
        "Aresh Arctic procedural Xilhuan macro mask",
        "=========================================",
        "",
        f"Sea level treated as land threshold: {SEA_LEVEL_M} m",
        f"Mask threshold: {THRESHOLD}",
        "",
        "Projected anchors",
        "-----------------",
    ]
    for name, (earth_lat, earth_lon, px_x, px_y) in projected.items():
        aresh_lat, aresh_lon = earth_to_aresh(earth_lat, earth_lon)
        params = FIELD_PARAMS[name]
        report_lines.append(
            f"{name}: Earth ({earth_lat:+.4f}, {earth_lon:+.4f}) -> "
            f"Aresh ({aresh_lat:+.4f}, {aresh_lon:+.4f}) -> px ({px_x:.1f}, {px_y:.1f}) | "
            f"sigma=({params['sigma_x']:.1f}, {params['sigma_y']:.1f}) rot={params['rotation_deg']:.1f} weight={params['weight']:.2f}"
        )

    report_lines.extend(
        [
            "",
            "Mask stats",
            "----------",
            f"Land pixels in crop: {int(land_mask.sum())}",
            f"Mask pixels selected: {int(mask.sum())}",
        ]
    )
    REPORT_PATH.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print(OUTPUT_PATH)
    print(REPORT_PATH)


if __name__ == "__main__":
    main()
