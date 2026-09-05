import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { createLesson, updateLesson } from '../services/lessons.js';
import { createSection, updateSection } from '../services/sections.js';
import { createUnit, updateUnit } from '../services/units.js';
import { getCourseStructure } from '../services/courseStructure.js';

export default function registerCourseStructureTools(server: McpServer) {
  server.registerTool(
    'getCourseStructure',
    {
      description:
        'Get the full structure of a Stepik course: its sections and, within each section, the lessons placed there as units — with ids and positions. ' +
        'Use this before addSection/addLesson/addUnit to see existing positions and pick the right place to insert new content.',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
      },
    },
    async ({ courseId }) => {
      const structure = await getCourseStructure(courseId);
      const text = `${structure.title} (course ${structure.courseId})\n\n${structure.sections
        .map(
          (section) =>
            `Section ${section.sectionId} (position ${section.position}): "${section.title}"\n${
              section.units.length === 0
                ? '  (no lessons)'
                : section.units
                    .map(
                      (unit) =>
                        `  unit ${unit.unitId}, position ${unit.position}: lesson ${unit.lessonId} "${unit.lessonTitle}"`,
                    )
                    .join('\n')
            }`,
        )
        .join('\n\n')}`;
      return {
        content: [{ text, type: 'text' }],
      };
    },
  );

  server.registerTool(
    'addLesson',
    {
      description:
        'Create a new (standalone) Stepik lesson. The lesson is not attached to any course until it is placed into a section with addUnit.',
      inputSchema: {
        title: z.string().describe('The title of the lesson'),
        language: z
          .string()
          .optional()
          .describe('Language code, e.g. "ru", "en" (default: "ru")'),
        isPublic: z
          .boolean()
          .optional()
          .describe('Whether the lesson is public (default: true)'),
      },
    },
    async ({ title, language, isPublic }) => {
      const lesson = await createLesson({ title, language, isPublic });
      return {
        content: [
          {
            text: `Lesson created with id ${lesson.id}: "${lesson.title}" (${lesson.canonical_url})`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateLesson',
    {
      description:
        "Update an existing Stepik lesson's title, language, or visibility. Only the provided fields are changed.",
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson to update'),
        title: z.string().optional().describe('New title of the lesson'),
        language: z
          .string()
          .optional()
          .describe('New language code, e.g. "ru", "en"'),
        isPublic: z
          .boolean()
          .optional()
          .describe('Whether the lesson is public'),
      },
    },
    async ({ lessonId, title, language, isPublic }) => {
      const lesson = await updateLesson({
        lessonId,
        title,
        language,
        isPublic,
      });
      return {
        content: [
          {
            text: `Lesson ${lesson.id} updated: "${lesson.title}"`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'addSection',
    {
      description: 'Create a new section (chapter) within a Stepik course.',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        title: z.string().describe('The title of the section'),
        position: z.number().describe('Position of the section in the course'),
        description: z
          .string()
          .optional()
          .describe('Optional section description'),
      },
    },
    async ({ courseId, title, position, description }) => {
      const section = await createSection({
        courseId,
        title,
        position,
        description,
      });
      return {
        content: [
          {
            text: `Section created with id ${section.id}: "${section.title}" at position ${section.position} in course ${section.course}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateSection',
    {
      description:
        "Update an existing section's title, position, or description. Only the provided fields are changed.",
      inputSchema: {
        sectionId: z.number().describe('The ID of the section to update'),
        title: z.string().optional().describe('New title of the section'),
        position: z
          .number()
          .optional()
          .describe('New position of the section in the course'),
        description: z.string().optional().describe('New section description'),
      },
    },
    async ({ sectionId, title, position, description }) => {
      const section = await updateSection({
        sectionId,
        title,
        position,
        description,
      });
      return {
        content: [
          {
            text: `Section ${section.id} updated: "${section.title}" (position ${section.position})`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'addUnit',
    {
      description:
        'Place an existing lesson into an existing section at a given position (this is what makes a lesson appear in a course).',
      inputSchema: {
        sectionId: z.number().describe('The ID of the section'),
        lessonId: z.number().describe('The ID of the lesson to place'),
        position: z
          .number()
          .describe('Position of the lesson within the section'),
      },
    },
    async ({ sectionId, lessonId, position }) => {
      const unit = await createUnit({ sectionId, lessonId, position });
      return {
        content: [
          {
            text: `Unit created with id ${unit.id}: lesson ${unit.lesson} placed in section ${unit.section} at position ${unit.position}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateUnit',
    {
      description:
        'Move a lesson to a different section or position (or re-point it to a different lesson). Only the provided fields are changed.',
      inputSchema: {
        unitId: z.number().describe('The ID of the unit to update'),
        sectionId: z.number().optional().describe('New section ID'),
        lessonId: z.number().optional().describe('New lesson ID'),
        position: z.number().optional().describe('New position'),
      },
    },
    async ({ unitId, sectionId, lessonId, position }) => {
      const unit = await updateUnit({
        unitId,
        sectionId,
        lessonId,
        position,
      });
      return {
        content: [
          {
            text: `Unit ${unit.id} updated: lesson ${unit.lesson} in section ${unit.section} at position ${unit.position}`,
            type: 'text',
          },
        ],
      };
    },
  );
}
