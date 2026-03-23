from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parent.parent
TOPO_PATH = REPO_ROOT / "public" / "maps" / "areshnaat-topo-dem.webp"
REPORT_PATH = REPO_ROOT / "Areshnaat_Beringia_analog_bbox.txt"
THUMB_PATH = REPO_ROOT / "output" / "map_renders" / "areshnaat-beringia-analog-thumbnail.png"


POINTS = {
    "Tuktoyaktuk": {
        "lat": 69.44472,
        "lon": -133.03422,
        "source": "GeoDatos",
        "source_url": "https://www.geodatos.net/en/coordinates/canada/tuktoyaktuk",
        "role": "north_bound",
    },
    "Okha": {
        "lat": 53.58665,
        "lon": 142.93725,
        "source": "Mapcarta / OSM",
        "source_url": "https://mapcarta.com/W84723116",
        "role": "south_bound",
    },
    "Nordvik": {
        "lat": 73.99750,
        "lon": 111.46333,
        "source": "Wikimapia",
        "source_url": "https://wikimapia.org/7139461/Nordvik",
        "role": "west_bound",
    },
    "Mys Vasil'yeva": {
        "lat": 50.03460,
        "lon": 155.39800,
        "source": "1952 Kamchatka tsunami deposit table snippet",
        "source_url": "https://www.scribd.com/document/563333344/51140589",
        "role": "east_bound",
    },
}


def lon_to_x(lon: float, width: int) -> float:
    return (lon + 180.0) / 360.0 * width


def earth_lat_to_new_display_y(lat: float, height: int) -> float:
    # The DEM display is vertically flipped relative to the original geodetic array.
    # That means a familiar Earth-analog northern latitude is sampled on the lower
    # half of the displayed map.
    return (90.0 + lat) / 180.0 * height


