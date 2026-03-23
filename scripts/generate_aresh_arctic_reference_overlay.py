from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None


REPO_ROOT = Path(__file__).resolve().parent.parent
EXPORT_DIR = REPO_ROOT / "region_exports" / "aresh_arctic_azgaar_crop"
METADATA_PATH = EXPORT_DIR / "aresh_arctic_16x9_metadata.json"
TOPO_PATH = EXPORT_DIR / "aresh_arctic_16x9_topobathy.png"
HEATMAP_PATH = EXPORT_DIR / "aresh_arctic_16x9_azgaar_heatmap_reference.png"
TOPO_OUT = EXPORT_DIR / "aresh_arctic_16x9_topobathy_reference_cities.png"
HEATMAP_OUT = EXPORT_DIR / "aresh_arctic_16x9_azgaar_heatmap_reference_cities.png"
REPORT_OUT = EXPORT_DIR / "aresh_arctic_16x9_reference_cities_report.txt"


# Practical reference set for the Beringia-facing analog zone plus known anchors.
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
    # Solve [a b c; d e f] so that [lon lat 1] -> [aresh_lon aresh_lat]
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
    # North-up crop convention as used in the archived export plate.
    y = (bounds["north"] - aresh_lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def draw_overlay(base_path: Path, out_path: Path, placements: list[dict[str, float | str]]) -> None:
    image = Image.open(base_path).convert("RGBA")
    draw = ImageDraw.Draw(image, "RGBA")
    font = ImageFont.load_default()

    draw.rounded_rectangle((22, 22, 320, 84), radius=14, fill=(12, 18, 28, 190), outline=(235, 221, 181, 220), width=2)
    draw.text((36, 38), "Reference Cities", fill=(248, 242, 224, 255), font=font)
    draw.text((36, 58), "Earth anchors projected onto Aresh crop", fill=(220, 210, 184, 255), font=font)

    for item in placements:
        x = float(item["x"])
        y = float(item["y"])
        label = str(item["name"])
        in_bounds = bool(item["in_bounds"])
        point_fill = (255, 243, 120, 245) if in_bounds else (255, 120, 120, 245)
        point_outline = (32, 20, 18, 255)
        label_fill = (248, 245, 235, 255)
        glow_fill = (10, 12, 18, 220)

        if 0 <= x < image.width and 0 <= y < image.height:
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=point_fill, outline=point_outline, width=2)
            draw.rectangle((x + 10, y - 10, x + 10 + 8 * len(label), y + 8), fill=glow_fill)
            draw.text((x + 14, y - 8), label, fill=label_fill, font=font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(out_path, format="PNG", optimize=True)


def main() -> None:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf8"))
    transform = solve_affine(metadata["anchors_earth"], metadata["anchors_aresh"])
    bounds = metadata["crop_bounds_aresh"]
    width = int(metadata["render_size"]["width"])
    height = int(metadata["render_size"]["height"])

    placements: list[dict[str, float | str]] = []
    lines = [
        "Aresh Arctic 16x9 reference city overlay",
        "=======================================",
        "",
        "Affine transform solved from saved Earth/Aresh anchors",
        "-----------------------------------------------------",
        f"aresh_lon = {transform[0,0]:.10f} * earth_lon + {transform[0,1]:.10f} * earth_lat + {transform[0,2]:.10f}",
        f"aresh_lat = {transform[1,0]:.10f} * earth_lon + {transform[1,1]:.10f} * earth_lat + {transform[1,2]:.10f}",
        "",
        f"Crop bounds: north={bounds['north']:.6f}, south={bounds['south']:.6f}, west={bounds['west']:.6f}, east={bounds['east']:.6f}",
        f"Render size: {width} x {height}",
        "",
        "Projected cities",
        "----------------",
    ]

    for name, (lat, lon) in CITIES.items():
        aresh_lat, aresh_lon = project_city(transform, lat, lon)
        x, y = aresh_to_crop_px(aresh_lat, aresh_lon, bounds, width, height)
        in_bounds = 0 <= x < width and 0 <= y < height
        placements.append(
            {
                "name": name,
                "earth_lat": lat,
                "earth_lon": lon,
                "aresh_lat": aresh_lat,
                "aresh_lon": aresh_lon,
                "x": x,
                "y": y,
                "in_bounds": in_bounds,
            }
        )
        lines.append(
            f"{name}: Earth ({lat:+.4f}, {lon:+.4f}) -> Aresh ({aresh_lat:+.4f}, {aresh_lon:+.4f}) -> px ({x:.1f}, {y:.1f})"
            + (" [in bounds]" if in_bounds else " [out of bounds]")
        )

    draw_overlay(TOPO_PATH, TOPO_OUT, placements)
    draw_overlay(HEATMAP_PATH, HEATMAP_OUT, placements)
    REPORT_OUT.write_text("\n".join(lines) + "\n", encoding="utf8")

    print(TOPO_OUT)
    print(HEATMAP_OUT)
    print(REPORT_OUT)


if __name__ == "__main__":
    main()
