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

    let page = 1;
    let hasNext = true;
    while (hasNext) {
      const response = await fetch(`${url}?${queryParams}&page=${page}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} ${await response.text()}`,
        );
      }

      const data: PaginatedResponse<K, T> = await response.json();
      result.push(...data[key]);
      hasNext = data.meta?.has_next === true;
      page += 1;
    }
  }

  return result;
}
