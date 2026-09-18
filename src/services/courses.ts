import { getAccessToken } from './auth.js';

const COURSES_URL = 'https://stepik.org/api/courses';

export interface Course {
  id: number;
  title: string;
  language: string;
  sections: number[];
  description: string;
  summary: string;
  requirements: string;
  workload: string;
}

interface CoursesResponse {
  courses: Course[];
}

export async function getCourse(courseId: number): Promise<Course> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${COURSES_URL}/${courseId}`, {
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

  const data: CoursesResponse = await response.json();
  const course = data.courses[0];
  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }
  return course;
}

export interface UpdateCourseDescriptionParams {
  description?: string;
  summary?: string;
  requirements?: string;
  workload?: string;
}

export async function updateCourseDescription(
  courseId: number,
  params: UpdateCourseDescriptionParams,
): Promise<Course> {
  const course = await getCourse(courseId);
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
        language: course.language,
        description: params.description ?? course.description,
        summary: params.summary ?? course.summary,
        requirements: params.requirements ?? course.requirements,
        workload: params.workload ?? course.workload,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: CoursesResponse = await response.json();
  const updated = data.courses[0];
  if (!updated) {
    throw new Error(`Course ${courseId} not found`);
  }
  return updated;
}
