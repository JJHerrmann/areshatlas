import { execFile, spawn } from "node:child_process";
import process from "node:process";

const repoRoot = process.cwd();
const pollMs = Number(process.env.ARESH_STREAM_POLL_MS || 15000);
const minCommitGapMs = Number(process.env.ARESH_STREAM_COMMIT_GAP_MS || 90000);
const commitPrefix = process.env.ARESH_STREAM_COMMIT_PREFIX || "sync: codex stream update";

let running = false;
let lastPublishAt = 0;
let quietStdout = false;

function log(message) {
  if (quietStdout) return;
  try {
    process.stdout.write(`[codex-stream] ${message}\n`);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EPIPE") {
      quietStdout = true;
      return;
    }
    throw error;
  }
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: repoRoot, windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function isObsRunning() {
  try {
    const { stdout } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-Command", "(Get-Process -Name obs64 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessName)"],
    );
    return stdout.toLowerCase().includes("obs64");
  } catch (error) {
    log(`obs check failed: ${error.stderr || error.message}`);
    return false;
  }
}

function normalizeGitPath(rawPath) {
  return rawPath.replace(/^"/, "").replace(/"$/, "").replace(/\\/g, "/");
}

async function getTrackedContentStatus() {
  const { stdout } = await execFileAsync("git", ["status", "--short", "--", "content"]);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

async function hasPublishableChanges() {
  const lines = await getTrackedContentStatus();
  return lines.some((line) => {
    const pathPart = normalizeGitPath(line.slice(3));
    return pathPart.startsWith("content/");
  });
}

async function ensureContentOnlyWorkspace() {
  const { stdout } = await execFileAsync("git", ["status", "--porcelain"]);
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const nonContent = lines.filter((line) => {
    const pathPart = normalizeGitPath(line.slice(3));
    return !pathPart.startsWith("content/");
  });
  return nonContent.length === 0;
}

function spawnStreaming(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function publishOnce() {
  if (running) return;
  running = true;
  try {
    const obsLive = await isObsRunning();
    if (!obsLive) {
      log("OBS not running; stream publish idle");
      return;
    }

    const now = Date.now();
    if (now - lastPublishAt < minCommitGapMs) {
      log("waiting for commit debounce window");
      return;
    }

    const workspaceSafe = await ensureContentOnlyWorkspace();
    if (!workspaceSafe) {
      log("non-content changes detected; skipping auto-publish");
      return;
    }

    const dirty = await hasPublishableChanges();
    if (!dirty) {
      log("no mirrored content changes to publish");
      return;
    }

    const stamp = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
    const commitMessage = `${commitPrefix} (${stamp})`;

    log("staging content changes");
    await execFileAsync("git", ["add", "--", "content"]);
    log(`committing: ${commitMessage}`);
    await execFileAsync("git", ["commit", "-m", commitMessage]);
    log("pushing to origin/main");
    await spawnStreaming("git", ["push"]);
    lastPublishAt = Date.now();
    log("stream publish complete");
  } catch (error) {
    const message =
      (error && typeof error === "object" && "stderr" in error && error.stderr) ||
      (error && typeof error === "object" && "message" in error && error.message) ||
      String(error);
    log(`publish failed: ${message}`.trim());
  } finally {
    running = false;
  }
}

process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") {
    quietStdout = true;
    return;
  }
  throw error;
});

log(`stream publisher active; polling every ${pollMs}ms`);
publishOnce();
const timer = setInterval(publishOnce, pollMs);

process.on("SIGINT", () => {
  clearInterval(timer);
  log("stopping stream publisher");
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearInterval(timer);
  log("stopping stream publisher");
  process.exit(0);
});
