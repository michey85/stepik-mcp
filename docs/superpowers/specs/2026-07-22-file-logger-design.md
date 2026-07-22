# File Logger — Design

## Problem

The Stepik MCP server currently only logs via scattered `console.error` calls
(stdout is reserved for the MCP stdio protocol, so stderr is the only safe
console channel). There's no persistent record, which makes it hard to
analyze what happened after the fact — especially failures talking to the
Stepik API.

## Goals

- Persist logs to a file so they can be reviewed after the process exits.
- Capture: outgoing Stepik API requests/responses (success and failure), and
  uncaught/unexpected errors.
- Keep console (stderr) output as-is for live visibility during development.
- No new dependencies; minimal implementation.

## Non-goals

- Log rotation or size limits (single append-only file is fine for now).
- Configurable log destination (fixed path, no env var).
- Structured log level filtering/config (all levels always emit).

## Design

### `src/logger.ts`

A small module exporting a `logger` object with `debug`, `info`, `warn`,
`error` methods, each with signature `(message: string, meta?: object) => void`.

Each call:
1. Builds a JSON object: `{ timestamp: ISOString, level, message, ...meta }`.
2. Appends it as one line (`JSON.stringify(entry) + "\n"`) to the log file via
   `fs.appendFileSync`.
3. Also writes the same line to `console.error`, preserving current stderr
   visibility.

The log file lives at `logs/app.log`, resolved relative to the module's own
location via `import.meta.url` (not `process.cwd()`), so logs always land in
the project directory regardless of where the `stepik` binary is invoked
from. The `logs/` directory is created on first write if missing
(`fs.mkdirSync(..., { recursive: true })`).

### Integration points

- **[src/services/auth.ts](../../../src/services/auth.ts)** — log before
  requesting an access token; log status/statusText on failure.
- **[src/services/money.ts](../../../src/services/money.ts)** — log before
  fetching course benefits; log status/statusText on failure.
- **[src/index.ts](../../../src/index.ts)** — replace the two existing
  `console.error` calls with `logger.info` (startup message) and
  `logger.error` (fatal error in `main().catch`).
- **[src/server.ts](../../../src/server.ts)** — wrap the `getCourseBenefits`
  tool handler body in try/catch; log unexpected errors via `logger.error`
  before rethrowing (the MCP SDK converts the rethrown error into an
  `isError` tool result for the client — behavior unchanged, just logged now).

### `.gitignore`

Add `logs/` so the log file is never committed.

## Testing / verification

- Build (`npm run build`) succeeds with no type errors.
- Manually run the server, invoke `getCourseBenefits`, confirm `logs/app.log`
  is created and contains JSON lines for the request lifecycle.
- Force a failure (e.g. bad credentials) and confirm the error is logged with
  status info, and the tool call still returns an error result to the client
  as before.
