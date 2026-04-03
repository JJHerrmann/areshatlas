from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable

import numpy as np
from shapely.geometry import GeometryCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon, box, mapping
from shapely.ops import unary_union


REPO_ROOT = Path(__file__).resolve().parent.parent
KOPTURIA_PATH = REPO_ROOT / "FMG_Data" / "Kopturia_Final.json"
STATE_SVG_PATH = REPO_ROOT / "FMG_Data" / "states_isolated.svg"
STATE_CSV_PATH = REPO_ROOT / "FMG_Data" / "Drakharpan States 2026-04-01-18-47.csv"
NORMALIZED_CROP_META_PATH = REPO_ROOT / "output" / "working" / "aresh_arctic_16x9_normalized_metadata.json"
FALLBACK_CROP_META_PATH = REPO_ROOT / "region_exports" / "aresh_arctic_azgaar_crop" / "aresh_arctic_16x9_metadata.json"

OUTPUT_DIR = REPO_ROOT / "output" / "working"
OUTPUT_GEOJSON_PATH = OUTPUT_DIR / "drakharpan_reoriented_map.geojson"
OUTPUT_GEOSON_PATH = OUTPUT_DIR / "drakharpan_reoriented_map.geoson.json"
OUTPUT_REPORT_PATH = OUTPUT_DIR / "drakharpan_reoriented_map_report.txt"

TOPO_WIDTH = 3600.0
TOPO_HEIGHT = 1800.0
AZGAAR_WIDTH = 3023.0
AZGAAR_HEIGHT = 1562.0
OVERLAY_SCALE = 0.209
OVERLAY_OFFSET_X = 0.626 * TOPO_WIDTH
OVERLAY_OFFSET_Y = 0.364 * TOPO_HEIGHT
ROUTE_BBOX_PAD = 90.0


def resolve_crop_meta_path() -> Path:
    if NORMALIZED_CROP_META_PATH.exists():
        return NORMALIZED_CROP_META_PATH
    if FALLBACK_CROP_META_PATH.exists():
        return FALLBACK_CROP_META_PATH
    raise FileNotFoundError("No Drakharpan crop metadata file found")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf8", errors="replace"))


def load_drakharpan_state_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    lines = STATE_CSV_PATH.read_text(encoding="utf-8-sig").splitlines()
    headers = [header.strip() for header in lines[0].split(",")]
    for line in lines[1:]:
        values = [value.strip() for value in line.split(",")]
        if len(values) != len(headers):
            continue
        row = dict(zip(headers, values))
        if row.get("Id") and row["Id"] != "0":
            rows.append(row)
    return rows


def lon_to_world_x(lon: float) -> float:
    return (lon + 180.0) / 360.0 * TOPO_WIDTH


def lat_to_world_y(lat: float) -> float:
    # Current DEM display orientation is west-up / flipped relative to classic north-up.
    return (90.0 + lat) / 180.0 * TOPO_HEIGHT


def world_x_to_lon(x: float) -> float:
    return x / TOPO_WIDTH * 360.0 - 180.0


def world_y_to_lat(y: float) -> float:
    return y / TOPO_HEIGHT * 180.0 - 90.0


def azgaar_to_world(x: float, y: float) -> tuple[float, float]:
    return (
        OVERLAY_OFFSET_X + OVERLAY_SCALE * x,
        OVERLAY_OFFSET_Y + OVERLAY_SCALE * y,
    )


def world_to_crop_px(
    x: float,
    y: float,
    crop_world_x0: float,
    crop_world_y0: float,
    crop_world_width: float,
    crop_world_height: float,
    crop_px_width: float,
    crop_px_height: float,
) -> tuple[float, float]:
    crop_x = (x - crop_world_x0) / crop_world_width * crop_px_width
    crop_y = (y - crop_world_y0) / crop_world_height * crop_px_height
    return crop_x, crop_y


def tokenize_svg_path(path_data: str) -> list[str]:
    return re.findall(r"[MmLlHhVvZz]|-?\d+(?:\.\d+)?", path_data)


