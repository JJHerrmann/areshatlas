from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.spatial import cKDTree


REPO_ROOT = Path(__file__).resolve().parent.parent
DEM_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
OUTPUT_DIR = REPO_ROOT / "output" / "working"
CSV_PATH = OUTPUT_DIR / "areshnaat_land_traversal_cells.csv"
META_PATH = OUTPUT_DIR / "areshnaat_land_traversal_cells_metadata.json"
OVERLAY_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-land-traversal-cells-overlay.webp"

RNG_SEED = 42
DOWNSAMPLE = 4
SPACING = 10
JITTER = 3


def normalize(values: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = (values - low) / max(high - low, 1e-6)
    return np.clip(scaled, 0.0, 1.0)


def world_surfaces() -> tuple[np.ndarray, np.ndarray]:
    dem = np.load(DEM_PATH)["dem_m"][::DOWNSAMPLE, ::DOWNSAMPLE].astype(np.float32)
    landmask = np.load(LANDMASK_PATH)["landmask"][::DOWNSAMPLE, ::DOWNSAMPLE].astype(bool)
    return dem, landmask


def generate_seed_points(mask: np.ndarray, spacing: int, jitter: int) -> np.ndarray:
    rng = np.random.default_rng(RNG_SEED)
    height, width = mask.shape
    points: list[tuple[int, int]] = []

    for y0 in range(0, height, spacing):
      for x0 in range(0, width, spacing):
        y1 = min(y0 + spacing, height)
        x1 = min(x0 + spacing, width)
        window = mask[y0:y1, x0:x1]
        if not window.any():
            continue

        land_positions = np.argwhere(window)
        center = np.array([(y1 - y0 - 1) / 2.0, (x1 - x0 - 1) / 2.0])
        distances = np.sum((land_positions - center) ** 2, axis=1)
        local_y, local_x = land_positions[int(np.argmin(distances))]

        jitter_y = int(rng.integers(-jitter, jitter + 1))
        jitter_x = int(rng.integers(-jitter, jitter + 1))
        sample_y = int(np.clip(y0 + local_y + jitter_y, y0, y1 - 1))
        sample_x = int(np.clip(x0 + local_x + jitter_x, x0, x1 - 1))
        if not mask[sample_y, sample_x]:
            sample_y, sample_x = y0 + int(local_y), x0 + int(local_x)

        points.append((sample_x, sample_y))

    return np.array(points, dtype=np.int32)


def assign_cells(mask: np.ndarray, points_xy: np.ndarray) -> np.ndarray:
    labels = np.full(mask.shape, -1, dtype=np.int32)
    land_yx = np.argwhere(mask)
    tree = cKDTree(points_xy[:, ::-1])
    _, indices = tree.query(land_yx, k=1)
    labels[land_yx[:, 0], land_yx[:, 1]] = indices.astype(np.int32)
    return labels


def build_boundaries(labels: np.ndarray) -> np.ndarray:
    boundary = np.zeros(labels.shape, dtype=bool)
    valid = labels >= 0
    horizontal = valid[:, 1:] & valid[:, :-1] & (labels[:, 1:] != labels[:, :-1])
    vertical = valid[1:, :] & valid[:-1, :] & (labels[1:, :] != labels[:-1, :])
    boundary[:, 1:] |= horizontal
    boundary[:, :-1] |= horizontal
    boundary[1:, :] |= vertical
    boundary[:-1, :] |= vertical
    return ndi.binary_dilation(boundary, iterations=1)


def save_overlay(path: Path, boundary: np.ndarray) -> None:
    rgba = np.zeros((*boundary.shape, 4), dtype=np.uint8)
    rgba[..., 0] = 245
    rgba[..., 1] = 237
    rgba[..., 2] = 210
    rgba[..., 3] = np.where(boundary, 168, 0).astype(np.uint8)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(path, format="WEBP", quality=92, method=6)


def lonlat_from_xy(x: float, y: float, width: int, height: int) -> tuple[float, float]:
    lon = (x / width) * 360.0 - 180.0
    lat = 90.0 - (y / height) * 180.0
    return lat, lon


def classify_profile(score: float, mean_slope_deg: float, ruggedness_m: float, coast_distance_km: float) -> str:
    if score >= 85 and ruggedness_m < 140 and mean_slope_deg < 4.5:
        return "open"
    if score >= 72:
        return "easy"
    if score >= 58:
        return "moderate"
    if score >= 42:
        return "rough"
    if score >= 26:
        return "severe"
    if coast_distance_km < 18 and mean_slope_deg > 12:
        return "cliffed_coast"
    return "extreme"


def main() -> None:
    dem, landmask = world_surfaces()
    height, width = dem.shape

    smoothed_dem = ndi.gaussian_filter(dem, sigma=1.1, mode="nearest")
    gy, gx = np.gradient(smoothed_dem)
    slope = np.degrees(np.arctan(np.hypot(gx, gy) / 11.12))
    local_relief = ndi.maximum_filter(smoothed_dem, size=9) - ndi.minimum_filter(smoothed_dem, size=9)
    coast_distance_px = ndi.distance_transform_edt(landmask)
    points_xy = generate_seed_points(landmask, spacing=SPACING, jitter=JITTER)
    labels = assign_cells(landmask, points_xy)
    boundaries = build_boundaries(labels)

    land_yx = np.argwhere(labels >= 0)
    ys = land_yx[:, 0]
    xs = land_yx[:, 1]
    cell_ids = labels[ys, xs]
    cell_count = len(points_xy)

    areas = np.bincount(cell_ids, minlength=cell_count)
    sum_x = np.bincount(cell_ids, weights=xs, minlength=cell_count)
    sum_y = np.bincount(cell_ids, weights=ys, minlength=cell_count)
    mean_elev = np.bincount(cell_ids, weights=smoothed_dem[ys, xs], minlength=cell_count) / np.maximum(areas, 1)
    mean_slope = np.bincount(cell_ids, weights=slope[ys, xs], minlength=cell_count) / np.maximum(areas, 1)
    mean_relief = np.bincount(cell_ids, weights=local_relief[ys, xs], minlength=cell_count) / np.maximum(areas, 1)
    mean_coast_dist = np.bincount(cell_ids, weights=coast_distance_px[ys, xs], minlength=cell_count) / np.maximum(areas, 1)
    min_elev = np.full(cell_count, np.inf, dtype=np.float32)
    max_elev = np.full(cell_count, -np.inf, dtype=np.float32)
    np.minimum.at(min_elev, cell_ids, smoothed_dem[ys, xs])
    np.maximum.at(max_elev, cell_ids, smoothed_dem[ys, xs])

    elev_penalty = normalize(np.maximum(mean_elev, 0.0), 0.0, 3200.0)
    slope_penalty = normalize(mean_slope, 0.0, 24.0)
    rugged_penalty = normalize(mean_relief, 0.0, 900.0)
    coast_bonus = 1.0 - normalize(mean_coast_dist, 0.0, 120.0)
    traversal_score = (
        100.0
        - slope_penalty * 42.0
        - rugged_penalty * 28.0
        - elev_penalty * 18.0
        + coast_bonus * 8.0
    )
    traversal_score = np.clip(traversal_score, 0.0, 100.0)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    save_overlay(OVERLAY_PATH, boundaries)
    with CSV_PATH.open("w", newline="", encoding="utf8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "cell_id",
                "seed_x",
                "seed_y",
                "centroid_x",
                "centroid_y",
                "centroid_lat",
                "centroid_lon",
                "area_px",
                "mean_elevation_m",
                "min_elevation_m",
                "max_elevation_m",
                "mean_slope_deg",
                "ruggedness_m",
                "coast_distance_px",
                "coast_distance_km",
                "traversal_score",
                "traversal_profile",
            ]
        )

        for cell_id, (seed_x, seed_y) in enumerate(points_xy):
            area = int(areas[cell_id])
            centroid_x = float(sum_x[cell_id] / area) if area else float(seed_x)
            centroid_y = float(sum_y[cell_id] / area) if area else float(seed_y)
            centroid_lat, centroid_lon = lonlat_from_xy(centroid_x, centroid_y, width, height)
            coast_distance_px_value = float(mean_coast_dist[cell_id])
            coast_distance_km = coast_distance_px_value * 11.12
            score = float(traversal_score[cell_id])
            profile = classify_profile(
                score=score,
                mean_slope_deg=float(mean_slope[cell_id]),
                ruggedness_m=float(mean_relief[cell_id]),
                coast_distance_km=coast_distance_km,
            )
            writer.writerow(
                [
                    cell_id,
                    int(seed_x),
                    int(seed_y),
                    round(centroid_x, 2),
                    round(centroid_y, 2),
                    round(centroid_lat, 6),
                    round(centroid_lon, 6),
                    area,
                    round(float(mean_elev[cell_id]), 2),
                    round(float(min_elev[cell_id]), 2),
                    round(float(max_elev[cell_id]), 2),
                    round(float(mean_slope[cell_id]), 2),
                    round(float(mean_relief[cell_id]), 2),
                    round(coast_distance_px_value, 2),
                    round(coast_distance_km, 2),
                    round(score, 2),
                    profile,
                ]
            )

    profile_counts: dict[str, int] = {}
    for value in traversal_score:
        pass
    for cell_id in range(cell_count):
        profile = classify_profile(
            score=float(traversal_score[cell_id]),
            mean_slope_deg=float(mean_slope[cell_id]),
            ruggedness_m=float(mean_relief[cell_id]),
            coast_distance_km=float(mean_coast_dist[cell_id]) * 11.12,
        )
        profile_counts[profile] = profile_counts.get(profile, 0) + 1

    metadata = {
        "source_dem": str(DEM_PATH.relative_to(REPO_ROOT)),
        "source_landmask": str(LANDMASK_PATH.relative_to(REPO_ROOT)),
        "downsample": DOWNSAMPLE,
        "spacing": SPACING,
        "jitter": JITTER,
        "cell_count": int(cell_count),
        "world_shape": {"width": int(width), "height": int(height)},
        "notes": [
            "Land-only Voronoi cells against the -62 m coastline-derived landmask.",
            "Traversal score favors low slope, low ruggedness, low elevation, and nearer-coast lowlands.",
            "Pixel coordinates are in the rotated Aresh world raster space used by the current DEM stack.",
        ],
        "profile_counts": profile_counts,
        "outputs": {
            "csv": str(CSV_PATH.relative_to(REPO_ROOT)),
            "overlay": str(OVERLAY_PATH.relative_to(REPO_ROOT)),
        },
    }
    META_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
