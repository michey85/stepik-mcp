# File Logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal file-based logger to the Stepik MCP server that persists Stepik API request/response info and errors to `logs/app.log`, alongside existing stderr output.

**Architecture:** A single new module `src/logger.ts` exports a `logger` object (`debug`/`info`/`warn`/`error`). Each call appends a JSON line to `logs/app.log` (path resolved relative to the compiled module's own location, so it's stable regardless of invocation `cwd`) and mirrors the same line to `console.error`. Existing services (`auth.ts`, `money.ts`) and entry points (`index.ts`, `server.ts`) call into this logger instead of (or in addition to) their current `console.error`/silent-throw behavior.

**Tech Stack:** TypeScript (Node `fs`/`path`/`url` built-ins only, no new dependencies).

## Global Constraints

- No new npm dependencies (spec: "No new dependencies; minimal implementation").
- Log file path: `logs/app.log` at the project root, resolved via `import.meta.url` — not `process.cwd()`.
- Log format: one JSON object per line — `{ timestamp, level, message, ...meta }`.
- Every log call must also write to `console.error` (stderr) — do not remove existing stderr visibility.
- No log rotation, no level filtering/config — every call always emits (spec non-goals).
- `logs/` must be gitignored.
- Project has no test runner configured (`npm test` is a stub that exits 1) — verification is via `npm run build` (TypeScript compiles clean) plus manual run of the server, per the spec's own "Testing / verification" section. Do not introduce a test framework as part of this plan.

---

### Task 1: Logger module

**Files:**
- Create: `src/logger.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `logger: { debug(message: string, meta?: Record<string, unknown>): void; info(...): void; warn(...): void; error(...): void }`, exported as a named export `logger` from `src/logger.ts`.

- [ ] **Step 1: Write `src/logger.ts`**

```typescript
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(moduleDir, "..", "logs");
const LOG_FILE = join(LOG_DIR, "app.log");

type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);

  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(LOG_FILE, line + "\n");
  console.error(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
```

- [ ] **Step 2: Add `logs/` to `.gitignore`**

Append to `.gitignore` (current contents: `node_modules`, `build`, `*.local`):

```
logs
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: exits 0, `build/logger.js` exists.

- [ ] **Step 4: Commit**

```bash
git add src/logger.ts .gitignore
git commit -m "Add file logger module"
```

---

### Task 2: Log Stepik API requests in services

**Files:**
- Modify: `src/services/auth.ts`
- Modify: `src/services/money.ts`

**Interfaces:**
- Consumes: `logger` from `src/logger.ts` (Task 1) — `logger.info(message, meta?)`, `logger.error(message, meta?)`.

- [ ] **Step 1: Update `src/services/auth.ts`**

Replace the full file contents with:

```typescript
import { logger } from "../logger.js";

const BASE_URL = "https://stepik.org/oauth2/token/";

export const getAccessToken = async (): Promise<string> => {
  logger.info("Requesting Stepik access token", { url: BASE_URL });

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.STEPIK_CLIENT_ID!,
      client_secret: process.env.STEPIK_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    logger.error("Failed to get access token", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
};
```

- [ ] **Step 2: Update `src/services/money.ts`**

In `src/services/money.ts`, add the logger import at the top (after the existing imports):

```typescript
import { courseNames } from "../constants/courses.js";
import { getAccessToken } from "./auth.js";
import { logger } from "../logger.js";
```

Replace the `getCourseBenefits` function (currently lines 60-74) with:

```typescript
export async function getCourseBenefits(): Promise<string[]> {
  const accessToken = await getAccessToken();

  logger.info("Fetching course benefits", { url: BENEFITS_URL });

  const response = await fetch(BENEFITS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error("Failed to fetch course benefits", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to fetch course benefits: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.course.benefits || [];
}
```

Leave `convertToMessage` and everything else in the file unchanged.

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/services/auth.ts src/services/money.ts
git commit -m "Log Stepik API requests and failures"
```

---

### Task 3: Log server lifecycle and tool errors, manual verification

**Files:**
- Modify: `src/index.ts`
- Modify: `src/server.ts`

**Interfaces:**
- Consumes: `logger` from `src/logger.ts` (Task 1).

- [ ] **Step 1: Update `src/index.ts`**

Replace the full file contents with:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import server from "./server.js";
import { logger } from "./logger.js";

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Stepik MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("Fatal error in main()", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
```

- [ ] **Step 2: Update `src/server.ts`**

Replace the full file contents with:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convertToMessage, getCourseBenefits } from "./services/money.js";
import { logger } from "./logger.js";

const server = new McpServer({
  name: "stepik-mcp",
  version: "1.0.0",
});

server.registerTool(
  "getCourseBenefits",
  {
    description: "Get course benefits for the last 24 hours",
    outputSchema: z.array(z.object({ text: z.string() })),
  },
  async () => {
    try {
      const benefits = await getCourseBenefits();
      const message = convertToMessage(benefits);

      return {
        content: [
          { text: message, type: "text" },
        ]
      };
    } catch (error) {
      logger.error("getCourseBenefits tool call failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);

export default server;
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Manually verify logging end-to-end**

Run: `node build/index.js`

In another terminal, send a `getCourseBenefits` tool call via an MCP client (or, for a quick smoke test without a full client, confirm the process starts and `logs/app.log` is created):

Run: `cat logs/app.log`
Expected: at least one JSON line with `"message":"Stepik MCP Server running on stdio"`.

Stop the process (Ctrl+C), then if Stepik credentials are configured, re-run and trigger the tool via a real MCP client (e.g. Claude Desktop or the MCP inspector) to confirm `logs/app.log` picks up `"Requesting Stepik access token"` and `"Fetching course benefits"` entries, and that a deliberately bad credential produces an `"error"`-level entry with `status`/`statusText`.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/server.ts
git commit -m "Log server lifecycle and tool call errors"
```
