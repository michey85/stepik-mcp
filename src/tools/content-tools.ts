import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { getLessonContent, getStepContent } from '../services/lessons.js';
import { getCourse, updateCourseDescription } from '../services/courses.js';
import { loadCourses } from '../constants/courses.js';

export default function registerContentTools(server: McpServer) {
  server.registerTool(
    'getCourseList',
    {
      description: 'Get the list of all my courses with ID and names',
      inputSchema: {},
    },
    async () => {
      const courses = loadCourses();
      return {
        content: courses.map((c) => ({
          text: `${c.id}: ${c.title}`,
          type: 'text',
        })),
      };
    },
  );

  server.registerTool(
    'getCourseDescription',
    {
      description:
        "Get a Stepik course's description, summary, requirements, and workload (as stored on Stepik, HTML formatted).",
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
      },
    },
    async ({ courseId }) => {
      const course = await getCourse(courseId);
      return {
        content: [
          {
            text:
              `${course.title} (course ${course.id})\n\n` +
              `Summary:\n${course.summary || '(none)'}\n\n` +
              `Description:\n${course.description || '(none)'}\n\n` +
              `Requirements:\n${course.requirements || '(none)'}\n\n` +
              `Workload: ${course.workload || '(none)'}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateCourseDescription',
    {
      description:
        "Update a Stepik course's description, summary, requirements, and/or workload. Only the provided fields are changed; content should be HTML-formatted, as stored on Stepik.",
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        description: z.string().optional().describe('New description (HTML)'),
        summary: z.string().optional().describe('New summary (HTML)'),
        requirements: z.string().optional().describe('New requirements (HTML)'),
        workload: z
          .string()
          .optional()
          .describe('New workload, e.g. "3-5 часов"'),
      },
    },
    async ({ courseId, description, summary, requirements, workload }) => {
      const course = await updateCourseDescription(courseId, {
        description,
        summary,
        requirements,
        workload,
      });
      return {
        content: [
          {
            text: `Course ${course.id} ("${course.title}") updated.`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'getLessonContent',
    {
      description:
        'Get the content (title and step texts) of a Stepik lesson by its ID. Optionally filter to a single step by its step ID.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        stepId: z
          .number()
          .optional()
          .describe('Optional step ID to get content for only that step'),
      },
    },
    async ({ lessonId, stepId }) => {
      const lesson = await getLessonContent(lessonId, stepId);
      return {
        content: [
          {
            text: `${lesson.title} (${lesson.url})\n\n${lesson.steps
              .map(
                (s) =>
                  `Step ${s.id} (position ${s.position}) [${s.type}]: ${s.text}`,
              )
              .join('\n\n')}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'getStepContent',
    {
      description:
        'Get the content of a single Stepik lesson step by its step ID',
      inputSchema: {
        stepId: z.number().describe('The ID of the step'),
      },
    },
    async ({ stepId }) => {
      const step = await getStepContent(stepId);
      return {
        content: [
          {
            text: `Step ${step.id} (position ${step.position}) [${step.type}]: ${step.text}`,
            type: 'text',
          },
        ],
      };
    },
  );
}
