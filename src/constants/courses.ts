export interface StepikCourse {
  id: number;
  title: string;
  isPackage?: boolean;
}

function loadCourses(): readonly StepikCourse[] {
  const raw = process.env.STEPIK_COURSES;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('STEPIK_COURSES must be a JSON array');
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse STEPIK_COURSES env var as JSON: ${(error as Error).message}`,
    );
  }
}

export const COURSES: readonly StepikCourse[] = loadCourses();

export const courseNames: { [key: string]: string } = Object.fromEntries(
  COURSES.map((c) => [c.id, c.title]),
);