def parse_svg_line_path(path_data: str) -> list[tuple[float, float]]:
    tokens = tokenize_svg_path(path_data)
    points: list[tuple[float, float]] = []
    cursor = 0
    x = 0.0
    y = 0.0
    start_x = 0.0
    start_y = 0.0
    command = ""

    def read_float() -> float:
        nonlocal cursor
        value = float(tokens[cursor])
        cursor += 1
        return value

    while cursor < len(tokens):
        token = tokens[cursor]
        if re.fullmatch(r"[MmLlHhVvZz]", token):
            command = token
            cursor += 1
        if command in {"M", "m"}:
            first = True
            while cursor + 1 <= len(tokens) - 1 and not re.fullmatch(r"[MmLlHhVvZz]", tokens[cursor]):
                dx = read_float()
                dy = read_float()
                if command == "m":
                    x += dx
                    y += dy
                else:
                    x = dx
                    y = dy
                if first:
                    start_x, start_y = x, y
                    first = False
                points.append((x, y))
                command = "l" if command == "m" else "L"
        elif command in {"L", "l"}:
            while cursor + 1 <= len(tokens) - 1 and not re.fullmatch(r"[MmLlHhVvZz]", tokens[cursor]):
                dx = read_float()
                dy = read_float()
                if command == "l":
                    x += dx
                    y += dy
                else:
                    x = dx
                    y = dy
                points.append((x, y))
        elif command in {"H", "h"}:
            while cursor < len(tokens) and not re.fullmatch(r"[MmLlHhVvZz]", tokens[cursor]):
                dx = read_float()
                x = x + dx if command == "h" else dx
                points.append((x, y))
        elif command in {"V", "v"}:
            while cursor < len(tokens) and not re.fullmatch(r"[MmLlHhVvZz]", tokens[cursor]):
                dy = read_float()
                y = y + dy if command == "v" else dy
                points.append((x, y))
        elif command in {"Z", "z"}:
            points.append((start_x, start_y))
        else:
            raise ValueError(f"Unsupported SVG path command in state export: {command}")
    return points


def build_polygon(points: Iterable[tuple[float, float]]) -> Polygon | None:
    coords = list(points)
    if len(coords) < 3:
        return None
    polygon = Polygon(coords)
    if not polygon.is_valid:
        polygon = polygon.buffer(0)
    if polygon.is_empty:
        return None
    if isinstance(polygon, Polygon):
        return polygon
    if isinstance(polygon, MultiPolygon):
        pieces = [piece for piece in polygon.geoms if piece.area > 0]
        return max(pieces, key=lambda poly: poly.area) if pieces else None
    return None


def parse_state_polygons() -> dict[int, Polygon | MultiPolygon]:
    svg_text = STATE_SVG_PATH.read_text(encoding="utf8")
    path_entries = re.findall(r'id="state(\d+)"\s+class="(st\d+)"\s+d="([^"]+)"', svg_text)

    states: dict[int, Polygon | MultiPolygon] = {}
    for sid_str, _css_class, path_data in path_entries:
        sid = int(sid_str)
        subpaths = [chunk.strip() for chunk in re.split(r"(?=[Mm])", path_data) if chunk.strip()]
        polygons: list[Polygon] = []
        for subpath in subpaths:
            try:
                polygon = build_polygon(parse_svg_line_path(subpath))
            except Exception:
                polygon = None
            if polygon is not None:
                polygons.append(polygon)
        if polygons:
            states[sid] = unary_union(polygons)
    return states


def geom_to_aresh_crop_geometry(
    geometry: Polygon | MultiPolygon | LineString | MultiLineString | Point,
    crop_box_world: Polygon,
    crop_world_x0: float,
    crop_world_y0: float,
    crop_world_width: float,
    crop_world_height: float,
    crop_px_width: float,
    crop_px_height: float,
) -> tuple[dict | None, dict | None]:
    world_geometry = transform_azgaar_geometry_to_world(geometry)
    clipped = world_geometry.intersection(crop_box_world)
    if clipped.is_empty:
        return None, None

    geographic = transform_world_geometry_to_lonlat(clipped)
    crop_local = transform_world_geometry_to_crop_px(
        clipped,
        crop_world_x0,
        crop_world_y0,
        crop_world_width,
        crop_world_height,
        crop_px_width,
        crop_px_height,
    )
    return mapping(geographic), mapping(crop_local)


