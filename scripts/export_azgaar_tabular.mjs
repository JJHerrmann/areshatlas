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

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringifyCellValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
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

function findAllCsvLines(lines, predicate) {
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !line.includes(",")) continue;
    try {
      const parsed = JSON.parse(`[${line}]`);
      if (Array.isArray(parsed) && predicate(parsed)) {
        matches.push({ index, value: parsed });
      }
    } catch {}
  }
  return matches;
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

function identifyOwnershipLine(lines, length, maxId, targetIds) {
  const candidates = findAllCsvLines(
    lines,
    (arr) =>
      arr.length === length &&
      arr.every((item) => Number.isInteger(item) && item >= 0) &&
      Math.max(...arr) <= maxId &&
      targetIds.some((id) => arr.includes(id)),
  );

  return (
    candidates
      .map((match) => ({
        ...match,
        uniqueCount: new Set(match.value).size,
        maxValue: Math.max(...match.value),
      }))
      .sort((a, b) => {
        if (b.maxValue !== a.maxValue) return b.maxValue - a.maxValue;
        return b.uniqueCount - a.uniqueCount;
      })[0] || null
  );
}

function worksheetXml(name, columns, rows) {
  const headerRow = columns
    .map(
      (column) =>
        `<Cell><Data ss:Type="String">${escapeXml(column.label)}</Data></Cell>`,
    )
    .join("");

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = stringifyCellValue(row[column.key]);
          return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("\n      ");

  return `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table>
        <Row>${headerRow}</Row>
        ${bodyRows}
      </Table>
    </Worksheet>`;
}

