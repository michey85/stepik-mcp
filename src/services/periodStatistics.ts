import { getAccessToken } from './auth.js';
import { logger } from '../logger.js';

const STATS_URL = 'https://stepik.org/api/course-period-statistics';

export interface CoursePeriodStatistics {
  id: number;
  course: number;
  from_date: string;
  to_date: string;
  active_learners_count: number;
  active_learners_delta: number;
  submissions_count: number;
  submissions_delta: number;
  certificates_count: number;
  certificates_delta: number;
  comments_count: number;
  comments_delta: number;
  enrollments_count: number;
  enrollments_delta: number;
  dropouts_count: number;
  dropouts_delta: number;
  update_date: string;
}

interface CoursePeriodStatisticsResponse {
  meta: { page: number; has_next: boolean; has_previous: boolean };
  'course-period-statistics': CoursePeriodStatistics[];
}

async function fetchCoursePeriodStatisticsPage(
  courseId: number,
  page: number,
): Promise<CoursePeriodStatisticsResponse> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${STATS_URL}?course=${courseId}&page=${page}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    logger.error('Failed to fetch course period statistics', {
      status: response.status,
      statusText: response.statusText,
      courseId,
    });
    throw new Error(
      `Failed to fetch course period statistics: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function getCoursePeriodStatistics(
  courseId: number,
  page = 1,
): Promise<CoursePeriodStatistics[]> {
  const data = await fetchCoursePeriodStatisticsPage(courseId, page);
  return data['course-period-statistics'];
}

async function getLatestCoursePeriodStatistics(
  courseId: number,
  maxPages = 5,
): Promise<CoursePeriodStatistics | undefined> {
  let latest: CoursePeriodStatistics | undefined;
  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchCoursePeriodStatisticsPage(courseId, page);
    for (const p of data['course-period-statistics']) {
      if (!latest || new Date(p.to_date) > new Date(latest.to_date)) {
        latest = p;
      }
    }
    if (!data.meta.has_next) break;
  }
  return latest;
}

async function findCoursePeriodStatisticsByDate(
  courseId: number,
  fromDate: string,
  maxPages = 5,
): Promise<CoursePeriodStatistics | undefined> {
  for (let page = 1; page <= maxPages; page++) {
    const periods = await getCoursePeriodStatistics(courseId, page);
    const found = periods.find((p) => p.from_date.startsWith(fromDate));
    if (found) return found;
    if (periods.length === 0) break;
  }
  return undefined;
}

export interface CourseEngagementSummary {
  courseId: number;
  fromDate: string;
  toDate: string;
  activeLearners: { count: number; delta: number };
  enrollments: { count: number; delta: number };
  dropouts: { count: number; delta: number };
  submissions: { count: number; delta: number };
  certificates: { count: number; delta: number };
  comments: { count: number; delta: number };
}

function toSummary(
  courseId: number,
  stats: CoursePeriodStatistics,
): CourseEngagementSummary {
  return {
    courseId,
    fromDate: stats.from_date,
    toDate: stats.to_date,
    activeLearners: {
      count: stats.active_learners_count,
      delta: stats.active_learners_delta,
    },
    enrollments: {
      count: stats.enrollments_count,
      delta: stats.enrollments_delta,
    },
    dropouts: { count: stats.dropouts_count, delta: stats.dropouts_delta },
    submissions: {
      count: stats.submissions_count,
      delta: stats.submissions_delta,
    },
    certificates: {
      count: stats.certificates_count,
      delta: stats.certificates_delta,
    },
    comments: { count: stats.comments_count, delta: stats.comments_delta },
  };
}

export async function getCourseEngagementSummary(
  courseId: number,
  fromDate?: string,
): Promise<CourseEngagementSummary> {
  const stats =
    fromDate === undefined
      ? await getLatestCoursePeriodStatistics(courseId)
      : await findCoursePeriodStatisticsByDate(courseId, fromDate);

  if (!stats) {
    throw new Error(
      fromDate === undefined
        ? `No period statistics found for course ${courseId}`
        : `No period statistics found for course ${courseId} starting ${fromDate}`,
    );
  }

  return toSummary(courseId, stats);
}

export async function getCourseEngagementSummaries(
  courseIds: number[],
  fromDate?: string,
): Promise<CourseEngagementSummary[]> {
  const outcomes = await Promise.allSettled(
    courseIds.map((courseId) => getCourseEngagementSummary(courseId, fromDate)),
  );

  const results: CourseEngagementSummary[] = [];
  outcomes.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      logger.error('Skipping course engagement summary', {
        courseId: courseIds[i],
        error: (outcome.reason as Error).message,
      });
    }
  });
  return results;
}