def transform_azgaar_geometry_to_world(
    geometry: Polygon | MultiPolygon | LineString | MultiLineString | Point,
):
    def transform_xy(x: float, y: float) -> tuple[float, float]:
        return azgaar_to_world(x, y)

    return apply_xy_transform(geometry, transform_xy)


def transform_world_geometry_to_lonlat(
    geometry: Polygon | MultiPolygon | LineString | MultiLineString | Point,
):
    def transform_xy(x: float, y: float) -> tuple[float, float]:
        return world_x_to_lon(x), world_y_to_lat(y)

    return apply_xy_transform(geometry, transform_xy)


def transform_world_geometry_to_crop_px(
    geometry: Polygon | MultiPolygon | LineString | MultiLineString | Point,
    crop_world_x0: float,
    crop_world_y0: float,
    crop_world_width: float,
    crop_world_height: float,
    crop_px_width: float,
    crop_px_height: float,
):
    def transform_xy(x: float, y: float) -> tuple[float, float]:
        return world_to_crop_px(
            x,
            y,
            crop_world_x0,
            crop_world_y0,
            crop_world_width,
            crop_world_height,
            crop_px_width,
            crop_px_height,
        )

    return apply_xy_transform(geometry, transform_xy)


def apply_xy_transform(
    geometry: Polygon | MultiPolygon | LineString | MultiLineString | Point | GeometryCollection,
    transform_xy,
):
    if isinstance(geometry, Point):
        x, y = transform_xy(geometry.x, geometry.y)
        return Point(x, y)
    if isinstance(geometry, LineString):
        return LineString([transform_xy(x, y) for x, y in geometry.coords])
    if isinstance(geometry, MultiLineString):
        return MultiLineString([apply_xy_transform(line, transform_xy) for line in geometry.geoms])
    if isinstance(geometry, Polygon):
        exterior = [transform_xy(x, y) for x, y in geometry.exterior.coords]
        interiors = [[transform_xy(x, y) for x, y in ring.coords] for ring in geometry.interiors]
        return Polygon(exterior, interiors)
    if isinstance(geometry, MultiPolygon):
        return MultiPolygon([apply_xy_transform(poly, transform_xy) for poly in geometry.geoms])
    if isinstance(geometry, GeometryCollection):
        return GeometryCollection([apply_xy_transform(part, transform_xy) for part in geometry.geoms])
    raise TypeError(f"Unsupported geometry type: {type(geometry)!r}")


def bbox_intersects(a: dict[str, float], b: dict[str, float], pad: float = 0.0) -> bool:
    return not (
        a["maxX"] < b["minX"] - pad
        or a["minX"] > b["maxX"] + pad
        or a["maxY"] < b["minY"] - pad
        or a["minY"] > b["maxY"] + pad
    )


