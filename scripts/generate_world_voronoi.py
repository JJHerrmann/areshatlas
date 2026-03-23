from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.spatial import cKDTree


REPO_ROOT = Path(__file__).resolve().parent.parent
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
MAPS_DIR = REPO_ROOT / "public" / "maps"
JSON_DIR = REPO_ROOT / "public" / "azgaar"

RNG_SEED = 42


def world_mask() -> np.ndarray:
    land_npz = np.load(LANDMASK_PATH)
    return land_npz["landmask"][::4, ::4].astype(bool)


def region_bounds(width: int, height: int) -> tuple[int, int, int, int]:
    x0 = int(round(width * 0.626))
    y0 = int(round(height * 0.364))
    x1 = int(round(width * (0.626 + 0.209)))
    y1 = int(round(height * (0.364 + 0.209)))
    return x0, y0, x1, y1


def state_bounds(region: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = region
    width = x1 - x0
    height = y1 - y0
    inner_w = int(round(width * 0.42))
    inner_h = int(round(height * 0.42))
    inner_x0 = x0 + int(round(width * 0.28))
    inner_y0 = y0 + int(round(height * 0.28))
    return inner_x0, inner_y0, inner_x0 + inner_w, inner_y0 + inner_h


def generate_seed_points(mask: np.ndarray, spacing: int, jitter: int, seed_offset: int = 0) -> np.ndarray:
    rng = np.random.default_rng(RNG_SEED + seed_offset)
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
    point_yx = points_xy[:, ::-1]
    tree = cKDTree(point_yx)
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


def build_cell_records(labels: np.ndarray, points_xy: np.ndarray, origin_x: int, origin_y: int) -> list[dict[str, float | int]]:
    valid = labels >= 0
    cell_ids = labels[valid]
    ys, xs = np.nonzero(valid)
    count = len(points_xy)
    areas = np.bincount(cell_ids, minlength=count)
    sum_x = np.bincount(cell_ids, weights=xs, minlength=count)
    sum_y = np.bincount(cell_ids, weights=ys, minlength=count)

    records: list[dict[str, float | int]] = []
    for index, (seed_x, seed_y) in enumerate(points_xy):
        area = int(areas[index])
        centroid_x = float(sum_x[index] / area) if area else float(seed_x)
        centroid_y = float(sum_y[index] / area) if area else float(seed_y)
        records.append(
            {
                "id": index,
                "seed_x": int(seed_x + origin_x),
                "seed_y": int(seed_y + origin_y),
                "centroid_x": round(centroid_x + origin_x, 2),
                "centroid_y": round(centroid_y + origin_y, 2),
                "area_px": area,
            }
        )
    return records


def save_overlay(path: Path, boundary: np.ndarray, color: tuple[int, int, int], alpha: int) -> None:
    rgba = np.zeros((*boundary.shape, 4), dtype=np.uint8)
    rgba[..., 0] = color[0]
    rgba[..., 1] = color[1]
    rgba[..., 2] = color[2]
    rgba[..., 3] = np.where(boundary, alpha, 0).astype(np.uint8)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(path, format="WEBP", quality=92, method=6)


def write_level(
    name: str,
    mask: np.ndarray,
    bounds: tuple[int, int, int, int],
    spacing: int,
    jitter: int,
    seed_offset: int,
    color: tuple[int, int, int],
    alpha: int,
) -> dict[str, object]:
    x0, y0, x1, y1 = bounds
    cropped = mask[y0:y1, x0:x1]
    points_xy = generate_seed_points(cropped, spacing, jitter, seed_offset)
    labels = assign_cells(cropped, points_xy)
    boundary = build_boundaries(labels)
    records = build_cell_records(labels, points_xy, x0, y0)

    overlay_path = MAPS_DIR / f"areshnaat-voronoi-{name}.webp"
    json_path = JSON_DIR / f"areshnaat-voronoi-{name}.json"
    save_overlay(overlay_path, boundary, color, alpha)

    payload = {
        "metadata": {
            "name": name,
            "width": int(mask.shape[1]),
            "height": int(mask.shape[0]),
            "bounds": {"x0": x0, "y0": y0, "x1": x1, "y1": y1},
            "seed_count": int(len(points_xy)),
            "spacing": spacing,
            "jitter": jitter,
        },
        "cells": records,
    }
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf8")

    return {
      "name": name,
      "overlay": str(overlay_path),
      "cells": str(json_path),
      "seed_count": len(points_xy),
      "bounds": [x0, y0, x1, y1],
    }


def main() -> None:
    mask = world_mask()
    height, width = mask.shape
    world = (0, 0, width, height)
    region = region_bounds(width, height)
    state = state_bounds(region)

    results = [
        write_level("l0-world", mask, world, spacing=18, jitter=6, seed_offset=0, color=(112, 221, 242), alpha=140),
        write_level("l1-region", mask, region, spacing=8, jitter=3, seed_offset=100, color=(255, 214, 102), alpha=180),
        write_level("l2-state", mask, state, spacing=4, jitter=2, seed_offset=200, color=(255, 141, 87), alpha=210),
    ]

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
