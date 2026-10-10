import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createMatchingStep,
  updateMatchingStep,
} from '../services/stepSources/matching.js';

const pairSchema = z.object({
  first: z.string().describe('Left-hand item'),
  second: z.string().describe('Right-hand item that matches it'),
});

const pairsDescription =
  'Correctly matched pairs. "first" values must be unique, and non-blank "second" values must be unique (blank "second" values may repeat).';

export default function registerMatchingTools(server: McpServer) {
  server.registerTool(
    'addMatchingTask',
    {
      description:
        'Add a new matching step to a Stepik lesson. Students must match each left-hand item with its right-hand counterpart; pass the pairs already matched correctly, Stepik shuffles the right-hand column itself.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The step instructions/question text'),
        pairs: z.array(pairSchema).min(2).describe(pairsDescription),
        preserveFirstsOrder: z
          .boolean()
          .optional()
          .describe(
            'Keep left-hand items in the given order instead of shuffling them too (default: true)',
          ),
        feedbackCorrect: z
          .string()
          .optional()
          .describe('Optional hint shown when the items are matched correctly'),
        feedbackWrong: z
          .string()
          .optional()
          .describe(
            'Optional hint shown when the items are matched incorrectly',
          ),
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
      pairs,
      preserveFirstsOrder,
      feedbackCorrect,
      feedbackWrong,
      points,
    }) => {
      const step = await createMatchingStep({
        lessonId,
        position,
        question,
        pairs,
        preserveFirstsOrder,
        feedbackCorrect,
        feedbackWrong,
        points,
      });
      return {
        content: [
          {
            text: `Matching step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateMatchingTask',
    {
      description:
        'Update an existing matching step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z.number().describe('The ID of the matching step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z
          .string()
          .optional()
          .describe('The step instructions/question text'),
        pairs: z
          .array(pairSchema)
          .min(2)
          .optional()
          .describe(
            `The full list of correctly matched pairs (replaces all existing pairs). ${pairsDescription}`,
          ),
        preserveFirstsOrder: z
          .boolean()
          .optional()
          .describe(
            'Keep left-hand items in the given order instead of shuffling them too',
          ),
        feedbackCorrect: z
          .string()
          .optional()
          .describe('Hint shown when the items are matched correctly'),
        feedbackWrong: z
          .string()
          .optional()
          .describe('Hint shown when the items are matched incorrectly'),
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
      pairs,
      preserveFirstsOrder,
      feedbackCorrect,
      feedbackWrong,
      points,
    }) => {
      const step = await updateMatchingStep({
        stepId,
        position,
        question,
        pairs,
        preserveFirstsOrder,
        feedbackCorrect,
        feedbackWrong,
        points,
      });
      return {
        content: [
          {
            text: `Matching step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
