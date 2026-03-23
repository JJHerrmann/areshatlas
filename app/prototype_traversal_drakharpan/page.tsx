import { promises as fs } from "node:fs";
import path from "node:path";

import TraversalCellViewer, { type SettlementMarker, type TraversalCell } from "@/components/azgaar/TraversalCellViewer";

const CSV_PATH = path.join(process.cwd(), "output", "working", "drakharpan_deep_traversal_cells.csv");
const META_PATH = path.join(process.cwd(), "output", "working", "drakharpan_deep_traversal_cells_metadata.json");
const SETTLEMENTS_CSV_PATH = path.join(process.cwd(), "output", "working", "drakharpan_burgs_seeded.csv");

function parseCsv(text: string): TraversalCell[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");

  const readNumber = (row: Record<string, string>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value != null && value !== "") {
        return Number(value);
      }
    }
    return Number.NaN;
  };

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      cellId: Number(row.cell_id),
      mapX: readNumber(row, ["crop_x", "centroid_x"]),
      mapY: readNumber(row, ["crop_y", "centroid_y"]),
      centroidLat: Number(row.centroid_lat),
      centroidLon: Number(row.centroid_lon),
      traversalScore: Number(row.traversal_score),
      traversalProfile: row.traversal_profile,
      meanElevationM: Number(row.mean_elevation_m),
      meanSlopeDeg: Number(row.mean_slope_deg),
      ruggednessM: Number(row.ruggedness_m),
      coastDistanceKm: Number(row.coast_distance_km),
    };
  });
}

function parseSettlementCsv(text: string): SettlementMarker[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const readNumber = (row: Record<string, string>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value != null && value !== "") return Number(value);
    }
    return Number.NaN;
  };

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      settlementId: Number(row.burg_id),
      cellId: Number(row.cell_id),
      x: readNumber(row, ["x"]),
      y: readNumber(row, ["y"]),
      urbanPopulation: readNumber(row, ["urban_population"]),
      rankClass: row.rank_class,
      isPort: row.is_port === "True" || row.is_port === "true" || row.is_port === "1",
      isCapital: row.is_capital === "True" || row.is_capital === "true" || row.is_capital === "1",
      seedType: row.seed_type,
    };
  });
}

export default async function PrototypeTraversalDrakharpanPage() {
  const csvText = await fs.readFile(CSV_PATH, "utf8");
  const metadata = JSON.parse(await fs.readFile(META_PATH, "utf8"));
  const settlementsCsvText = await fs.readFile(SETTLEMENTS_CSV_PATH, "utf8");
  const cells = parseCsv(csvText);
  const settlements = parseSettlementCsv(settlementsCsvText);

  return (
    <main className="wiki-main-page prototype-map-page" data-prototype-traversal="true">
      <div className="wiki-content prototype-map-content">
        <article className="wiki-article prototype-map-article">
          <div className="wiki-article-header">
            <div className="wiki-kicker">Traversal Cells</div>
            <h1 className="wiki-title">Drakharpan Traversal Viewer</h1>
            <p className="wiki-subtitle">
              Fresh Drakharpan crop using the current normalized DEM stack, with a deeper local Voronoi
              traversal mesh generated directly from the regional DEM.
            </p>
          </div>

          <TraversalCellViewer
            cells={cells}
            metadata={metadata}
            basemapSrc="/maps/aresh_arctic_16x9_normalized_topobathy_current_coast_reference_cities.png"
            overlaySrc="/maps/drakharpan-deep-traversal-cells-overlay.webp"
            overlayLabel="Deep Voronoi"
            settlements={settlements}
            description="Fresh normalized Drakharpan crop with a direct local land-only Voronoi traversal mesh, suitable for finer province and travel-profile assignment."
          />
        </article>
      </div>
    </main>
  );
}
