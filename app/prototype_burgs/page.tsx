import { promises as fs } from "node:fs";
import path from "node:path";

import BurgPinWorkbench from "@/components/azgaar/BurgPinWorkbench";

type BurgRecord = {
  id: number;
  name: string;
  slug: string;
  stateId: number;
  stateName: string;
  provinceId: number | null;
  provinceName: string | null;
  cultureId: number | null;
  featureId: number | null;
  cell: number | null;
  x: number;
  y: number;
  capital: boolean;
  port: boolean;
  population: number | null;
  type: string | null;
  group: string | null;
  walls: boolean;
  citadel: boolean;
  temple: boolean;
  beringiaX: number | null;
  beringiaY: number | null;
  inBeringia: boolean;
};

const BURGS_CSV_PATH = path.join(
  process.cwd(),
  "output",
  "azgaar",
  "tabular",
  "areshnaahht-2026-03-15-21-47-authority-burgs.csv",
);
const BERINGIA_META_PATH = path.join(
  process.cwd(),
  "region_exports",
  "beringia_pipeline_locked_16x9",
  "beringia_locked_16x9_west_up_sl62_metadata.json",
);

const AZGAAR_WORLD_WIDTH = 3023;
const AZGAAR_WORLD_HEIGHT = 1562;

function parseBoolean(value: string | undefined) {
  return (value ?? "").trim().toUpperCase() === "TRUE";
}

function parseNumber(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function areshXyToLonLat(x: number, y: number) {
  const lon = (x / AZGAAR_WORLD_WIDTH) * 360 - 180;
  const lat = 90 - (y / AZGAAR_WORLD_HEIGHT) * 180;
  return { lat, lon };
}

function lonLatToVector(latDeg: number, lonDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)] as const;
}

function vectorToLonLat(vec: readonly [number, number, number]) {
  const [x, y, z] = vec;
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI;
  return { lat, lon };
}

function localEastNorthUp(latDeg: number, lonDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const east = [-Math.sin(lon), Math.cos(lon), 0] as const;
  const north = [
    -Math.sin(lat) * Math.cos(lon),
    -Math.sin(lat) * Math.sin(lon),
    Math.cos(lat),
  ] as const;
  const up = lonLatToVector(latDeg, lonDeg);
  return { east, north, up };
}

function dot3(a: readonly number[], b: readonly number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function areshToEarthLonLat(areshLat: number, areshLon: number) {
  const anchorLat = 38.977580555555555;
  const anchorLon = -9.27326388888889;
  const { east, north, up } = localEastNorthUp(anchorLat, anchorLon);
  const areshVec = lonLatToVector(areshLat, areshLon);

  // earth_from_aresh columns:
  // x = up(anchor), y = earth north(anchor), z = earth west(anchor) = -earth east(anchor)
  const earthVec = [
    up[0] * areshVec[0] + north[0] * areshVec[1] - east[0] * areshVec[2],
    up[1] * areshVec[0] + north[1] * areshVec[1] - east[1] * areshVec[2],
    up[2] * areshVec[0] + north[2] * areshVec[1] - east[2] * areshVec[2],
  ] as const;

  return vectorToLonLat(earthVec);
}

function earthLonLatToBeringiaPx(lat: number, lon: number, meta: any) {
  const width = Number(meta.output_size_color_reference?.[0] ?? 2400);
  const height = Number(meta.output_size_color_reference?.[1] ?? 1350);
  const locked = meta.locked_interior;
  const topEdgeLon = Number(locked.top_edge_lon);
  const bottomEdgeLon = Number(locked.bottom_edge_lon);
  const latMin = Number(locked.lat_min);
  const latMax = Number(locked.lat_max);

  const topUnwrapped = topEdgeLon;
  const bottomUnwrapped = bottomEdgeLon > topEdgeLon ? bottomEdgeLon - 360 : bottomEdgeLon;
  const lonUnwrapped = lon > topEdgeLon ? lon - 360 : lon;

  const x = ((lat - latMin) / (latMax - latMin)) * width;
  const y = ((topUnwrapped - lonUnwrapped) / (topUnwrapped - bottomUnwrapped)) * height;
  const inBounds = x >= 0 && x <= width && y >= 0 && y <= height;
  return { x, y, inBounds, width, height };
}

function parseCsv(text: string, beringiaMeta: any): BurgRecord[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const x = Number(row.x);
    const y = Number(row.y);
    const areshLonLat = areshXyToLonLat(x, y);
    const earthLonLat = areshToEarthLonLat(areshLonLat.lat, areshLonLat.lon);
    const beringia = earthLonLatToBeringiaPx(earthLonLat.lat, earthLonLat.lon, beringiaMeta);
    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      stateId: Number(row.state_id),
      stateName: row.state_name,
      provinceId: parseNumber(row.province_id),
      provinceName: row.province_name || null,
      cultureId: parseNumber(row.culture_id),
      featureId: parseNumber(row.feature_id),
      cell: parseNumber(row.cell),
      x,
      y,
      capital: parseBoolean(row.capital),
      port: parseBoolean(row.port),
      population: parseNumber(row.population),
      type: row.type || null,
      group: row.group || null,
      walls: parseBoolean(row.walls),
      citadel: parseBoolean(row.citadel),
      temple: parseBoolean(row.temple),
      beringiaX: beringia.inBounds ? beringia.x : null,
      beringiaY: beringia.inBounds ? beringia.y : null,
      inBeringia: beringia.inBounds,
    };
  });
}

export default async function PrototypeBurgsPage() {
  try {
    const csvText = await fs.readFile(BURGS_CSV_PATH, "utf8");
    const beringiaMeta = JSON.parse(await fs.readFile(BERINGIA_META_PATH, "utf8"));
    const burgs = parseCsv(csvText, beringiaMeta);

    return (
      <main className="wiki-main-page prototype-map-page">
        <div className="wiki-content prototype-map-content">
          <article className="wiki-article prototype-map-article">
            <div className="wiki-article-header">
              <div className="wiki-kicker">Prototype Burgs</div>
              <h1 className="wiki-title">Azgaar Burg Coordinate Audit</h1>
              <p className="wiki-subtitle">
                Beringia-section inspection window for the authority burg CSV. Use this to check where
                spherical-remapped Azgaar burgs land against the locked `-62 m` regional DEM in the
                rotated audit orientation before we start validating provinces and settlement placement
                against the terrain.
              </p>
            </div>

            <BurgPinWorkbench burgs={burgs} />
          </article>
        </div>
      </main>
    );
  } catch (error) {
    const missingPrototypeAsset =
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT";

    if (!missingPrototypeAsset) throw error;

    return (
      <main className="wiki-main-page prototype-map-page">
        <div className="wiki-content prototype-map-content">
          <article className="wiki-article prototype-map-article">
            <div className="wiki-article-header">
              <div className="wiki-kicker">Prototype Burgs</div>
              <h1 className="wiki-title">Azgaar Burg Coordinate Audit</h1>
              <p className="wiki-subtitle">
                This prototype depends on local export artifacts that are not present in the production
                deployment environment.
              </p>
            </div>

            <div className="codex-empty-state p-6 text-sm leading-6">
              Required regional export files were not found. This prototype remains available in local
              development where `region_exports/` is present.
            </div>
          </article>
        </div>
      </main>
    );
  }
}
