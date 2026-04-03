from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Polygon, mapping
from shapely.ops import unary_union


REPO_ROOT = Path(__file__).resolve().parent.parent
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
DEM_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.npz"
ROTATION_REF_PATH = REPO_ROOT / "output" / "map_renders" / "aresh_spherical_rotation_reference.json"

OUTPUT_DIR = REPO_ROOT / "output" / "working"
OUTPUT_GEOSON_PATH = OUTPUT_DIR / "areshnaat_world_reference.geoson.json"
OUTPUT_REPORT_PATH = OUTPUT_DIR / "areshnaat_world_reference_report.txt"

DOWNSAMPLE = 4
MIN_AREA_DEG2 = 0.05
APPROX_EPSILON_PX = 1.0
GRATICULE_STEP_DEG = 30


def load_npz(path: Path) -> dict[str, np.ndarray]:
    loaded = np.load(path)
    return {key: loaded[key] for key in loaded.files}


def contour_to_ring(
    contour: np.ndarray,
    lons: np.ndarray,
    lats: np.ndarray,
) -> list[tuple[float, float]]:
    pts = contour.reshape(-1, 2)
    ring: list[tuple[float, float]] = []
    height = len(lats)
    width = len(lons)
    for x_px, y_px in pts:
        x_idx = min(max(int(x_px), 0), width - 1)
        y_idx = min(max(int(y_px), 0), height - 1)
        ring.append((float(lons[x_idx]), float(lats[y_idx])))
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def build_land_polygons(mask: np.ndarray, lons: np.ndarray, lats: np.ndarray) -> MultiPolygon:
    mask_u8 = (mask.astype(np.uint8) * 255)
    contours, hierarchy = cv2.findContours(mask_u8, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None:
        return MultiPolygon([])

    hierarchy = hierarchy[0]
    polygons: list[Polygon] = []
    for idx, contour in enumerate(contours):
        parent = hierarchy[idx][3]
        if parent != -1:
            continue

        shell_contour = cv2.approxPolyDP(contour, APPROX_EPSILON_PX, True)
        shell = contour_to_ring(shell_contour, lons, lats)
        holes: list[list[tuple[float, float]]] = []

        child = hierarchy[idx][2]
        while child != -1:
            hole_contour = cv2.approxPolyDP(contours[child], APPROX_EPSILON_PX, True)
            hole = contour_to_ring(hole_contour, lons, lats)
            if len(hole) >= 4:
                holes.append(hole)
            child = hierarchy[child][0]

        if len(shell) < 4:
            continue
        polygon = Polygon(shell, holes)
        if not polygon.is_valid:
            polygon = polygon.buffer(0)
        if polygon.is_empty:
            continue
        if isinstance(polygon, Polygon):
            if polygon.area >= MIN_AREA_DEG2:
                polygons.append(polygon)
        elif isinstance(polygon, MultiPolygon):
            polygons.extend([piece for piece in polygon.geoms if piece.area >= MIN_AREA_DEG2])

    merged = unary_union(polygons) if polygons else MultiPolygon([])
    if isinstance(merged, Polygon):
        return MultiPolygon([merged])
    if isinstance(merged, MultiPolygon):
        return merged
    return MultiPolygon([])


def build_coastlines(land: MultiPolygon) -> MultiLineString:
    lines: list[LineString] = []
    for polygon in land.geoms:
        lines.append(LineString(polygon.exterior.coords))
        for ring in polygon.interiors:
            lines.append(LineString(ring.coords))
    return MultiLineString(lines)


def build_graticule(step_deg: int = GRATICULE_STEP_DEG) -> list[dict]:
    features: list[dict] = []
    for lon in range(-180, 181, step_deg):
        coords = [[float(lon), float(lat)] for lat in range(-90, 91, 2)]
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {"feature_kind": "graticule", "axis": "longitude", "value": lon},
            }
        )
    for lat in range(-90, 91, step_deg):
        coords = [[float(lon), float(lat)] for lon in range(-180, 181, 2)]
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {"feature_kind": "graticule", "axis": "latitude", "value": lat},
            }
        )
    return features


def build_anchor_features(rotation_ref: dict) -> list[dict]:
    features: list[dict] = []
    for name, sample in rotation_ref.get("samples", {}).items():
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        float(sample["aresh_lon"]),
                        float(sample["aresh_lat"]),
                    ],
                },
                "properties": {
                    "feature_kind": "anchor_point",
                    "name": name,
                    "earth_lat": sample.get("earth_lat"),
                    "earth_lon": sample.get("earth_lon"),
                    "aresh_lat": sample.get("aresh_lat"),
                    "aresh_lon": sample.get("aresh_lon"),
                    "round_trip": sample.get("round_trip"),
                },
            }
        )
    return features


