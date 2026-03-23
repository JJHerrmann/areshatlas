from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parent.parent
MAP_DATA_PATH = REPO_ROOT / "public" / "azgaar" / "areshnaat-map-data.json"
CROP_META_PATH = REPO_ROOT / "region_exports" / "aresh_arctic_azgaar_crop" / "aresh_arctic_16x9_metadata.json"
PLATE_PATH = REPO_ROOT / "region_exports" / "aresh_arctic_azgaar_crop" / "aresh_arctic_16x9_topobathy.png"
OUTPUT_IMAGE = REPO_ROOT / "output" / "map_renders" / "drakharpan_on_plate_estimate.png"
OUTPUT_REPORT = REPO_ROOT / "Drakharpan_plate_estimate.txt"

TOPO_WIDTH = 3600
TOPO_HEIGHT = 1800
OVERLAY_SCALE = 0.209
OVERLAY_OFFSET_X = 62.6 / 100.0 * TOPO_WIDTH
OVERLAY_OFFSET_Y = 36.4 / 100.0 * TOPO_HEIGHT

DRAKHARPAN_STATES = {
    "Kanchasuyu",
    "Xilhuan",
    "Naharcan",
    "Raamkoda",
    "Petrello",
    "Riagan",
    "Nekosdamkoda",
}


def lon_to_x(lon: float, width: float = TOPO_WIDTH) -> float:
    return (lon + 180.0) / 360.0 * width


def lat_to_y(lat: float, height: float = TOPO_HEIGHT) -> float:
    # Current DEM display orientation is vertically flipped from classic north-up.
    return (90.0 + lat) / 180.0 * height


