from __future__ import annotations

import base64
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


REPO_ROOT = Path(__file__).resolve().parent.parent
DEM_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
BIOME_PATH = REPO_ROOT / "projected_biomes_v1_world.png"
OUTPUT_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-faux-satellite-8k.webp"
EXPORT_DIR = REPO_ROOT / "output" / "map_renders"
PNG_EXPORT_PATH = EXPORT_DIR / "areshnaat-faux-satellite-8k.png"
SVG_EXPORT_PATH = EXPORT_DIR / "areshnaat-faux-satellite-8k.svg"

TARGET_WIDTH = 7680
TARGET_HEIGHT = 3840


def fractal_noise(shape: tuple[int, int], seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noise = np.zeros(shape, dtype=np.float32)
    for sigma, weight in ((4, 0.45), (12, 0.28), (30, 0.17), (70, 0.10)):
        layer = rng.random(shape, dtype=np.float32)
        layer = ndi.gaussian_filter(layer, sigma=sigma, mode="wrap")
        noise += layer * weight
    noise -= noise.min()
    noise /= max(noise.max(), 1e-6)
    return noise


def normalize(values: np.ndarray, low: float, high: float) -> np.ndarray:
    out = (values - low) / max(high - low, 1e-6)
    return np.clip(out, 0.0, 1.0)


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    t = normalize(values, edge0, edge1)
    return t * t * (3.0 - 2.0 * t)


def blend(a: np.ndarray, b: np.ndarray, factor: np.ndarray) -> np.ndarray:
    return a * (1.0 - factor[..., None]) + b * factor[..., None]


def hillshade(surface: np.ndarray) -> np.ndarray:
    gy, gx = np.gradient(surface)
    azimuth = np.deg2rad(315.0)
    altitude = np.deg2rad(42.0)
    x_grad = gx / 120.0
    y_grad = gy / 120.0
    slope_rad = np.pi / 2.0 - np.arctan(np.hypot(x_grad, y_grad))
    aspect = np.arctan2(-x_grad, y_grad)
    shade = (
        np.sin(altitude) * np.sin(slope_rad)
        + np.cos(altitude) * np.cos(slope_rad) * np.cos(azimuth - aspect)
    )
    return np.clip((shade + 1.0) * 0.5, 0.0, 1.0)


def resize_rgb(path: Path, size: tuple[int, int]) -> np.ndarray:
    image = Image.open(path).convert("RGB").resize(size, Image.Resampling.BICUBIC)
    return np.asarray(image, dtype=np.float32) / 255.0


def resize_mask(mask: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    image = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    resized = image.resize(size, Image.Resampling.NEAREST)
    return np.asarray(resized, dtype=np.uint8) > 127


def climate_tint(abs_lat: np.ndarray, moisture: np.ndarray) -> np.ndarray:
    equatorial = np.array([0.03, 0.10, 0.02], dtype=np.float32)
    subtropical = np.array([0.09, 0.05, -0.01], dtype=np.float32)
    temperate = np.array([0.02, 0.04, 0.01], dtype=np.float32)
    boreal = np.array([-0.03, 0.02, 0.04], dtype=np.float32)
    polar = np.array([0.08, 0.08, 0.08], dtype=np.float32)

    equatorial_band = smoothstep(0.0, 0.12, 0.18 - abs_lat)
    subtropical_band = smoothstep(0.12, 0.26, abs_lat) * smoothstep(0.44, 0.28, abs_lat)
    temperate_band = smoothstep(0.26, 0.42, abs_lat) * smoothstep(0.64, 0.44, abs_lat)
    boreal_band = smoothstep(0.44, 0.62, abs_lat) * smoothstep(0.84, 0.62, abs_lat)
    polar_band = smoothstep(0.72, 0.96, abs_lat)

    tint = (
        equatorial_band[..., None] * equatorial * (0.55 + 0.45 * moisture[..., None])
        + subtropical_band[..., None] * subtropical * (1.10 - 0.35 * moisture[..., None])
        + temperate_band[..., None] * temperate
        + boreal_band[..., None] * boreal
        + polar_band[..., None] * polar
    )
    return tint


def main() -> None:
    dem_npz = np.load(DEM_PATH)
    land_npz = np.load(LANDMASK_PATH)

    dem = dem_npz["dem_m"][::2, ::2].astype(np.float32)
    landmask = land_npz["landmask"][::2, ::2].astype(bool)
    lats = dem_npz["lats"][::2].astype(np.float32)

    working_height, working_width = dem.shape
    biome = resize_rgb(BIOME_PATH, (working_width, working_height))
    # Legacy biome export is north/south inverted relative to the corrected DEM stack.
    biome = biome[::-1, :, :]
    ocean = ~landmask

    lat_grid = np.repeat(lats[:, None], working_width, axis=1)
    abs_lat = np.abs(lat_grid) / 90.0

    smooth_elev = ndi.gaussian_filter(np.where(landmask, dem, 0.0), sigma=1.5, mode="nearest")
    shade = hillshade(smooth_elev)
    gy, gx = np.gradient(smooth_elev)
    slope = np.hypot(gx, gy)
    slope_norm = normalize(np.log1p(slope), 0.0, 4.5)

    dist_to_ocean = ndi.distance_transform_edt(landmask)
    dist_to_land = ndi.distance_transform_edt(ocean)

    elev_norm = normalize(np.where(landmask, dem, 0.0), 0.0, 4500.0)
    depth_norm = normalize(np.where(ocean, -dem, 0.0), 0.0, 6500.0)

    noise_a = fractal_noise((working_height, working_width), seed=11)
    noise_b = fractal_noise((working_height, working_width), seed=29)
    moisture = np.clip(
        0.48 * biome[..., 1] + 0.24 * (1.0 - abs_lat) + 0.18 * noise_a + 0.10 * (1.0 - slope_norm),
        0.0,
        1.0,
    )

    land_rgb = biome.copy()

    rainforest_mask = landmask & (biome[..., 0] > 0.78) & (biome[..., 1] < 0.56) & (biome[..., 2] < 0.46)
    grassland_mask = landmask & (biome[..., 0] > 0.84) & (biome[..., 1] > 0.72) & (biome[..., 2] < 0.46)
    desert_mask = landmask & (abs_lat < 0.36) & (moisture < 0.32) & (elev_norm < 0.5)

    rainforest_color = np.array([0.11, 0.31, 0.14], dtype=np.float32)
    grassland_color = np.array([0.69, 0.75, 0.27], dtype=np.float32)
    desert_color = np.array([0.78, 0.70, 0.41], dtype=np.float32)

    land_rgb[rainforest_mask] = land_rgb[rainforest_mask] * 0.14 + rainforest_color * 0.86
    land_rgb[grassland_mask] = land_rgb[grassland_mask] * 0.26 + grassland_color * 0.74
    land_rgb[desert_mask] = land_rgb[desert_mask] * 0.22 + desert_color * 0.78

    vegetation = np.stack(
        (
            0.03 + 0.06 * moisture,
            0.05 + 0.14 * moisture,
            0.01 + 0.03 * moisture,
        ),
        axis=-1,
    )
    aridity = np.stack(
        (
            0.08 * (1.0 - moisture),
            0.05 * (1.0 - moisture),
            0.00 * (1.0 - moisture),
        ),
        axis=-1,
    )
    climate = climate_tint(abs_lat, moisture)
    mountain = np.stack(
        (
            0.10 * elev_norm,
            0.08 * elev_norm,
            0.07 * elev_norm,
        ),
        axis=-1,
    )

    land_rgb = land_rgb + vegetation + aridity + climate
    land_rgb = land_rgb + 0.28 * (noise_b[..., None] - 0.5) * np.array([0.10, 0.12, 0.07], dtype=np.float32)
    land_rgb = land_rgb * (0.80 + 0.38 * shade[..., None])
    land_rgb = land_rgb * (1.0 - 0.22 * slope_norm[..., None]) + mountain * 0.16

    beach_mask = landmask & (dist_to_ocean < 6.0) & (elev_norm < 0.14)
    snow_mask = landmask & (((abs_lat > 0.70) & (moisture > 0.35)) | (elev_norm > 0.76))
    rock_mask = landmask & (elev_norm > 0.60) & (slope_norm > 0.34)

    beach_color = np.array([0.86, 0.80, 0.64], dtype=np.float32)
    snow_color = np.array([0.94, 0.97, 0.98], dtype=np.float32)
    rock_color = np.array([0.52, 0.48, 0.43], dtype=np.float32)

    land_rgb[beach_mask] = land_rgb[beach_mask] * 0.34 + beach_color * 0.66
    land_rgb[rock_mask] = land_rgb[rock_mask] * 0.44 + rock_color * 0.56
    land_rgb[snow_mask] = land_rgb[snow_mask] * 0.14 + snow_color * 0.86

    deep_ocean = np.array([0.03, 0.11, 0.23], dtype=np.float32)
    mid_ocean = np.array([0.05, 0.23, 0.37], dtype=np.float32)
    shelf_ocean = np.array([0.11, 0.42, 0.50], dtype=np.float32)
    shallows = np.array([0.24, 0.63, 0.64], dtype=np.float32)

    ocean_rgb = blend(mid_ocean, deep_ocean, depth_norm)
    ocean_rgb = blend(ocean_rgb, shelf_ocean, smoothstep(0.0, 0.24, 1.0 - depth_norm))
    near_shore = np.clip(1.0 - dist_to_land / 9.0, 0.0, 1.0)
    ocean_rgb = blend(ocean_rgb, shallows, near_shore)
    ocean_rgb = ocean_rgb * (0.87 + 0.18 * shade[..., None]) + 0.04 * noise_a[..., None]

    polar_haze = smoothstep(0.72, 0.98, abs_lat)
    haze_color = np.array([0.83, 0.88, 0.92], dtype=np.float32)

    rgb = np.where(landmask[..., None], land_rgb, ocean_rgb)
    rgb = rgb * (1.0 - polar_haze[..., None] * 0.16) + haze_color * (polar_haze[..., None] * 0.16)
    rgb = np.clip(rgb, 0.0, 1.0)

    rgb_uint8 = (rgb * 255.0).astype(np.uint8)
    image = Image.fromarray(rgb_uint8, mode="RGB").resize(
        (TARGET_WIDTH, TARGET_HEIGHT),
        Image.Resampling.LANCZOS,
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_PATH, format="WEBP", quality=90, method=6)
    image.save(PNG_EXPORT_PATH, format="PNG", optimize=True)

    png_bytes = PNG_EXPORT_PATH.read_bytes()
    png_b64 = base64.b64encode(png_bytes).decode("ascii")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{TARGET_WIDTH}" height="{TARGET_HEIGHT}" viewBox="0 0 {TARGET_WIDTH} {TARGET_HEIGHT}">
  <image href="data:image/png;base64,{png_b64}" width="{TARGET_WIDTH}" height="{TARGET_HEIGHT}" preserveAspectRatio="none"/>
</svg>
"""
    SVG_EXPORT_PATH.write_text(svg, encoding="utf8")

    print(f"[faux-sat-8k] wrote {OUTPUT_PATH}")
    print(f"[faux-sat-8k] wrote {PNG_EXPORT_PATH}")
    print(f"[faux-sat-8k] wrote {SVG_EXPORT_PATH}")


if __name__ == "__main__":
    main()
