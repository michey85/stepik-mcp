import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createPromoCode,
  getActivePromoCodesByCourse,
} from '../services/promoCodes.js';

export default function registerPromocodeTools(server: McpServer) {
  server.registerTool(
    'getActivePromoCodesByCourse',
    {
      description:
        'Get the list of currently active promo codes for a specific course. Paginated. ' +
        'The response includes a "hasNext" flag and the current "page" number: ' +
        'if hasNext is true, call this tool again with page + 1 to get the next page.',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        page: z
          .number()
          .default(1)
          .describe('page query param for pagination (default: 1)'),
      },
    },
    async ({ courseId, page }) => {
      const {
        promoCodes,
        hasNext,
        page: currentPage,
      } = await getActivePromoCodesByCourse(courseId, page);
      const summary = `Page ${currentPage}, ${promoCodes.length} active promo code(s). hasNext: ${hasNext}${hasNext ? ` (call again with page: ${currentPage + 1} for more)` : ''}`;
      return {
        content: [
          { text: summary, type: 'text' },
          ...promoCodes.map((p) => ({
            text: `${p.id}: ${p.name} - discount ${p.discount}${p.is_percent_discount ? '%' : ''}${p.expire_date ? `, expires ${p.expire_date}` : ''}`,
            type: 'text' as const,
          })),
        ],
      };
    },
  );

  server.registerTool(
    'addPromoCode',
    {
      description: 'Create a new promo code for a specific course',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        name: z.string().describe('The promo code name (the code itself)'),
        discount: z
          .number()
          .describe(
            'The discount amount (percent or absolute, see isPercentDiscount)',
          ),
        isPercentDiscount: z
          .boolean()
          .optional()
          .describe('Whether discount is a percentage (default: false)'),
        description: z.string().optional().describe('Optional description'),
        limitPerUser: z
          .number()
          .optional()
          .describe('Optional usage limit per user'),
        startDate: z
          .string()
          .optional()
          .describe('Optional ISO datetime when the promo code becomes active'),
        expireDate: z
          .string()
          .optional()
          .describe('Optional ISO datetime when the promo code expires'),
      },
    },
    async ({
      courseId,
      name,
      discount,
      isPercentDiscount,
      description,
      limitPerUser,
      startDate,
      expireDate,
    }) => {
      const promoCode = await createPromoCode({
        courseId,
        name,
        discount,
        isPercentDiscount,
        description,
        limitPerUser,
        startDate,
        expireDate,
      });
      return {
        content: [
          {
            text: `Promo code created with id ${promoCode.id}: ${promoCode.name}`,
            type: 'text',
          },
        ],
      };
    },
  );
}
