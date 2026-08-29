import { getAccessToken } from './auth.js';

const COURSES_URL = 'https://stepik.org/api/courses';
const PROGRESSES_URL = 'https://stepik.org/api/progresses';

interface Course {
  id: number;
  title: string;
  last_step: string;
  certificate_regular_threshold: number;
  certificate_distinction_threshold: number;
}

interface CoursesResponse {
  courses: Course[];
}

interface Progress {
  id: string;
  cost: number;
}

interface ProgressesResponse {
  progresses: Progress[];
}

export interface CertificatePoints {
  regularThreshold: number;
  distinctionThreshold: number;
  maxPoints: number;
}

async function fetchCourse(courseId: number): Promise<Course> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${COURSES_URL}?ids[]=${courseId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: CoursesResponse = await response.json();
  const course = data.courses[0];
  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }
  return course;
}

async function fetchMaxPoints(lastStep: string): Promise<number> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PROGRESSES_URL}/${lastStep}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ProgressesResponse = await response.json();
  const progress = data.progresses[0];
  if (!progress) {
    throw new Error(`Progress ${lastStep} not found`);
  }
  return progress.cost;
}

export async function getCertificatePoints(
  courseId: number,
): Promise<CertificatePoints> {
  const course = await fetchCourse(courseId);
  const maxPoints = await fetchMaxPoints(course.last_step);

  return {
    regularThreshold: course.certificate_regular_threshold,
    distinctionThreshold: course.certificate_distinction_threshold,
    maxPoints,
  };
}

export interface UpdateCertificatePointsParams {
  regularThreshold?: number;
  distinctionThreshold?: number;
}

export async function updateCertificatePoints(
  courseId: number,
  params: UpdateCertificatePointsParams = {},
): Promise<CertificatePoints> {
  const course = await fetchCourse(courseId);
  const maxPoints = await fetchMaxPoints(course.last_step);

  const distinctionThreshold = params.distinctionThreshold ?? maxPoints - 3;
  const regularThreshold = params.regularThreshold ?? maxPoints - 10;

  const accessToken = await getAccessToken();

  const response = await fetch(`${COURSES_URL}/${courseId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      course: {
        title: course.title,
        certificate_regular_threshold: regularThreshold,
        certificate_distinction_threshold: distinctionThreshold,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  return { regularThreshold, distinctionThreshold, maxPoints };
}
