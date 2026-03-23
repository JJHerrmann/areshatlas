from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

Image.MAX_IMAGE_PIXELS = None


REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts" / "lib"))

from aresh_spherical_transform import earth_to_aresh_lonlat

PREVIOUS_META_PATH = REPO_ROOT / "region_exports" / "aresh_arctic_azgaar_crop" / "aresh_arctic_16x9_metadata.json"
ARCHIVE_ROOT = REPO_ROOT / "region_exports" / "archive"
DEM_NPZ_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
LANDMASK_NPZ_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
OUTPUT_DIR = REPO_ROOT / "output" / "working"
PUBLIC_MAPS_DIR = REPO_ROOT / "public" / "maps"
OUTPUT_METADATA_PATH = OUTPUT_DIR / "aresh_arctic_16x9_normalized_metadata.json"
OUTPUT_DEM_PATH = OUTPUT_DIR / "aresh_arctic_16x9_normalized_dem.tif"
OUTPUT_TOPO_PATH = PUBLIC_MAPS_DIR / "aresh_arctic_16x9_normalized_topobathy.png"
OUTPUT_TOPO_REF_PATH = PUBLIC_MAPS_DIR / "aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities.png"
OUTPUT_REPORT_PATH = OUTPUT_DIR / "aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities_report.txt"

DOWNSAMPLE = 4
CITIES = {
    "Anchorage": (61.2181, -149.9003),
    "Nome": (64.5011, -165.4064),
    "Anadyr": (64.7333, 177.5167),
    "Yakutat": (59.5469444, -139.7272222),
    "Okha": (53.5892, 142.9497),
    "Magadan": (59.5600, 150.8000),
    "Petropavlovsk-Kamchatsky": (53.0370, 158.6550),
}


