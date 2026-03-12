import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceDir =
  process.env.ARESH_CODEX_SOURCE ||
  "R:\\RookVault\\01_Active\\Mindpalace\\Authorship\\roleplaying\\worlds\\aresh\\codex-content";
const syncScript = path.join(repoRoot, "scripts", "sync_codex_content.ps1");

let syncRunning = false;
let syncQueued = false;
let debounceTimer = null;
let quietStdout = false;

function log(message) {
  if (quietStdout) return;
  try {
    process.stdout.write(`[codex-watch] ${message}\n`);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EPIPE") {
      quietStdout = true;
      return;
    }
    throw error;
  }
}

function runSync(reason) {
  if (syncRunning) {
    syncQueued = true;
    log(`sync already running; queued follow-up (${reason})`);
    return;
  }

  syncRunning = true;
  log(`sync start (${reason})`);

  const child = spawn(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", syncScript, "-Source", sourceDir],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        ARESH_CODEX_SOURCE: sourceDir,
      },
    },
  );

  child.on("exit", (code) => {
    syncRunning = false;
    if (code === 0) {
      log("sync complete");
    } else {
      log(`sync failed with exit code ${code ?? "unknown"}`);
    }

    if (syncQueued) {
      syncQueued = false;
      runSync("queued-change");
    }
  });
}

function scheduleSync(reason) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSync(reason), 700);
}

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Aresh codex source folder not found: ${sourceDir}`);
}

process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") {
    quietStdout = true;
    return;
  }
  throw error;
});

log(`watching ${sourceDir}`);
runSync("startup");

const watcher = fs.watch(sourceDir, { recursive: true }, (_eventType, fileName) => {
  const target = fileName ? String(fileName) : "unknown";
  log(`change detected: ${target}`);
  scheduleSync(target);
});

process.on("SIGINT", () => {
  log("stopping watcher");
  watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("stopping watcher");
  watcher.close();
  process.exit(0);
});
