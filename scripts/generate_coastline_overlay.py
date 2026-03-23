from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parent.parent
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
OUTPUT_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-coastline.svg"


Point = tuple[int, int]
Segment = tuple[Point, Point]


def normalize_polyline(polyline: list[Point]) -> list[Point]:
    if len(polyline) <= 2:
        return polyline

    normalized = [polyline[0]]
    previous_direction: Point | None = None

    for index in range(1, len(polyline) - 1):
        a = normalized[-1]
        b = polyline[index]
        c = polyline[index + 1]
        dir_ab = (b[0] - a[0], b[1] - a[1])
        dir_bc = (c[0] - b[0], c[1] - b[1])
        if dir_ab == dir_bc and previous_direction == dir_ab:
            continue
        normalized.append(b)
        previous_direction = dir_ab

    normalized.append(polyline[-1])
    return normalized


def build_segments(mask: np.ndarray) -> list[Segment]:
    height, width = mask.shape
    segments: list[Segment] = []

    for y in range(height):
        for x in range(width - 1):
            if mask[y, x] != mask[y, x + 1]:
                segments.append(((x + 1, y), (x + 1, y + 1)))

    for y in range(height - 1):
        for x in range(width):
            if mask[y, x] != mask[y + 1, x]:
                segments.append(((x, y + 1), (x + 1, y + 1)))

    return segments


def stitch_segments(segments: list[Segment]) -> list[list[Point]]:
    adjacency: dict[Point, list[Point]] = defaultdict(list)
    edge_counts: dict[tuple[Point, Point], int] = defaultdict(int)

    for a, b in segments:
        adjacency[a].append(b)
        adjacency[b].append(a)
        key = (a, b) if a <= b else (b, a)
        edge_counts[key] += 1

    visited: set[tuple[Point, Point]] = set()
    polylines: list[list[Point]] = []

    for a, b in segments:
        key = (a, b) if a <= b else (b, a)
        if key in visited:
            continue

        line = [a, b]
        visited.add(key)

        changed = True
        while changed:
            changed = False
            start = line[0]
            for neighbor in adjacency[start]:
                edge_key = (start, neighbor) if start <= neighbor else (neighbor, start)
                if edge_key in visited:
                    continue
                visited.add(edge_key)
                line.insert(0, neighbor)
                changed = True
                break

            end = line[-1]
            for neighbor in adjacency[end]:
                edge_key = (end, neighbor) if end <= neighbor else (neighbor, end)
                if edge_key in visited:
                    continue
                visited.add(edge_key)
                line.append(neighbor)
                changed = True
                break

        polylines.append(normalize_polyline(line))

    return polylines


def polyline_to_path(polyline: list[Point]) -> str:
    if len(polyline) < 2:
      return ""
    start = polyline[0]
    parts = [f"M{start[0]},{start[1]}"]
    for x, y in polyline[1:]:
        parts.append(f"L{x},{y}")
    return " ".join(parts)


def main() -> None:
    land_npz = np.load(LANDMASK_PATH)
    landmask = land_npz["landmask"][::4, ::4].astype(bool)
    height, width = landmask.shape

    segments = build_segments(landmask)
    polylines = stitch_segments(segments)
    path_data = " ".join(
        polyline_to_path(polyline) for polyline in polylines if len(polyline) >= 4
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" preserveAspectRatio="none">
  <g id="coastline">
    <path d="{path_data}" fill="none" stroke="#d8f9ff" stroke-opacity="0.88" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="{path_data}" fill="none" stroke="#54d8e9" stroke-opacity="0.48" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>
"""

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(svg, encoding="utf8")
    print(f"[coastline] wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
