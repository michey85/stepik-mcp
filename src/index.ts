import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import server from './server.js';
import dotenv from 'dotenv';

dotenv.config({
  path: '/Users/mishanep/Developer/stepik-mcp/.env.local',
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
