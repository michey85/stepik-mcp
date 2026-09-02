import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { convertToMessage, getCourseBenefits } from '../services/money.js';

export default function registerBenefitsTools(server: McpServer) {
  server.registerTool(
    'getCourseBenefits',
    {
      description: 'Get course benefits for the given period or last 24 hours',
      inputSchema: {
        period: z.number().min(1).describe('Period in hours (default: 24)'),
      },
    },
    async ({ period = 24 }) => {
      const benefits = await getCourseBenefits();
      const message = convertToMessage(benefits, period);

      return {
        content: [{ text: message, type: 'text' }],
      };
    },
  );
}
