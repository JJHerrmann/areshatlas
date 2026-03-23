from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
METADATA_PATH = REPO_ROOT / "aresh_rebuild" / "GEBCO_BATHY_TOPO_ARESH" / "GEBCO_BATHY_TOPO_ARESH_metadata.json"


def lonlat_to_unit_vector(lat_deg: float, lon_deg: float) -> np.ndarray:
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    cos_lat = math.cos(lat)
    return np.array(
        [
            cos_lat * math.cos(lon),
            cos_lat * math.sin(lon),
            math.sin(lat),
        ],
        dtype=np.float64,
    )


def unit_vector_to_lonlat(vec: np.ndarray) -> tuple[float, float]:
    x, y, z = vec.tolist()
    lon = math.degrees(math.atan2(y, x))
    lat = math.degrees(math.asin(max(-1.0, min(1.0, z))))
    return lat, lon


def local_east_north_up(lat_deg: float, lon_deg: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)

    east = np.array(
        [
            -math.sin(lon),
            math.cos(lon),
            0.0,
        ],
        dtype=np.float64,
    )
    north = np.array(
        [
            -math.sin(lat) * math.cos(lon),
            -math.sin(lat) * math.sin(lon),
            math.cos(lat),
        ],
        dtype=np.float64,
    )
    up = lonlat_to_unit_vector(lat_deg, lon_deg)
    return east, north, up


def load_aresh_rotation_metadata() -> dict[str, Any]:
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))


def build_aresh_basis() -> dict[str, Any]:
    metadata = load_aresh_rotation_metadata()
    anchor = metadata["rotation_logic"]["anchor_that_becomes_aresh_0_0"]
    anchor_lat = float(anchor["latitude"])
    anchor_lon = float(anchor["longitude"])

    east, north, up = local_east_north_up(anchor_lat, anchor_lon)

    # Aresh basis from metadata:
    # x-axis: Aresh (0,0) point on the sphere
    # y-axis: Aresh east at the anchor = Earth north
    # z-axis: Aresh north at the anchor = Earth west = -Earth east
    x_axis = up
    y_axis = north
    z_axis = -east

    earth_from_aresh = np.column_stack([x_axis, y_axis, z_axis])
    aresh_from_earth = earth_from_aresh.T

    return {
        "anchor_lat": anchor_lat,
        "anchor_lon": anchor_lon,
        "earth_from_aresh": earth_from_aresh,
        "aresh_from_earth": aresh_from_earth,
    }


def earth_to_aresh_lonlat(lat_deg: float, lon_deg: float) -> tuple[float, float]:
    basis = build_aresh_basis()
    earth_vec = lonlat_to_unit_vector(lat_deg, lon_deg)
    aresh_vec = basis["aresh_from_earth"] @ earth_vec
    return unit_vector_to_lonlat(aresh_vec)


def aresh_to_earth_lonlat(lat_deg: float, lon_deg: float) -> tuple[float, float]:
    basis = build_aresh_basis()
    aresh_vec = lonlat_to_unit_vector(lat_deg, lon_deg)
    earth_vec = basis["earth_from_aresh"] @ aresh_vec
    return unit_vector_to_lonlat(earth_vec)


def normalized_lon(lon_deg: float) -> float:
    lon = ((lon_deg + 180.0) % 360.0) - 180.0
    # Prefer +180 over -180 only when exactly there.
    if lon == -180.0:
        return 180.0
    return lon


def round_trip_error(lat_deg: float, lon_deg: float) -> dict[str, float]:
    a_lat, a_lon = earth_to_aresh_lonlat(lat_deg, lon_deg)
    e_lat, e_lon = aresh_to_earth_lonlat(a_lat, a_lon)
    return {
        "input_lat": lat_deg,
        "input_lon": lon_deg,
        "aresh_lat": a_lat,
        "aresh_lon": normalized_lon(a_lon),
        "round_trip_lat": e_lat,
        "round_trip_lon": normalized_lon(e_lon),
        "lat_error_deg": e_lat - lat_deg,
        "lon_error_deg": normalized_lon(e_lon) - normalized_lon(lon_deg),
    }
