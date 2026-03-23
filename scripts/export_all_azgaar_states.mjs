import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const defaultInput = path.join(cwd, "content", "Huis 2026-03-12-15-24.map");
  const inputPath = path.resolve(args.input || defaultInput);
  const dataPath = path.resolve(args.data || path.join(cwd, "public", "azgaar", "areshnaat-map-data.json"));
  const outputDir = path.resolve(args.outputDir || path.join(cwd, "output", "azgaar", "states"));
  const manifestPath = path.join(outputDir, "state-exports-manifest.json");
  const exporterPath = path.resolve(args.exporter || path.join(cwd, "scripts", "export_azgaar_state_svg.mjs"));
  const nodeExe = process.execPath;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input map not found: ${inputPath}`);
  }
  if (!fs.existsSync(dataPath)) {
    throw new Error(`State data json not found: ${dataPath}`);
  }
  if (!fs.existsSync(exporterPath)) {
    throw new Error(`Single-state exporter not found: ${exporterPath}`);
  }

  const mapData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const states = (mapData.states || []).filter((state) => state && state.id && state.name && state.name !== "Neutrals");

  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];

  for (const state of states) {
    const outputPath = path.join(outputDir, `${slugify(state.name)}.svg`);
    const commandArgs = [exporterPath, "--input", inputPath, "--target", state.name, "--output", outputPath];
    const run = spawnSync(nodeExe, commandArgs, { encoding: "utf8" });

    if (run.status === 0) {
      let parsed = null;
      try {
        parsed = JSON.parse(run.stdout);
      } catch {
        parsed = { output: outputPath, raw: run.stdout.trim() };
      }
      results.push({
        stateId: state.id,
        stateName: state.name,
        status: "ok",
        output: outputPath,
        report: parsed,
      });
      continue;
    }

    results.push({
      stateId: state.id,
      stateName: state.name,
      status: "error",
      output: outputPath,
      exitCode: run.status,
      signal: run.signal,
      error: (run.stderr || run.stdout || run.error?.message || "").trim(),
    });
  }

  const manifest = {
    input: inputPath,
    data: dataPath,
    exporter: exporterPath,
    outputDir,
    totalStates: states.length,
    ok: results.filter((item) => item.status === "ok").length,
    errors: results.filter((item) => item.status === "error").length,
    results,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ manifest: manifestPath, totalStates: manifest.totalStates, ok: manifest.ok, errors: manifest.errors }, null, 2)}\n`);
}

main();