def main() -> None:
    crop_meta = json.loads(CROP_META_PATH.read_text(encoding="utf8"))
    map_data = json.loads(MAP_DATA_PATH.read_text(encoding="utf8"))

    crop_bounds = crop_meta["crop_bounds_aresh"]
    plate_width = crop_meta["render_size"]["width"]
    plate_height = crop_meta["render_size"]["height"]

    crop_x0 = lon_to_x(crop_bounds["west"])
    crop_x1 = lon_to_x(crop_bounds["east"])
    crop_y0 = lat_to_y(crop_bounds["south"])
    crop_y1 = lat_to_y(crop_bounds["north"])

    crop_world_width = crop_x1 - crop_x0
    crop_world_height = crop_y1 - crop_y0

    plate = Image.open(PLATE_PATH).convert("RGB")
    draw = ImageDraw.Draw(plate, "RGBA")
    font = ImageFont.load_default()

    projected: list[dict[str, float | str]] = []
    min_x = float("inf")
    min_y = float("inf")
    max_x = float("-inf")
    max_y = float("-inf")

    for state in map_data["states"]:
        if state["name"] not in DRAKHARPAN_STATES:
            continue

        bbox = state["bbox"]
        pole_x, pole_y = state["pole"]

        world_x0 = OVERLAY_OFFSET_X + OVERLAY_SCALE * bbox["minX"]
        world_y0 = OVERLAY_OFFSET_Y + OVERLAY_SCALE * bbox["minY"]
        world_x1 = OVERLAY_OFFSET_X + OVERLAY_SCALE * bbox["maxX"]
        world_y1 = OVERLAY_OFFSET_Y + OVERLAY_SCALE * bbox["maxY"]
        world_pole_x = OVERLAY_OFFSET_X + OVERLAY_SCALE * pole_x
        world_pole_y = OVERLAY_OFFSET_Y + OVERLAY_SCALE * pole_y

        plate_x0 = (world_x0 - crop_x0) / crop_world_width * plate_width
        plate_y0 = (world_y0 - crop_y0) / crop_world_height * plate_height
        plate_x1 = (world_x1 - crop_x0) / crop_world_width * plate_width
        plate_y1 = (world_y1 - crop_y0) / crop_world_height * plate_height
        plate_pole_x = (world_pole_x - crop_x0) / crop_world_width * plate_width
        plate_pole_y = (world_pole_y - crop_y0) / crop_world_height * plate_height

        projected.append(
            {
                "name": state["name"],
                "x0": plate_x0,
                "y0": plate_y0,
                "x1": plate_x1,
                "y1": plate_y1,
                "pole_x": plate_pole_x,
                "pole_y": plate_pole_y,
            }
        )
        min_x = min(min_x, plate_x0, plate_x1)
        min_y = min(min_y, plate_y0, plate_y1)
        max_x = max(max_x, plate_x0, plate_x1)
        max_y = max(max_y, plate_y0, plate_y1)

    # Draw projected per-state boxes/poles with clipping to plate extents.
    for state in projected:
        x0 = max(0, min(plate_width - 1, state["x0"]))
        y0 = max(0, min(plate_height - 1, state["y0"]))
        x1 = max(0, min(plate_width - 1, state["x1"]))
        y1 = max(0, min(plate_height - 1, state["y1"]))
        px = max(0, min(plate_width - 1, state["pole_x"]))
        py = max(0, min(plate_height - 1, state["pole_y"]))

        draw.rectangle((x0, y0, x1, y1), outline=(64, 220, 255, 210), width=4)
        draw.ellipse((px - 7, py - 7, px + 7, py + 7), fill=(255, 244, 112, 230), outline=(32, 24, 16, 255), width=2)
        draw.text((px + 10, py - 8), str(state["name"]), fill=(248, 248, 240, 255), font=font)

    clip_x0 = max(0, min(plate_width - 1, min_x))
    clip_y0 = max(0, min(plate_height - 1, min_y))
    clip_x1 = max(0, min(plate_width - 1, max_x))
    clip_y1 = max(0, min(plate_height - 1, max_y))

    draw.rectangle((clip_x0, clip_y0, clip_x1, clip_y1), outline=(170, 52, 255, 255), width=10)
    label = "Estimated Drakharpan extent on old plate"
    draw.rectangle((clip_x0 + 12, clip_y0 + 12, clip_x0 + 12 + 8 * len(label), clip_y0 + 34), fill=(18, 12, 32, 190))
    draw.text((clip_x0 + 18, clip_y0 + 17), label, fill=(255, 232, 252, 255), font=font)

    OUTPUT_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    plate.save(OUTPUT_IMAGE, format="PNG", optimize=True)

    lines = [
        "Estimated Drakharpan Placement On Archived Azgaar Import Plate",
        "==============================================================",
        "",
        "Inputs",
        "------",
        f"Plate image: {PLATE_PATH}",
        f"Crop metadata: {CROP_META_PATH}",
        f"Azgaar state source: {MAP_DATA_PATH}",
        "",
        "Transform used",
        "--------------",
        f"Azgaar -> world DEM calibration: translate({62.6:.2f}%, {36.4:.2f}%) scale({OVERLAY_SCALE:.3f}, {OVERLAY_SCALE:.3f})",
        "This is the user-calibrated full-world alignment from /prototype_map.",
        "",
        "Selected Drakharpan states",
        "--------------------------",
        ", ".join(sorted(DRAKHARPAN_STATES)),
        "",
        "Plate-local projected box",
        "-------------------------",
        f"Raw extents: x[{min_x:.2f}, {max_x:.2f}] y[{min_y:.2f}, {max_y:.2f}]",
        f"Clipped extents: x[{clip_x0:.2f}, {clip_x1:.2f}] y[{clip_y0:.2f}, {clip_y1:.2f}]",
        "",
        "Interpretation",
        "--------------",
        "The estimate lands coherently on the left/central side of the old import plate.",
        "Several northern member states project above the plate's top edge, which implies this old plate was a southernly clipped macroregion rather than a perfectly tight Drakharpan-only crop.",
        "",
        "Per-state projected boxes",
        "-------------------------",
    ]
    for state in projected:
        lines.append(
            f"{state['name']}: bbox x[{state['x0']:.2f}, {state['x1']:.2f}] y[{state['y0']:.2f}, {state['y1']:.2f}], "
            f"pole ({state['pole_x']:.2f}, {state['pole_y']:.2f})"
        )

    OUTPUT_REPORT.write_text("\n".join(lines) + "\n", encoding="utf8")
    print(OUTPUT_IMAGE)
    print(OUTPUT_REPORT)


if __name__ == "__main__":
    main()
