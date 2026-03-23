from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from fmg_heightmap_policy import to_uint8_grayscale

REPO_ROOT = Path(__file__).resolve().parent.parent
DEM_PATH = REPO_ROOT / "output" / "working" / "aresh_arctic_16x9_normalized_dem.tif"
WORKING_OUTPUT = REPO_ROOT / "output" / "working" / "drakharpan_fmg_heightmap.png"
FMG_OUTPUT = (
    REPO_ROOT
    / "Fantasy-Map-Generator-master"
    / "Fantasy-Map-Generator-master"
    / "public"
    / "heightmaps"
    / "drakharpan.png"
)
REPORT_OUTPUT = REPO_ROOT / "output" / "working" / "drakharpan_fmg_heightmap_report.txt"


def main() -> None:
    if not DEM_PATH.exists():
      raise FileNotFoundError(f"Missing normalized DEM: {DEM_PATH}")

    with Image.open(DEM_PATH) as dem_img:
        dem = np.array(dem_img, dtype=np.float32)
    if dem.ndim != 2:
        raise ValueError(f"Expected a single-band DEM, got shape {dem.shape}")

    grayscale = to_uint8_grayscale(dem)
    img = Image.fromarray(grayscale, mode="L")

    WORKING_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    FMG_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(WORKING_OUTPUT, format="PNG", optimize=True)
    img.save(FMG_OUTPUT, format="PNG", optimize=True)

    report = [
        "Drakharpan FMG heightmap",
        "=========================",
        f"Source DEM: {DEM_PATH.relative_to(REPO_ROOT)}",
        f"Source size: {dem.shape[1]} x {dem.shape[0]}",
        f"DEM min: {float(np.min(dem)):.3f} m",
        f"DEM max: {float(np.max(dem)):.3f} m",
        "Sea level mapped to ~20% brightness for FMG import semantics.",
        "Target break uses -62 m relative to current Earth sea level.",
        "Land uses a lowland-biased curve with a 10% shoreline brightness boost.",
        f"Working output: {WORKING_OUTPUT.relative_to(REPO_ROOT)}",
        f"FMG output: {FMG_OUTPUT.relative_to(REPO_ROOT)}",
    ]
    REPORT_OUTPUT.write_text("\n".join(report) + "\n", encoding="utf8")
    print(FMG_OUTPUT)


if __name__ == "__main__":
    main()
