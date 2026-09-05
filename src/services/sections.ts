import { getAccessToken } from './auth.js';
import { fetchAllByIds } from './stepikApi.js';

const SECTIONS_URL = 'https://stepik.org/api/sections';

export interface Section {
  id: number;
  course: number;
  title: string;
  position: number;
  units: number[];
  description: string;
  required_percent: number;
  is_exam: boolean;
  exam_duration_minutes: number;
  random_exam_problems_count: number;
}

interface SectionsResponse {
  sections: Section[];
}

export async function getSections(sectionIds: number[]): Promise<Section[]> {
  return fetchAllByIds<'sections', Section>(
    SECTIONS_URL,
    'sections',
    sectionIds,
  );
}

export interface CreateSectionParams {
  courseId: number;
  title: string;
  position: number;
  description?: string;
}

export interface UpdateSectionParams {
  sectionId: number;
  title?: string;
  position?: number;
  description?: string;
}

async function fetchSection(sectionId: number): Promise<Section> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${SECTIONS_URL}/${sectionId}`, {
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

  const data: SectionsResponse = await response.json();
  const section = data.sections[0];
  if (!section) {
    throw new Error(`Section ${sectionId} not found`);
  }
  return section;
}

export async function createSection(
  params: CreateSectionParams,
): Promise<Section> {
  const accessToken = await getAccessToken();

  const response = await fetch(SECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      section: {
        course: params.courseId,
        title: params.title,
        position: params.position,
        description: params.description ?? '',
        required_percent: 100,
        exam_duration_minutes: 60,
        random_exam_problems_count: 20,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: SectionsResponse = await response.json();
  return data.sections[0];
}

export async function updateSection(
  params: UpdateSectionParams,
): Promise<Section> {
  const current = await fetchSection(params.sectionId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${SECTIONS_URL}/${params.sectionId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      section: {
        course: current.course,
        title: params.title ?? current.title,
        position: params.position ?? current.position,
        description: params.description ?? current.description,
        required_percent: current.required_percent,
        is_exam: current.is_exam,
        exam_duration_minutes: current.exam_duration_minutes,
        random_exam_problems_count: current.random_exam_problems_count,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: SectionsResponse = await response.json();
  return data.sections[0];
}
