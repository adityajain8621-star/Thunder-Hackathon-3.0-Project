/**
 * file-crud.ts
 * Full CRUD (Create, Read, Update, Delete) operations on source-code files.
 *
 * Design decisions:
 *  - All paths are resolved relative to the current working directory so the
 *    tool works correctly regardless of where it is invoked.
 *  - Every operation returns a typed Result<T> — no silent failures.
 *  - "Update" implements three modes:
 *      overwrite  – replace the entire file (default)
 *      append     – add content to the end
 *      prepend    – add content to the beginning
 *  - "List" recursively walks a directory up to a configurable depth to give
 *    a tree-like view of project files.
 *  - Backup copies (*.bak) are created before any destructive write so the
 *    user can recover if needed.
 */

import fs from "fs";
import path from "path";

export type UpdateMode = "overwrite" | "append" | "prepend";

export interface FileResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
  path: string;
}

export interface FileEntry {
  name: string;
  fullPath: string;
  type: "file" | "directory";
  sizeBytes?: number;
  lastModified?: string;
}

function resolve(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

function backupPath(filePath: string): string {
  return filePath + ".bak";
}

export function createFile(filePath: string, content: string): FileResult {
  const abs = resolve(filePath);
  if (fs.existsSync(abs)) {
    return { ok: false, path: abs, error: `File already exists: ${abs}` };
  }
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
    return { ok: true, path: abs };
  } catch (err) {
    return { ok: false, path: abs, error: String(err) };
  }
}

export function readFile(filePath: string): FileResult<string> {
  const abs = resolve(filePath);
  if (!fs.existsSync(abs)) {
    return { ok: false, path: abs, error: `File not found: ${abs}` };
  }
  try {
    const content = fs.readFileSync(abs, "utf8");
    return { ok: true, path: abs, data: content };
  } catch (err) {
    return { ok: false, path: abs, error: String(err) };
  }
}

export function updateFile(
  filePath: string,
  content: string,
  mode: UpdateMode = "overwrite"
): FileResult {
  const abs = resolve(filePath);
  if (!fs.existsSync(abs)) {
    return { ok: false, path: abs, error: `File not found: ${abs}` };
  }
  try {
    const existing = fs.readFileSync(abs, "utf8");
    fs.writeFileSync(backupPath(abs), existing, "utf8");

    let next: string;
    if (mode === "append") {
      next = existing + content;
    } else if (mode === "prepend") {
      next = content + existing;
    } else {
      next = content;
    }

    fs.writeFileSync(abs, next, "utf8");
    return { ok: true, path: abs };
  } catch (err) {
    return { ok: false, path: abs, error: String(err) };
  }
}

export function deleteFile(filePath: string): FileResult {
  const abs = resolve(filePath);
  if (!fs.existsSync(abs)) {
    return { ok: false, path: abs, error: `File not found: ${abs}` };
  }
  try {
    const existing = fs.readFileSync(abs, "utf8");
    fs.writeFileSync(backupPath(abs), existing, "utf8");
    fs.unlinkSync(abs);
    return { ok: true, path: abs };
  } catch (err) {
    return { ok: false, path: abs, error: String(err) };
  }
}

export function listFiles(
  dirPath: string,
  depth: number = 2,
  _currentDepth: number = 0
): FileEntry[] {
  const abs = resolve(dirPath);
  if (!fs.existsSync(abs)) return [];

  const entries: FileEntry[] = [];
  let items: fs.Dirent[] = [];
  try {
    items = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const item of items) {
    const fullPath = path.join(abs, item.name);
    if (item.isDirectory()) {
      entries.push({ name: item.name, fullPath, type: "directory" });
      if (_currentDepth < depth) {
        const children = listFiles(fullPath, depth, _currentDepth + 1);
        entries.push(...children);
      }
    } else if (item.isFile()) {
      let sizeBytes: number | undefined;
      let lastModified: string | undefined;
      try {
        const stat = fs.statSync(fullPath);
        sizeBytes = stat.size;
        lastModified = stat.mtime.toISOString();
      } catch { /* skip stat errors */ }
      entries.push({ name: item.name, fullPath, type: "file", sizeBytes, lastModified });
    }
  }
  return entries;
}

export function formatFileTree(entries: FileEntry[], rootPath: string): string {
  const lines: string[] = [`\n  Directory: ${path.resolve(rootPath)}\n`];
  for (const entry of entries) {
    const rel = path.relative(path.resolve(rootPath), entry.fullPath);
    const depth = rel.split(path.sep).length - 1;
    const indent = "  ".repeat(depth + 1);
    const icon = entry.type === "directory" ? "📁" : "📄";
    const size =
      entry.type === "file" && entry.sizeBytes !== undefined
        ? ` (${entry.sizeBytes} bytes)`
        : "";
    lines.push(`${indent}${icon} ${entry.name}${size}`);
  }
  return lines.join("\n") + "\n";
}