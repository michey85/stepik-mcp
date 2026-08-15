import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { convertToMessage, getCourseBenefits } from './services/money.js';
import { getUnansweredQuestionsFromBestInItCourse } from './services/comments.js';
import { getReviews } from './services/reviews.js';

const server = new McpServer({
  name: 'stepik-mcp',
  version: '1.0.0',
});

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

server.registerTool(
  'getUnansweredQuestionsFromBestInItCourse',
  {
    description: 'Get unanswered questions from the Best in IT course',
    inputSchema: {},
  },
  async () => {
    const unanswered = await getUnansweredQuestionsFromBestInItCourse();
    return {
      content: unanswered.map((q) => ({
        text: `${q.text} with URL: ${q.discussion_url}`,
        type: 'text',
      })),
    };
  },
);

server.registerTool('getCorsesReviews', {
  description: "Get the list of 5 starts review from all my courses, paginated",
  inputSchema: {
    page: z.number().default(1).describe('page query param for pagination (default: 1), 20 reviews per page')
  }
}, async ({ page }) => {
  const reviews = await getReviews(page);
  return {
    content: reviews.map((r) => ({
      text: r.text,
      type: 'text',
    })),
  };
})

export default server;
