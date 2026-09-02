import { getAccessToken } from './auth.js';

const PROMO_CODES_URL = 'https://stepik.org/api/promo-codes';

export interface Meta {
  page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PromoCode {
  id: number;
  name: string;
  discount: string;
  course: number;
  description: string;
  is_stepik_side: boolean;
  is_percent_discount: boolean;
  hex: string;
  user?: number;
  limit_per_user?: number;
  start_date?: string;
  expire_date?: string;
  create_date: string;
  update_date: string;
}

export interface PromoCodesResponse {
  meta: Meta;
  'promo-codes': PromoCode[];
}

function isActive(promoCode: PromoCode): boolean {
  const now = Date.now();
  if (promoCode.start_date && new Date(promoCode.start_date).getTime() > now) {
    return false;
  }
  if (
    promoCode.expire_date &&
    new Date(promoCode.expire_date).getTime() < now
  ) {
    return false;
  }
  return true;
}

export interface ActivePromoCodesPage {
  promoCodes: PromoCode[];
  hasNext: boolean;
  page: number;
}

export async function getActivePromoCodesByCourse(
  courseId: number,
  page = 1,
): Promise<ActivePromoCodesPage> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PROMO_CODES_URL}?course=${courseId}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: PromoCodesResponse = await response.json();
  return {
    promoCodes: data['promo-codes'].filter(isActive),
    hasNext: data.meta.has_next,
    page: data.meta.page,
  };
}

export interface CreatePromoCodeParams {
  courseId: number;
  name: string;
  discount: number;
  isPercentDiscount?: boolean;
  description?: string;
  limitPerUser?: number;
  startDate?: string;
  expireDate?: string;
}

export async function createPromoCode(
  params: CreatePromoCodeParams,
): Promise<PromoCode> {
  const accessToken = await getAccessToken();

  const response = await fetch(PROMO_CODES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'promo-code': {
        course: params.courseId,
        name: params.name,
        discount: params.discount,
        is_percent_discount: params.isPercentDiscount ?? false,
        description: params.description,
        limit_per_user: params.limitPerUser,
        start_date: params.startDate,
        expire_date: params.expireDate,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: PromoCodesResponse = await response.json();
  return data['promo-codes'][0];
}
