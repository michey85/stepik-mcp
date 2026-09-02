import { courseNames } from '../constants/courses.js';
import { getAccessToken } from './auth.js';
import { logger } from '../logger.js';

const BENEFITS_URL = 'https://stepik.org/api/course-benefits?page=1';

export const convertToMessage = (benefits: any[], period = 24) => {
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

export async function getCourseBenefits(): Promise<string[]> {
  const accessToken = await getAccessToken();

  const response = await fetch(BENEFITS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('Failed to fetch course benefits', {
      status: response.status,
      statusText: response.statusText,
      accessToken,
    });
    throw new Error(
      `Failed to fetch course benefits: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data['course-benefits'] || [];
}