def build_report_and_thumbnail() -> dict[str, object]:
    topo = Image.open(TOPO_PATH).convert("RGB")
    width, height = topo.size

    converted = {}
    for name, point in POINTS.items():
        converted[name] = {
            **point,
            "areshnaat_display_lat": point["lat"],
            "areshnaat_sampling_lat": -point["lat"],
            "areshnaat_lon": point["lon"],
            "x_px": lon_to_x(point["lon"], width),
            "y_px": earth_lat_to_new_display_y(point["lat"], height),
        }

    north = converted["Tuktoyaktuk"]["areshnaat_display_lat"]
    south = converted["Okha"]["areshnaat_display_lat"]
    west = converted["Nordvik"]["areshnaat_lon"]
    east = converted["Mys Vasil'yeva"]["areshnaat_lon"]

    x0 = lon_to_x(west, width)
    x1 = lon_to_x(east, width)
    y_north = earth_lat_to_new_display_y(north, height)
    y_south = earth_lat_to_new_display_y(south, height)
    draw_x0, draw_x1 = sorted((x0, x1))
    draw_y0, draw_y1 = sorted((y_north, y_south))

    bbox = {
        "north_lat": north,
        "south_lat": south,
        "west_lon": west,
        "east_lon": east,
        "x0": draw_x0,
        "y0": draw_y0,
        "x1": draw_x1,
        "y1": draw_y1,
        "width_px": draw_x1 - draw_x0,
        "height_px": draw_y1 - draw_y0,
        "raw_y_north": y_north,
        "raw_y_south": y_south,
    }

    world = topo.copy()
    draw = ImageDraw.Draw(world)
    draw.rectangle((draw_x0, draw_y0, draw_x1, draw_y1), outline=(255, 88, 64), width=5)

    crop_pad = 40
    crop_box = (
        max(0, int(draw_x0) - crop_pad),
        max(0, int(draw_y0) - crop_pad),
        min(width, int(draw_x1) + crop_pad),
        min(height, int(draw_y1) + crop_pad),
    )
    crop = topo.crop(crop_box).copy()
    crop_draw = ImageDraw.Draw(crop)
    crop_draw.rectangle(
        (
            int(draw_x0) - crop_box[0],
            int(draw_y0) - crop_box[1],
            int(draw_x1) - crop_box[0],
            int(draw_y1) - crop_box[1],
        ),
        outline=(255, 88, 64),
        width=5,
    )

    world_thumb = world.resize((960, 480), Image.Resampling.LANCZOS)
    crop_target_w = 960
    crop_target_h = max(320, round(crop.height * crop_target_w / max(crop.width, 1)))
    crop_thumb = crop.resize((crop_target_w, crop_target_h), Image.Resampling.LANCZOS)

    composite = Image.new("RGB", (960, 480 + crop_target_h + 20), (10, 16, 26))
    composite.paste(world_thumb, (0, 0))
    composite.paste(crop_thumb, (0, 500))
    THUMB_PATH.parent.mkdir(parents=True, exist_ok=True)
    composite.save(THUMB_PATH, format="PNG", optimize=True)

    lines: list[str] = []
    lines.append("Areshnaat Beringia-Analog Bounding Box")
    lines.append("=====================================")
    lines.append("")
    lines.append("Requested construction")
    lines.append("- North/South bounds from Tuktoyaktuk and Okha")
    lines.append("- East/West bounds from Nordvik and Mys Vasil'yeva")
    lines.append("")
    lines.append("Math")
    lines.append("----")
    lines.append(f"Map size used: {width} x {height}")
    lines.append("Displayed map is the vertically flipped DEM orientation.")
    lines.append("Longitude to x: x = ((lon + 180) / 360) * width")
    lines.append("Earth-analog latitude to display y after the new flip: y = ((90 + lat) / 180) * height")
    lines.append("Equivalent legacy DEM sampling latitude: sampling_lat = -earth_lat")
    lines.append("")

    for name, point in converted.items():
        lines.append(
            f"{name}: Earth ({point['lat']:+.5f}, {point['lon']:+.5f}) -> "
            f"Areshnaat display ({point['areshnaat_display_lat']:+.5f}, {point['areshnaat_lon']:+.5f}), "
            f"legacy DEM sample lat {point['areshnaat_sampling_lat']:+.5f}, "
            f"pixel ({point['x_px']:.2f}, {point['y_px']:.2f})"
        )
        lines.append(f"  Source: {point['source']} | {point['source_url']}")

    lines.append("")
    lines.append("Resulting bounding box")
    lines.append("----------------------")
    lines.append(
        f"North = Tuktoyaktuk latitude = {north:+.5f}"
    )
    lines.append(
        f"South = Okha latitude = {south:+.5f}"
    )
    lines.append(
        f"West = Nordvik longitude = {west:+.5f}"
    )
    lines.append(
        f"East = Mys Vasil'yeva longitude = {east:+.5f}"
    )
    lines.append(
        f"Pixel box = x[{draw_x0:.2f}, {draw_x1:.2f}] y[{draw_y0:.2f}, {draw_y1:.2f}] "
        f"(w={draw_x1 - draw_x0:.2f}, h={draw_y1 - draw_y0:.2f})"
    )
    lines.append(
        f"Raw flipped y positions: north={y_north:.2f}, south={y_south:.2f}"
    )
    lines.append("")
    lines.append("Interpretation note")
    lines.append("-------------------")
    lines.append(
        "This construction uses the named Earth places only as analog anchors. "
        "Because Tuktoyaktuk and Okha define only latitude while Nordvik and Mys Vasil'yeva define only longitude, "
        "the final box is a synthetic analog region, not a direct four-corner polygon through those towns."
    )

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf8")
    return {
        "report": str(REPORT_PATH),
        "thumbnail": str(THUMB_PATH),
        "bbox": bbox,
        "points": converted,
    }


def main() -> None:
    result = build_report_and_thumbnail()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
