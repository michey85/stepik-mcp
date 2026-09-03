# Stepik MCP

https://stepik.org/api/docs/ - source of truth for the API endpoints.

To check a particular endpoint for a RAW format, use the following URL format:
https://stepik.org/api/docs/api-docs/api/course-reviews

https://github.com/StepicOrg/Stepik-API - examples

## Commands

- `npm run build` - compile TypeScript to `build/` (also produces the `stepik` bin)
- `npm run typecheck` - `tsc --noEmit`, use this to verify changes (no test suite exists)
- `npm run format` / `npm run format:check` - prettier

## Structure

- `src/services/` - Stepik API calls (auth, comments, reviews, lessons, promoCodes, etc.)
- `src/tools/` - MCP tool definitions exposed to the client, grouped by domain (`*-tools.ts`)
- `src/helpers/` - shared logic (e.g. HTML/CSS task building)
- Config comes from `.env.local` (see `.env.example`): `STEPIK_CLIENT_ID`, `STEPIK_CLIENT_SECRET`, `STEPIK_COURSES` (JSON array of `{id, title, isPackage?}`)
- Logs write to `logs/app.log` (`src/logger.ts`)
