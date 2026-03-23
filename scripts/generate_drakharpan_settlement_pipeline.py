from __future__ import annotations

import csv
import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


REPO_ROOT = Path(__file__).resolve().parent.parent
INPUT_CSV_PATH = REPO_ROOT / "output" / "working" / "drakharpan_deep_traversal_cells.csv"
INPUT_META_PATH = REPO_ROOT / "output" / "working" / "drakharpan_deep_traversal_cells_metadata.json"
BASEMAP_PATH = REPO_ROOT / "public" / "maps" / "aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities.png"
OUTPUT_DIR = REPO_ROOT / "output" / "working"

SETTLEMENT_CSV_PATH = OUTPUT_DIR / "drakharpan_settlement_cells.csv"
POPULATION_HEATMAP_PATH = OUTPUT_DIR / "drakharpan_population_heatmap.png"
BURG_CANDIDATES_CSV_PATH = OUTPUT_DIR / "drakharpan_burg_candidates.csv"
BURGS_SEEDED_CSV_PATH = OUTPUT_DIR / "drakharpan_burgs_seeded.csv"
BURGS_PREVIEW_PATH = OUTPUT_DIR / "drakharpan_burgs_preview.png"
CONFIG_PATH = OUTPUT_DIR / "drakharpan_population_config.json"

TOTAL_POPULATION_TARGET = 420_000
URBANIZATION_RATE = 0.18
MIN_BURG_SPACING_CELLS = 10
BURG_COUNT_TARGET = 24
COAST_BONUS = 1.35
SLOPE_PENALTY = 1.55
ELEVATION_PENALTY = 0.95
DESIRABILITY_POWER = 1.28
WATER_ACCESS_BONUS = 0.9


@dataclass(frozen=True)
class SettlementCell:
    cell_id: int
    x: float
    y: float
    lat: float
    lon: float
    area_px: int
    elevation_m: float
    slope_deg: float
    ruggedness_m: float
    coast_distance_km: float
    traversal_cost: float
    settlement_desirability: float
    population_weight: float
    population_estimate: float


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf8", newline="") as handle:
        return list(csv.DictReader(handle))


def parse_float(row: dict[str, str], *keys: str, default: float = 0.0) -> float:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            try:
                return float(value)
            except ValueError:
                continue
    return default


def normalize(values: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = (values - low) / max(high - low, 1e-6)
    return np.clip(scaled, 0.0, 1.0)


def load_cells() -> list[dict[str, str]]:
    if not INPUT_CSV_PATH.exists():
        raise FileNotFoundError(f"Missing traversal CSV: {INPUT_CSV_PATH}")
    return load_rows(INPUT_CSV_PATH)


def build_cells(rows: list[dict[str, str]]) -> list[SettlementCell]:
    elevation = np.array([parse_float(row, "mean_elevation_m") for row in rows], dtype=np.float32)
    slope = np.array([parse_float(row, "mean_slope_deg") for row in rows], dtype=np.float32)
    ruggedness = np.array([parse_float(row, "ruggedness_m") for row in rows], dtype=np.float32)
    coast_distance = np.array([parse_float(row, "coast_distance_km") for row in rows], dtype=np.float32)
    traversal_cost = 100.0 - np.array([parse_float(row, "traversal_score") for row in rows], dtype=np.float32)

    elev_factor = 1.0 - normalize(np.maximum(elevation, -62.0), -62.0, 2200.0)
    slope_factor = 1.0 - normalize(slope, 0.0, 22.0)
    rugged_factor = 1.0 - normalize(ruggedness, 0.0, 760.0)
    coast_factor = 1.0 - normalize(coast_distance, 0.0, 65.0)
    traversal_factor = 1.0 - normalize(traversal_cost, 0.0, 100.0)
    water_access_factor = np.clip(1.0 - normalize(coast_distance, 0.0, 20.0) * 0.55, 0.0, 1.0)

    desirability = (
        elev_factor * 0.9
        + slope_factor * 1.45
        + rugged_factor * 1.1
        + coast_factor * COAST_BONUS
        + traversal_factor * 1.4
        + water_access_factor * WATER_ACCESS_BONUS
    )
    desirability = np.power(np.clip(desirability / 7.0, 0.0, 1.0), DESIRABILITY_POWER)

    weights = desirability * (0.25 + normalize(coast_factor + water_access_factor, 0.0, 2.0))
    if float(weights.sum()) <= 0.0:
        weights = np.ones_like(weights) / max(len(weights), 1)
    else:
        weights = weights / weights.sum()
    population_estimate = weights * TOTAL_POPULATION_TARGET

    results: list[SettlementCell] = []
    for idx, row in enumerate(rows):
        results.append(
            SettlementCell(
                cell_id=int(parse_float(row, "cell_id", default=float(idx))),
                x=parse_float(row, "centroid_x", "crop_x"),
                y=parse_float(row, "centroid_y", "crop_y"),
                lat=parse_float(row, "centroid_lat"),
                lon=parse_float(row, "centroid_lon"),
                area_px=int(parse_float(row, "area_px", default=0.0)),
                elevation_m=float(elevation[idx]),
                slope_deg=float(slope[idx]),
                ruggedness_m=float(ruggedness[idx]),
                coast_distance_km=float(coast_distance[idx]),
                traversal_cost=float(traversal_cost[idx]),
                settlement_desirability=float(desirability[idx]),
                population_weight=float(weights[idx]),
                population_estimate=float(population_estimate[idx]),
            )
        )
    return results


def write_settlement_csv(cells: list[SettlementCell]) -> None:
    with SETTLEMENT_CSV_PATH.open("w", newline="", encoding="utf8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "cell_id",
                "x",
                "y",
                "lat",
                "lon",
                "area_px",
                "elevation_m",
                "slope_deg",
                "ruggedness_m",
                "coast_distance_km",
                "traversal_cost",
                "settlement_desirability",
                "population_weight",
                "population_estimate",
            ]
        )
        for cell in cells:
            writer.writerow(
                [
                    cell.cell_id,
                    round(cell.x, 2),
                    round(cell.y, 2),
                    round(cell.lat, 6),
                    round(cell.lon, 6),
                    cell.area_px,
                    round(cell.elevation_m, 2),
                    round(cell.slope_deg, 2),
                    round(cell.ruggedness_m, 2),
                    round(cell.coast_distance_km, 2),
                    round(cell.traversal_cost, 2),
                    round(cell.settlement_desirability, 5),
                    round(cell.population_weight, 6),
                    round(cell.population_estimate, 2),
                ]
            )


