import { getAccessToken } from './auth.js';

const BASE_URL = 'https://stepik.org/api/discussion-proxies/77-9759908-1';
const COMMENTS_URL = 'https://stepik.org/api/comments';

export interface CourseDiscussions {
  meta: Meta;
  'discussion-proxies': Proxy[];
}

export interface Meta {
  page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface Proxy {
  id: string;
  discussions: number[];
  discussions_most_liked: number[];
  discussions_most_active: number[];
  discussions_recent_activity: number[];
}

export interface Comment {
  id: number;
  parent?: number;
  user: number;
  user_role: string;
  time: string;
  last_time: string;
  text: string;
  reply_count: number;
  is_deleted: boolean;
  is_banned: boolean;
  deleted_by: any;
  deleted_at: any;
  can_edit: boolean;
  can_moderate: boolean;
  can_delete: boolean;
  actions: Actions;
  target: number;
  replies: number[];
  subscriptions: string[];
  is_pinned: boolean;
  pinned_by: any;
  pinned_at: any;
  is_staff_replied: boolean;
  is_reported: boolean;
  attachments: any[];
  thread: string;
  submission: any;
  edited_by?: number;
  edited_at?: string;
  epic_count: number;
  abuse_count: number;
  vote_delta: number;
  vote?: string;
  translations: Translations;
}

export interface Actions {
  delete: boolean;
  pin: boolean;
  report: boolean;
  vote?: boolean;
  edit: boolean;
  ban: boolean;
}

export interface Translations {}

export interface User {
  id: number;
  profile: number;
  is_private: boolean;
  is_active: boolean;
  is_guest: boolean;
  is_organization: boolean;
  is_author: boolean;
  short_bio: string;
  details: string;
  first_name: string;
  last_name: string;
  full_name: string;
  alias?: string;
  avatar: string;
  cover?: string;
  city?: number;
  knowledge: number;
  knowledge_rank: number;
  reputation: number;
  reputation_rank: number;
  join_date: string;
  social_profiles: number[];
  solved_steps_count: number;
  created_courses_count: number;
  created_lessons_count: number;
  issued_certificates_count: number;
  followers_count: number;
}

export interface Vote {
  id: string;
  value: any;
}

export interface CommentsObject {
  meta: Meta;
  comments: Comment[];
  attempts: any[];
  submissions: any[];
  users: User[];
  votes: Vote[];
}

interface UnansweredQuestion {
  text: string;
  author_id: number;
  created_at: string;
  discussion_url: string;
}

function toPlain(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getUnansweredQuestionsFromBestInItCourse(): Promise<
  UnansweredQuestion[]
> {
  const accessToken = await getAccessToken();

  const response = await fetch(BASE_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: CourseDiscussions = await response.json();

  const queryParams = data['discussion-proxies'][0].discussions_recent_activity
    .map((comment) => `ids%5B%5D=${comment}`)
    .join('&');

  const response2 = await fetch(`${COMMENTS_URL}?${queryParams}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response2.ok) {
    throw new Error(`HTTP error! status: ${response2.status}`);
  }

  const data2: CommentsObject = await response2.json();
  const comments = data2.comments;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();

  const unanswered = comments.filter((c) => {
    if (c.is_deleted || c.is_banned) return false;
    if (c.parent !== null) return false;
    return new Date(c.time).getTime() >= since;
  });

  return unanswered.map((c) => ({
    text: toPlain(c.text || '').slice(0, 600),
    author_id: c.user,
    created_at: c.time,
    discussion_url: `https://stepik.org/lesson/2246724/step/2?discussion=${c.id}`,
  }));
}
