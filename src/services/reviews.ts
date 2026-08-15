const REVIEWS_URL =
  'https://stepik.org/api/course-reviews?author=167596167&score=5';
const BEST_IN_IT = 257879;

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

export async function getReviews(page = 1): Promise<Review[]> {
  const response = await fetch(`${REVIEWS_URL}&page=${page}`);
  const data: Response = await response.json();
  return data['course-reviews'];
}

export async function getReviewsByCourse(courseId: number, page = 1): Promise<Review[]> {
  const response = await fetch(`${REVIEWS_URL}&course=${courseId}&page=${page}`);
  const data: Response = await response.json();
  return data['course-reviews'];
}