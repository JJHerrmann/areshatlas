from __future__ import annotations

import json
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parent.parent
LANDMASK_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_landmask_m62_0p025deg.npz"
MAP_DATA_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-map-data.json"
OUTPUT_PATH = REPO_ROOT / "Areshnaat_orientation_climate_report.txt"


def latitude_from_y(y: float, height: int) -> float:
    # The DEM-facing map stack is now vertically flipped, so the new latitude
    # sign is the inverse of the legacy north/south reading from the Azgaar map.
    old_lat = 90.0 - (180.0 * float(y) / max(height - 1, 1))
    return -old_lat


def annual_mean_temp_c(lat: float) -> float:
    abs_lat = abs(lat)
    anchors = [
        (0.0, 27.0),
        (10.0, 26.0),
        (20.0, 24.0),
        (30.0, 20.0),
        (40.0, 14.0),
        (50.0, 9.0),
        (60.0, 3.0),
        (70.0, -6.0),
        (80.0, -16.0),
        (90.0, -28.0),
    ]

    for (lat0, temp0), (lat1, temp1) in zip(anchors, anchors[1:]):
        if abs_lat <= lat1:
            factor = (abs_lat - lat0) / (lat1 - lat0)
            return temp0 + (temp1 - temp0) * factor
    return anchors[-1][1]


def pole_analog_description(land_fraction: float) -> str:
    if land_fraction >= 0.55:
        return "Antarctica / East Antarctic ice-cap style: a mostly continental polar cap"
    if land_fraction <= 0.35:
        return "Arctic Ocean / Greenland-Svalbard style: a mostly oceanic polar cap"
    return "Canadian Arctic / Greenland edge style: a mixed polar sea with strong continental rims"


def main() -> None:
    land_npz = np.load(LANDMASK_PATH)
    landmask = land_npz["landmask"][::4, ::4].astype(bool)[::-1, :]
    map_data = json.loads(MAP_DATA_PATH.read_text(encoding="utf8"))
    state_name_by_id = {
        int(state["id"]): state.get("fullName") or state.get("name") or f"State {state['id']}"
        for state in map_data.get("states", [])
        if state.get("id") is not None
    }

    height = int(map_data["metadata"]["height"])
    belt_rows = max(1, round(landmask.shape[0] * 0.05))

    north_land_fraction = float(landmask[:belt_rows, :].mean())
    south_land_fraction = float(landmask[-belt_rows:, :].mean())

    burgs = map_data.get("burgs", [])
    capitals = [burg for burg in burgs if burg.get("capital")]
    equator_line = sorted(
        burgs,
        key=lambda burg: (abs(latitude_from_y(burg["y"], height)), -float(burg.get("population") or 0.0)),
    )[:12]
    capitals_for_report = sorted(capitals, key=lambda burg: abs(latitude_from_y(burg["y"], height)))[:15]

    lines: list[str] = []
    lines.append("Areshnaat Orientation / Climate Note")
    lines.append("=" * 40)
    lines.append("")
    lines.append("The DEM-facing map stack has been vertically flipped so the topo, coastline, faux-satellite, and globe outputs now share the same north/south orientation.")
    lines.append("")
    lines.append("Pole analogs")
    lines.append("-" * 11)
    lines.append(
        f"New North Pole: {pole_analog_description(north_land_fraction)} "
        f"(top 5% belt land coverage: {north_land_fraction * 100:.1f}%)."
    )
    lines.append(
        f"New South Pole: {pole_analog_description(south_land_fraction)} "
        f"(bottom 5% belt land coverage: {south_land_fraction * 100:.1f}%)."
    )
    lines.append("")
    lines.append("Cities closest to the new equator")
    lines.append("-" * 29)
    for burg in equator_line:
      new_lat = latitude_from_y(burg["y"], height)
      lines.append(
          f"{burg['name']} ({state_name_by_id.get(int(burg.get('stateId') or 0), 'Unknown state')}): "
          f"{new_lat:+.2f}°, est. annual mean {annual_mean_temp_c(new_lat):.1f} C"
      )

    lines.append("")
    lines.append("Capital city latitude / temperature comparison")
    lines.append("-" * 42)
    lines.append(
        "Because this was a pole swap rather than an obliquity change, absolute latitude is unchanged. "
        "First-order solar temperature estimates therefore stay effectively the same; only hemisphere labels invert."
    )
    lines.append("")
    for burg in capitals_for_report:
        old_lat = -latitude_from_y(burg["y"], height)
        new_lat = latitude_from_y(burg["y"], height)
        old_temp = annual_mean_temp_c(old_lat)
        new_temp = annual_mean_temp_c(new_lat)
        lines.append(
            f"{burg['name']} ({state_name_by_id.get(int(burg.get('stateId') or 0), 'Unknown state')}): "
            f"old {old_lat:+.2f}° -> {old_temp:.1f} C, "
            f"new {new_lat:+.2f}° -> {new_temp:.1f} C"
        )

    OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf8")
    print(
        json.dumps(
            {
                "output": str(OUTPUT_PATH),
                "equatorCities": len(equator_line),
                "capitalComparisons": len(capitals_for_report),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
