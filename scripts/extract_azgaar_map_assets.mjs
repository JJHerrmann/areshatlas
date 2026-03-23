import fs from "node:fs";
import path from "node:path";
import { assignAtlasColors } from "./lib/azgaar_atlas_colors.mjs";

const DEFAULT_INPUT = "R:\\RookVault\\00_Inbox\\Areshnaahht 2026-03-15-21-47.map";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : "true";
    args[key] = value;
  }
  return args;
}

function findJsonLine(lines, predicate) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !line.trim().startsWith("[")) continue;
    try {
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed) && predicate(parsed)) {
        return { index, value: parsed };
      }
    } catch {}
  }
  return null;
}

function findCsvLine(lines, predicate) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !line.includes(",")) continue;
    try {
      const parsed = JSON.parse(`[${line}]`);
      if (Array.isArray(parsed) && predicate(parsed)) {
        return { index, value: parsed };
      }
    } catch {}
  }
  return null;
}

function extractPathData(text, groupId) {
  const pattern = new RegExp(`<g id="${groupId}"[^>]*><path d="([^"]+)"`, "i");
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function parseSettingsMetadata(raw) {
  const lines = raw.split(/\r?\n/);
  const candidate = lines.find((line) => line.includes("|") && line.includes('{"pinNotes"'));
  if (!candidate) {
    return {
      distanceUnit: null,
      distanceScale: null,
      areaUnit: null,
      heightUnit: null,
      temperatureScale: null,
      populationRate: null,
      urbanization: null,
      worldName: null,
    };
  }

  const parts = candidate.split("|");
  return {
    distanceUnit: parts[0] || null,
    distanceScale: Number(parts[1] || 0) || null,
    areaUnit: parts[2] || null,
    heightUnit: parts[3] || null,
    temperatureScale: parts[5] || null,
    populationRate: Number(parts[15] || 0) || null,
    urbanization: Number(parts[16] || 0) || null,
    worldName: parts[20] || null,
  };
}

function buildStateBox(burgs) {
  if (!burgs.length) return null;
  const xs = burgs.map((item) => item.x);
  const ys = burgs.map((item) => item.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.input || DEFAULT_INPUT;
  const outputDir = path.resolve(args.outputDir || path.join(process.cwd(), "public", "azgaar"));

  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const header = (lines[0] || "").split("|");
  const settings = parseSettingsMetadata(raw);

  const statesLine = findJsonLine(
    lines,
    (arr) => arr.some((item) => item && typeof item === "object" && "diplomacy" in item && "neighbors" in item),
  );
  const burgsLine = findJsonLine(
    lines,
    (arr) => arr.some((item) => item && typeof item === "object" && "population" in item && "state" in item && "x" in item && "y" in item),
  );
  const provincesLine = findJsonLine(
    lines,
    (arr) => arr.some((item) => item && typeof item === "object" && "fullName" in item && "state" in item && "center" in item),
  );
  const routesLine = findJsonLine(
    lines,
    (arr) => arr.some((item) => item && typeof item === "object" && "group" in item && Array.isArray(item.points)),
  );
  const provinceByCellLine = findCsvLine(lines, (arr) => arr.length > 2000 && arr.every((item) => Number.isInteger(item)));

  if (!statesLine || !burgsLine || !provincesLine || !routesLine || !provinceByCellLine) {
    throw new Error("Could not identify required Azgaar tables for extraction");
  }

  const states = statesLine.value.filter(Boolean);
  const provinces = provincesLine.value.filter(Boolean);
  const burgs = burgsLine.value.filter(Boolean);
  const routes = routesLine.value.filter(Boolean);
  const provinceByCell = provinceByCellLine.value;
  const atlasColors = assignAtlasColors(states);

  const provinceIdToName = new Map(provinces.map((province) => [province.i, province.fullName || province.name]));

  const normalizedBurgs = burgs.map((burg) => ({
    id: burg.i,
    name: burg.name,
    stateId: burg.state,
    provinceId: Number.isInteger(provinceByCell[burg.cell]) ? provinceByCell[burg.cell] : null,
    provinceName:
      Number.isInteger(provinceByCell[burg.cell]) && provinceIdToName.has(provinceByCell[burg.cell])
        ? provinceIdToName.get(provinceByCell[burg.cell])
        : null,
    cultureId: burg.culture,
    featureId: burg.feature,
    cell: burg.cell,
    x: Number(burg.x),
    y: Number(burg.y),
    capital: Boolean(burg.capital),
    port: Boolean(burg.port),
    population: burg.population,
    type: burg.type || null,
    group: burg.group || null,
    walls: Boolean(burg.walls),
    citadel: Boolean(burg.citadel),
    temple: Boolean(burg.temple),
  }));

  const burgsByState = new Map();
  for (const burg of normalizedBurgs) {
    if (!burgsByState.has(burg.stateId)) burgsByState.set(burg.stateId, []);
    burgsByState.get(burg.stateId).push(burg);
  }

  const normalizedStates = states
    .map((state) => {
      const stateBurgs = burgsByState.get(state.i) || [];
      return {
        id: state.i,
        name: state.name || null,
        fullName: state.fullName || state.name || null,
        form: state.form || null,
        type: state.type || null,
        color: state.color || null,
        atlasColor: atlasColors.get(state.i) || null,
        capitalId: state.capital || null,
        center: Array.isArray(state.center) ? state.center : null,
        pole: Array.isArray(state.pole) ? state.pole : null,
        cells: state.cells ?? 0,
        burgCount: state.burgs ?? stateBurgs.length,
        cultureId: state.culture ?? null,
        expansionism: state.expansionism ?? null,
        neighbors: Array.isArray(state.neighbors) ? state.neighbors.filter(Boolean) : [],
        bbox: buildStateBox(stateBurgs),
      };
    })
    .filter(
      (state) =>
        Boolean(state.name || state.fullName) ||
        state.cells > 0 ||
        state.burgCount > 0 ||
        state.neighbors.length > 0,
    );

  const normalizedProvinces = provinces.map((province) => ({
    id: province.i,
    name: province.name,
    fullName: province.fullName || province.name,
    stateId: province.state,
    burgId: province.burg || null,
    center: Array.isArray(province.center) ? province.center : null,
    pole: Array.isArray(province.pole) ? province.pole : null,
    color: province.color || null,
    formName: province.formName || null,
  }));

  const normalizedRoutes = routes.map((route) => ({
    id: route.i,
    group: route.group,
    featureId: route.feature ?? null,
    pointCount: Array.isArray(route.points) ? route.points.length : 0,
    points: (route.points || []).map(([x, y]) => [Number(x), Number(y)]),
  }));

  const svgStart = raw.indexOf('<svg id="map"');
  const svgEnd = raw.lastIndexOf("</svg>");
  if (svgStart < 0 || svgEnd < 0) {
    throw new Error("Could not locate embedded SVG in Azgaar save");
  }
  const svg = raw.slice(svgStart, svgEnd + 6);

  const data = {
    metadata: {
      version: header[0] || null,
      source: path.basename(inputPath),
      saveDate: header[2] || null,
      width: Number(header[4] || 0),
      height: Number(header[5] || 0),
      ...settings,
    },
    paths: {
      statesBody: extractPathData(raw, "statesBody"),
      provinceBorders: extractPathData(raw, "provinceBorders"),
      stateBorders: extractPathData(raw, "stateBorders"),
    },
    states: normalizedStates,
    provinces: normalizedProvinces,
    burgs: normalizedBurgs,
    routes: normalizedRoutes,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "areshnaat-map-data.json");
  const svgPath = path.join(outputDir, "areshnaat-world-raw.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.writeFileSync(svgPath, svg, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        input: inputPath,
        jsonPath,
        svgPath,
        counts: {
          states: normalizedStates.length,
          provinces: normalizedProvinces.length,
          burgs: normalizedBurgs.length,
          routes: normalizedRoutes.length,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main();