def state_feature(
    state: dict,
    geometry: Polygon | MultiPolygon,
    crop_box_world: Polygon,
    crop_world_x0: float,
    crop_world_y0: float,
    crop_world_width: float,
    crop_world_height: float,
    crop_px_width: float,
    crop_px_height: float,
) -> dict | None:
    geographic_geom, crop_geom = geom_to_aresh_crop_geometry(
        geometry,
        crop_box_world,
        crop_world_x0,
        crop_world_y0,
        crop_world_width,
        crop_world_height,
        crop_px_width,
        crop_px_height,
    )
    if geographic_geom is None or crop_geom is None:
        return None

    pole = state.get("pole")
    pole_world = azgaar_to_world(float(pole[0]), float(pole[1])) if pole else None
    pole_lonlat = (
        [world_x_to_lon(pole_world[0]), world_y_to_lat(pole_world[1])]
        if pole_world is not None
        else None
    )
    pole_crop = (
        list(
            world_to_crop_px(
                pole_world[0],
                pole_world[1],
                crop_world_x0,
                crop_world_y0,
                crop_world_width,
                crop_world_height,
                crop_px_width,
                crop_px_height,
            )
        )
        if pole_world is not None
        else None
    )

    return {
        "type": "Feature",
        "geometry": geographic_geom,
        "properties": {
            "feature_kind": "state",
            "id": state["id"],
            "name": state["name"],
            "full_name": state["fullName"],
            "form": state.get("form"),
            "state_type": state.get("type"),
            "color": state.get("color"),
            "atlas_color": state.get("atlasColor"),
            "cells": state.get("cells"),
            "burg_count": state.get("burgCount"),
            "culture_id": state.get("cultureId"),
            "pole_aresh_lonlat": pole_lonlat,
            "pole_crop_px": pole_crop,
            "crop_geometry": crop_geom,
        },
    }


def route_feature(
    route: dict,
    crop_bounds_world_bbox: dict[str, float],
    crop_box_world: Polygon,
    crop_world_x0: float,
    crop_world_y0: float,
    crop_world_width: float,
    crop_world_height: float,
    crop_px_width: float,
    crop_px_height: float,
) -> dict | None:
    points = route.get("points") or []
    if len(points) < 2:
        return None
    route_bbox = {
        "minX": min(point[0] for point in points),
        "minY": min(point[1] for point in points),
        "maxX": max(point[0] for point in points),
        "maxY": max(point[1] for point in points),
    }
    if not bbox_intersects(route_bbox, crop_bounds_world_bbox, pad=ROUTE_BBOX_PAD / OVERLAY_SCALE):
        return None

    geometry = LineString([(float(x), float(y)) for x, y in points])
    geographic_geom, crop_geom = geom_to_aresh_crop_geometry(
        geometry,
        crop_box_world,
        crop_world_x0,
        crop_world_y0,
        crop_world_width,
        crop_world_height,
        crop_px_width,
        crop_px_height,
    )
    if geographic_geom is None or crop_geom is None:
        return None

    return {
        "type": "Feature",
        "geometry": geographic_geom,
        "properties": {
            "feature_kind": "route",
            "id": route["id"],
            "group": route.get("group"),
            "feature_id": route.get("featureId"),
            "point_count": route.get("pointCount"),
            "crop_geometry": crop_geom,
        },
    }


def burg_feature(
    burg: dict,
    crop_box_world: Polygon,
    crop_world_x0: float,
    crop_world_y0: float,
    crop_world_width: float,
    crop_world_height: float,
    crop_px_width: float,
    crop_px_height: float,
    selected_state_ids: set[int],
) -> dict | None:
    if int(burg.get("stateId", -1)) not in selected_state_ids:
        return None

    geometry = Point(float(burg["x"]), float(burg["y"]))
    geographic_geom, crop_geom = geom_to_aresh_crop_geometry(
        geometry,
        crop_box_world,
        crop_world_x0,
        crop_world_y0,
        crop_world_width,
        crop_world_height,
        crop_px_width,
        crop_px_height,
    )
    if geographic_geom is None or crop_geom is None:
        return None

    return {
        "type": "Feature",
        "geometry": geographic_geom,
        "properties": {
            "feature_kind": "burg",
            "id": burg["id"],
            "name": burg["name"],
            "state_id": burg.get("stateId"),
            "province_id": burg.get("provinceId"),
            "province_name": burg.get("provinceName"),
            "culture_id": burg.get("cultureId"),
            "feature_id": burg.get("featureId"),
            "cell": burg.get("cell"),
            "capital": burg.get("capital"),
            "port": burg.get("port"),
            "population": burg.get("population"),
            "type": burg.get("type"),
            "group": burg.get("group"),
            "walls": burg.get("walls"),
            "citadel": burg.get("citadel"),
            "temple": burg.get("temple"),
            "crop_geometry": crop_geom,
        },
    }


