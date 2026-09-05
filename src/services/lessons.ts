import { getAccessToken } from './auth.js';
import { toPlain } from '../helpers/html.js';

const LESSONS_URL = 'https://stepik.org/api/lessons';
const STEPS_URL = 'https://stepik.org/api/steps';

export interface Lesson {
  id: number;
  steps: number[];
  title: string;
  canonical_url: string;
  language: string;
  is_public: boolean;
}

interface LessonsResponse {
  lessons: Lesson[];
}

export interface CreateLessonParams {
  title: string;
  language?: string;
  isPublic?: boolean;
}

export interface UpdateLessonParams {
  lessonId: number;
  title?: string;
  language?: string;
  isPublic?: boolean;
}

export interface Block {
  name: string;
  text?: string;
  video?: any;
  options?: any;
}

export interface Step {
  id: number;
  lesson: number;
  position: number;
  block: Block;
}

interface StepsResponse {
  steps: Step[];
}

export interface LessonContent {
  id: number;
  title: string;
  url: string;
  steps: {
    id: number;
    position: number;
    type: string;
    text: string;
  }[];
}

export async function getLesson(lessonId: number): Promise<Lesson> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${LESSONS_URL}/${lessonId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: LessonsResponse = await response.json();
  const lesson = data.lessons[0];
  if (!lesson) {
    throw new Error(`Lesson ${lessonId} not found`);
  }
  return lesson;
}

export async function getLessons(lessonIds: number[]): Promise<Lesson[]> {
  if (lessonIds.length === 0) return [];

  const accessToken = await getAccessToken();
  const queryParams = lessonIds.map((id) => `ids[]=${id}`).join('&');

  const response = await fetch(`${LESSONS_URL}?${queryParams}`, {
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

  const data: LessonsResponse = await response.json();
  return data.lessons;
}

export async function createLesson(
  params: CreateLessonParams,
): Promise<Lesson> {
  const accessToken = await getAccessToken();

  const response = await fetch(LESSONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson: {
        title: params.title,
        language: params.language ?? 'ru',
        is_public: params.isPublic ?? true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: LessonsResponse = await response.json();
  return data.lessons[0];
}

export async function updateLesson(
  params: UpdateLessonParams,
): Promise<Lesson> {
  const current = await getLesson(params.lessonId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${LESSONS_URL}/${params.lessonId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson: {
        title: params.title ?? current.title,
        language: params.language ?? current.language,
        is_public: params.isPublic ?? current.is_public,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: LessonsResponse = await response.json();
  return data.lessons[0];
}

export async function getSteps(stepIds: number[]): Promise<Step[]> {
  if (stepIds.length === 0) return [];

  const accessToken = await getAccessToken();
  const queryParams = stepIds.map((id) => `ids[]=${id}`).join('&');

  const response = await fetch(`${STEPS_URL}?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: StepsResponse = await response.json();
  return data.steps;
}

export async function getStepContent(
  stepId: number,
): Promise<LessonContent['steps'][number]> {
  const steps = await getSteps([stepId]);
  const step = steps[0];
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  return {
    id: step.id,
    position: step.position,
    type: step.block.name,
    text: toPlain(step.block.text || ''),
  };
}

export async function getLessonContent(
  lessonId: number,
  stepId?: number,
): Promise<LessonContent> {
  const lesson = await getLesson(lessonId);

  if (stepId !== undefined && !lesson.steps.includes(stepId)) {
    throw new Error(`Step ${stepId} not found in lesson ${lessonId}`);
  }

  const stepIds = stepId !== undefined ? [stepId] : lesson.steps;
  const steps = await getSteps(stepIds);

  const stepsById = new Map(steps.map((s) => [s.id, s]));

  return {
    id: lesson.id,
    title: lesson.title,
    url: lesson.canonical_url,
    steps: stepIds.map((id, index) => {
      const step = stepsById.get(id);
      return {
        id,
        position: step?.position ?? index + 1,
        type: step?.block.name ?? 'unknown',
        text: toPlain(step?.block.text || ''),
      };
    }),
  };
}
