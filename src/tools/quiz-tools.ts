import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { createChoiceStep, updateChoiceStep } from '../services/stepSources.js';

export default function registerQuizTools(server: McpServer) {
  server.registerTool(
    'addMultipleChoiceQuiz',
    {
      description:
        'Add a new multiple-choice (or single-choice) quiz step to a Stepik lesson',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The quiz question text'),
        options: z
          .array(
            z.object({
              text: z.string().describe('Option text'),
              isCorrect: z.boolean().describe('Whether this option is correct'),
              feedback: z
                .string()
                .optional()
                .describe('Optional feedback shown when this option is picked'),
            }),
          )
          .min(2)
          .describe('The list of answer options'),
        isMultipleChoice: z
          .boolean()
          .optional()
          .describe(
            'Whether multiple options can be selected (default: false, i.e. single choice)',
          ),
        isOptionsFeedback: z
          .boolean()
          .optional()
          .describe('Whether to show per-option feedback (default: false)'),
        feedbackCorrect: z
          .string()
          .optional()
          .describe('Optional feedback shown on a correct submission'),
        feedbackWrong: z
          .string()
          .optional()
          .describe('Optional feedback shown on a wrong submission'),
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
      isMultipleChoice,
      isOptionsFeedback,
      feedbackCorrect,
      feedbackWrong,
      points,
    }) => {
      const step = await createChoiceStep({
        lessonId,
        position,
        question,
        options,
        isMultipleChoice,
        isOptionsFeedback,
        feedbackCorrect,
        feedbackWrong,
        points,
      });
      return {
        content: [
          {
            text: `Quiz step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateMultipleChoiceQuiz',
    {
      description:
        'Update an existing multiple-choice (or single-choice) quiz step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z.number().describe('The ID of the quiz step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z.string().optional().describe('The quiz question text'),
        options: z
          .array(
            z.object({
              text: z.string().describe('Option text'),
              isCorrect: z.boolean().describe('Whether this option is correct'),
              feedback: z
                .string()
                .optional()
                .describe('Optional feedback shown when this option is picked'),
            }),
          )
          .min(2)
          .optional()
          .describe(
            'The full list of answer options (replaces all existing options)',
          ),
        isMultipleChoice: z
          .boolean()
          .optional()
          .describe('Whether multiple options can be selected'),
        isOptionsFeedback: z
          .boolean()
          .optional()
          .describe('Whether to show per-option feedback'),
        feedbackCorrect: z
          .string()
          .optional()
          .describe('Feedback shown on a correct submission'),
        feedbackWrong: z
          .string()
          .optional()
          .describe('Feedback shown on a wrong submission'),
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
      options,
      isMultipleChoice,
      isOptionsFeedback,
      feedbackCorrect,
      feedbackWrong,
      points,
    }) => {
      const step = await updateChoiceStep({
        stepId,
        position,
        question,
        options,
        isMultipleChoice,
        isOptionsFeedback,
        feedbackCorrect,
        feedbackWrong,
        points,
      });
      return {
        content: [
          {
            text: `Quiz step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
