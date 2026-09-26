import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createSortingStep,
  updateSortingStep,
} from '../services/stepSources.js';

export default function registerSortingTools(server: McpServer) {
  server.registerTool(
    'addSortingTask',
    {
      description:
        'Add a new sorting step to a Stepik lesson. Students must arrange the items in the correct order; Stepik shuffles them automatically, so pass the items already in the correct order.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The step instructions/question text'),
        options: z
          .array(z.string())
          .min(2)
          .describe('Items to sort, listed in the correct order'),
        isHtmlEnabled: z
          .boolean()
          .optional()
          .describe('Whether item texts are rendered as HTML (default: true)'),
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
      options,
      isHtmlEnabled,
      points,
    }) => {
      const step = await createSortingStep({
        lessonId,
        position,
        question,
        options,
        isHtmlEnabled,
        points,
      });
      return {
        content: [
          {
            text: `Sorting step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateSortingTask',
    {
      description:
        'Update an existing sorting step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z.number().describe('The ID of the sorting step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z
          .string()
          .optional()
          .describe('The step instructions/question text'),
        options: z
          .array(z.string())
          .min(2)
          .optional()
          .describe(
            'The full list of items in the correct order (replaces all existing items)',
          ),
        isHtmlEnabled: z
          .boolean()
          .optional()
          .describe('Whether item texts are rendered as HTML'),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step'),
      },
    },
    async ({ stepId, position, question, options, isHtmlEnabled, points }) => {
      const step = await updateSortingStep({
        stepId,
        position,
        question,
        options,
        isHtmlEnabled,
        points,
      });
      return {
        content: [
          {
            text: `Sorting step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
