from __future__ import annotations

import json
from pathlib import Path

from lib.aresh_spherical_transform import (
    build_aresh_basis,
    earth_to_aresh_lonlat,
    round_trip_error,
)


ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "output" / "map_renders" / "aresh_spherical_rotation_reference.json"
OUT_TXT = ROOT / "output" / "map_renders" / "aresh_spherical_rotation_reference.txt"


SAMPLES = {
    "Anchor (should map to Aresh 0,0)": (38.977580555555555, -9.27326388888889),
    "Nome": (64.5011, -165.4064),
    "Hooper Bay": (61.5314, -166.0967),
    "Anchorage": (61.2181, -149.9003),
    "Yakutat": (59.5469444, -139.7272222),
    "Dutch Harbor": (53.8897, -166.5419),
}


def main() -> None:
    basis = build_aresh_basis()
    json_payload = {
        "method": "explicit spherical basis remap",
        "anchor_that_becomes_aresh_0_0": {
            "latitude": basis["anchor_lat"],
            "longitude": basis["anchor_lon"],
        },
        "basis_vectors_earth_xyz": {
            "aresh_x_equator_prime": basis["earth_from_aresh"][:, 0].tolist(),
            "aresh_y_east_at_anchor": basis["earth_from_aresh"][:, 1].tolist(),
            "aresh_z_north_pole": basis["earth_from_aresh"][:, 2].tolist(),
        },
        "matrices": {
            "earth_from_aresh": basis["earth_from_aresh"].tolist(),
            "aresh_from_earth": basis["aresh_from_earth"].tolist(),
        },
        "samples": {
            name: {
                "earth_lat": lat,
                "earth_lon": lon,
                "aresh_lat": earth_to_aresh_lonlat(lat, lon)[0],
                "aresh_lon": earth_to_aresh_lonlat(lat, lon)[1],
                "round_trip": round_trip_error(lat, lon),
            }
            for name, (lat, lon) in SAMPLES.items()
        },
    }

    lines = [
        "Aresh spherical rotation reference",
        "=================================",
        "",
        "Method: explicit spherical basis remap",
        f"Anchor that becomes Aresh 0,0: lat={basis['anchor_lat']:.12f}, lon={basis['anchor_lon']:.12f}",
        "",
        "Basis vectors in Earth xyz",
        "--------------------------",
        f"aresh_x_equator_prime = {basis['earth_from_aresh'][:, 0].tolist()}",
        f"aresh_y_east_at_anchor = {basis['earth_from_aresh'][:, 1].tolist()}",
        f"aresh_z_north_pole = {basis['earth_from_aresh'][:, 2].tolist()}",
        "",
        "Sample conversions",
        "------------------",
    ]

    for name, (lat, lon) in SAMPLES.items():
        sample = round_trip_error(lat, lon)
        lines.append(
            f"{name}: Earth ({lat:+.6f}, {lon:+.6f}) -> "
            f"Aresh ({sample['aresh_lat']:+.6f}, {sample['aresh_lon']:+.6f}) -> "
            f"round trip error lat={sample['lat_error_deg']:+.12f}, lon={sample['lon_error_deg']:+.12f}"
        )

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(json_payload, indent=2), encoding="utf-8")
    OUT_TXT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(OUT_JSON)
    print(OUT_TXT)


if __name__ == "__main__":
    main()