function csvText(columns, rows) {
  const encode = (value) => {
    const text = stringifyCellValue(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = columns.map((column) => encode(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => encode(row[column.key])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.input || DEFAULT_INPUT;
  const outputDir = path.resolve(args.outputDir || path.join(process.cwd(), "output", "azgaar", "tabular"));
  const workbookBaseName = args.name || `${slugify(path.basename(inputPath, path.extname(inputPath)))}-authority`;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input map not found: ${inputPath}`);
  }

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
  const cellsPathLine = lines.find((line) => line.includes('<g id="cells"') || line.includes('<path id="cells"'));

  if (!statesLine || !burgsLine || !provincesLine || !routesLine || !cellsPathLine) {
    throw new Error("Could not identify required Azgaar tables for tabular export");
  }

  const cellCount = ((raw.match(/<g id="cells"[^>]*><path d="([^"]+)"/i) || [])[1] || "")
    .split("M")
    .filter(Boolean).length;

  const states = statesLine.value.filter(Boolean);
  const provinces = provincesLine.value.filter(Boolean);
  const burgs = burgsLine.value.filter(Boolean);
  const routes = routesLine.value.filter(Boolean);

  const maxStateId = Math.max(...states.map((item) => item?.i || 0));
  const maxProvinceId = Math.max(...provinces.map((item) => item?.i || 0));
  const stateIds = states.map((item) => item.i).filter((value) => Number.isInteger(value) && value > 0);
  const provinceIds = provinces.map((item) => item.i).filter((value) => Number.isInteger(value) && value > 0);

  const stateByCellLine = identifyOwnershipLine(lines, cellCount, maxStateId, stateIds);
  const provinceByCellLine = identifyOwnershipLine(lines, cellCount, maxProvinceId, provinceIds);

  if (!stateByCellLine || !provinceByCellLine) {
    throw new Error("Could not identify cell ownership arrays for states/provinces");
  }

  const stateByCell = stateByCellLine.value;
  const provinceByCell = provinceByCellLine.value;
  const atlasColors = assignAtlasColors(states);

  const provinceIdToName = new Map(provinces.map((province) => [province.i, province.fullName || province.name]));
  const stateIdToName = new Map(states.map((state) => [state.i, state.fullName || state.name]));

  const normalizedBurgs = burgs.map((burg) => ({
    id: burg.i,
    name: burg.name,
    slug: slugify(burg.name),
    stateId: burg.state,
    stateName: stateIdToName.get(burg.state) || null,
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
        slug: slugify(state.name || state.fullName || `state-${state.i}`),
        fullName: state.fullName || state.name || null,
        form: state.form || null,
        type: state.type || null,
        color: state.color || null,
        atlasColor: atlasColors.get(state.i) || null,
        capitalId: state.capital || null,
        center: Array.isArray(state.center) ? state.center.join(", ") : null,
        pole: Array.isArray(state.pole) ? state.pole.join(", ") : null,
        cells: state.cells ?? 0,
        burgCount: state.burgs ?? stateBurgs.length,
        cultureId: state.culture ?? null,
        expansionism: state.expansionism ?? null,
        neighbors: Array.isArray(state.neighbors) ? state.neighbors.filter(Boolean).join(", ") : "",
        bbox: buildStateBox(stateBurgs)
          ? `${buildStateBox(stateBurgs).minX}, ${buildStateBox(stateBurgs).minY}, ${buildStateBox(stateBurgs).maxX}, ${buildStateBox(stateBurgs).maxY}`
          : null,
      };
    })
    .filter(
      (state) =>
        Boolean(state.name || state.fullName) ||
        state.cells > 0 ||
        state.burgCount > 0 ||
        Boolean(state.neighbors),
    );

  const normalizedProvinces = provinces.map((province) => ({
    id: province.i,
    name: province.name,
    slug: slugify(province.fullName || province.name || `province-${province.i}`),
    fullName: province.fullName || province.name,
    stateId: province.state,
    stateName: stateIdToName.get(province.state) || null,
    burgId: province.burg || null,
    center: Array.isArray(province.center) ? province.center.join(", ") : null,
    pole: Array.isArray(province.pole) ? province.pole.join(", ") : null,
    color: province.color || null,
    formName: province.formName || null,
  }));

  const normalizedRoutes = routes.map((route) => ({
    id: route.i,
    group: route.group,
    featureId: route.feature ?? null,
    pointCount: Array.isArray(route.points) ? route.points.length : 0,
    points: (route.points || [])
      .map(([x, y]) => `${Number(x).toFixed(2)},${Number(y).toFixed(2)}`)
      .join(" | "),
  }));

  const cellOwnershipRows = stateByCell.map((ownerStateId, index) => ({
    cellId: index,
    stateId: ownerStateId,
    stateName: stateIdToName.get(ownerStateId) || null,
    provinceId: provinceByCell[index] ?? null,
    provinceName: provinceIdToName.get(provinceByCell[index]) || null,
  }));

  const metadataRows = [
    { key: "source", value: inputPath },
    { key: "version", value: header[0] || null },
    { key: "saveDate", value: header[2] || null },
    { key: "width", value: Number(header[4] || 0) },
    { key: "height", value: Number(header[5] || 0) },
    { key: "worldName", value: settings.worldName },
    { key: "distanceUnit", value: settings.distanceUnit },
    { key: "distanceScale", value: settings.distanceScale },
    { key: "areaUnit", value: settings.areaUnit },
    { key: "heightUnit", value: settings.heightUnit },
    { key: "temperatureScale", value: settings.temperatureScale },
    { key: "populationRate", value: settings.populationRate },
    { key: "urbanization", value: settings.urbanization },
    { key: "stateOwnershipLine", value: stateByCellLine.index },
    { key: "provinceOwnershipLine", value: provinceByCellLine.index },
    { key: "cellCount", value: cellCount },
  ];

  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  ${worksheetXml(
    "metadata",
    [
      { key: "key", label: "key" },
      { key: "value", label: "value" },
    ],
    metadataRows,
  )}
  ${worksheetXml(
    "states",
    [
      { key: "id", label: "id" },
      { key: "name", label: "name" },
      { key: "slug", label: "slug" },
      { key: "fullName", label: "full_name" },
      { key: "form", label: "form" },
      { key: "type", label: "type" },
      { key: "color", label: "color" },
      { key: "atlasColor", label: "atlas_color" },
      { key: "capitalId", label: "capital_id" },
      { key: "center", label: "center" },
      { key: "pole", label: "pole" },
      { key: "cells", label: "cells" },
      { key: "burgCount", label: "burg_count" },
      { key: "cultureId", label: "culture_id" },
      { key: "expansionism", label: "expansionism" },
      { key: "neighbors", label: "neighbors" },
      { key: "bbox", label: "bbox" },
    ],
    normalizedStates,
  )}
  ${worksheetXml(
    "provinces",
    [
      { key: "id", label: "id" },
      { key: "name", label: "name" },
      { key: "slug", label: "slug" },
      { key: "fullName", label: "full_name" },
      { key: "stateId", label: "state_id" },
      { key: "stateName", label: "state_name" },
      { key: "burgId", label: "burg_id" },
      { key: "center", label: "center" },
      { key: "pole", label: "pole" },
      { key: "color", label: "color" },
      { key: "formName", label: "form_name" },
    ],
    normalizedProvinces,
  )}
  ${worksheetXml(
    "burgs",
    [
      { key: "id", label: "id" },
      { key: "name", label: "name" },
      { key: "slug", label: "slug" },
      { key: "stateId", label: "state_id" },
      { key: "stateName", label: "state_name" },
      { key: "provinceId", label: "province_id" },
      { key: "provinceName", label: "province_name" },
      { key: "cultureId", label: "culture_id" },
      { key: "featureId", label: "feature_id" },
      { key: "cell", label: "cell" },
      { key: "x", label: "x" },
      { key: "y", label: "y" },
      { key: "capital", label: "capital" },
      { key: "port", label: "port" },
      { key: "population", label: "population" },
      { key: "type", label: "type" },
      { key: "group", label: "group" },
      { key: "walls", label: "walls" },
      { key: "citadel", label: "citadel" },
      { key: "temple", label: "temple" },
    ],
    normalizedBurgs,
  )}
  ${worksheetXml(
    "routes",
    [
      { key: "id", label: "id" },
      { key: "group", label: "group" },
      { key: "featureId", label: "feature_id" },
      { key: "pointCount", label: "point_count" },
      { key: "points", label: "points" },
    ],
    normalizedRoutes,
  )}
  ${worksheetXml(
    "cells",
    [
      { key: "cellId", label: "cell_id" },
      { key: "stateId", label: "state_id" },
      { key: "stateName", label: "state_name" },
      { key: "provinceId", label: "province_id" },
      { key: "provinceName", label: "province_name" },
    ],
    cellOwnershipRows,
  )}
</Workbook>
`;

  fs.mkdirSync(outputDir, { recursive: true });
  const workbookPath = path.join(outputDir, `${workbookBaseName}.xml`);
  fs.writeFileSync(workbookPath, `${workbookXml}\n`, "utf8");

  const sheets = [
    {
      name: "metadata",
      columns: [
        { key: "key", label: "key" },
        { key: "value", label: "value" },
      ],
      rows: metadataRows,
    },
    {
      name: "states",
      columns: [
        { key: "id", label: "id" },
        { key: "name", label: "name" },
        { key: "slug", label: "slug" },
        { key: "fullName", label: "full_name" },
        { key: "form", label: "form" },
        { key: "type", label: "type" },
        { key: "color", label: "color" },
        { key: "atlasColor", label: "atlas_color" },
        { key: "capitalId", label: "capital_id" },
        { key: "center", label: "center" },
        { key: "pole", label: "pole" },
        { key: "cells", label: "cells" },
        { key: "burgCount", label: "burg_count" },
        { key: "cultureId", label: "culture_id" },
        { key: "expansionism", label: "expansionism" },
        { key: "neighbors", label: "neighbors" },
        { key: "bbox", label: "bbox" },
      ],
      rows: normalizedStates,
    },
    {
      name: "provinces",
      columns: [
        { key: "id", label: "id" },
        { key: "name", label: "name" },
        { key: "slug", label: "slug" },
        { key: "fullName", label: "full_name" },
        { key: "stateId", label: "state_id" },
        { key: "stateName", label: "state_name" },
        { key: "burgId", label: "burg_id" },
        { key: "center", label: "center" },
        { key: "pole", label: "pole" },
        { key: "color", label: "color" },
        { key: "formName", label: "form_name" },
      ],
      rows: normalizedProvinces,
    },
    {
      name: "burgs",
      columns: [
        { key: "id", label: "id" },
        { key: "name", label: "name" },
        { key: "slug", label: "slug" },
        { key: "stateId", label: "state_id" },
        { key: "stateName", label: "state_name" },
        { key: "provinceId", label: "province_id" },
        { key: "provinceName", label: "province_name" },
        { key: "cultureId", label: "culture_id" },
        { key: "featureId", label: "feature_id" },
        { key: "cell", label: "cell" },
        { key: "x", label: "x" },
        { key: "y", label: "y" },
        { key: "capital", label: "capital" },
        { key: "port", label: "port" },
        { key: "population", label: "population" },
        { key: "type", label: "type" },
        { key: "group", label: "group" },
        { key: "walls", label: "walls" },
        { key: "citadel", label: "citadel" },
        { key: "temple", label: "temple" },
      ],
      rows: normalizedBurgs,
    },
    {
      name: "routes",
      columns: [
        { key: "id", label: "id" },
        { key: "group", label: "group" },
        { key: "featureId", label: "feature_id" },
        { key: "pointCount", label: "point_count" },
        { key: "points", label: "points" },
      ],
      rows: normalizedRoutes,
    },
    {
      name: "cells",
      columns: [
        { key: "cellId", label: "cell_id" },
        { key: "stateId", label: "state_id" },
        { key: "stateName", label: "state_name" },
        { key: "provinceId", label: "province_id" },
        { key: "provinceName", label: "province_name" },
      ],
      rows: cellOwnershipRows,
    },
  ];

  for (const sheet of sheets) {
    fs.writeFileSync(path.join(outputDir, `${workbookBaseName}-${sheet.name}.csv`), csvText(sheet.columns, sheet.rows), "utf8");
  }

  process.stdout.write(
      `${JSON.stringify(
      {
        input: inputPath,
        workbookPath,
        csvDir: outputDir,
        counts: {
          states: normalizedStates.length,
          provinces: normalizedProvinces.length,
          burgs: normalizedBurgs.length,
          routes: normalizedRoutes.length,
          cells: cellOwnershipRows.length,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main();
