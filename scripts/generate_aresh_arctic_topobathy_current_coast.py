from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None


REPO_ROOT = Path(__file__).resolve().parent.parent
EXPORT_DIR = REPO_ROOT / "region_exports" / "aresh_arctic_azgaar_crop"
METADATA_PATH = EXPORT_DIR / "aresh_arctic_16x9_metadata.json"
TOPO_PATH = EXPORT_DIR / "aresh_arctic_16x9_topobathy.png"
DEM_PATH = EXPORT_DIR / "aresh_arctic_16x9_dem.tif"
OUTPUT_PATH = EXPORT_DIR / "aresh_arctic_16x9_topobathy_current_coast_reference_cities.png"
REPORT_PATH = EXPORT_DIR / "aresh_arctic_16x9_topobathy_current_coast_reference_cities_report.txt"

CITIES = {
    "Anchorage": (61.2181, -149.9003),
    "Nome": (64.5011, -165.4064),
    "Anadyr": (64.7333, 177.5167),
    "Yakutat": (59.5469444, -139.7272222),
    "Okha": (53.5892, 142.9497),
    "Magadan": (59.5600, 150.8000),
    "Petropavlovsk-Kamchatsky": (53.0370, 158.6550),
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


def aresh_to_crop_px(aresh_lat: float, aresh_lon: float, bounds: dict[str, float], width: int, height: int) -> tuple[float, float]:
    x = (aresh_lon - bounds["west"]) / (bounds["east"] - bounds["west"]) * width
    y = (bounds["north"] - aresh_lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def load_current_coastline_polylines(target_width: int, target_height: int) -> list[np.ndarray]:
    dem = np.array(Image.open(DEM_PATH), dtype=np.int32)
    dem_img = Image.fromarray(dem.astype(np.int32), mode="I")
    dem_small = dem_img.resize((target_width, target_height), Image.Resampling.BILINEAR)
    dem_small_np = np.array(dem_small, dtype=np.int32)
    current_land = (dem_small_np >= 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(current_land, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    polylines: list[np.ndarray] = []
    for contour in contours:
        contour = contour.reshape(-1, 2)
        if contour.shape[0] < 20:
            continue
        approx = cv2.approxPolyDP(contour, 1.1, True).reshape(-1, 2)
        if approx.shape[0] < 3:
            continue
        polylines.append(approx.astype(np.int32))
    return polylines


def main() -> None:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf8"))
    transform = solve_affine(metadata["anchors_earth"], metadata["anchors_aresh"])
    bounds = metadata["crop_bounds_aresh"]

    base = Image.open(TOPO_PATH).convert("RGBA")
    width, height = base.size
    draw = ImageDraw.Draw(base, "RGBA")
    font = ImageFont.load_default()

    # Current 0 m coastline over the archived -62 m topobathy surface.
    coastlines = load_current_coastline_polylines(width, height)
    for line in coastlines:
        pts = [tuple(map(int, pt)) for pt in line]
        if len(pts) >= 2:
            draw.line(pts, fill=(255, 88, 96, 220), width=3, joint="curve")

    draw.rounded_rectangle((22, 22, 412, 96), radius=14, fill=(12, 18, 28, 190), outline=(235, 221, 181, 220), width=2)
    draw.text((36, 36), "Aresh Arctic Plate", fill=(248, 242, 224, 255), font=font)
    draw.text((36, 56), "-62 m topobathy base with present-day 0 m coast", fill=(220, 210, 184, 255), font=font)
    draw.text((36, 74), "Reference cities projected from Earth anchors", fill=(220, 210, 184, 255), font=font)

    report_lines = [
        "Aresh Arctic topobathy with current coast + reference cities",
        "===========================================================",
        "",
        "Current coastline overlay",
        "-------------------------",
        "Base plate is the archived -62 m topobathy render.",
        "Red line is the present-day 0 m coastline traced from aresh_arctic_16x9_dem.tif.",
        f"Output size: {width} x {height}",
        "",
        "Projected cities",
        "----------------",
    ]

    for name, (lat, lon) in CITIES.items():
        aresh_lat, aresh_lon = project_city(transform, lat, lon)
        x, y = aresh_to_crop_px(aresh_lat, aresh_lon, bounds, width, height)
        in_bounds = 0 <= x < width and 0 <= y < height
        if in_bounds:
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(255, 243, 120, 245), outline=(32, 20, 18, 255), width=2)
            draw.rectangle((x + 10, y - 10, x + 10 + 8 * len(name), y + 8), fill=(10, 12, 18, 220))
            draw.text((x + 14, y - 8), name, fill=(248, 245, 235, 255), font=font)
        report_lines.append(
            f"{name}: Earth ({lat:+.4f}, {lon:+.4f}) -> Aresh ({aresh_lat:+.4f}, {aresh_lon:+.4f}) -> px ({x:.1f}, {y:.1f})"
            + (" [in bounds]" if in_bounds else " [out of bounds]")
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    base.save(OUTPUT_PATH, format="PNG", optimize=True)
    REPORT_PATH.write_text("\n".join(report_lines) + "\n", encoding="utf8")

    print(OUTPUT_PATH)
    print(REPORT_PATH)


if __name__ == "__main__":
    main()