def render_heatmap(cells: list[SettlementCell], width: int, height: int) -> None:
    base = Image.open(BASEMAP_PATH).convert("RGBA")
    if base.size != (width, height):
        base = base.resize((width, height), Image.Resampling.LANCZOS)

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    desirabilities = np.array([cell.settlement_desirability for cell in cells], dtype=np.float32)
    max_des = max(float(desirabilities.max()), 1e-6)

    for cell in cells:
        alpha = int(20 + 225 * (cell.settlement_desirability / max_des))
        radius = 5 + int(12 * cell.settlement_desirability)
        color = (
            int(255 - 85 * cell.settlement_desirability),
            int(220 - 90 * cell.settlement_desirability),
            int(92 + 40 * cell.settlement_desirability),
            alpha,
        )
        x, y = int(round(cell.x)), int(round(cell.y))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=4))
    preview = Image.alpha_composite(base, overlay)
    preview.save(POPULATION_HEATMAP_PATH)


def pick_burg_candidates(cells: list[SettlementCell]) -> list[dict[str, object]]:
    ordered = sorted(cells, key=lambda cell: cell.settlement_desirability, reverse=True)
    candidates: list[dict[str, object]] = []
    local_population_radius = 8

    for cell in ordered:
        radius_cells = [
            other
            for other in cells
            if abs(other.x - cell.x) <= 120 and abs(other.y - cell.y) <= 120
        ]
        local_population = sum(other.population_estimate for other in radius_cells)
        connectivity = (1.0 - min(cell.traversal_cost, 100.0) / 100.0) * 0.55 + (1.0 - min(cell.coast_distance_km, 90.0) / 90.0) * 0.45
        strategic = cell.settlement_desirability * 72.0 + connectivity * 18.0 + min(local_population / 8500.0, 24.0)
        burg_candidate_score = strategic + min(cell.population_estimate / 500.0, 12.0)
        candidates.append(
            {
                "cell": cell,
                "local_population_radius_sum": round(local_population, 2),
                "connectivity_score": round(connectivity, 4),
                "strategic_score": round(strategic, 4),
                "burg_candidate_score": round(burg_candidate_score, 4),
                "coastal_flag": cell.coast_distance_km <= 18.0,
                "water_flag": cell.coast_distance_km <= 8.0,
            }
        )

    candidates.sort(key=lambda item: item["burg_candidate_score"], reverse=True)
    return candidates


