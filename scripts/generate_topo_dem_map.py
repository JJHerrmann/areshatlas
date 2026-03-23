from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


REPO_ROOT = Path(__file__).resolve().parent.parent
DEM_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
OUTPUT_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-topo-dem.webp"


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


def main() -> None:
    dem_npz = np.load(DEM_PATH)
    land_npz = np.load(LANDMASK_PATH)

    dem = dem_npz["dem_m"][::4, ::4].astype(np.float32)
    landmask = land_npz["landmask"][::4, ::4].astype(bool)
    ocean = ~landmask

    smoothed = ndi.gaussian_filter(dem, sigma=1.25, mode="nearest")
    hillshade = make_hillshade(smoothed)
    dist_to_ocean = ndi.distance_transform_edt(landmask)
    dist_to_land = ndi.distance_transform_edt(ocean)

    elev_norm = normalize(np.where(landmask, dem, 0.0), 0.0, 5200.0)
    depth_norm = normalize(np.where(ocean, -dem, 0.0), 0.0, 7200.0)
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

    rgb = np.where(landmask[..., None], land_rgb, ocean_rgb)
    rgb = np.clip(rgb, 0.0, 1.0)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((rgb * 255.0).astype(np.uint8), mode="RGB").save(
        OUTPUT_PATH,
        format="WEBP",
        quality=92,
        method=6,
    )
    print(f"[topo] wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
