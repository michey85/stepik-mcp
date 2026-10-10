import { getAccessToken } from './auth.js';

/**
 * Stepik answers with a 5xx when an `ids[]=...` query string gets long
 * (empirically ~3.5 KB of URL, i.e. a couple of hundred ids), so request the ids
 * in batches. `meta.has_next` is followed too, in case a batch is ever paginated.
 */
const BATCH_SIZE = 100;

type PaginatedResponse<K extends string, T> = Record<K, T[]> & {
  meta?: { has_next?: boolean };
};

export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
}

export async function assertOk(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }
}

/**
 * Follows `meta.has_next` from page 1. Stops on an empty page too, since some
 * filtered Stepik endpoints keep reporting `has_next` with no items left.
 */
export async function fetchAllPages<K extends string, T>(
  url: string,
  key: K,
  accessToken: string,
): Promise<T[]> {
  const separator = url.includes('?') ? '&' : '?';
  const result: T[] = [];

  for (let page = 1; ; page += 1) {
    const response = await fetch(`${url}${separator}page=${page}`, {
      headers: authHeaders(accessToken),
    });
    await assertOk(response);

    const data: PaginatedResponse<K, T> = await response.json();
    const items = data[key] ?? [];
    result.push(...items);
    if (items.length === 0 || data.meta?.has_next !== true) break;
  }

  return result;
}

export async function fetchAllByIds<K extends string, T>(
  url: string,
  key: K,
  ids: number[],
): Promise<T[]> {
  if (ids.length === 0) return [];

  const accessToken = await getAccessToken();
  const result: T[] = [];

  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    const chunk = ids.slice(offset, offset + BATCH_SIZE);
    const queryParams = chunk.map((id) => `ids[]=${id}`).join('&');
    result.push(
      ...(await fetchAllPages<K, T>(`${url}?${queryParams}`, key, accessToken)),
    );
  }

  return result;
}
