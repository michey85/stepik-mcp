import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { convertToMessage, getCourseBenefits } from './services/money.js';
import { getUnansweredQuestionsFromBestInItCourse } from './services/comments.js';
import { getReviews, getReviewsByCourse } from './services/reviews.js';
import { COURSES, COURSES_URI } from './resources/courses.js';

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

server.registerTool(
  'getCorsesReviews',
  {
    description:
      'Get the list of 5 starts review from all my courses, paginated',
    inputSchema: {
      page: z
        .number()
        .default(1)
        .describe(
          'page query param for pagination (default: 1), 20 reviews per page',
        ),
    },
  },
  async ({ page }) => {
    const reviews = await getReviews(page);
    return {
      content: reviews.map((r) => ({
        text: r.text,
        type: 'text',
      })),
    };
  },
);

server.registerTool(
  'getCourseList',
  {
    description: 'Get the list of all my courses with ID and names',
    inputSchema: {},
  },
  async () => {
    const courses = COURSES;
    return {
      content: courses.map((c) => ({
        text: `${c.id}: ${c.title}`,
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
    },
  },
  async ({ courseId, page }) => {
    const reviews = await getReviewsByCourse(courseId, page);
    return {
      content: reviews.map((r) => ({
        text: r.text,
        type: 'text',
      })),
    };
  },
);

server.registerResource(
  'courses',
  COURSES_URI,
  {
    title: 'Courses',
    description: 'List of my Stepik courses',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(COURSES),
      },
    ],
  }),
);

export default server;
