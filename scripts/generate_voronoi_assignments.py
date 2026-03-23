from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DATA_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-map-data.json"
L1_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-voronoi-l1-region.json"
L2_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-voronoi-l2-state.json"
L1_ASSIGNED_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-voronoi-l1-region-assigned.json"
L2_ASSIGNED_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-voronoi-l2-state-assigned.json"

TOPO_WIDTH = 3600
TOPO_HEIGHT = 1800
AZGAAR_WIDTH = 3023
AZGAAR_HEIGHT = 1562
UI_SCALE_X = 0.209
UI_SCALE_Y = 0.209
UI_OFFSET_X = 0.626 * TOPO_WIDTH
UI_OFFSET_Y = 0.364 * TOPO_HEIGHT
BBOX_PAD = 18


def transform_point(x: float, y: float) -> tuple[float, float]:
    base_x = x * (TOPO_WIDTH / AZGAAR_WIDTH)
    base_y = y * (TOPO_HEIGHT / AZGAAR_HEIGHT)
    return (UI_OFFSET_X + base_x * UI_SCALE_X, UI_OFFSET_Y + base_y * UI_SCALE_Y)


def transform_bbox(bbox: dict[str, float]) -> dict[str, float]:
    x0, y0 = transform_point(bbox["minX"], bbox["minY"])
    x1, y1 = transform_point(bbox["maxX"], bbox["maxY"])
    return {"minX": x0, "minY": y0, "maxX": x1, "maxY": y1}


def bbox_intersects(a: dict[str, float], b: dict[str, float]) -> bool:
    return not (
        a["maxX"] < b["minX"]
        or a["minX"] > b["maxX"]
        or a["maxY"] < b["minY"]
        or a["minY"] > b["maxY"]
    )


def point_in_bbox(x: float, y: float, bbox: dict[str, float], pad: float = 0) -> bool:
    return (
        bbox["minX"] - pad <= x <= bbox["maxX"] + pad
        and bbox["minY"] - pad <= y <= bbox["maxY"] + pad
    )


def distance_sq(ax: float, ay: float, bx: float, by: float) -> float:
    return (ax - bx) ** 2 + (ay - by) ** 2


def main() -> None:
    map_data = json.loads(MAP_DATA_PATH.read_text(encoding="utf8"))
    l1 = json.loads(L1_PATH.read_text(encoding="utf8"))
    l2 = json.loads(L2_PATH.read_text(encoding="utf8"))

    l1_bounds = l1["metadata"]["bounds"]
    l1_bbox = {
        "minX": l1_bounds["x0"],
        "minY": l1_bounds["y0"],
        "maxX": l1_bounds["x1"],
        "maxY": l1_bounds["y1"],
    }

    candidate_states: list[dict[str, object]] = []
    for state in map_data["states"]:
        if not state.get("pole") or not state.get("bbox"):
            continue
        transformed_bbox = transform_bbox(state["bbox"])
        if not bbox_intersects(transformed_bbox, l1_bbox):
            continue
        pole_x, pole_y = transform_point(state["pole"][0], state["pole"][1])
        candidate_states.append(
            {
                "id": state["id"],
                "name": state["name"],
                "fullName": state["fullName"],
                "form": state.get("form"),
                "type": state.get("type"),
                "color": state.get("color"),
                "pole_x": pole_x,
                "pole_y": pole_y,
                "bbox": transformed_bbox,
            }
        )

    l1_assigned_cells = []
    l1_centroids = []
    for cell in l1["cells"]:
        x = cell["centroid_x"]
        y = cell["centroid_y"]
        candidates = [
            state
            for state in candidate_states
            if point_in_bbox(x, y, state["bbox"], BBOX_PAD)
        ]
        pool = candidates if candidates else candidate_states
        chosen = min(
            pool,
            key=lambda state: distance_sq(x, y, state["pole_x"], state["pole_y"]),
        )
        assigned = {
            **cell,
            "state_id": chosen["id"],
            "state_name": chosen["name"],
            "state_full_name": chosen["fullName"],
            "state_form": chosen["form"],
            "state_type": chosen["type"],
            "state_color": chosen["color"],
        }
        l1_assigned_cells.append(assigned)
        l1_centroids.append((cell["id"], x, y, chosen["id"], chosen["name"]))

    l2_assigned_cells = []
    for cell in l2["cells"]:
        x = cell["centroid_x"]
        y = cell["centroid_y"]
        parent = min(
            l1_centroids,
            key=lambda item: distance_sq(x, y, item[1], item[2]),
        )
        l2_assigned_cells.append(
            {
                **cell,
                "parent_l1_id": parent[0],
                "state_id": parent[3],
                "state_name": parent[4],
            }
        )

    l1_out = {
        "metadata": {
            **l1["metadata"],
            "assignment_mode": "nearest_transformed_state_pole_with_bbox_preference",
            "candidate_state_count": len(candidate_states),
        },
        "candidate_states": candidate_states,
        "cells": l1_assigned_cells,
    }
    l2_out = {
        "metadata": {
            **l2["metadata"],
            "assignment_mode": "inherit_from_nearest_l1_centroid",
        },
        "cells": l2_assigned_cells,
    }

    L1_ASSIGNED_PATH.write_text(json.dumps(l1_out, indent=2), encoding="utf8")
    L2_ASSIGNED_PATH.write_text(json.dumps(l2_out, indent=2), encoding="utf8")

    summary = {}
    for cell in l1_assigned_cells:
        summary[cell["state_name"]] = summary.get(cell["state_name"], 0) + 1

    print(
        json.dumps(
            {
                "l1_assigned": str(L1_ASSIGNED_PATH),
                "l2_assigned": str(L2_ASSIGNED_PATH),
                "candidate_states": [state["name"] for state in candidate_states],
                "l1_summary": summary,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
