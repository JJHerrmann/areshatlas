from __future__ import annotations

import numpy as np


def build_heightmap(
    dem: np.ndarray,
    *,
    sea_level: float = -62.0,
    sea_break: float = 0.2,
    land_curve_power: float = 0.58,
    shoreline_boost: float = 0.10,
) -> np.ndarray:
    low = float(np.min(dem))
    high = float(np.max(dem))
    if high <= sea_level:
        raise ValueError("DEM max must be above sea level to build a mixed land/sea heightmap")
    if low >= sea_level:
        raise ValueError("DEM min must be below sea level to build a mixed land/sea heightmap")

    out = np.empty_like(dem, dtype=np.float32)
    below = dem <= sea_level
    above = ~below

    # FMG treats roughly sea_break brightness as the water/land break on import.
    out[below] = (dem[below] - low) / max(sea_level - low, 1e-6) * sea_break

    land_norm = (dem[above] - sea_level) / max(high - sea_level, 1e-6)
    land_norm = np.clip(land_norm, 0.0, 1.0)

    # Emphasize low-lying landforms and compress the upper tail.
    lowland_curve = land_norm**land_curve_power

    # Keep coasts slightly brighter so shoreline survives FMG's resampling.
    shoreline = shoreline_boost * (1.0 - land_norm)

    out[above] = sea_break + (1.0 - sea_break) * lowland_curve + shoreline
    return np.clip(out, 0.0, 1.0)


def to_uint8_grayscale(dem: np.ndarray, **kwargs) -> np.ndarray:
    return (build_heightmap(dem, **kwargs) * 255.0).astype(np.uint8)
