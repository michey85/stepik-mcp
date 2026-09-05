import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  getCoursePeriodStatistics,
  getCourseEngagementSummary,
  getCourseEngagementSummaries,
  CourseEngagementSummary,
} from '../services/periodStatistics.js';
import { courseNames, loadCourses } from '../constants/courses.js';

function courseLabel(courseId: number): string {
  return courseNames[courseId] || `курс ${courseId}`;
}

function formatDelta(delta: number): string {
  if (delta === 0) return '';
  return ` (${delta > 0 ? '+' : ''}${delta})`;
}

function formatSummary(summary: CourseEngagementSummary): string {
  return [
    courseLabel(summary.courseId),
    `  Период: ${summary.fromDate} — ${summary.toDate}`,
    `  Активные учащиеся: ${summary.activeLearners.count}${formatDelta(summary.activeLearners.delta)}`,
    `  Зачисления: ${summary.enrollments.count}${formatDelta(summary.enrollments.delta)}`,
    `  Отчисления: ${summary.dropouts.count}${formatDelta(summary.dropouts.delta)}`,
    `  Решения: ${summary.submissions.count}${formatDelta(summary.submissions.delta)}`,
    `  Сертификаты: ${summary.certificates.count}${formatDelta(summary.certificates.delta)}`,
    `  Комментарии: ${summary.comments.count}${formatDelta(summary.comments.delta)}`,
    '',
  ].join('\n');
}

export default function registerPeriodStatisticsTools(server: McpServer) {
  server.registerTool(
    'getCoursePeriodStatistics',
    {
      description:
        'List raw course period statistics records for a course (paginated, includes all historical periods).',
      inputSchema: {
        courseId: z.number().describe('The Stepik course id'),
        page: z
          .number()
          .default(1)
          .describe('page query param for pagination (default: 1)'),
      },
    },
    async ({ courseId, page }) => {
      const stats = await getCoursePeriodStatistics(courseId, page);
      return {
        content: stats.map((s) => ({
          text: JSON.stringify(s),
          type: 'text',
        })),
      };
    },
  );

  server.registerTool(
    'getCourseEngagementSummary',
    {
      description:
        'Get an engagement summary (active learners, enrollments, dropouts, submissions, certificates, comments — with period-over-period deltas) for a course. Omit fromDate to get the latest available period.',
      inputSchema: {
        courseId: z.number().describe('The Stepik course id'),
        fromDate: z
          .string()
          .optional()
          .describe(
            'ISO date (YYYY-MM-DD) matching the start of the desired period. Omit for the latest period.',
          ),
      },
    },
    async ({ courseId, fromDate }) => {
      const summary = await getCourseEngagementSummary(courseId, fromDate);
      return {
        content: [{ text: formatSummary(summary), type: 'text' }],
      };
    },
  );

  server.registerTool(
    'getAllCoursesEngagementSummary',
    {
      description:
        'Get engagement summaries (active learners, enrollments, dropouts, submissions, certificates, comments) for all courses configured in STEPIK_COURSES. Omit fromDate to get the latest available period for each course.',
      inputSchema: {
        fromDate: z
          .string()
          .optional()
          .describe(
            'ISO date (YYYY-MM-DD) matching the start of the desired period. Omit for the latest period.',
          ),
      },
    },
    async ({ fromDate }) => {
      const courseIds = loadCourses().map((c) => c.id);
      const summaries = await getCourseEngagementSummaries(courseIds, fromDate);
      return {
        content: summaries.map((s) => ({
          text: formatSummary(s),
          type: 'text',
        })),
      };
    },
  );
}