def is_far_enough(cell: SettlementCell, placed: list[SettlementCell]) -> bool:
    min_spacing = MIN_BURG_SPACING_CELLS * 18.0
    for burg in placed:
        if math.hypot(cell.x - burg.x, cell.y - burg.y) < min_spacing:
            return False
    return True


def place_burgs(candidates: list[dict[str, object]]) -> list[dict[str, object]]:
    placed_cells: list[SettlementCell] = []
    burgs: list[dict[str, object]] = []

    for candidate in candidates:
        cell = candidate["cell"]
        assert isinstance(cell, SettlementCell)
        if len(burgs) >= BURG_COUNT_TARGET and candidate["burg_candidate_score"] < 7.0:
            break
        if not is_far_enough(cell, placed_cells):
            continue
        placed_cells.append(cell)
        burgs.append(
            {
                "burg_id": len(burgs),
                "cell_id": cell.cell_id,
                "x": round(cell.x, 2),
                "y": round(cell.y, 2),
                "burg_candidate_score": candidate["burg_candidate_score"],
                "seed_type": "coastal" if candidate["coastal_flag"] else "inland",
                "coastal_flag": candidate["coastal_flag"],
                "water_flag": candidate["water_flag"],
                "population_estimate": round(cell.population_estimate, 2),
                "settlement_desirability": round(cell.settlement_desirability, 5),
            }
        )
        if len(burgs) >= BURG_COUNT_TARGET:
            break
    return burgs


def rank_burgs(burgs: list[dict[str, object]], cells: list[SettlementCell]) -> list[dict[str, object]]:
    cell_by_id = {cell.cell_id: cell for cell in cells}
    ranked: list[dict[str, object]] = []
    scores = np.array([float(burg["burg_candidate_score"]) for burg in burgs], dtype=np.float32)
    max_score = max(float(scores.max()), 1e-6)

    for burg in burgs:
        cell = cell_by_id[int(burg["cell_id"])]
        influence = cell.population_estimate * 0.55 + float(burg["burg_candidate_score"]) * 1200.0
        urban_population = max(120.0, min(influence * 0.42, TOTAL_POPULATION_TARGET * 0.08))
        hinterland = max(0.0, influence - urban_population)
        rank_class = (
            "great_city"
            if urban_population >= 22000
            else "city"
            if urban_population >= 12000
            else "town"
            if urban_population >= 4500
            else "village"
            if urban_population >= 1200
            else "hamlet"
        )
        hub_score = float(burg["burg_candidate_score"]) / max_score
        ranked.append(
            {
                **burg,
                "urban_population": round(urban_population, 2),
                "rural_hinterland_population": round(hinterland, 2),
                "total_influence_population": round(influence, 2),
                "rank_class": rank_class,
                "is_port": bool(burg["coastal_flag"]),
                "is_capital": False,
                "hub_score": round(hub_score, 4),
                "admin_level": 1 if rank_class in {"great_city", "city"} else 2,
            }
        )

    if ranked:
        ranked[0]["is_capital"] = True
        ranked[0]["admin_level"] = 0
    return ranked


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def render_burg_preview(cells: list[SettlementCell], burgs: list[dict[str, object]], width: int, height: int) -> None:
    base = Image.open(BASEMAP_PATH).convert("RGBA")
    if base.size != (width, height):
        base = base.resize((width, height), Image.Resampling.LANCZOS)

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cell_by_id = {cell.cell_id: cell for cell in cells}

    for burg in burgs:
        cell = cell_by_id[int(burg["cell_id"])]
        pop = float(burg["urban_population"])
        is_capital = bool(burg["is_capital"])
        is_port = bool(burg["is_port"])
        radius = 6 + int(min(12.0, math.log10(max(pop, 1.0)) * 3.6))
        if is_capital:
            fill = (214, 173, 82, 245)
            outline = (61, 34, 11, 255)
        elif is_port:
            fill = (84, 150, 206, 230)
            outline = (20, 41, 69, 255)
        else:
            fill = (196, 114, 71, 225)
            outline = (56, 29, 12, 255)
        x, y = int(round(cell.x)), int(round(cell.y))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill, outline=outline, width=2)
        draw.text((x + radius + 2, y - radius - 2), str(burg["burg_id"] + 1), fill=(30, 20, 10, 255))

    preview = Image.alpha_composite(base, overlay)
    preview.save(BURGS_PREVIEW_PATH)


