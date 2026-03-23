from __future__ import annotations

import math
from pathlib import Path
from xml.sax.saxutils import escape

import cv2
import numpy as np
import tifffile


REPO_ROOT = Path(__file__).resolve().parent.parent
DEM_PATH = REPO_ROOT / "aresh_rebuild" / "GEBCO_BATHY_TOPO_EARTH62" / "GEBCO_BATHY_TOPO_EARTH62_dem.tif"
OUTPUT_KML = REPO_ROOT / "output" / "kml" / "gebco_minus62m_1000ft_contours.kml"
OUTPUT_REPORT = REPO_ROOT / "output" / "kml" / "gebco_minus62m_1000ft_contours_report.txt"
OUTPUT_DIR = REPO_ROOT / "output" / "kml" / "gebco_minus62m_1000ft_chunks"

SEA_LEVEL_ZERO_M = -62.0
FEET_PER_METER = 3.280839895013123
INTERVAL_FT = 1000.0
INTERVAL_M = INTERVAL_FT / FEET_PER_METER
STRIDE = 24  # 15 arcsec * 24 = 0.1 degree contours for a manageable whole-world KML
MIN_POINTS = 24
SIMPLIFY_EPSILON_PX = 0.9
MAX_FEATURES_PER_FILE = 2500


def format_coord(x_index: float, y_index: float, width: int, height: int) -> tuple[float, float]:
    lon = -180.0 + (x_index + 0.5) * (360.0 / width)
    lat = 90.0 - (y_index + 0.5) * (180.0 / height)
    return lon, lat


def style_for_level(level_ft: float) -> tuple[str, str]:
    if abs(level_ft) < 0.5:
        return "zero", "Sea level rebased to 0 ft (-62 m)"
    if level_ft > 0:
        return "land", f"+{int(level_ft):,} ft"
    return "sea", f"{int(level_ft):,} ft"


def build_styles() -> str:
    return """
    <Style id="land">
      <LineStyle><color>ff5a84d6</color><width>1.4</width></LineStyle>
    </Style>
    <Style id="sea">
      <LineStyle><color>ffd68c4a</color><width>1.1</width></LineStyle>
    </Style>
    <Style id="zero">
      <LineStyle><color>ffb7f7ff</color><width>2.2</width></LineStyle>
    </Style>
    """.strip()


def build_kml(document_name: str, description: str, placemarks: list[str]) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{escape(document_name)}</name>
    <description>{escape(description)}</description>
    {build_styles()}
    {''.join(placemarks)}
  </Document>
</kml>
"""


def chunked(seq: list[str], size: int) -> list[list[str]]:
    return [seq[i : i + size] for i in range(0, len(seq), size)]


def main() -> None:
    with tifffile.TiffFile(DEM_PATH) as tif:
        dem = tif.asarray()[::STRIDE, ::STRIDE].astype(np.float32)

    height, width = dem.shape
    adjusted_m = dem - SEA_LEVEL_ZERO_M
    adjusted_ft = adjusted_m * FEET_PER_METER

    min_level_ft = math.floor(float(np.nanmin(adjusted_ft)) / INTERVAL_FT) * INTERVAL_FT
    max_level_ft = math.ceil(float(np.nanmax(adjusted_ft)) / INTERVAL_FT) * INTERVAL_FT
    levels_ft = np.arange(min_level_ft, max_level_ft + INTERVAL_FT, INTERVAL_FT, dtype=np.float32)

    placemarks: list[str] = []
    grouped_placemarks: dict[str, list[str]] = {"land": [], "sea": [], "zero": []}
    stats: list[str] = []
    total_lines = 0

    for level_ft in levels_ft:
        threshold_mask = (adjusted_ft >= level_ft).astype(np.uint8) * 255
        contours, _ = cv2.findContours(threshold_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)

        kept = 0
        style_id, level_label = style_for_level(float(level_ft))
        for contour in contours:
            contour = contour.reshape(-1, 2)
            if contour.shape[0] < MIN_POINTS:
                continue
            approx = cv2.approxPolyDP(contour, SIMPLIFY_EPSILON_PX, True).reshape(-1, 2)
            if approx.shape[0] < 3:
                continue

            coords = []
            for x, y in approx:
                lon, lat = format_coord(float(x), float(y), width, height)
                coords.append(f"{lon:.6f},{lat:.6f},0")

            placemark = (
                f"""
      <Placemark>
        <name>{escape(level_label)}</name>
        <styleUrl>#{style_id}</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>{' '.join(coords)}</coordinates>
        </LineString>
      </Placemark>""".rstrip()
            )
            placemarks.append(placemark)
            grouped_placemarks[style_id].append(placemark)
            kept += 1

        total_lines += kept
        stats.append(f"{int(level_ft):>7} ft : {kept} contour(s)")

    OUTPUT_KML.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_KML.write_text(
        build_kml(
            "GEBCO topobathy contours rebased to -62m sea level, 1000ft interval",
            f"Generated from GEBCO_BATHY_TOPO_EARTH62_dem.tif, sampled every {STRIDE} pixels (~0.1 degree).",
            placemarks,
        ),
        encoding="utf8",
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    chunk_lines = [
        f"Chunk max features: {MAX_FEATURES_PER_FILE}",
        "",
        "Chunked outputs",
        "---------------",
    ]
    for group_name, group_marks in grouped_placemarks.items():
        chunks = chunked(group_marks, MAX_FEATURES_PER_FILE)
        chunk_lines.append(f"{group_name}: {len(group_marks)} placemarks across {len(chunks)} file(s)")
        for index, chunk in enumerate(chunks, start=1):
            chunk_path = OUTPUT_DIR / f"gebco_minus62m_1000ft_{group_name}_part_{index:02d}.kml"
            chunk_path.write_text(
                build_kml(
                    f"GEBCO -62m rebased 1000ft contours [{group_name}] part {index}",
                    f"{group_name} contours only, chunk {index}, max {MAX_FEATURES_PER_FILE} placemarks per file.",
                    chunk,
                ),
                encoding="utf8",
            )
            chunk_lines.append(f"  {chunk_path.name}: {len(chunk)} placemark(s)")

    OUTPUT_REPORT.write_text(
        "\n".join(
            [
                "GEBCO -62m zero-point 1000ft contour KML",
                "========================================",
                f"Source DEM: {DEM_PATH}",
                f"Stride: {STRIDE}",
                f"Sampled raster size: {width} x {height}",
                f"Interval: {INTERVAL_FT:.0f} ft ({INTERVAL_M:.3f} m)",
                f"Sea-level zero reference: {SEA_LEVEL_ZERO_M:.1f} m",
                f"Level range: {int(min_level_ft)} ft to {int(max_level_ft)} ft",
                f"Total placemarks: {total_lines}",
                "",
                *chunk_lines,
                "",
                *stats,
            ]
        )
        + "\n",
        encoding="utf8",
    )

    print(OUTPUT_KML)
    print(OUTPUT_REPORT)


if __name__ == "__main__":
    main()
