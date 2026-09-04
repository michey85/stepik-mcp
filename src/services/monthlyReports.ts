import { getAccessToken } from './auth.js';
import { readXlsxSheetAsObjects } from '../helpers/xlsxReader.js';
import { logger } from '../logger.js';

const REPORTS_URL = 'https://stepik.org/api/course-monthly-reports';
const BASE_URL = 'https://stepik.org';

export interface MonthlyReportListItem {
  id: number;
  date: string;
  document: string;
  report: string;
}

interface MonthlyReportsResponse {
  meta: { page: number; has_next: boolean; has_previous: boolean };
  'course-monthly-reports': MonthlyReportListItem[];
}

export async function getMonthlyReports(
  page = 1,
): Promise<MonthlyReportListItem[]> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${REPORTS_URL}?page=${page}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    logger.error('Failed to fetch monthly reports', {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(
      `Failed to fetch monthly reports: ${response.status} ${response.statusText}`,
    );
  }

  const data: MonthlyReportsResponse = await response.json();
  return data['course-monthly-reports'];
}

async function findReportById(
  reportId: number,
  maxPages = 5,
): Promise<MonthlyReportListItem | undefined> {
  for (let page = 1; page <= maxPages; page++) {
    const reports = await getMonthlyReports(page);
    const found = reports.find((r) => r.id === reportId);
    if (found) return found;
    if (reports.length === 0) break;
  }
  return undefined;
}

async function downloadReportWorkbook(reportPath: string): Promise<Buffer> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${BASE_URL}${reportPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    logger.error('Failed to download monthly report file', {
      status: response.status,
      statusText: response.statusText,
      reportPath,
    });
    throw new Error(
      `Failed to download monthly report file: ${response.status} ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export interface CourseReportSummary {
  courseId: number;
  courseTitle: string;
  benefitsCount: number;
  credit: number;
  debit: number;
  fee: number;
  profit: number;
}

export interface MonthlyReportSummary {
  reportId: number;
  date: string;
  courses: CourseReportSummary[];
  totals: { credit: number; debit: number; fee: number; profit: number };
}

export async function getMonthlyReportSummary(
  reportId?: number,
): Promise<MonthlyReportSummary> {
  const item =
    reportId === undefined
      ? (await getMonthlyReports(1))[0]
      : await findReportById(reportId);

  if (!item) {
    throw new Error(
      reportId === undefined
        ? 'No monthly reports found'
        : `Monthly report ${reportId} not found`,
    );
  }

  const buffer = await downloadReportWorkbook(item.report);
  const rows = readXlsxSheetAsObjects(buffer, 'benefits');

  const byCourse = new Map<number, CourseReportSummary>();
  for (const row of rows) {
    const courseId = Number(row.course_id);
    if (!Number.isFinite(courseId)) {
      logger.error('Skipping benefits row with invalid course_id', {
        row,
      });
      continue;
    }
    const existing = byCourse.get(courseId) ?? {
      courseId,
      courseTitle: row.course_title,
      benefitsCount: 0,
      credit: 0,
      debit: 0,
      fee: 0,
      profit: 0,
    };
    existing.benefitsCount += 1;
    existing.credit += parseFloat(row.credit) || 0;
    existing.debit += parseFloat(row.debit) || 0;
    existing.fee += parseFloat(row.fee) || 0;
    existing.profit += parseFloat(row.profit) || 0;
    byCourse.set(courseId, existing);
  }

  const courses = [...byCourse.values()].sort((a, b) => b.profit - a.profit);
  const totals = courses.reduce(
    (acc, c) => ({
      credit: acc.credit + c.credit,
      debit: acc.debit + c.debit,
      fee: acc.fee + c.fee,
      profit: acc.profit + c.profit,
    }),
    { credit: 0, debit: 0, fee: 0, profit: 0 },
  );

  return { reportId: item.id, date: item.date, courses, totals };
}
