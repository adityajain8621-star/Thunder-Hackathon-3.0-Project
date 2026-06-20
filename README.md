# THUNDER HACKATHON 3.0 — System Intelligence Tool

A Node.js/TypeScript CLI that **collects system information** and provides
**full CRUD operations on source-code files**.

---

## Quick Start

\```bash
# Install dependencies
npm install

# Show all system info
npx tsx ./src/thunder.ts info

# JSON output
npx tsx ./src/thunder.ts info --json

# File CRUD
npx tsx ./src/thunder.ts create  src/example.ts "console.log('hello')"
npx tsx ./src/thunder.ts read    src/example.ts
npx tsx ./src/thunder.ts update  src/example.ts "console.log('updated')"
npx tsx ./src/thunder.ts update  src/example.ts "\n// appended" --mode append
npx tsx ./src/thunder.ts delete  src/example.ts
npx tsx ./src/thunder.ts list    src
\```

---

## Code Flow & Strategy

### Architecture

\```
thunder.ts  (CLI entry — parses args, routes commands)
    │
    ├── system-info.ts  →  Node.js `os` module → SystemSnapshot → formatted output
    └── file-crud.ts    →  Node.js `fs` module → CRUD ops → typed FileResult<T>
\```

### 1. CLI Entry Point (`thunder.ts`)

\```
process.argv
    │
    ▼
parseArgs()     — tokenise flags (--key value) vs positional args
    │
    ▼
switch(cmd)     — route to handler
    │
    ├── "info"   → gatherSystemInfo() → format or JSON.stringify()
    ├── "create" → createFile(path, content)
    ├── "read"   → readFile(path)
    ├── "update" → updateFile(path, content, mode)
    ├── "delete" → deleteFile(path)
    ├── "list"   → listFiles(dir, depth) → formatFileTree()
    └── "help"   → printHelp()
\```

### 2. System Information (`system-info.ts`)

\```
gatherSystemInfo()
    ├── os.platform()      → platform
    ├── os.type()          → OS type
    ├── os.release()       → kernel release
    ├── os.arch()          → CPU architecture
    ├── os.hostname()      → hostname
    ├── os.cpus()          → CPU model, cores, speed
    ├── os.totalmem()      → total RAM → MB
    ├── os.freemem()       → free RAM → MB
    ├── process.version    → Node.js version
    ├── os.homedir()       → home directory
    ├── os.userInfo()      → username (with fallback)
    ├── os.uptime()        → system uptime
    └── collectEnvVars()   → allowlisted env vars only
\```

### 3. File CRUD (`file-crud.ts`)

Every function returns `FileResult<T>` — no thrown exceptions across modules:

\```typescript
interface FileResult<T = void> {
  ok: boolean;      // true = success
  data?: T;         // payload (read returns content here)
  error?: string;   // human-readable error on failure
  path: string;     // resolved absolute path
}
\```

**Backup strategy:** Before any destructive write (`update`, `delete`),
the original is saved as `<file>.bak`. Run `mv file.bak file` to undo.

---

## Data Collected

| Field | Source |
|---|---|
| platform | `os.platform()` |
| type | `os.type()` |
| release | `os.release()` |
| arch | `os.arch()` |
| hostname | `os.hostname()` |
| cpu.model / cores / speedMHz | `os.cpus()` |
| totalMemoryMB / freeMemoryMB | `os.totalmem()` / `os.freemem()` |
| nodeVersion | `process.version` |
| homeDir | `os.homedir()` |
| username | `os.userInfo().username` |
| uptimeSeconds | `os.uptime()` |
| collectedAt | `new Date().toISOString()` |
| envVars | `process.env` (allowlist only) |

---

## Error Handling

- File ops return `{ ok: false, error: "..." }` — never throw across modules
- `os.userInfo()` wrapped in try/catch with fallback
- CLI exits with code `1` on any error, printing `❌ <message>`
- Missing env vars shown as `"<not set>"` — no undefined surprises
\```

---

## Run Command ---->

```bash
cd scripts
npm install
