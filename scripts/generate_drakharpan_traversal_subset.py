from __future__ import annotations

import csv
import json
from pathlib import Path

from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parent.parent
FULL_CSV_PATH = REPO_ROOT / "output" / "working" / "areshnaat_land_traversal_cells.csv"
FULL_META_PATH = REPO_ROOT / "output" / "working" / "areshnaat_land_traversal_cells_metadata.json"
CROP_META_PATH = REPO_ROOT / "output" / "working" / "aresh_arctic_16x9_normalized_metadata.json"
CROP_IMAGE_PATH = REPO_ROOT / "public" / "maps" / "aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities.png"
OUTPUT_DIR = REPO_ROOT / "output" / "working"
SUBSET_CSV_PATH = OUTPUT_DIR / "drakharpan_traversal_cells.csv"
SUBSET_META_PATH = OUTPUT_DIR / "drakharpan_traversal_cells_metadata.json"
SUBSET_IMAGE_PATH = OUTPUT_DIR / "drakharpan_traversal_cells_preview.png"

PROFILE_COLORS = {
    "open": (246, 232, 166, 220),
    "easy": (215, 240, 166, 220),
    "moderate": (137, 209, 123, 220),
    "rough": (232, 184, 102, 220),
    "severe": (207, 125, 67, 220),
    "cliffed_coast": (180, 93, 68, 220),
    "extreme": (130, 47, 42, 220),
}


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf8", newline="") as handle:
        return list(csv.DictReader(handle))


def aresh_to_crop_px(aresh_lat: float, aresh_lon: float, bounds: dict[str, float], width: int, height: int) -> tuple[float, float]:
    x = (aresh_lon - bounds["west"]) / (bounds["east"] - bounds["west"]) * width
    y = (bounds["north"] - aresh_lat) / (bounds["north"] - bounds["south"]) * height
    return x, y


def main() -> None:
    rows = load_rows(FULL_CSV_PATH)
    full_meta = json.loads(FULL_META_PATH.read_text(encoding="utf8"))
    crop_meta = json.loads(CROP_META_PATH.read_text(encoding="utf8"))
    bounds = crop_meta["crop_bounds_aresh"]
    width = int(crop_meta["render_size"]["width"])
    height = int(crop_meta["render_size"]["height"])

    filtered: list[dict[str, str | float]] = []
    for row in rows:
        lat = float(row["centroid_lat"])
        lon = float(row["centroid_lon"])
        if not (bounds["south"] <= lat <= bounds["north"] and bounds["west"] <= lon <= bounds["east"]):
            continue
        crop_x, crop_y = aresh_to_crop_px(lat, lon, bounds, width, height)
        filtered.append(
            {
                **row,
                "crop_x": round(crop_x, 2),
                "crop_y": round(crop_y, 2),
            }
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) + ["crop_x", "crop_y"]
    with SUBSET_CSV_PATH.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(filtered)

    base = Image.open(CROP_IMAGE_PATH).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for row in filtered:
        x = float(row["crop_x"])
        y = float(row["crop_y"])
        color = PROFILE_COLORS.get(str(row["traversal_profile"]), (242, 228, 186, 220))
        r = 4
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color, outline=(30, 24, 18, 220), width=1)

    preview = Image.alpha_composite(base, overlay)
    preview.save(SUBSET_IMAGE_PATH)

    profile_counts: dict[str, int] = {}
    for row in filtered:
        profile = str(row["traversal_profile"])
        profile_counts[profile] = profile_counts.get(profile, 0) + 1

    metadata = {
        "source_csv": str(FULL_CSV_PATH.relative_to(REPO_ROOT)),
        "crop_metadata": str(CROP_META_PATH.relative_to(REPO_ROOT)),
        "crop_image": str(CROP_IMAGE_PATH.relative_to(REPO_ROOT)),
        "cell_count": len(filtered),
        "crop_bounds_aresh": bounds,
        "render_size": {"width": width, "height": height},
        "profile_counts": profile_counts,
        "outputs": {
            "csv": str(SUBSET_CSV_PATH.relative_to(REPO_ROOT)),
            "preview": str(SUBSET_IMAGE_PATH.relative_to(REPO_ROOT)),
        },
        "notes": [
            "Subset is filtered by traversal-cell centroid lat/lon falling inside the archived Drakharpan crop bounds.",
            "Preview uses centroid markers only. Exact cell polygons are not preserved in the CSV and would require label-space reconstruction.",
            "Preview image uses the current fresh crop orientation directly.",
            f"Original world traversal cell count: {full_meta['cell_count']}",
        ],
    }
    SUBSET_META_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
