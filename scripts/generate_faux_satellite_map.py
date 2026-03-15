from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


REPO_ROOT = Path(__file__).resolve().parent.parent
DEM_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
BIOME_PATH = REPO_ROOT / "projected_biomes_v1_world.png"
OUTPUT_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-faux-satellite.webp"


def fractal_noise(shape: tuple[int, int], seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noise = np.zeros(shape, dtype=np.float32)
    for sigma, weight in ((3, 0.5), (9, 0.28), (24, 0.14), (60, 0.08)):
        layer = rng.random(shape, dtype=np.float32)
        layer = ndi.gaussian_filter(layer, sigma=sigma, mode="wrap")
        noise += layer * weight
    noise -= noise.min()
    noise /= max(noise.max(), 1e-6)
    return noise


def normalize(values: np.ndarray, low: float, high: float) -> np.ndarray:
    out = (values - low) / max(high - low, 1e-6)
    return np.clip(out, 0.0, 1.0)


def main() -> None:
    dem_npz = np.load(DEM_PATH)
    land_npz = np.load(LANDMASK_PATH)

    dem = dem_npz["dem_m"][::4, ::4].astype(np.float32)
    landmask = land_npz["landmask"][::4, ::4].astype(bool)
    lats = dem_npz["lats"][::4].astype(np.float32)

    biome_img = Image.open(BIOME_PATH).convert("RGB")
    biome = np.asarray(biome_img, dtype=np.float32) / 255.0

    if biome.shape[:2] != dem.shape:
      raise ValueError(f"Biome image {biome.shape[:2]} does not match DEM {dem.shape}")

    height, width = dem.shape
    lat_grid = np.repeat(lats[:, None], width, axis=1)
    abs_lat = np.abs(lat_grid) / 90.0

    land_elev = np.where(landmask, dem, np.nan)
    elev_fill = np.where(landmask, land_elev, 0.0)
    smooth_elev = ndi.gaussian_filter(elev_fill, sigma=1.4, mode="nearest")
    gy, gx = np.gradient(smooth_elev)
    slope = np.hypot(gx, gy)
    slope_norm = normalize(np.log1p(slope), 0.0, 4.0)

    azimuth = np.deg2rad(315.0)
    altitude = np.deg2rad(42.0)
    x_grad = gx / 120.0
    y_grad = gy / 120.0
    slope_rad = np.pi / 2.0 - np.arctan(np.hypot(x_grad, y_grad))
    aspect = np.arctan2(-x_grad, y_grad)
    hillshade = (
        np.sin(altitude) * np.sin(slope_rad)
        + np.cos(altitude) * np.cos(slope_rad) * np.cos(azimuth - aspect)
    )
    hillshade = np.clip((hillshade + 1.0) * 0.5, 0.0, 1.0)

    ocean = ~landmask
    dist_to_ocean = ndi.distance_transform_edt(landmask)
    dist_to_land = ndi.distance_transform_edt(ocean)

    coastal_land = np.clip(1.0 - dist_to_ocean / 18.0, 0.0, 1.0)
    coastal_ocean = np.clip(1.0 - dist_to_land / 28.0, 0.0, 1.0)

    elev_norm = normalize(np.where(landmask, dem, 0.0), 0.0, 4200.0)
    depth_norm = normalize(np.where(ocean, -dem, 0.0), 0.0, 6200.0)

    noise_a = fractal_noise((height, width), seed=11)
    noise_b = fractal_noise((height, width), seed=29)
    moisture = np.clip(
        0.55 * biome[..., 1] + 0.25 * (1.0 - abs_lat) + 0.2 * noise_a,
        0.0,
        1.0,
    )

    land_rgb = biome.copy()

    vegetation_boost = np.stack(
        (
            0.04 + 0.10 * moisture,
            0.07 + 0.18 * moisture,
            0.02 + 0.04 * moisture,
        ),
        axis=-1,
    )
    arid_boost = np.stack(
        (
            0.10 * (1.0 - moisture),
            0.05 * (1.0 - moisture),
            0.00 * (1.0 - moisture),
        ),
        axis=-1,
    )
    mountain_tint = np.stack(
        (
            0.12 * elev_norm,
            0.10 * elev_norm,
            0.08 * elev_norm,
        ),
        axis=-1,
    )

    land_rgb = land_rgb + vegetation_boost + arid_boost + 0.35 * (noise_b[..., None] - 0.5) * np.array([0.08, 0.10, 0.05], dtype=np.float32)
    land_rgb = land_rgb * (0.78 + 0.42 * hillshade[..., None])
    land_rgb = land_rgb * (1.0 - 0.24 * slope_norm[..., None]) + mountain_tint * 0.18

    beach_mask = landmask & (dist_to_ocean < 5.0) & (elev_norm < 0.12)
    snow_mask = landmask & (((abs_lat > 0.66) & (moisture > 0.35)) | (elev_norm > 0.72))
    rock_mask = landmask & (elev_norm > 0.58) & (slope_norm > 0.38)

    beach_color = np.array([0.86, 0.79, 0.62], dtype=np.float32)
    snow_color = np.array([0.93, 0.96, 0.97], dtype=np.float32)
    rock_color = np.array([0.52, 0.48, 0.42], dtype=np.float32)

    land_rgb[beach_mask] = land_rgb[beach_mask] * 0.35 + beach_color * 0.65
    land_rgb[rock_mask] = land_rgb[rock_mask] * 0.45 + rock_color * 0.55
    land_rgb[snow_mask] = land_rgb[snow_mask] * 0.18 + snow_color * 0.82

    deep_ocean = np.array([0.03, 0.13, 0.24], dtype=np.float32)
    mid_ocean = np.array([0.05, 0.25, 0.39], dtype=np.float32)
    shelf_ocean = np.array([0.12, 0.44, 0.51], dtype=np.float32)
    shallows = np.array([0.24, 0.62, 0.63], dtype=np.float32)

    depth_mix = depth_norm[..., None]
    ocean_rgb = deep_ocean * depth_mix + mid_ocean * (1.0 - depth_mix)
    ocean_rgb = ocean_rgb * (1.0 - coastal_ocean[..., None]) + shelf_ocean * coastal_ocean[..., None]
    near_shore = np.clip(1.0 - dist_to_land / 8.0, 0.0, 1.0)
    ocean_rgb = ocean_rgb * (1.0 - near_shore[..., None]) + shallows * near_shore[..., None]
    ocean_rgb = ocean_rgb * (0.88 + 0.20 * hillshade[..., None]) + 0.05 * noise_a[..., None]

    rgb = np.where(landmask[..., None], land_rgb, ocean_rgb)

    haze = np.clip((abs_lat - 0.72) / 0.28, 0.0, 1.0)
    haze_color = np.array([0.84, 0.89, 0.92], dtype=np.float32)
    rgb = rgb * (1.0 - haze[..., None] * 0.18) + haze_color * (haze[..., None] * 0.18)

    rgb = np.clip(rgb, 0.0, 1.0)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((rgb * 255.0).astype(np.uint8), mode="RGB").save(
        OUTPUT_PATH,
        format="WEBP",
        quality=90,
        method=6,
    )
    print(f"[faux-sat] wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
