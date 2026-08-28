import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import server from './server.js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, '..', '.env.local'),
  quiet: true,
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Stepik MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
