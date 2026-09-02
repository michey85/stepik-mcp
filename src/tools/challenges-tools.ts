import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createCodeStep,
  createHtmlCssStep,
  updateCodeStep,
  updateHtmlCssStep,
} from '../services/stepSources.js';
import { htmlCssChecklistItemSchema } from '../helpers/htmlCssTask.js';

export default function registerChallengesTools(server: McpServer) {
  server.registerTool(
    'addHtmlCssTask',
    {
      description:
        'Add a new "Задача на HTML и CSS" (interactive HTML/CSS layout exercise) step to a Stepik lesson. ' +
        "Checks run client-side in the browser against the student's HTML/CSS, driven by a checklist of DOM-selector-based tests.",
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The task statement (HTML allowed)'),
        htmlTemplate: z
          .string()
          .describe('Starting HTML shown to the student in the editor'),
        cssTemplate: z
          .string()
          .optional()
          .describe('Starting CSS shown to the student in the editor'),
        checklist: z
          .array(htmlCssChecklistItemSchema)
          .min(1)
          .describe('The checklist of sub-tasks the student must complete'),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step (default: 1)'),
      },
    },
    async ({
      lessonId,
      position,
      question,
      htmlTemplate,
      cssTemplate,
      checklist,
      points,
    }) => {
      const step = await createHtmlCssStep({
        lessonId,
        position,
        question,
        htmlTemplate,
        cssTemplate,
        checklist,
        points,
      });
      return {
        content: [
          {
            text: `HTML/CSS task created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateHtmlCssTask',
    {
      description:
        'Update an existing "Задача на HTML и CSS" step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z
          .number()
          .describe('The ID of the HTML/CSS task step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z
          .string()
          .optional()
          .describe('The task statement (HTML allowed)'),
        htmlTemplate: z
          .string()
          .optional()
          .describe('Starting HTML shown to the student in the editor'),
        cssTemplate: z
          .string()
          .optional()
          .describe('Starting CSS shown to the student in the editor'),
        checklist: z
          .array(htmlCssChecklistItemSchema)
          .min(1)
          .optional()
          .describe(
            'The full checklist of sub-tasks (replaces the existing checklist)',
          ),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step'),
      },
    },
    async ({
      stepId,
      position,
      question,
      htmlTemplate,
      cssTemplate,
      checklist,
      points,
    }) => {
      const step = await updateHtmlCssStep({
        stepId,
        position,
        question,
        htmlTemplate,
        cssTemplate,
        checklist,
        points,
      });
      return {
        content: [
          {
            text: `HTML/CSS task ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'addProgrammingTask',
    {
      description:
        'Add a new programming (code challenge) step to a Stepik lesson',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The task statement (HTML allowed)'),
        checkerCode: z
          .string()
          .describe(
            'Python checker script defining generate()/check()/solve() (or just check(), for simple test-case-based checking) used to validate submissions',
          ),
        testCases: z
          .array(
            z.object({
              input: z.string().describe('Sample input fed to the solution'),
              output: z.string().describe('Expected output for this input'),
            }),
          )
          .min(1)
          .describe('Sample test cases shown to the student'),
        executionTimeLimit: z
          .number()
          .optional()
          .describe('Execution time limit in seconds (default: 5)'),
        executionMemoryLimit: z
          .number()
          .optional()
          .describe('Execution memory limit in MB (default: 256)'),
        samplesCount: z
          .number()
          .optional()
          .describe(
            'Number of generated samples used for grading (default: 1)',
          ),
        templates: z
          .array(
            z.object({
              language: z
                .string()
                .describe('Language identifier, e.g. "javascript", "python3"'),
              header: z
                .string()
                .optional()
                .describe('Read-only code shown before the editable stub'),
              code: z.string().optional().describe('Editable code stub'),
              footer: z
                .string()
                .optional()
                .describe('Read-only code shown after the editable stub'),
            }),
          )
          .optional()
          .describe('Optional per-language code templates for the student'),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step (default: 1)'),
      },
    },
    async ({
      lessonId,
      position,
      question,
      checkerCode,
      testCases,
      executionTimeLimit,
      executionMemoryLimit,
      samplesCount,
      templates,
      points,
    }) => {
      const step = await createCodeStep({
        lessonId,
        position,
        question,
        checkerCode,
        testCases,
        executionTimeLimit,
        executionMemoryLimit,
        samplesCount,
        templates,
        points,
      });
      return {
        content: [
          {
            text: `Programming task created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateProgrammingTask',
    {
      description:
        'Update an existing programming (code challenge) step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z
          .number()
          .describe('The ID of the programming task step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z
          .string()
          .optional()
          .describe('The task statement (HTML allowed)'),
        checkerCode: z
          .string()
          .optional()
          .describe(
            'Python checker script defining generate()/check()/solve() (or just check(), for simple test-case-based checking) used to validate submissions',
          ),
        testCases: z
          .array(
            z.object({
              input: z.string().describe('Sample input fed to the solution'),
              output: z.string().describe('Expected output for this input'),
            }),
          )
          .min(1)
          .optional()
          .describe(
            'The full list of sample test cases (replaces all existing test cases)',
          ),
        executionTimeLimit: z
          .number()
          .optional()
          .describe('Execution time limit in seconds'),
        executionMemoryLimit: z
          .number()
          .optional()
          .describe('Execution memory limit in MB'),
        samplesCount: z
          .number()
          .optional()
          .describe('Number of generated samples used for grading'),
        templates: z
          .array(
            z.object({
              language: z
                .string()
                .describe('Language identifier, e.g. "javascript", "python3"'),
              header: z
                .string()
                .optional()
                .describe('Read-only code shown before the editable stub'),
              code: z.string().optional().describe('Editable code stub'),
              footer: z
                .string()
                .optional()
                .describe('Read-only code shown after the editable stub'),
            }),
          )
          .optional()
          .describe(
            'The full list of per-language code templates (replaces all existing templates)',
          ),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step'),
      },
    },
    async ({
      stepId,
      position,
      question,
      checkerCode,
      testCases,
      executionTimeLimit,
      executionMemoryLimit,
      samplesCount,
      templates,
      points,
    }) => {
      const step = await updateCodeStep({
        stepId,
        position,
        question,
        checkerCode,
        testCases,
        executionTimeLimit,
        executionMemoryLimit,
        samplesCount,
        templates,
        points,
      });
      return {
        content: [
          {
            text: `Programming task ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