def main() -> None:
    rows = load_cells()
    cells = build_cells(rows)
    write_settlement_csv(cells)
    with INPUT_META_PATH.open("r", encoding="utf8") as handle:
        meta = json.load(handle)
    width = int(meta.get("render_size", {}).get("width", 4800))
    height = int(meta.get("render_size", {}).get("height", 2700))
    render_heatmap(cells, width, height)
    candidates = pick_burg_candidates(cells)
    candidate_rows = [
        {
            "burg_candidate_rank": idx + 1,
            "cell_id": cand["cell"].cell_id,
            "x": round(cand["cell"].x, 2),
            "y": round(cand["cell"].y, 2),
            "lat": round(cand["cell"].lat, 6),
            "lon": round(cand["cell"].lon, 6),
            "settlement_desirability": round(cand["cell"].settlement_desirability, 5),
            "population_estimate": round(cand["cell"].population_estimate, 2),
            "local_population_radius_sum": cand["local_population_radius_sum"],
            "connectivity_score": cand["connectivity_score"],
            "strategic_score": cand["strategic_score"],
            "burg_candidate_score": cand["burg_candidate_score"],
            "coastal_flag": cand["coastal_flag"],
            "water_flag": cand["water_flag"],
        }
        for idx, cand in enumerate(candidates)
    ]
    write_csv(
        BURG_CANDIDATES_CSV_PATH,
        candidate_rows,
        [
            "burg_candidate_rank",
            "cell_id",
            "x",
            "y",
            "lat",
            "lon",
            "settlement_desirability",
            "population_estimate",
            "local_population_radius_sum",
            "connectivity_score",
            "strategic_score",
            "burg_candidate_score",
            "coastal_flag",
            "water_flag",
        ],
    )
    burgs = rank_burgs(place_burgs(candidates), cells)
    write_csv(
        BURGS_SEEDED_CSV_PATH,
        burgs,
        [
            "burg_id",
            "cell_id",
            "x",
            "y",
            "burg_candidate_score",
            "seed_type",
            "coastal_flag",
            "water_flag",
            "population_estimate",
            "settlement_desirability",
            "urban_population",
            "rural_hinterland_population",
            "total_influence_population",
            "rank_class",
            "is_port",
            "is_capital",
            "hub_score",
            "admin_level",
        ],
    )
    render_burg_preview(cells, burgs, width, height)

    config = {
        "total_population_target": TOTAL_POPULATION_TARGET,
        "urbanization_rate": URBANIZATION_RATE,
        "min_burg_spacing_cells": MIN_BURG_SPACING_CELLS,
        "burg_count_target": BURG_COUNT_TARGET,
        "coast_bonus": COAST_BONUS,
        "slope_penalty": SLOPE_PENALTY,
        "elevation_penalty": ELEVATION_PENALTY,
        "desirability_power": DESIRABILITY_POWER,
        "water_access_bonus": WATER_ACCESS_BONUS,
    }
    CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf8")

    summary = {
        "settlement_cells": len(cells),
        "burg_candidates": len(candidate_rows),
        "burgs_placed": len(burgs),
        "top_burgs": [
            {
                "burg_id": burg["burg_id"],
                "cell_id": burg["cell_id"],
                "urban_population": burg["urban_population"],
                "rank_class": burg["rank_class"],
                "is_port": burg["is_port"],
                "is_capital": burg["is_capital"],
            }
            for burg in burgs[:10]
        ],
        "total_population_estimate": round(sum(cell.population_estimate for cell in cells), 2),
        "urban_vs_rural": {
            "urban": round(sum(float(burg["urban_population"]) for burg in burgs), 2),
            "rural": round(sum(float(burg["rural_hinterland_population"]) for burg in burgs), 2),
        },
        "outputs": {
            "settlement_csv": str(SETTLEMENT_CSV_PATH.relative_to(REPO_ROOT)),
            "population_heatmap": str(POPULATION_HEATMAP_PATH.relative_to(REPO_ROOT)),
            "burg_candidates_csv": str(BURG_CANDIDATES_CSV_PATH.relative_to(REPO_ROOT)),
            "burgs_seeded_csv": str(BURGS_SEEDED_CSV_PATH.relative_to(REPO_ROOT)),
            "burgs_preview": str(BURGS_PREVIEW_PATH.relative_to(REPO_ROOT)),
            "config": str(CONFIG_PATH.relative_to(REPO_ROOT)),
        },
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