def main() -> None:
    landmask_npz = load_npz(LANDMASK_PATH)
    dem_npz = load_npz(DEM_PATH)
    rotation_ref = json.loads(ROTATION_REF_PATH.read_text(encoding="utf8"))

    landmask = landmask_npz["landmask"][::DOWNSAMPLE, ::DOWNSAMPLE].astype(bool)
    lats = landmask_npz["lats"][::DOWNSAMPLE]
    lons = landmask_npz["lons"][::DOWNSAMPLE]
    dem = dem_npz["dem_m"][::DOWNSAMPLE, ::DOWNSAMPLE]

    land = build_land_polygons(landmask, lons, lats)
    coastlines = build_coastlines(land)

    land_area_deg2 = float(sum(poly.area for poly in land.geoms))
    land_polygons_count = len(land.geoms)
    coastline_segments_count = len(coastlines.geoms)
    min_elev = float(np.nanmin(dem))
    max_elev = float(np.nanmax(dem))

    features = [
        {
            "type": "Feature",
            "geometry": mapping(land),
            "properties": {
                "feature_kind": "land_polygons",
                "source": str(LANDMASK_PATH.relative_to(REPO_ROOT)),
                "sea_level_baseline_m": -62.0,
                "polygon_count": land_polygons_count,
                "downsample": DOWNSAMPLE,
            },
        },
        {
            "type": "Feature",
            "geometry": mapping(coastlines),
            "properties": {
                "feature_kind": "coastlines",
                "source": str(LANDMASK_PATH.relative_to(REPO_ROOT)),
                "sea_level_baseline_m": -62.0,
                "segment_count": coastline_segments_count,
                "downsample": DOWNSAMPLE,
            },
        },
    ]
    features.extend(build_graticule())
    features.extend(build_anchor_features(rotation_ref))

    payload = {
        "type": "FeatureCollection",
        "metadata": {
            "export_name": "areshnaat_world_reference",
            "purpose": "Canonical world-scale Areshnaat reference layer for fitting external political vectors onto the Aresh globe.",
            "geometry_crs": "Aresh geographic lon/lat",
            "bounds": {"west": -180.0, "south": -90.0, "east": 180.0, "north": 90.0},
            "orientation": {
                "display": "aresh_north_up",
                "top_of_image": "aresh_north = earth_west",
                "right_of_image": "aresh_east = earth_north",
            },
            "sources": {
                "landmask": str(LANDMASK_PATH.relative_to(REPO_ROOT)),
                "dem": str(DEM_PATH.relative_to(REPO_ROOT)),
                "spherical_rotation_reference": str(ROTATION_REF_PATH.relative_to(REPO_ROOT)),
            },
            "sea_level_baseline_m": -62.0,
            "downsample": DOWNSAMPLE,
            "grid_shape": {
                "height": int(landmask.shape[0]),
                "width": int(landmask.shape[1]),
            },
            "elevation_range_m": {"min": min_elev, "max": max_elev},
            "land_polygon_count": land_polygons_count,
            "coastline_segment_count": coastline_segments_count,
            "land_area_deg2_estimate": land_area_deg2,
            "rotation_logic": rotation_ref,
        },
        "features": features,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_GEOSON_PATH.write_text(json.dumps(payload, indent=2), encoding="utf8")

    lines = [
        "Areshnaat World Reference GEOSON",
        "================================",
        "",
        f"Output: {OUTPUT_GEOSON_PATH.relative_to(REPO_ROOT)}",
        "",
        "Sources",
        "-------",
        f"Landmask: {LANDMASK_PATH.relative_to(REPO_ROOT)}",
        f"DEM: {DEM_PATH.relative_to(REPO_ROOT)}",
        f"Spherical rotation reference: {ROTATION_REF_PATH.relative_to(REPO_ROOT)}",
        "",
        "Summary",
        "-------",
        f"Downsample: {DOWNSAMPLE}",
        f"Grid shape: {landmask.shape[1]} x {landmask.shape[0]}",
        f"Land polygons: {land_polygons_count}",
        f"Coastline segments: {coastline_segments_count}",
        f"Land area estimate (deg^2): {land_area_deg2:.2f}",
        f"Elevation range (m): {min_elev:.2f} to {max_elev:.2f}",
        "",
        "Included feature kinds",
        "----------------------",
        "land_polygons",
        "coastlines",
        "graticule",
        "anchor_point",
    ]
    OUTPUT_REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf8")
    print(OUTPUT_GEOSON_PATH)
    print(OUTPUT_REPORT_PATH)


if __name__ == "__main__":
    main()
