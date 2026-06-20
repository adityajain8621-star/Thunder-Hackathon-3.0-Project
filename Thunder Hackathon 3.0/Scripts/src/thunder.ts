#!/usr/bin/env tsx
/**
 * thunder.ts — THUNDER HACKATHON 3.0 Main CLI
 *
 * Entry point for the system-information collector and file-CRUD tool.
 *
 * Usage:
 *   npx tsx ./src/thunder.ts info              — display full system snapshot
 *   npx tsx ./src/thunder.ts info --json       — output snapshot as raw JSON
 *   npx tsx ./src/thunder.ts create <file> [content]
 *   npx tsx ./src/thunder.ts read   <file>
 *   npx tsx ./src/thunder.ts update <file> [content] [--mode overwrite|append|prepend]
 *   npx tsx ./src/thunder.ts delete <file>
 *   npx tsx ./src/thunder.ts list   [dir]
 *   npx tsx ./src/thunder.ts help
 */

import { gatherSystemInfo, formatSystemInfo, SystemSnapshot } from "./system-info.js";
import {
  createFile,
  readFile,
  updateFile,
  deleteFile,
  listFiles,
  formatFileTree,
  UpdateMode,
} from "./file-crud.js";

const BANNER = `
╔═══════════════════════════════════════════════════════╗
║   ⚡  THUNDER HACKATHON 3.0 — System Intelligence    ║
╚═══════════════════════════════════════════════════════╝`;

function ok(msg: string): void {
  console.log(`  ✅  ${msg}`);
}

function fail(msg: string): void {
  console.error(`  ❌  ${msg}`);
  process.exit(1);
}

function printHelp(): void {
  console.log(BANNER);
  console.log(`
  COMMANDS
  ─────────────────────────────────────────────────────
  info                        Gather and display system information
  info --json                 Output system info as JSON

  create  <file> [content]    Create a new file with optional content
  read    <file>              Read and display a file's content
  update  <file> [content]    Update a file (overwrite by default)
               --mode append  Append content to the file
               --mode prepend Prepend content to the file
  delete  <file>              Delete a file (backup saved as <file>.bak)
  list    [dir]               List files in a directory (default: current dir)

  help                        Show this help text
  ─────────────────────────────────────────────────────
`);
}

function parseArgs(argv: string[]): {
  cmd: string;
  args: string[];
  flags: Record<string, string>;
} {
  const raw = argv.slice(2);
  const cmd = raw[0] ?? "help";
  const flags: Record<string, string> = {};
  const args: string[] = [];

  for (let i = 1; i < raw.length; i++) {
    const token = raw[i]!;
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = raw[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      args.push(token);
    }
  }

  return { cmd, args, flags };
}

async function main(): Promise<void> {
  console.log(BANNER);

  const { cmd, args, flags } = parseArgs(process.argv);

  switch (cmd) {
    case "info": {
      const snap: SystemSnapshot = gatherSystemInfo();
      if (flags["json"] === "true") {
        console.log(JSON.stringify(snap, null, 2));
      } else {
        console.log(formatSystemInfo(snap));
      }
      break;
    }

    case "create": {
      const filePath = args[0];
      if (!filePath) fail("Usage: thunder create <file> [content]");
      const content = args.slice(1).join(" ");
      const result = createFile(filePath!, content);
      if (!result.ok) fail(result.error ?? "Unknown error");
      ok(`Created: ${result.path}`);
      break;
    }

    case "read": {
      const filePath = args[0];
      if (!filePath) fail("Usage: thunder read <file>");
      const result = readFile(filePath!);
      if (!result.ok) fail(result.error ?? "Unknown error");
      console.log(`\n  ── ${result.path} ───────────────────────────\n`);
      console.log(result.data);
      break;
    }

    case "update": {
      const filePath = args[0];
      if (!filePath)
        fail("Usage: thunder update <file> [content] [--mode overwrite|append|prepend]");
      const content = args.slice(1).join(" ");
      const mode = (flags["mode"] ?? "overwrite") as UpdateMode;
      if (!["overwrite", "append", "prepend"].includes(mode)) {
        fail(`Invalid mode "${mode}". Use: overwrite | append | prepend`);
      }
      const result = updateFile(filePath!, content, mode);
      if (!result.ok) fail(result.error ?? "Unknown error");
      ok(`Updated (${mode}): ${result.path}  — backup saved as ${result.path}.bak`);
      break;
    }

    case "delete": {
      const filePath = args[0];
      if (!filePath) fail("Usage: thunder delete <file>");
      const result = deleteFile(filePath!);
      if (!result.ok) fail(result.error ?? "Unknown error");
      ok(`Deleted: ${result.path}  — backup saved as ${result.path}.bak`);
      break;
    }

    case "list": {
      const dir = args[0] ?? ".";
      const entries = listFiles(dir, 3);
      console.log(formatFileTree(entries, dir));
      break;
    }

    case "help":
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});