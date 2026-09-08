import { getAccessToken, getCurrentUserId } from './auth.js';
import { logger } from '../logger.js';

const REVIEWS_URL = 'https://stepik.org/api/course-reviews';
const REVIEW_SUMMARIES_URL = 'https://stepik.org/api/course-review-summaries';

export interface Response {
  meta: Meta;
  'course-reviews': Review[];
}

export interface Meta {
  page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface Review {
  id: number;
  course: number;
  user: number;
  score: number;
  text: string;
  reply_text: string;
  reply_created_at?: string;
  reply_updated_at?: string;
  reply_created_by?: number;
  reply_updated_by?: number;
  create_date: string;
  update_date: string;
  translations: object;
  epic_count: number;
  abuse_count: number;
  vote_delta: number;
  vote: any;
}

export async function getReviews(page = 1, score?: number): Promise<Review[]> {
  const authorId = await getCurrentUserId();
  const scoreParam = score !== undefined ? `&score=${score}` : '';
  const response = await fetch(
    `${REVIEWS_URL}?author=${authorId}${scoreParam}&page=${page}`,
  );
  const data: Response = await response.json();
  return data['course-reviews'];
}

export async function getReviewsByCourse(
  courseId: number,
  page = 1,
  score?: number,
): Promise<Review[]> {
  const authorId = await getCurrentUserId();
  const scoreParam = score !== undefined ? `&score=${score}` : '';
  const response = await fetch(
    `${REVIEWS_URL}?author=${authorId}${scoreParam}&course=${courseId}&page=${page}`,
  );
  const data: Response = await response.json();
  return data['course-reviews'];
}

export interface CourseReviewSummary {
  courseId: number;
  average: number;
  count: number;
  distribution: number[];
}

interface ReviewSummariesResponse {
  meta: Meta;
  'course-review-summaries': {
    id: number;
    course: number;
    average: number;
    count: number;
    distribution: number[];
  }[];
}

export async function getCourseReviewSummary(
  courseId: number,
  accessToken?: string,
): Promise<CourseReviewSummary> {
  const token = accessToken ?? (await getAccessToken());
  const response = await fetch(`${REVIEW_SUMMARIES_URL}?course=${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    logger.error('Failed to fetch course review summary', {
      status: response.status,
      statusText: response.statusText,
      courseId,
    });
    throw new Error(
      `Failed to fetch course review summary: ${response.status} ${response.statusText}`,
    );
  }

  const data: ReviewSummariesResponse = await response.json();
  const summary = data['course-review-summaries'][0];

  return {
    courseId,
    average: summary?.average ?? 0,
    count: summary?.count ?? 0,
    distribution: summary?.distribution ?? [0, 0, 0, 0, 0],
  };
}

export async function getAllCoursesReviewSummaries(
  courseIds: number[],
): Promise<CourseReviewSummary[]> {
  const accessToken = await getAccessToken();
  const outcomes = await Promise.allSettled(
    courseIds.map((courseId) => getCourseReviewSummary(courseId, accessToken)),
  );

  const results: CourseReviewSummary[] = [];
  outcomes.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      logger.error('Skipping course review summary', {
        courseId: courseIds[i],
        error: (outcome.reason as Error).message,
      });
    }
  });
  return results;
}
