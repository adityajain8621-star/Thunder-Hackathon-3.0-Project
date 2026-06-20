/**
 * system-info.ts
 * Collects and formats system information using Node.js built-in `os` module.
 *
 * Gathered data:
 *  - platform     : Underlying OS platform identifier (linux, darwin, win32, …)
 *  - type         : OS name as returned by uname (Linux, Darwin, Windows_NT, …)
 *  - release      : OS kernel release string
 *  - arch         : CPU instruction-set architecture (x64, arm64, …)
 *  - hostname     : Network hostname of the machine
 *  - cpus         : Number of logical CPU cores (and their model string)
 *  - totalMemoryMB: Total installed RAM in mebibytes
 *  - freeMemoryMB : Currently available RAM in mebibytes
 *  - nodeVersion  : Node.js runtime version (process.version)
 *  - homeDir      : Current user's home directory
 *  - username     : Operating-system login name of the current user
 *  - uptime       : System uptime in seconds
 *  - envVars      : A curated snapshot of environment variables (sensitive
 *                   values such as keys or tokens are intentionally excluded)
 */

import os from "os";

export interface CpuInfo {
  model: string;
  cores: number;
  speedMHz: number;
}

export interface SystemSnapshot {
  platform: string;
  type: string;
  release: string;
  arch: string;
  hostname: string;
  cpu: CpuInfo;
  totalMemoryMB: number;
  freeMemoryMB: number;
  nodeVersion: string;
  homeDir: string;
  username: string;
  uptimeSeconds: number;
  collectedAt: string;
  envVars: Record<string, string>;
}

const SAFE_ENV_KEYS = [
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "TERM",
  "NODE_ENV",
  "NODE_PATH",
  "npm_config_user_agent",
  "HOSTNAME",
  "PWD",
  "OLDPWD",
  "TMPDIR",
  "TMP",
  "TEMP",
] as const;

function collectEnvVars(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    const val = process.env[key];
    result[key] = val !== undefined ? val : "<not set>";
  }
  return result;
}

function getCpuInfo(): CpuInfo {
  const cpus = os.cpus();
  if (cpus.length === 0) {
    return { model: "unknown", cores: 0, speedMHz: 0 };
  }
  return {
    model: cpus[0]!.model.trim(),
    cores: cpus.length,
    speedMHz: cpus[0]!.speed,
  };
}

export function gatherSystemInfo(): SystemSnapshot {
  const userInfo = (() => {
    try {
      return os.userInfo();
    } catch {
      return { username: process.env["USER"] ?? "unknown", homedir: os.homedir() };
    }
  })();

  return {
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpu: getCpuInfo(),
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    nodeVersion: process.version,
    homeDir: os.homedir(),
    username: userInfo.username,
    uptimeSeconds: Math.round(os.uptime()),
    collectedAt: new Date().toISOString(),
    envVars: collectEnvVars(),
  };
}

export function formatSystemInfo(snap: SystemSnapshot): string {
  const line = (label: string, value: string | number) =>
    `  ${label.padEnd(20)} ${value}`;

  const envLines = Object.entries(snap.envVars)
    .map(([k, v]) => `    ${k.padEnd(30)} ${v}`)
    .join("\n");

  return [
    "",
    "╔══════════════════════════════════════════════════╗",
    "║          THUNDER HACKATHON 3.0 — SYS INFO        ║",
    "╚══════════════════════════════════════════════════╝",
    "",
    "  ── Operating System ──────────────────────────────",
    line("Platform:", snap.platform),
    line("OS Type:", snap.type),
    line("Kernel Release:", snap.release),
    line("Architecture:", snap.arch),
    line("Hostname:", snap.hostname),
    "",
    "  ── Hardware ────────────────────────────────────────",
    line("CPU Model:", snap.cpu.model),
    line("CPU Cores:", snap.cpu.cores),
    line("CPU Speed:", `${snap.cpu.speedMHz} MHz`),
    line("Total Memory:", `${snap.totalMemoryMB} MB`),
    line("Free Memory:", `${snap.freeMemoryMB} MB`),
    "",
    "  ── Runtime ─────────────────────────────────────────",
    line("Node.js Version:", snap.nodeVersion),
    line("Home Directory:", snap.homeDir),
    line("Username:", snap.username),
    line("Uptime:", `${snap.uptimeSeconds}s`),
    line("Collected At:", snap.collectedAt),
    "",
    "  ── Environment Variables ───────────────────────────",
    envLines,
    "",
  ].join("\n");
}