import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  getReviews,
  getReviewsByCourse,
  getCourseReviewSummary,
  getAllCoursesReviewSummaries,
  CourseReviewSummary,
} from '../services/reviews.js';
import { courseNames, loadCourses } from '../constants/courses.js';

function courseLabel(courseId: number): string {
  return courseNames[courseId] || `курс ${courseId}`;
}

function formatReviewSummary(summary: CourseReviewSummary): string {
  if (summary.count === 0) {
    return `${courseLabel(summary.courseId)}\n  Отзывов пока нет\n`;
  }

  const stars = summary.distribution
    .map((n, i) => `★${i + 1}: ${n}`)
    .join('  ');

  return [
    courseLabel(summary.courseId),
    `  Средняя оценка: ${summary.average.toFixed(2)} (${summary.count} отзывов)`,
    `  ${stars}`,
    '',
  ].join('\n');
}

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

  server.registerTool(
    'getCourseReviewSummary',
    {
      description:
        'Get the aggregate rating summary for a course: average score, total review count, and the star distribution (1-5).',
      inputSchema: {
        courseId: z.number().describe('The Stepik course id'),
      },
    },
    async ({ courseId }) => {
      const summary = await getCourseReviewSummary(courseId);
      return {
        content: [{ text: formatReviewSummary(summary), type: 'text' }],
      };
    },
  );

  server.registerTool(
    'getAllCoursesReviewSummary',
    {
      description:
        'Get the aggregate rating summary (average score, review count, star distribution) for all courses configured in STEPIK_COURSES.',
      inputSchema: {},
    },
    async () => {
      const courseIds = loadCourses().map((c) => c.id);
      const summaries = await getAllCoursesReviewSummaries(courseIds);
      return {
        content: summaries.map((s) => ({
          text: formatReviewSummary(s),
          type: 'text',
        })),
      };
    },
  );
}
