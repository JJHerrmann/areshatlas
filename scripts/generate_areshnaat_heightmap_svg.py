from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

import tifffile
from PIL import Image

from fmg_heightmap_policy import to_uint8_grayscale


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DEM_PATH = REPO_ROOT / "rookworld_source_data" / "v2.5" / "rookworld_rotated_dem_0p025deg.tif"
OUTPUT_SVG_PATH = REPO_ROOT / "output" / "working" / "areshnaat_gebco_heightmap.svg"
OUTPUT_PNG_PATH = REPO_ROOT / "output" / "working" / "areshnaat_gebco_heightmap.png"
OUTPUT_REPORT_PATH = REPO_ROOT / "output" / "working" / "areshnaat_gebco_heightmap_report.txt"


def main() -> None:
    if not SOURCE_DEM_PATH.exists():
        raise FileNotFoundError(f"Missing rotated Aresh DEM GeoTIFF: {SOURCE_DEM_PATH}")

    dem = tifffile.imread(SOURCE_DEM_PATH)
    grayscale = to_uint8_grayscale(dem)
    image = Image.fromarray(grayscale, mode="L")

    OUTPUT_SVG_PATH.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_PNG_PATH, format="PNG", optimize=True)

    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    png_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    width = image.width
    height = image.height
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" preserveAspectRatio="none" role="img" aria-label="Areshnaat GEBCO-derived grayscale heightmap">
  <title>Areshnaat GEBCO-derived grayscale heightmap</title>
  <desc>Generated from rookworld_rotated_dem_0p025deg.tif using the shared FMG-oriented sea/land transfer curve.</desc>
  <image width="{width}" height="{height}" href="data:image/png;base64,{png_b64}" />
</svg>
"""
    OUTPUT_SVG_PATH.write_text(svg, encoding="utf8")

    report = [
        "Areshnaat GEBCO Heightmap SVG",
        "=============================",
        f"Source DEM: {SOURCE_DEM_PATH.relative_to(REPO_ROOT)}",
        f"Source size: {width} x {height}",
        f"DEM min: {float(dem.min()):.3f} m",
        f"DEM max: {float(dem.max()):.3f} m",
        "Transfer curve: shared FMG heightmap policy",
        "Sea level mapped to ~20% brightness with lowland-biased land curve.",
        f"PNG output: {OUTPUT_PNG_PATH.relative_to(REPO_ROOT)}",
        f"SVG output: {OUTPUT_SVG_PATH.relative_to(REPO_ROOT)}",
    ]
    OUTPUT_REPORT_PATH.write_text("\n".join(report) + "\n", encoding="utf8")
    print(OUTPUT_SVG_PATH)


if __name__ == "__main__":
    main()
