import { getAccessToken } from './auth.js';

const COURSES_URL = 'https://stepik.org/api/courses';

export interface Course {
  id: number;
  title: string;
  sections: number[];
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
