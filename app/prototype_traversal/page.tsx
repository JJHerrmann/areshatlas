import { promises as fs } from "node:fs";
import path from "node:path";

import TraversalCellViewer, { type TraversalCell } from "@/components/azgaar/TraversalCellViewer";

const CSV_PATH = path.join(process.cwd(), "output", "working", "areshnaat_land_traversal_cells.csv");
const META_PATH = path.join(process.cwd(), "output", "working", "areshnaat_land_traversal_cells_metadata.json");

function parseCsv(text: string): TraversalCell[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      cellId: Number(row.cell_id),
      mapX: Number(row.centroid_x),
      mapY: Number(row.centroid_y),
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

export default async function PrototypeTraversalPage() {
  const csvText = await fs.readFile(CSV_PATH, "utf8");
  const metadata = JSON.parse(await fs.readFile(META_PATH, "utf8"));
  const cells = parseCsv(csvText);

  return (
    <main className="wiki-main-page prototype-map-page" data-prototype-traversal="true">
      <div className="wiki-content prototype-map-content">
        <article className="wiki-article prototype-map-article">
          <div className="wiki-article-header">
            <div className="wiki-kicker">Traversal Cells</div>
            <h1 className="wiki-title">Areshnaat Land Traversal Viewer</h1>
            <p className="wiki-subtitle">
              DEM-basemap viewer for the reusable land-side Voronoi traversal substrate. This is the working
              surface for assigning movement difficulty and revisiting those cells later.
            </p>
          </div>

          <TraversalCellViewer
            cells={cells}
            metadata={metadata}
            basemapSrc="/maps/areshnaat-topo-dem.webp"
            overlaySrc="/maps/areshnaat-land-traversal-cells-overlay.webp"
            overlayLabel="Show world Voronoi overlay"
            description="DEM basemap with land-side Voronoi boundaries and centroid markers from the working world traversal CSV."
          />
        </article>
      </div>
    </main>
  );
}
