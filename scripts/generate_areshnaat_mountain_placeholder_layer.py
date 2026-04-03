from __future__ import annotations

import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None


ROOT = Path(__file__).resolve().parents[1]
DEM_PATH = ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
LAND_PATH = ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
SVG_PATH = ROOT / "FMG_Data" / "aresh_world_drakharpan_v2.svg"
PREVIEW_BASE = ROOT / "output" / "working" / "areshnaat_fmg_heightmap.png"
FRAGMENT_PATH = ROOT / "output" / "working" / "areshnaat_mountain_placeholder_layer.svgfrag"
REPORT_PATH = ROOT / "output" / "working" / "areshnaat_mountain_placeholder_layer_report.txt"
PREVIEW_PATH = ROOT / "output" / "working" / "areshnaat_mountain_placeholder_layer_preview.png"

# Appalachian-or-better placeholder selection.
ELEVATION_MIN_M = 900.0
LOCAL_RELIEF_WINDOW = 31
LOCAL_RELIEF_MIN_M = 700.0
WRAP_DILATION_PX = 3
WRAP_CLOSING_PX = 1
MIN_COMPONENT_AREA_PX = 12000
SIMPLIFY_EPSILON_PX = 10.0

LAYER_OPEN = (
    '  <g id="mountain_placeholder_cells" clip-path="url(#land_clip)" '
    'fill="#8f6b32" fill-opacity="0.38" stroke="#5f4318" stroke-width="3" '
    'stroke-opacity="0.9" stroke-dasharray="14,10" stroke-linejoin="round">'
)
LAYER_CLOSE = "  </g>"


def load_grids() -> tuple[np.ndarray, np.ndarray]:
    dem = np.load(DEM_PATH)["dem_m"]
    land = np.load(LAND_PATH)["landmask"].astype(bool)

    # The SVG is a 7200x3600 equirectangular canvas, so 2x max-pooling
    # matches the raster directly to SVG pixel space.
    dem = dem.reshape(3600, 2, 7200, 2).max(axis=(1, 3))
    land = land.reshape(3600, 2, 7200, 2).max(axis=(1, 3))

    # DEM rows run south->north; SVG y runs north->south.
    return dem[::-1, :], land[::-1, :]


def build_wrap_mask(dem: np.ndarray, land: np.ndarray) -> np.ndarray:
    masked = np.where(land, dem, -99999.0)
    relief = ndimage.maximum_filter(masked, size=LOCAL_RELIEF_WINDOW, mode="nearest")
    relief -= ndimage.minimum_filter(masked, size=LOCAL_RELIEF_WINDOW, mode="nearest")

    core = land & (dem >= ELEVATION_MIN_M) & (relief >= LOCAL_RELIEF_MIN_M)
    wrap = ndimage.binary_dilation(core, iterations=WRAP_DILATION_PX)
    wrap = ndimage.binary_closing(wrap, iterations=WRAP_CLOSING_PX)
    wrap = ndimage.binary_fill_holes(wrap)
    return wrap & land


def extract_components(mask: np.ndarray) -> list[dict[str, object]]:
    labels, count = ndimage.label(mask)
    objects = ndimage.find_objects(labels)
    sizes = np.bincount(labels.ravel())[1:]
    components: list[dict[str, object]] = []

    for idx in range(1, count + 1):
        area = int(sizes[idx - 1])
        if area < MIN_COMPONENT_AREA_PX:
            continue

        sl = objects[idx - 1]
        if sl is None:
            continue

        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop

        local = (labels[y0:y1, x0:x1] == idx).astype(np.uint8) * 255
        contours, _ = cv2.findContours(local, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        contour = max(contours, key=cv2.contourArea)
        epsilon = max(SIMPLIFY_EPSILON_PX, 0.003 * cv2.arcLength(contour, True))
        contour = cv2.approxPolyDP(contour, epsilon, True)
        points = [(int(pt[0][0] + x0), int(pt[0][1] + y0)) for pt in contour]
        if len(points) < 3:
            continue

        components.append(
            {
                "area_px": area,
                "bbox": (x0, y0, x1, y1),
                "points": points,
            }
        )

    components.sort(key=lambda item: int(item["area_px"]), reverse=True)
    return components


def component_to_path(points: list[tuple[int, int]]) -> str:
    head_x, head_y = points[0]
    segments = [f"M{head_x},{head_y}"]
    segments.extend(f"L{x},{y}" for x, y in points[1:])
    segments.append("Z")
    return " ".join(segments)


def write_fragment(components: list[dict[str, object]]) -> str:
    lines = [LAYER_OPEN]
    for idx, component in enumerate(components, start=1):
        bbox = component["bbox"]
        area = component["area_px"]
        path = component_to_path(component["points"])
        lines.append(
            f'    <path id="mountain_wrap_{idx:02d}" '
            f'data-area-px="{area}" '
            f'data-bbox="{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}" '
            f'd="{path}"/>'
        )
    lines.append(LAYER_CLOSE)
    fragment = "\n".join(lines) + "\n"
    FRAGMENT_PATH.write_text(fragment, encoding="utf-8")
    return fragment


def update_svg(fragment: str) -> None:
    svg = SVG_PATH.read_text(encoding="utf-8")
    pattern = re.compile(
        r"(?ms)^  <g id=\"mountain_placeholder_cells\".*?^  </g>\n"
    )
    replacement_count = 0
    svg, replacement_count = pattern.subn(fragment, svg, count=1)
    if replacement_count != 1:
        raise RuntimeError("Could not replace mountain_placeholder_cells layer in SVG.")
    SVG_PATH.write_text(svg, encoding="utf-8")


def write_report(components: list[dict[str, object]]) -> None:
    lines = [
        "Areshnaat terrain-driven mountain placeholder cells",
        "===============================================",
        f"Source DEM: {DEM_PATH.relative_to(ROOT)}",
        f"Source landmask: {LAND_PATH.relative_to(ROOT)}",
        f"Elevation minimum: {ELEVATION_MIN_M:.0f} m",
        f"Local relief window: {LOCAL_RELIEF_WINDOW} px",
        f"Local relief minimum: {LOCAL_RELIEF_MIN_M:.0f} m",
        f"Dilation: {WRAP_DILATION_PX} px",
        f"Closing: {WRAP_CLOSING_PX} px",
        f"Minimum component area: {MIN_COMPONENT_AREA_PX} px",
        f"Retained components: {len(components)}",
        "",
    ]
    for idx, component in enumerate(components, start=1):
        x0, y0, x1, y1 = component["bbox"]
        lines.append(
            f"{idx:02d}. area={component['area_px']} bbox=({x0},{y0})-({x1},{y1}) "
            f"points={len(component['points'])}"
        )
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_preview(components: list[dict[str, object]]) -> None:
    base = Image.open(PREVIEW_BASE).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    scale_x = base.width / 7200.0
    scale_y = base.height / 3600.0

    for component in components:
        points = [
            (x * scale_x, y * scale_y) for x, y in component["points"]
        ]
        draw.polygon(points, fill=(143, 107, 50, 105), outline=(95, 67, 24, 210))

    preview = Image.alpha_composite(base, overlay)
    preview.save(PREVIEW_PATH)


def main() -> None:
    dem, land = load_grids()
    wrap = build_wrap_mask(dem, land)
    components = extract_components(wrap)
    fragment = write_fragment(components)
    update_svg(fragment)
    write_report(components)
    write_preview(components)
    print(f"Updated {SVG_PATH}")
    print(f"Components: {len(components)}")
    print(f"Fragment: {FRAGMENT_PATH}")
    print(f"Report: {REPORT_PATH}")
    print(f"Preview: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