def main() -> None:
    crop_meta_path = resolve_crop_meta_path()
    crop_meta = load_json(crop_meta_path)
    kopturia = load_json(KOPTURIA_PATH)
    pack = kopturia["pack"]
    state_geometries = parse_state_polygons()
    drakharpan_state_rows = load_drakharpan_state_rows()

    bounds = crop_meta["crop_bounds_aresh"]
    crop_px_width = float(crop_meta["render_size"]["width"])
    crop_px_height = float(crop_meta["render_size"]["height"])

    crop_world_x0 = lon_to_world_x(float(bounds["west"]))
    crop_world_x1 = lon_to_world_x(float(bounds["east"]))
    crop_world_y0 = lat_to_world_y(float(bounds["south"]))
    crop_world_y1 = lat_to_world_y(float(bounds["north"]))
    crop_world_width = crop_world_x1 - crop_world_x0
    crop_world_height = crop_world_y1 - crop_world_y0
    crop_box_world = box(crop_world_x0, crop_world_y0, crop_world_x1, crop_world_y1)

    crop_bounds_world_bbox = {
        "minX": (crop_world_x0 - OVERLAY_OFFSET_X) / OVERLAY_SCALE,
        "minY": (crop_world_y0 - OVERLAY_OFFSET_Y) / OVERLAY_SCALE,
        "maxX": (crop_world_x1 - OVERLAY_OFFSET_X) / OVERLAY_SCALE,
        "maxY": (crop_world_y1 - OVERLAY_OFFSET_Y) / OVERLAY_SCALE,
    }

    states_by_id = {
        int(state["i"]): state
        for state in pack["states"]
        if isinstance(state, dict) and "i" in state
    }
    selected_state_ids = {int(row["Id"]) for row in drakharpan_state_rows}
    selected_states: list[dict] = []
    for row in drakharpan_state_rows:
        state_id = int(row["Id"])
        state = states_by_id.get(state_id)
        if state is None or state_id not in state_geometries:
            continue
        selected_states.append(
            {
                "id": state_id,
                "name": row["State"],
                "fullName": row["Full Name"],
                "form": state.get("formName") or row.get("Form") or state.get("form"),
                "type": state.get("type"),
                "color": row.get("Color") or state.get("color"),
                "atlasColor": state.get("color"),
                "cells": state.get("cells"),
                "burgCount": state.get("burgs"),
                "cultureId": state.get("culture"),
                "pole": state.get("pole"),
            }
        )

    features: list[dict] = []

    for state in selected_states:
        feature = state_feature(
            state,
            state_geometries[int(state["id"])],
            crop_box_world,
            crop_world_x0,
            crop_world_y0,
            crop_world_width,
            crop_world_height,
            crop_px_width,
            crop_px_height,
        )
        if feature is not None:
            features.append(feature)

    for route in pack["routes"]:
        normalized_route = {
            "id": int(route["i"]),
            "group": route.get("group"),
            "featureId": route.get("feature"),
            "pointCount": len(route.get("points") or []),
            "points": [[float(point[0]), float(point[1])] for point in route.get("points") or []],
        }
        feature = route_feature(
            normalized_route,
            crop_bounds_world_bbox,
            crop_box_world,
            crop_world_x0,
            crop_world_y0,
            crop_world_width,
            crop_world_height,
            crop_px_width,
            crop_px_height,
        )
        if feature is not None:
            features.append(feature)

    for burg in pack["burgs"]:
        if not isinstance(burg, dict) or "i" not in burg:
            continue
        normalized_burg = {
            "id": int(burg["i"]),
            "name": burg.get("name"),
            "stateId": burg.get("state"),
            "provinceId": burg.get("province"),
            "provinceName": None,
            "cultureId": burg.get("culture"),
            "featureId": burg.get("feature"),
            "cell": burg.get("cell"),
            "x": float(burg.get("x", 0.0)),
            "y": float(burg.get("y", 0.0)),
            "capital": bool(burg.get("capital")),
            "port": bool(burg.get("port")),
            "population": burg.get("population"),
            "type": burg.get("type"),
            "group": burg.get("group"),
            "walls": bool(burg.get("walls")),
            "citadel": bool(burg.get("citadel")),
            "temple": bool(burg.get("temple")),
        }
        feature = burg_feature(
            normalized_burg,
            crop_box_world,
            crop_world_x0,
            crop_world_y0,
            crop_world_width,
            crop_world_height,
            crop_px_width,
            crop_px_height,
            selected_state_ids,
        )
        if feature is not None:
            features.append(feature)

    collection = {
        "type": "FeatureCollection",
        "metadata": {
            "export_name": "drakharpan_reoriented_map",
            "source_map": str(KOPTURIA_PATH.relative_to(REPO_ROOT)),
            "source_state_svg": str(STATE_SVG_PATH.relative_to(REPO_ROOT)),
            "source_state_csv": str(STATE_CSV_PATH.relative_to(REPO_ROOT)),
            "crop_metadata": str(crop_meta_path.relative_to(REPO_ROOT)),
            "selection_mode": "drakharpan_csv_states_plus_crop_intersecting_routes_and_burgs",
            "selected_state_ids": sorted(selected_state_ids),
            "selected_states": [state["name"] for state in selected_states],
            "azgaar_to_world_transform": {
                "scale": OVERLAY_SCALE,
                "offset_x": OVERLAY_OFFSET_X,
                "offset_y": OVERLAY_OFFSET_Y,
                "world_size": [TOPO_WIDTH, TOPO_HEIGHT],
                "azgaar_size": [AZGAAR_WIDTH, AZGAAR_HEIGHT],
            },
            "crop_bounds_aresh": bounds,
            "crop_size_px": [crop_px_width, crop_px_height],
            "geometry_crs": "Aresh geographic lon/lat in the current vertically flipped world orientation",
            "alternate_geometry": "properties.crop_geometry stores the same feature in Drakharpan crop-local pixel space",
        },
        "features": features,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_GEOJSON_PATH.write_text(json.dumps(collection, indent=2), encoding="utf8")
    OUTPUT_GEOSON_PATH.write_text(json.dumps(collection, indent=2), encoding="utf8")

    counts: dict[str, int] = {}
    route_groups: dict[str, int] = {}
    for feature in features:
        kind = str(feature["properties"]["feature_kind"])
        counts[kind] = counts.get(kind, 0) + 1
        if kind == "route":
            group = str(feature["properties"].get("group") or "unknown")
            route_groups[group] = route_groups.get(group, 0) + 1

    lines = [
        "Drakharpan Reoriented Map Export",
        "================================",
        "",
        f"Crop metadata: {crop_meta_path.relative_to(REPO_ROOT)}",
        f"Source map data: {KOPTURIA_PATH.relative_to(REPO_ROOT)}",
        f"Source isolated states SVG: {STATE_SVG_PATH.relative_to(REPO_ROOT)}",
        f"Source state CSV: {STATE_CSV_PATH.relative_to(REPO_ROOT)}",
        "",
        "Outputs",
        "-------",
        f"GeoJSON: {OUTPUT_GEOJSON_PATH.relative_to(REPO_ROOT)}",
        f"GEOSON copy: {OUTPUT_GEOSON_PATH.relative_to(REPO_ROOT)}",
        "",
        "Selected states",
        "---------------",
        ", ".join(state["name"] for state in selected_states),
        "",
        "Feature counts",
        "--------------",
    ]
    for kind in sorted(counts):
        lines.append(f"{kind}: {counts[kind]}")
    if route_groups:
        lines.extend(["", "Route groups", "------------"])
        for group in sorted(route_groups):
            lines.append(f"{group}: {route_groups[group]}")

    OUTPUT_REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf8")
    print(OUTPUT_GEOJSON_PATH)
    print(OUTPUT_GEOSON_PATH)
    print(OUTPUT_REPORT_PATH)


if __name__ == "__main__":
    main()