def normalize(values: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = (values - low) / max(high - low, 1e-6)
    return np.clip(scaled, 0.0, 1.0)


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    t = normalize(values, edge0, edge1)
    return t * t * (3.0 - 2.0 * t)


def blend(a: np.ndarray, b: np.ndarray, factor: np.ndarray) -> np.ndarray:
    return a * (1.0 - factor[..., None]) + b * factor[..., None]


def make_hillshade(surface: np.ndarray) -> np.ndarray:
    gy, gx = np.gradient(surface)
    azimuth = np.deg2rad(315.0)
    altitude = np.deg2rad(40.0)
    x_grad = gx / 125.0
    y_grad = gy / 125.0
    slope_rad = np.pi / 2.0 - np.arctan(np.hypot(x_grad, y_grad))
    aspect = np.arctan2(-x_grad, y_grad)
    hillshade = (
        np.sin(altitude) * np.sin(slope_rad)
        + np.cos(altitude) * np.cos(slope_rad) * np.cos(azimuth - aspect)
    )
    return np.clip((hillshade + 1.0) * 0.5, 0.0, 1.0)


def lon_to_x(lon: float, width: int) -> float:
    return (lon + 180.0) / 360.0 * width


def lat_to_y(lat: float, height: int) -> float:
    return (90.0 - lat) / 180.0 * height


def load_world_surfaces() -> tuple[np.ndarray, np.ndarray]:
    dem = np.load(DEM_NPZ_PATH)["dem_m"][::DOWNSAMPLE, ::DOWNSAMPLE].astype(np.float32)
    landmask = np.load(LANDMASK_NPZ_PATH)["landmask"][::DOWNSAMPLE, ::DOWNSAMPLE].astype(bool)
    return dem, landmask


def crop_indices(bounds: dict[str, float], width: int, height: int) -> tuple[int, int, int, int]:
    x0 = int(np.floor(lon_to_x(bounds["west"], width)))
    x1 = int(np.ceil(lon_to_x(bounds["east"], width)))
    y0 = int(np.floor(lat_to_y(bounds["north"], height)))
    y1 = int(np.ceil(lat_to_y(bounds["south"], height)))
    return x0, y0, x1, y1


def render_topobathy(dem_crop: np.ndarray, landmask_crop: np.ndarray, target_size: tuple[int, int]) -> tuple[np.ndarray, np.ndarray]:
    target_width, target_height = target_size
    dem_resized = np.array(
        Image.fromarray(dem_crop.astype(np.float32), mode="F").resize((target_width, target_height), Image.Resampling.BILINEAR),
        dtype=np.float32,
    )
    landmask_resized = np.array(
        Image.fromarray(landmask_crop.astype(np.uint8) * 255, mode="L").resize((target_width, target_height), Image.Resampling.BILINEAR),
        dtype=np.uint8,
    ) >= 127
    ocean = ~landmask_resized

    smoothed = ndi.gaussian_filter(dem_resized, sigma=1.25, mode="nearest")
    hillshade = make_hillshade(smoothed)
    dist_to_ocean = ndi.distance_transform_edt(landmask_resized)
    dist_to_land = ndi.distance_transform_edt(ocean)

    elev_norm = normalize(np.where(landmask_resized, dem_resized, 0.0), 0.0, 5200.0)
    depth_norm = normalize(np.where(ocean, -dem_resized, 0.0), 0.0, 7200.0)
    coast_glow = smoothstep(0.0, 10.0, 10.0 - dist_to_land)
    coast_land = smoothstep(0.0, 8.0, 8.0 - dist_to_ocean)

    deep_ocean = np.array([0.03, 0.12, 0.24], dtype=np.float32)
    mid_ocean = np.array([0.06, 0.23, 0.38], dtype=np.float32)
    shelf_ocean = np.array([0.10, 0.38, 0.53], dtype=np.float32)
    shore_ocean = np.array([0.26, 0.74, 0.78], dtype=np.float32)

    ocean_rgb = blend(mid_ocean, deep_ocean, depth_norm)
    ocean_rgb = blend(ocean_rgb, shelf_ocean, smoothstep(0.0, 0.26, 1.0 - depth_norm))
    ocean_rgb = blend(ocean_rgb, shore_ocean, coast_glow * 0.9)
    ocean_rgb *= (0.82 + hillshade[..., None] * 0.22)

    lowland = np.array([0.76, 0.83, 0.56], dtype=np.float32)
    upland = np.array([0.58, 0.68, 0.34], dtype=np.float32)
    alpine = np.array([0.65, 0.62, 0.54], dtype=np.float32)
    snow = np.array([0.94, 0.97, 0.98], dtype=np.float32)
    beach = np.array([0.86, 0.81, 0.64], dtype=np.float32)

    land_rgb = blend(lowland, upland, smoothstep(0.10, 0.42, elev_norm))
    land_rgb = blend(land_rgb, alpine, smoothstep(0.48, 0.72, elev_norm))
    land_rgb = blend(land_rgb, snow, smoothstep(0.74, 0.92, elev_norm))
    land_rgb = blend(land_rgb, beach, coast_land * (1.0 - smoothstep(0.06, 0.22, elev_norm)))
    land_rgb *= (0.72 + hillshade[..., None] * 0.42)

    rgb = np.where(landmask_resized[..., None], land_rgb, ocean_rgb)
    rgb = np.clip(rgb, 0.0, 1.0)
    return dem_resized, (rgb * 255.0).astype(np.uint8)


def load_current_coastline_polylines(dem_resized: np.ndarray) -> list[np.ndarray]:
    current_land = (dem_resized >= 0).astype(np.uint8) * 255
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


def aresh_to_crop_px(aresh_lat: float, aresh_lon: float, bounds: dict[str, float], width: int, height: int) -> tuple[float, float]:
    x = (aresh_lon - bounds["west"]) / (bounds["east"] - bounds["west"]) * width
    y = (bounds["north"] - aresh_lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def resolve_previous_meta_path() -> Path:
    if PREVIOUS_META_PATH.exists():
        return PREVIOUS_META_PATH
    archived = sorted(
        ARCHIVE_ROOT.glob("aresh_arctic_azgaar_crop_*"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    for folder in archived:
        candidate = folder / "aresh_arctic_16x9_metadata.json"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("No archived or live aresh_arctic_16x9_metadata.json found")


def main() -> None:
    previous_meta_path = resolve_previous_meta_path()
    previous_meta = json.loads(previous_meta_path.read_text(encoding="utf8"))
    bounds = previous_meta["crop_bounds_aresh"]
    render_width = int(previous_meta["render_size"]["width"])
    render_height = int(previous_meta["render_size"]["height"])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_MAPS_DIR.mkdir(parents=True, exist_ok=True)

    dem_world, landmask_world = load_world_surfaces()
    world_height, world_width = dem_world.shape
    x0, y0, x1, y1 = crop_indices(bounds, world_width, world_height)
    dem_crop = dem_world[y0:y1, x0:x1]
    landmask_crop = landmask_world[y0:y1, x0:x1]

    dem_resized, topobathy_rgb = render_topobathy(dem_crop, landmask_crop, (render_width, render_height))
    Image.fromarray(topobathy_rgb, mode="RGB").save(OUTPUT_TOPO_PATH, format="PNG", optimize=True)
    Image.fromarray(dem_resized.astype(np.float32), mode="F").save(OUTPUT_DEM_PATH, format="TIFF")

    base = Image.fromarray(topobathy_rgb, mode="RGB").convert("RGBA")
    draw = ImageDraw.Draw(base, "RGBA")
    font = ImageFont.load_default()

    for line in load_current_coastline_polylines(dem_resized):
        pts = [tuple(map(int, pt)) for pt in line]
        if len(pts) >= 2:
            draw.line(pts, fill=(255, 88, 96, 220), width=3, joint="curve")

    draw.rounded_rectangle((22, 22, 444, 96), radius=14, fill=(12, 18, 28, 190), outline=(235, 221, 181, 220), width=2)
    draw.text((36, 36), "Aresh Arctic Plate", fill=(248, 242, 224, 255), font=font)
    draw.text((36, 56), "Fresh crop from current normalized world DEM", fill=(220, 210, 184, 255), font=font)
    draw.text((36, 74), "Red line is present-day 0 m coast; cities use spherical remap", fill=(220, 210, 184, 255), font=font)

    report_lines = [
        "Fresh normalized Aresh Arctic crop from current world DEM",
        "========================================================",
        "",
        f"Source DEM NPZ: {DEM_NPZ_PATH.relative_to(REPO_ROOT)}",
        f"Source landmask NPZ: {LANDMASK_NPZ_PATH.relative_to(REPO_ROOT)}",
        f"Crop bounds (Aresh): north={bounds['north']:.6f}, south={bounds['south']:.6f}, west={bounds['west']:.6f}, east={bounds['east']:.6f}",
        f"Render size: {render_width} x {render_height}",
        "",
        "Projected cities",
        "----------------",
    ]

    for name, (earth_lat, earth_lon) in CITIES.items():
        aresh_lat, aresh_lon = earth_to_aresh_lonlat(earth_lat, earth_lon)
        x, y = aresh_to_crop_px(aresh_lat, aresh_lon, bounds, render_width, render_height)
        in_bounds = 0 <= x < render_width and 0 <= y < render_height
        if in_bounds:
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(255, 243, 120, 245), outline=(32, 20, 18, 255), width=2)
            draw.rectangle((x + 10, y - 10, x + 10 + 8 * len(name), y + 8), fill=(10, 12, 18, 220))
            draw.text((x + 14, y - 8), name, fill=(248, 245, 235, 255), font=font)
        report_lines.append(
            f"{name}: Earth ({earth_lat:+.4f}, {earth_lon:+.4f}) -> Aresh ({aresh_lat:+.4f}, {aresh_lon:+.4f}) -> px ({x:.1f}, {y:.1f})"
            + (" [in bounds]" if in_bounds else " [out of bounds]")
        )

    base.save(OUTPUT_TOPO_REF_PATH, format="PNG", optimize=True)
    metadata = {
        "source_dem": str(DEM_NPZ_PATH.relative_to(REPO_ROOT)),
        "source_landmask": str(LANDMASK_NPZ_PATH.relative_to(REPO_ROOT)),
        "crop_bounds_aresh": bounds,
        "render_size": {"width": render_width, "height": render_height},
        "orientation_note": "Normalized crop generated to match the current world mental map (Eurasia south).",
        "outputs": {
            "dem": str(OUTPUT_DEM_PATH.relative_to(REPO_ROOT)),
            "topobathy_png": str(OUTPUT_TOPO_PATH.relative_to(REPO_ROOT)),
            "topobathy_current_coast_reference_cities_png": str(OUTPUT_TOPO_REF_PATH.relative_to(REPO_ROOT)),
        },
    }
    OUTPUT_METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf8")
    OUTPUT_REPORT_PATH.write_text("\n".join(report_lines) + "\n", encoding="utf8")
    print(OUTPUT_TOPO_REF_PATH)


if __name__ == "__main__":
    main()
