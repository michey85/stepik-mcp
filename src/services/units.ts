import { getAccessToken } from './auth.js';

const UNITS_URL = 'https://stepik.org/api/units';

export interface Unit {
  id: number;
  section: number;
  lesson: number;
  position: number;
}

interface UnitsResponse {
  units: Unit[];
}

export interface CreateUnitParams {
  sectionId: number;
  lessonId: number;
  position: number;
}

export interface UpdateUnitParams {
  unitId: number;
  sectionId?: number;
  lessonId?: number;
  position?: number;
}

export async function getUnits(unitIds: number[]): Promise<Unit[]> {
  if (unitIds.length === 0) return [];

  const accessToken = await getAccessToken();
  const queryParams = unitIds.map((id) => `ids[]=${id}`).join('&');

  const response = await fetch(`${UNITS_URL}?${queryParams}`, {
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

  const data: UnitsResponse = await response.json();
  return data.units;
}

async function fetchUnit(unitId: number): Promise<Unit> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${UNITS_URL}/${unitId}`, {
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

  const data: UnitsResponse = await response.json();
  const unit = data.units[0];
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`);
  }
  return unit;
}

export async function createUnit(params: CreateUnitParams): Promise<Unit> {
  const accessToken = await getAccessToken();

  const response = await fetch(UNITS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      unit: {
        section: params.sectionId,
        lesson: params.lessonId,
        position: params.position,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: UnitsResponse = await response.json();
  return data.units[0];
}

export async function updateUnit(params: UpdateUnitParams): Promise<Unit> {
  const current = await fetchUnit(params.unitId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${UNITS_URL}/${params.unitId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      unit: {
        section: params.sectionId ?? current.section,
        lesson: params.lessonId ?? current.lesson,
        position: params.position ?? current.position,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: UnitsResponse = await response.json();
  return data.units[0];
}
