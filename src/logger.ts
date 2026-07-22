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
