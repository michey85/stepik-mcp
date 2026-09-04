import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  getMonthlyReports,
  getMonthlyReportSummary,
  MonthlyReportSummary,
} from '../services/monthlyReports.js';
import { courseNames } from '../constants/courses.js';

function formatSummary(summary: MonthlyReportSummary): string {
  const monthLabel = new Date(summary.date).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const lines = [`Отчет за ${monthLabel} (id: ${summary.reportId})`, ''];

  for (const course of summary.courses) {
    const name = courseNames[course.courseId] || course.courseTitle;
    lines.push(
      name,
      `  Продаж: ${course.benefitsCount}`,
      `  Начислено: ${course.credit.toFixed(2)} ₽`,
      `  Возвраты: ${course.debit.toFixed(2)} ₽`,
      `  Комиссия: ${course.fee.toFixed(2)} ₽`,
      `  К выплате: ${course.profit.toFixed(2)} ₽`,
      '',
    );
  }

  lines.push(
    `Итого к выплате: ${summary.totals.profit.toFixed(2)} ₽ ` +
      `(начислено ${summary.totals.credit.toFixed(2)} ₽, возвраты ${summary.totals.debit.toFixed(2)} ₽, комиссия ${summary.totals.fee.toFixed(2)} ₽)`,
  );

  return lines.join('\n');
}

export default function registerMonthlyReportTools(server: McpServer) {
  server.registerTool(
    'getCourseMonthlyReports',
    {
      description:
        'List available course monthly reports (id and month), paginated, newest first',
      inputSchema: {
        page: z
          .number()
          .default(1)
          .describe('page query param for pagination (default: 1)'),
      },
    },
    async ({ page }) => {
      const reports = await getMonthlyReports(page);
      return {
        content: reports.map((r) => ({
          text: `id: ${r.id}, date: ${r.date}`,
          type: 'text',
        })),
      };
    },
  );

  server.registerTool(
    'getCourseMonthlyReportSummary',
    {
      description:
        'Get a per-course financial summary (sales count, revenue, refunds, fee, payout) for a monthly report. Omit reportId to get the latest available month.',
      inputSchema: {
        reportId: z
          .number()
          .optional()
          .describe(
            'The id of the monthly report (from getCourseMonthlyReports). Omit for the latest report.',
          ),
      },
    },
    async ({ reportId }) => {
      const summary = await getMonthlyReportSummary(reportId);
      return {
        content: [{ text: formatSummary(summary), type: 'text' }],
      };
    },
  );
}
