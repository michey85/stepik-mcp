import { courseNames } from '../constants/courses.js';
import { getAccessToken } from './auth.js';
import { logger } from '../logger.js';

const BENEFITS_URL = 'https://stepik.org/api/course-benefits';
const MAX_PAGES = 50;

export interface CourseBenefit {
  id: number;
  course: number;
  time: string;
  amount: string;
  promo_code: string | null;
  [key: string]: unknown;
}

interface CourseBenefitsResponse {
  meta: { page: number; has_next: boolean; has_previous: boolean };
  'course-benefits': CourseBenefit[];
}

export const convertToMessage = (benefits: CourseBenefit[], period = 24) => {
  // Граница: последние 24 часа от момента запуска
  const now = new Date();
  const since = new Date(now.getTime() - period * 60 * 60 * 1000);

  // Фильтруем только за последние {period} часа
  const recent = benefits.filter((item) => new Date(item.time) >= since);

  if (recent.length === 0) {
    return `📭 За последние ${period} часа покупок не было.`;
  }

  // Группируем по курсу
  const byCourse: {
    [key: number]: {
      count: number;
      totalAmount: number;
      promoCodes: Set<string>;
    };
  } = {};
  for (const item of recent) {
    const cid = item.course;
    if (!byCourse[cid]) {
      byCourse[cid] = { count: 0, totalAmount: 0, promoCodes: new Set() };
    }
    byCourse[cid].count += 1;
    byCourse[cid].totalAmount += parseFloat(item.amount);
    if (item.promo_code) {
      byCourse[cid].promoCodes.add(item.promo_code);
    }
  }

  // Формируем сообщение
  const dateStr = now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  let lines = [
    `🛒 *Покупки за последние ${period} часа* (по ${dateStr} МСК)\n`,
  ];

  // Сортируем по убыванию числа покупок
  const sorted = Object.entries(byCourse).sort(
    (a, b) => b[1].count - a[1].count,
  );

  for (const [courseId, data] of sorted) {
    const name = courseNames[courseId] || `Курс ${courseId}`;
    const promos =
      data.promoCodes.size > 0
        ? `🎟 ${[...data.promoCodes].join(', ')}`
        : 'без промокода';
    lines.push(
      `📘 *${name}*\n` +
        `   Покупок: ${data.count}\n` +
        `   Выплата: ${data.totalAmount.toFixed(2)} ₽\n` +
        `   ${promos}\n`,
    );
  }

  // Итог
  const totalCount = recent.length;
  const totalAmount = recent.reduce((s, i) => s + parseFloat(i.amount), 0);
  lines.push(`\n💰 Итого: ${totalCount} покупок, ${totalAmount.toFixed(2)} ₽`);

  return lines.join('\n');
};

async function fetchBenefitsPage(
  page: number,
  accessToken: string,
): Promise<CourseBenefitsResponse> {
  const response = await fetch(`${BENEFITS_URL}?page=${page}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('Failed to fetch course benefits', {
      status: response.status,
      statusText: response.statusText,
      page,
    });
    throw new Error(
      `Failed to fetch course benefits: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// Benefits come newest-first, so we walk pages until we hit an item older
// than `since` (or run out of pages / hit the safety cap).
export async function getCourseBenefits(
  since?: Date,
  maxPages = MAX_PAGES,
): Promise<CourseBenefit[]> {
  const accessToken = await getAccessToken();
  const all: CourseBenefit[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchBenefitsPage(page, accessToken);
    const items = data['course-benefits'] || [];
    all.push(...items);

    if (items.length === 0 || !data.meta?.has_next) break;

    const oldest = items[items.length - 1];
    if (since && new Date(oldest.time) < since) break;
  }

  return all;
}
