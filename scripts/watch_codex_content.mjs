import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const isWindows = process.platform === "win32";

/** Default vault location per platform; the POSIX default comes from the publish registry. */
function defaultSourceDir() {
  if (isWindows) {
    return "R:\\RookVault\\01_Active\\Mindpalace\\Authorship\\roleplaying\\worlds\\aresh\\codex-content";
  }
  try {
    const registry = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "codex_registry", "publish.json"), "utf8"),
    );
    const configured = String(registry.source_default || "");
    return configured.startsWith("~")
      ? path.join(process.env.HOME || "", configured.slice(1))
      : configured;
  } catch {
    return path.join(process.env.HOME || "", "Documents", "Areshnaat");
  }
}

const sourceDir = process.env.ARESH_CODEX_SOURCE || defaultSourceDir();
const syncScript = path.join(
  repoRoot,
  "scripts",
  isWindows ? "sync_codex_content.ps1" : "sync_codex_content.sh",
);

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

  const [command, args] = isWindows
    ? ["powershell", ["-ExecutionPolicy", "Bypass", "-File", syncScript, "-Source", sourceDir]]
    : ["bash", [syncScript]];

  const child = spawn(
    command,
    args,
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
