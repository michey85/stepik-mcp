import { getAccessToken } from './auth.js';
import type { Meta } from './promoCodes.js';

const ANNOUNCEMENTS_URL = 'https://stepik.org/api/announcements';

export type AnnouncementStatus =
  'composing' | 'scheduled' | 'queued' | 'sending' | 'sent' | 'aborted';

export interface Announcement {
  id: number;
  course: number;
  user: number | null;
  subject: string;
  text: string;
  create_date: string;
  next_date: string | null;
  sent_date: string | null;
  status: AnnouncementStatus | string;
  is_restricted_by_score: boolean;
  score_percent_min: number;
  score_percent_max: number;
  is_scheduled: boolean;
  start_date: string | null;
  mail_period_days: number;
  mail_quantity: number;
  is_infinite: boolean;
  on_enroll: boolean;
  publish_count: number;
  queue_count: number;
  sent_count: number;
  open_count: number;
  click_count: number;
}

export interface AnnouncementsResponse {
  meta: Meta;
  announcements: Announcement[];
}

export interface AnnouncementsPage {
  announcements: Announcement[];
  hasNext: boolean;
  page: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function assertOk(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }
}

export async function getAnnouncementsByCourse(
  courseId: number,
  page = 1,
): Promise<AnnouncementsPage> {
  const response = await fetch(
    `${ANNOUNCEMENTS_URL}?course=${courseId}&page=${page}`,
    { headers: await authHeaders() },
  );
  await assertOk(response);

  const data: AnnouncementsResponse = await response.json();
  return {
    announcements: data.announcements,
    hasNext: data.meta.has_next,
    page: data.meta.page,
  };
}

export async function getAnnouncementById(id: number): Promise<Announcement> {
  const response = await fetch(`${ANNOUNCEMENTS_URL}/${id}`, {
    headers: await authHeaders(),
  });
  await assertOk(response);

  const data: AnnouncementsResponse = await response.json();
  return data.announcements[0];
}

export interface CreateAnnouncementParams {
  courseId: number;
  subject: string;
  text: string;
  onEnroll?: boolean;
  isScheduled?: boolean;
  startDate?: string;
  mailPeriodDays?: number;
  mailQuantity?: number;
  isInfinite?: boolean;
  isRestrictedByScore?: boolean;
  scorePercentMin?: number;
  scorePercentMax?: number;
}

export async function createAnnouncement(
  params: CreateAnnouncementParams,
): Promise<Announcement> {
  const response = await fetch(ANNOUNCEMENTS_URL, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      announcement: {
        course: params.courseId,
        subject: params.subject,
        text: params.text,
        on_enroll: params.onEnroll ?? false,
        is_scheduled: params.isScheduled ?? false,
        start_date: params.startDate,
        mail_period_days: params.mailPeriodDays ?? 7,
        mail_quantity: params.mailQuantity ?? 1,
        is_infinite: params.isInfinite ?? false,
        is_restricted_by_score: params.isRestrictedByScore ?? false,
        score_percent_min: params.scorePercentMin ?? 0,
        score_percent_max: params.scorePercentMax ?? 100,
      },
    }),
  });
  await assertOk(response);

  const data: AnnouncementsResponse = await response.json();
  return data.announcements[0];
}

export type UpdateAnnouncementParams = Partial<
  Omit<CreateAnnouncementParams, 'courseId'>
>;

export async function updateAnnouncement(
  id: number,
  params: UpdateAnnouncementParams,
): Promise<Announcement> {
  const current = await getAnnouncementById(id);

  const response = await fetch(`${ANNOUNCEMENTS_URL}/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({
      announcement: {
        course: current.course,
        subject: params.subject ?? current.subject,
        text: params.text ?? current.text,
        on_enroll: params.onEnroll ?? current.on_enroll,
        is_scheduled: params.isScheduled ?? current.is_scheduled,
        start_date: params.startDate ?? current.start_date,
        mail_period_days: params.mailPeriodDays ?? current.mail_period_days,
        mail_quantity: params.mailQuantity ?? current.mail_quantity,
        is_infinite: params.isInfinite ?? current.is_infinite,
        is_restricted_by_score:
          params.isRestrictedByScore ?? current.is_restricted_by_score,
        score_percent_min: params.scorePercentMin ?? current.score_percent_min,
        score_percent_max: params.scorePercentMax ?? current.score_percent_max,
      },
    }),
  });
  await assertOk(response);

  const data: AnnouncementsResponse = await response.json();
  return data.announcements[0];
}

async function postAction(
  id: number,
  action: 'send' | 'test' | 'abort',
): Promise<string> {
  const response = await fetch(`${ANNOUNCEMENTS_URL}/${id}/${action}`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  await assertOk(response);
  return response.text();
}

/** Queue the announcement for delivery to all course learners. */
export function sendAnnouncement(id: number): Promise<string> {
  return postAction(id, 'send');
}

/** Send a test copy of the announcement to the author only. */
export function testAnnouncement(id: number): Promise<string> {
  return postAction(id, 'test');
}

/** Cancel a scheduled/queued announcement. */
export function abortAnnouncement(id: number): Promise<string> {
  return postAction(id, 'abort');
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const response = await fetch(`${ANNOUNCEMENTS_URL}/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  await assertOk(response);
}
