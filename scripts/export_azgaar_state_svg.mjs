import fs from "node:fs";
import path from "node:path";
import { assignAtlasColors } from "./lib/azgaar_atlas_colors.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findJsonLine(lines, predicate) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim().startsWith("[")) continue;
    try {
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed) && predicate(parsed)) return { index: i, value: parsed };
    } catch {}
  }
  return null;
}

function findCsvLine(lines, predicate) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.includes(",")) continue;
    try {
      const parsed = JSON.parse(`[${line}]`);
      if (Array.isArray(parsed) && predicate(parsed)) return { index: i, value: parsed };
    } catch {}
  }
  return null;
}

function findAllCsvLines(lines, predicate) {
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.includes(",")) continue;
    try {
      const parsed = JSON.parse(`[${line}]`);
      if (Array.isArray(parsed) && predicate(parsed)) {
        matches.push({ index: i, value: parsed });
      }
    } catch {}
  }
  return matches;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function routeTouchesBox(route, box) {
  return route.points.some(([x, y]) => x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY);
}

function routeToPath(points) {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

function intersects(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

function estimateTextBox(text, x, y, fontSize, anchor = "start") {
  const width = Math.max(24, text.length * fontSize * 0.58);
  const height = fontSize * 1.2;
  const left = anchor === "middle" ? x - width / 2 : x;
  const top = y - fontSize * 0.9;
  return { x: left, y: top, width, height };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickLabelPlacement({ x, y, text, fontSize, anchor = "start", occupied, box, pointRadius = 0 }) {
  const candidates = [
    { x: x + pointRadius + 7, y: y - 8, anchor },
    { x: x + pointRadius + 7, y: y + fontSize + 1, anchor },
    { x: x - pointRadius - 7, y: y - 8, anchor: "end" },
    { x: x - pointRadius - 7, y: y + fontSize + 1, anchor: "end" },
    { x, y: y - pointRadius - 10, anchor: "middle" },
    { x, y: y + pointRadius + fontSize + 2, anchor: "middle" },
  ];

  for (const candidate of candidates) {
    const bounds = estimateTextBox(text, candidate.x, candidate.y, fontSize, candidate.anchor);
    const padded = {
      x: bounds.x - 4,
      y: bounds.y - 2,
      width: bounds.width + 8,
      height: bounds.height + 4,
    };
    if (
      padded.x < box.minX ||
      padded.y < box.minY ||
      padded.x + padded.width > box.maxX ||
      padded.y + padded.height > box.maxY
    ) {
      continue;
    }
    if (occupied.some((item) => intersects(padded, item))) {
      continue;
    }
    occupied.push(padded);
    return candidate;
  }

  const fallback = {
    x: clamp(x + pointRadius + 7, box.minX + 6, box.maxX - 80),
    y: clamp(y - 8, box.minY + fontSize + 2, box.maxY - 6),
    anchor,
  };
  occupied.push(estimateTextBox(text, fallback.x, fallback.y, fontSize, fallback.anchor));
  return fallback;
}

function makeFallbackKodaName(provinceName) {
  const base = String(provinceName || "").trim();
  if (!base) return "Koda";
  if (/koda$/i.test(base)) return base;
  return `${base}koda`;
}

function extractPathData(text, groupId) {
  const pattern = new RegExp(`<g id="${groupId}"[^>]*><path d="([^"]+)"`, "i");
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function extractNamedBlock(text, tagName, id) {
  const pattern = new RegExp(`<${tagName} id="${id}"[^>]*>[\\s\\S]*?<\\/${tagName}>`, "i");
  const match = text.match(pattern);
  return match ? match[0] : null;
}

function extractFeatureDefs(text) {
  const matches = text.match(/<path d="[^"]+" id="feature_\d+" data-f="\d+"\/>/g);
  return matches || [];
}

function splitCellsPathData(d) {
  return String(d || "")
    .split("M")
    .filter(Boolean)
    .map((segment) => `M${segment}`);
}

function parseCellSubpathBounds(segment) {
  const numbers = segment
    .slice(1)
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function boxIntersects(a, b) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

function parseColor(value) {
  const text = String(value || "").trim();
  const rgbaMatch = text.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i,
  );

  if (!rgbaMatch) {
    return { color: text, opacity: null };
  }

  const [, r, g, b, alpha] = rgbaMatch;
  const toHex = (component) => Math.round(Number(component)).toString(16).padStart(2, "0");
  return {
    color: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    opacity: alpha == null ? null : String(alpha),
  };
}

function hexToRgb(hex) {
  const text = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(text)) return null;
  return {
    r: Number.parseInt(text.slice(0, 2), 16),
    g: Number.parseInt(text.slice(2, 4), 16),
    b: Number.parseInt(text.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (component) => Math.round(clamp(component, 0, 255)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base, target, ratio) {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  if (!a || !b) return base;
  return rgbToHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

function renderStyledPath({ d, fill, fillOpacity = null, stroke = null, strokeOpacity = null, strokeWidth = null, maskId = null }) {
  if (!d) return "";
  const attrs = [`d="${d}"`, `fill="${fill}"`];
  if (fillOpacity != null) attrs.push(`fill-opacity="${fillOpacity}"`);
  if (stroke) attrs.push(`stroke="${stroke}"`);
  if (strokeOpacity != null) attrs.push(`stroke-opacity="${strokeOpacity}"`);
  if (strokeWidth != null) attrs.push(`stroke-width="${strokeWidth}"`);
  if (maskId) attrs.push(`mask="url(#${maskId})"`);
  return `<path ${attrs.join(" ")} />`;
}

function renderTextPair({
  text,
  x,
  y,
  anchor = "start",
  fontFamily,
  fontSize,
  fontWeight = 400,
  fontStyle = "normal",
  letterSpacing,
  fill,
  halo = "rgba(245, 239, 220, 0.95)",
  haloWidth = 2.4,
  className = "",
}) {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `text-anchor="${anchor}"`,
    `font-family="${fontFamily}"`,
    `font-size="${fontSize}"`,
    `font-weight="${fontWeight}"`,
    `font-style="${fontStyle}"`,
    `fill="${fill}"`,
  ];
  if (letterSpacing != null) attrs.push(`letter-spacing="${letterSpacing}"`);
  if (className) attrs.push(`class="${className}"`);

  const haloColor = parseColor(halo);
  const haloAttrs = [
    `x="${x}"`,
    `y="${y}"`,
    `text-anchor="${anchor}"`,
    `font-family="${fontFamily}"`,
    `font-size="${fontSize}"`,
    `font-weight="${fontWeight}"`,
    `font-style="${fontStyle}"`,
    `fill="none"`,
    `stroke="${haloColor.color}"`,
    ...(haloColor.opacity ? [`stroke-opacity="${haloColor.opacity}"`] : []),
    `stroke-width="${haloWidth}"`,
    `stroke-linejoin="round"`,
    `stroke-linecap="round"`,
  ];
  if (letterSpacing != null) haloAttrs.push(`letter-spacing="${letterSpacing}"`);
  if (className) haloAttrs.push(`class="${className}"`);

  return `
    <text ${haloAttrs.join(" ")}>${escapeXml(text)}</text>
    <text ${attrs.join(" ")}>${escapeXml(text)}</text>
  `;
}

function buildSvgStyles({ seaColor, landColor, provinceBorderColor, stateBorderColor }) {
  return [
    `.bg { fill: ${seaColor}; }`,
    `.land-base { fill: ${landColor}; fill-opacity: 0.96; stroke: none; }`,
    `.sea-cells { fill: #4f7392; fill-opacity: 0.32; stroke: #d7e4ef; stroke-opacity: 0.24; stroke-width: 0.18; }`,
    `.province-borders { fill: none; stroke: ${provinceBorderColor}; stroke-opacity: 0.72; stroke-width: 0.8; stroke-dasharray: 0 2; stroke-linecap: round; }`,
    `.state-borders { fill: none; stroke: ${stateBorderColor}; stroke-opacity: 0.88; stroke-width: 1.4; stroke-linecap: round; }`,
    ".road { fill: none; stroke: #b2602a; stroke-width: 1.15; stroke-dasharray: 2 1; opacity: 0.9; }",
    ".trail { fill: none; stroke: #8a6938; stroke-width: 0.8; stroke-dasharray: 1.5 2.2; opacity: 0.8; }",
    ".burg { fill: #f7f2e6; stroke: #3e2d18; stroke-width: 1.3; }",
    ".burg-capital { fill: #cda65a; }",
    ".burg-synthetic { fill: #d9cfb6; stroke-dasharray: 2 1.5; }",
    ".legend-box { fill: #fbf6ea; fill-opacity: 0.9; stroke: #5f4827; stroke-opacity: 0.32; }",
  ].join("\n    ");
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.input;
  const target = args.target || "Raamkoda";
  const outputPath = path.resolve(args.output || path.join(process.cwd(), "output", `${slugify(target)}-azgaar-export.svg`));
  const padding = Number(args.padding || 140);

  if (!inputPath) {
    throw new Error("Usage: node scripts/export_azgaar_state_svg.mjs --input <file.map> [--target Raamkoda] [--output out.svg]");
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const header = (lines[0] || "").split("|");
  const mapWidth = Number(header[4] || 3023);
  const mapHeight = Number(header[5] || 1562);

  const statesLine = findJsonLine(lines, (arr) => arr.some((item) => item && typeof item === "object" && "diplomacy" in item && "neighbors" in item));
  const burgsLine = findJsonLine(lines, (arr) => arr.some((item) => item && typeof item === "object" && "population" in item && "state" in item && "x" in item && "y" in item));
  const provincesLine = findJsonLine(lines, (arr) => arr.some((item) => item && typeof item === "object" && "fullName" in item && "state" in item && "center" in item));
  const routesLine = findJsonLine(lines, (arr) => arr.some((item) => item && typeof item === "object" && "group" in item && Array.isArray(item.points)));

  if (!statesLine || !burgsLine || !provincesLine || !routesLine) {
    throw new Error("Could not identify required Azgaar data tables");
  }

  const states = statesLine.value;
  const burgs = burgsLine.value;
  const provinces = provincesLine.value;
  const routes = routesLine.value;

  const state =
    states.find((item) => item && typeof item.name === "string" && item.name.toLowerCase() === target.toLowerCase()) ||
    states.find((item) => item && typeof item.name === "string" && item.name.toLowerCase().includes(target.toLowerCase()));
  if (!state) {
    throw new Error(`State not found for target: ${target}`);
  }

  const stateBurgs = burgs.filter((item) => item && item.state === state.i);
  const stateProvinces = provinces.filter((item) => item && item.state === state.i);
  const atlasColors = assignAtlasColors(states);
  if (!stateBurgs.length) {
    throw new Error(`State ${state.name} has no burg coordinates to anchor the export`);
  }

  const xValues = stateBurgs.map((item) => item.x);
  const yValues = stateBurgs.map((item) => item.y);
  if (Array.isArray(state.pole) && state.pole.length >= 2) {
    xValues.push(state.pole[0]);
    yValues.push(state.pole[1]);
  }

  const box = {
    minX: Math.max(0, Math.floor(Math.min(...xValues) - padding)),
    minY: Math.max(0, Math.floor(Math.min(...yValues) - padding)),
    maxX: Math.min(mapWidth, Math.ceil(Math.max(...xValues) + padding)),
    maxY: Math.min(mapHeight, Math.ceil(Math.max(...yValues) + padding)),
  };

  const routeSubset = routes.filter((route) => route && Array.isArray(route.points) && routeTouchesBox(route, box));
  const stateBordersPath = extractPathData(raw, "stateBorders");
  const provinceBordersPath = extractPathData(raw, "provinceBorders");
  const statesBodyPath = extractPathData(raw, "statesBody");
  const cellsPath = extractPathData(raw, "cells");
  const landMask = extractNamedBlock(raw, "mask", "land");
  const waterMask = extractNamedBlock(raw, "mask", "water");
  const featureDefs = extractFeatureDefs(raw);
  const cellSegments = splitCellsPathData(cellsPath);
  const maxStateId = Math.max(...states.map((item) => item?.i || 0));
  const maxProvinceId = Math.max(...provinces.map((item) => item?.i || 0));
  const targetProvinceIds = new Set(stateProvinces.map((province) => province.i).filter((value) => Number.isInteger(value) && value > 0));
  const activeStateCandidates = findAllCsvLines(
    lines,
    (arr) =>
      arr.length === cellSegments.length &&
      arr.every((item) => Number.isInteger(item) && item >= 0) &&
      arr.some((item) => item === state.i) &&
      Math.max(...arr) <= maxStateId,
  );
  const activeStateLine =
    activeStateCandidates
      .map((match) => ({
        ...match,
        uniqueCount: new Set(match.value).size,
        maxValue: Math.max(...match.value),
      }))
      .sort((a, b) => {
        if (b.maxValue !== a.maxValue) return b.maxValue - a.maxValue;
        return b.uniqueCount - a.uniqueCount;
      })[0] || null;
  const activeProvinceCandidates = findAllCsvLines(
    lines,
    (arr) =>
      arr.length === cellSegments.length &&
      arr.every((item) => Number.isInteger(item) && item >= 0) &&
      arr.some((item) => targetProvinceIds.has(item)) &&
      Math.max(...arr) <= maxProvinceId,
  );
  const activeProvinceLine =
    activeProvinceCandidates
      .map((match) => ({
        ...match,
        uniqueCount: new Set(match.value).size,
        maxValue: Math.max(...match.value),
      }))
      .sort((a, b) => {
        if (b.maxValue !== a.maxValue) return b.maxValue - a.maxValue;
        return b.uniqueCount - a.uniqueCount;
      })[0] || null;
  const stateByCell = activeStateLine?.value || [];
  const provinceByCell = activeProvinceLine?.value || [];
  const visibleCellSegments = [];
  const visibleNeighborStateSegments = new Map();
  const visibleTargetProvinceSegments = new Map();
  const visibleNeutralLandSegments = [];
  if (cellSegments.length === stateByCell.length && provinceByCell.length === cellSegments.length) {
    for (let i = 0; i < cellSegments.length; i += 1) {
      const segment = cellSegments[i];
      const bounds = parseCellSubpathBounds(segment);
      if (!boxIntersects(bounds, box)) continue;
      visibleCellSegments.push(segment);
      const ownerStateId = stateByCell[i];
      const ownerProvinceId = provinceByCell[i];
      if (ownerStateId === state.i) {
        const provinceKey = targetProvinceIds.has(ownerProvinceId) ? ownerProvinceId : 0;
        const list = visibleTargetProvinceSegments.get(provinceKey) || [];
        list.push(segment);
        visibleTargetProvinceSegments.set(provinceKey, list);
      } else {
        if (ownerStateId > 0) {
          const list = visibleNeighborStateSegments.get(ownerStateId) || [];
          list.push(segment);
          visibleNeighborStateSegments.set(ownerStateId, list);
        } else {
          visibleNeutralLandSegments.push(segment);
        }
      }
    }
  }
  const visibleAllCellsPath = visibleCellSegments.join("");
  const stateBaseColor = atlasColors.get(state.i) || "#9b7044";
  const seaColor = mixHex("#17324a", "#5f8196", 0.45);
  const landColor = mixHex(stateBaseColor, "#f4ecd2", 0.78);
  const provinceBorderColor = mixHex(stateBaseColor, "#4d3c23", 0.62);
  const stateBorderColor = mixHex(stateBaseColor, "#24170c", 0.4);
  const titleFill = mixHex(stateBaseColor, "#24170c", 0.35);
  const subtitleFill = mixHex(stateBaseColor, "#5a4227", 0.45);
  const provinceById = new Map(provinces.filter(Boolean).map((province) => [province.i, province]));
  const stateById = new Map(states.filter(Boolean).map((item) => [item.i, item]));

  const neighborStatePaths = [
    ...visibleNeighborStateSegments.entries()
      .map(([ownerStateId, segments]) => {
        const ownerState = stateById.get(ownerStateId);
        const ownerColor = atlasColors.get(ownerStateId) || landColor;
        return renderStyledPath({
          d: segments.join(""),
          fill: mixHex(ownerColor, "#f0e7d2", 0.7),
          fillOpacity: "0.72",
          stroke: mixHex(ownerColor, "#3d2d18", 0.68),
          strokeOpacity: "0.22",
          strokeWidth: "0.18",
          maskId: "land",
        });
      })
      .filter(Boolean),
    visibleNeutralLandSegments.length
      ? renderStyledPath({
          d: visibleNeutralLandSegments.join(""),
          fill: landColor,
          fillOpacity: "0.68",
          stroke: provinceBorderColor,
          strokeOpacity: "0.16",
          strokeWidth: "0.18",
          maskId: "land",
        })
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  const targetProvincePaths = [...visibleTargetProvinceSegments.entries()]
    .map(([provinceId, segments]) => {
      const province = provinceById.get(provinceId);
        const provinceColor =
          typeof province?.color === "string" && province.color.trim()
            ? province.color.trim()
            : mixHex(stateBaseColor, "#f4ecd2", 0.18);
      return renderStyledPath({
        d: segments.join(""),
        fill: provinceColor,
        fillOpacity: provinceId === 0 ? "0.34" : "0.44",
        stroke: mixHex(provinceColor, "#2a1a0d", 0.5),
        strokeOpacity: provinceId === 0 ? "0.24" : "0.36",
        strokeWidth: provinceId === 0 ? "0.2" : "0.24",
        maskId: "land",
      });
    })
    .filter(Boolean)
    .join("\n    ");

  const provinceLegend = stateProvinces
    .map((province, index) => {
      const y = box.minY + 28 + index * 20;
      return `
        <rect x="${box.maxX - 190}" y="${y - 11}" width="10" height="10" fill="${province.color || "#8a8a8a"}" />
        ${renderTextPair({
          text: province.fullName || province.name,
          x: box.maxX - 174,
          y: y - 2,
          fontFamily: "Raleway, Trebuchet MS, sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.04em",
          fill: titleFill,
          halo: "rgba(251,246,234,0.92)",
          haloWidth: 1.6,
          className: "legend-text",
        })}
      `;
    })
    .join("");

  const occupied = [
    { x: box.maxX - 205, y: box.minY + 10, width: 190, height: Math.max(54, stateProvinces.length * 20 + 30) },
    { x: box.minX + 10, y: box.minY + 6, width: 280, height: 44 },
  ];

  const sortedBurgs = [...stateBurgs].sort((a, b) => {
    if (a.capital !== b.capital) return b.capital - a.capital;
    return b.population - a.population;
  });

  const burgMarks = sortedBurgs
    .map((burg) => {
      const radius = burg.capital ? 6 : 4;
      const cls = burg.capital ? "burg burg-capital" : "burg";
      const placement = pickLabelPlacement({
        x: burg.x,
        y: burg.y,
        text: burg.name,
        fontSize: 11,
        occupied,
        box,
        pointRadius: radius,
      });
      return `
        <circle class="${cls}" cx="${burg.x}" cy="${burg.y}" r="${radius}" />
        ${renderTextPair({
          text: burg.name,
          x: placement.x,
          y: placement.y,
          anchor: placement.anchor,
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 11,
          fontWeight: 700,
          fill: "#2e2012",
          halo: "rgba(245,239,220,0.98)",
          haloWidth: 2.8,
          className: "burg-label",
        })}
      `;
    })
    .join("");

  const syntheticProvinceSeats = stateProvinces
    .filter((province) => !province.burg && Array.isArray(province.pole) && province.pole.length >= 2)
    .map((province) => {
      const [x, y] = province.pole;
      const seatName = makeFallbackKodaName(province.name);
      const placement = pickLabelPlacement({
        x,
        y,
        text: seatName,
        fontSize: 11,
        occupied,
        box,
        pointRadius: 4.5,
      });
      return `
        <circle class="burg burg-synthetic" cx="${x}" cy="${y}" r="4.5" />
        ${renderTextPair({
          text: seatName,
          x: placement.x,
          y: placement.y,
          anchor: placement.anchor,
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 11,
          fontWeight: 700,
          fontStyle: "italic",
          fill: "#2e2012",
          halo: "rgba(245,239,220,0.98)",
          haloWidth: 2.8,
          className: "burg-label synthetic-label",
        })}
      `;
    })
    .join("");

  const provinceCenterMarks = stateProvinces
    .map((province) => {
      const burg = province.burg ? stateBurgs.find((item) => item.i === province.burg) : null;
      if (burg) {
        const placement = pickLabelPlacement({
          x: burg.x,
          y: burg.y + 18,
          text: province.name,
          fontSize: 10,
          anchor: "middle",
          occupied,
          box,
        });
        return renderTextPair({
          text: province.name,
          x: placement.x,
          y: placement.y,
          anchor: placement.anchor,
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 10,
          fontStyle: "italic",
          fill: "#5b3b19",
          halo: "rgba(245,239,220,0.96)",
          haloWidth: 2.2,
          className: "province-label",
        });
      }
      if (Array.isArray(province.pole) && province.pole.length >= 2) {
        const placement = pickLabelPlacement({
          x: province.pole[0],
          y: province.pole[1] + 18,
          text: province.name,
          fontSize: 10,
          anchor: "middle",
          occupied,
          box,
        });
        return renderTextPair({
          text: province.name,
          x: placement.x,
          y: placement.y,
          anchor: placement.anchor,
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 10,
          fontStyle: "italic",
          fill: "#5b3b19",
          halo: "rgba(245,239,220,0.96)",
          haloWidth: 2.2,
          className: "province-label",
        });
      }
      return "";
    })
    .join("");

  const routePaths = routeSubset
    .map((route) => {
      const cls = route.group === "trails" ? "route trail" : "route road";
      return `<path class="${cls}" d="${routeToPath(route.points)}" />`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${box.maxX - box.minX}" height="${box.maxY - box.minY}" viewBox="${box.minX} ${box.minY} ${box.maxX - box.minX} ${box.maxY - box.minY}">
  <defs>
    ${featureDefs.join("\n    ")}
    ${landMask || ""}
    ${waterMask || ""}
  </defs>
  <style>
    ${buildSvgStyles({ seaColor, landColor, provinceBorderColor, stateBorderColor })}
  </style>
  <rect class="bg" x="${box.minX}" y="${box.minY}" width="${box.maxX - box.minX}" height="${box.maxY - box.minY}" />
  <g id="sea_cells_layer">
    ${visibleAllCellsPath && waterMask ? `<path class="sea-cells" d="${visibleAllCellsPath}" mask="url(#water)" />` : ""}
  </g>
  <g id="land_layer">
    ${statesBodyPath ? `<path class="land-base" d="${statesBodyPath}" />` : ""}
  </g>
  <g id="land_cells_layer">
    ${neighborStatePaths}
  </g>
  <g id="state_tint_layer">
    ${targetProvincePaths}
  </g>
  <g id="routes_layer">
    ${routePaths}
  </g>
  <g id="province_borders_layer">
    ${provinceBordersPath ? `<path class="province-borders" d="${provinceBordersPath}" />` : ""}
  </g>
  <g id="state_borders_layer">
    ${stateBordersPath ? `<path class="state-borders" d="${stateBordersPath}" />` : ""}
  </g>
  <g id="settlements_layer">
    ${burgMarks}
    ${syntheticProvinceSeats}
  </g>
  <g id="province_labels_layer">
    ${provinceCenterMarks}
  </g>
  <g id="legend_layer">
    <rect class="legend-box" x="${box.maxX - 205}" y="${box.minY + 10}" width="190" height="${Math.max(54, stateProvinces.length * 20 + 30)}" rx="6" />
    ${renderTextPair({
      text: state.fullName || state.name,
      x: box.minX + 16,
      y: box.minY + 26,
      fontFamily: "Cinzel Decorative, Cinzel, Georgia, serif",
      fontSize: 19,
      fontWeight: 700,
      letterSpacing: "0.03em",
      fill: titleFill,
      halo: "rgba(245,239,220,0.96)",
      haloWidth: 3.1,
      className: "title",
    })}
    ${renderTextPair({
      text: state.form || state.type || "State",
      x: box.minX + 16,
      y: box.minY + 42,
      fontFamily: "Raleway, Trebuchet MS, sans-serif",
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: "0.12em",
      fill: subtitleFill,
      halo: "rgba(245,239,220,0.96)",
      haloWidth: 2,
      className: "subtitle",
    })}
    ${renderTextPair({
      text: "Provinces",
      x: box.maxX - 190,
      y: box.minY + 24,
      fontFamily: "Raleway, Trebuchet MS, sans-serif",
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: "0.12em",
      fill: subtitleFill,
      halo: "rgba(245,239,220,0.96)",
      haloWidth: 2,
      className: "subtitle",
    })}
    ${provinceLegend}
  </g>
</svg>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, svg, "utf8");

  const report = {
    output: outputPath,
    state: {
      id: state.i,
      name: state.name,
      fullName: state.fullName,
      cells: state.cells,
      burgs: stateBurgs.length,
      provinces: stateProvinces.map((province) => province.fullName || province.name),
    },
    bbox: box,
    routesIncluded: routeSubset.length,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
