import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { getReviews, getReviewsByCourse } from '../services/reviews.js';

export default function registerReviewTools(server: McpServer) {
  server.registerTool(
    'getCorsesReviews',
    {
      description: 'Get the list of reviews from all my courses, paginated',
      inputSchema: {
        page: z
          .number()
          .default(1)
          .describe(
            'page query param for pagination (default: 1), 20 reviews per page',
          ),
        score: z
          .number()
          .optional()
          .describe('Filter by review score (1-5). Omit to get all scores'),
      },
    },
    async ({ page, score }) => {
      const reviews = await getReviews(page, score);
      return {
        content: reviews.map((r) => ({
          text: `${r.text}, score: ${r.score}, course: ${r.course}, user: ${r.user}, date: ${r.create_date}`,
          type: 'text',
        })),
      };
    },
  );

  server.registerTool(
    'getReviewsByCourse',
    {
      description: 'Get the list of reviews for a specific course, paginated',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        page: z
          .number()
          .default(1)
          .describe(
            'page query param for pagination (default: 1), 20 reviews per page',
          ),
        score: z
          .number()
          .optional()
          .describe('Filter by review score (1-5). Omit to get all scores'),
      },
    },
    async ({ courseId, page, score }) => {
      const reviews = await getReviewsByCourse(courseId, page, score);
      return {
        content: reviews.map((r) => ({
          text: `${r.text}, score: ${r.score}, user: ${r.user}, date: ${r.create_date}`,
          type: 'text',
        })),
      };
    },
  );
}
