import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createExternalGraderStep,
  updateExternalGraderStep,
} from '../services/stepSources/externalGrader.js';

const taskTypeSchema = z.enum(['javascript', 'nodejs', 'react']);

const filesSchema = z.array(
  z.object({
    label: z
      .string()
      .describe('Label shown to the student above the upload field'),
    filename: z
      .string()
      .describe('File name the grader expects, e.g. main.jsx'),
  }),
);

export default function registerExternalGraderTools(server: McpServer) {
  server.registerTool(
    'addExternalGraderTask',
    {
      description:
        'Add a new external grader step ("Внешний грейдер") to a Stepik lesson. The submission goes to an XQueue queue, and the grader picks the tests by grader_payload { task_type, task_id }. By default the student types code into an editor (seeded with `template`); pass `files` to make the student upload files instead (the first file must be the entry file).',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The task statement (HTML)'),
        queueName: z
          .string()
          .describe(
            'XQueue queue name the grader listens to, e.g. course114165',
          ),
        taskType: taskTypeSchema.describe('grader_payload.task_type'),
        taskId: z
          .string()
          .describe('grader_payload.task_id, e.g. js_closure_01'),
        language: z
          .string()
          .optional()
          .describe(
            'Editor language (default: "react" for react tasks, "javascript" otherwise)',
          ),
        template: z
          .string()
          .optional()
          .describe(
            'Starter code in the editor (editor mode only, default: empty)',
          ),
        files: filesSchema
          .optional()
          .describe(
            'Files the student must upload; switches the step to upload mode',
          ),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step (default: 1)'),
      },
    },
    async (params) => {
      const step = await createExternalGraderStep(params);
      return {
        content: [
          {
            text: `External grader step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateExternalGraderTask',
    {
      description:
        'Update an existing external grader step. Only the provided fields are changed; everything else (including extra grader_payload keys) is left as-is. Pass `files` to switch to upload mode, or an empty `files` array to switch back to editor mode.',
      inputSchema: {
        stepId: z
          .number()
          .describe('The ID of the external grader step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z.string().optional().describe('The task statement (HTML)'),
        queueName: z.string().optional().describe('XQueue queue name'),
        taskType: taskTypeSchema
          .optional()
          .describe('grader_payload.task_type'),
        taskId: z.string().optional().describe('grader_payload.task_id'),
        language: z
          .string()
          .optional()
          .describe(
            'Editor language (if omitted but taskType is given, derived from it)',
          ),
        template: z
          .string()
          .optional()
          .describe('Starter code in the editor (editor mode only)'),
        files: filesSchema
          .optional()
          .describe(
            'Full list of files to upload (replaces existing); empty array switches to editor mode',
          ),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step'),
      },
    },
    async (params) => {
      const step = await updateExternalGraderStep(params);
      return {
        content: [
          {
            text: `External grader step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
