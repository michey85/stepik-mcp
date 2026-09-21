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
        maxPages: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            'Max number of API pages to fetch, 20 purchases per page (default: 50, i.e. up to 1000 purchases). Increase for long periods with many purchases',
          ),
      },
    },
    async ({ period = 24, maxPages }) => {
      const since = new Date(Date.now() - period * 60 * 60 * 1000);
      const benefits = await getCourseBenefits(since, maxPages);
      const message = convertToMessage(benefits, period);

      return {
        content: [{ text: message, type: 'text' }],
      };
    },
  );
}
