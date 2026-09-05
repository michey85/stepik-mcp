import { getCourse } from './courses.js';
import { getSections } from './sections.js';
import { getUnits } from './units.js';
import { getLessons } from './lessons.js';

export interface CourseStructureUnit {
  unitId: number;
  lessonId: number;
  lessonTitle: string;
  position: number;
}

export interface CourseStructureSection {
  sectionId: number;
  title: string;
  position: number;
  units: CourseStructureUnit[];
}

export interface CourseStructure {
  courseId: number;
  title: string;
  sections: CourseStructureSection[];
}

export async function getCourseStructure(
  courseId: number,
): Promise<CourseStructure> {
  const course = await getCourse(courseId);
  const sections = await getSections(course.sections);

  const unitIds = sections.flatMap((section) => section.units);
  const units = await getUnits(unitIds);

  const lessonIds = units.map((unit) => unit.lesson);
  const lessons = await getLessons(lessonIds);
  const lessonTitleById = new Map(
    lessons.map((lesson) => [lesson.id, lesson.title]),
  );

  const unitsBySection = new Map<number, typeof units>();
  for (const unit of units) {
    const list = unitsBySection.get(unit.section) ?? [];
    list.push(unit);
    unitsBySection.set(unit.section, list);
  }

  const sortedSections = [...sections]
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      sectionId: section.id,
      title: section.title,
      position: section.position,
      units: (unitsBySection.get(section.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((unit) => ({
          unitId: unit.id,
          lessonId: unit.lesson,
          lessonTitle: lessonTitleById.get(unit.lesson) ?? '(unknown lesson)',
          position: unit.position,
        })),
    }));

  return {
    courseId: course.id,
    title: course.title,
    sections: sortedSections,
  };
}
