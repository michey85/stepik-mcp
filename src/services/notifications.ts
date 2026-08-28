import { getAccessToken } from './auth.js';

const NOTIFICATIONS_URL = 'https://stepik.org/api/notifications';

export interface Meta {
  page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface NotificationContext {
  action_url: string;
  data: {
    actor_id: number;
    actor_name: string;
    actor_url: string;
    comment_id: number;
    comment_preview_text: string;
  };
  target: {
    lesson_cover: string;
    lesson_id: number;
    lesson_title: string;
    lesson_url: string;
    step_id: number;
    step_position: number;
    step_url: string;
  };
}

export interface Notification {
  id: number;
  is_unread: boolean;
  is_muted: boolean;
  is_favorite: boolean;
  time: string;
  type: string;
  action: string;
  level: string;
  priority: string;
  html_text: string;
  context: NotificationContext;
  courses: number[];
}

export interface Response {
  meta: Meta;
  notifications: Notification[];
}

export function toPlain(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getNotifications(
  page = 1,
  isUnread?: boolean,
): Promise<Notification[]> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({ page: String(page) });
  if (isUnread !== undefined) {
    params.set('is_unread', String(isUnread));
  }

  const response = await fetch(`${NOTIFICATIONS_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch notifications: ${response.status} ${response.statusText}`,
    );
  }

  const data: Response = await response.json();
  return data.notifications;
}
