import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createFillBlanksStep,
  updateFillBlanksStep,
} from '../services/stepSources.js';

const componentSchema = z.object({
  type: z
    .enum(['text', 'input', 'select'])
    .describe(
      '"text" is plain non-blank content; "input" is a free-text blank checked against options; "select" is a dropdown blank checked against options',
    ),
  text: z
    .string()
    .optional()
    .describe('Text content, only used for "text" components'),
  options: z
    .array(
      z.object({
        text: z.string().describe('Option text'),
        isCorrect: z
          .boolean()
          .describe('Whether this option is a correct answer'),
      }),
    )
    .optional()
    .describe(
      'Accepted answers for "input"/"select" components; unused for "text" components',
    ),
});

export default function registerFillBlanksTools(server: McpServer) {
  server.registerTool(
    'addFillBlanksTask',
    {
      description:
        'Add a new fill-in-the-blanks step to a Stepik lesson. The step is built from an ordered list of components: "text" segments and "input"/"select" blanks, each blank carrying its accepted answers.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The step instructions/question text'),
        components: z
          .array(componentSchema)
          .min(1)
          .describe(
            'Ordered list of text segments and blanks making up the step',
          ),
        isCaseSensitive: z
          .boolean()
          .optional()
          .describe(
            'Whether input blanks are checked case-sensitively (default: false)',
          ),
        isDetailedFeedback: z
          .boolean()
          .optional()
          .describe('Whether to show per-blank feedback (default: false)'),
        isPartiallyCorrect: z
          .boolean()
          .optional()
          .describe(
            'Whether partial credit is awarded for partially correct answers (default: false)',
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
      components,
      isCaseSensitive,
      isDetailedFeedback,
      isPartiallyCorrect,
      points,
    }) => {
      const step = await createFillBlanksStep({
        lessonId,
        position,
        question,
        components,
        isCaseSensitive,
        isDetailedFeedback,
        isPartiallyCorrect,
        points,
      });
      return {
        content: [
          {
            text: `Fill-in-the-blanks step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateFillBlanksTask',
    {
      description:
        'Update an existing fill-in-the-blanks step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z
          .number()
          .describe('The ID of the fill-in-the-blanks step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z
          .string()
          .optional()
          .describe('The step instructions/question text'),
        components: z
          .array(componentSchema)
          .min(1)
          .optional()
          .describe(
            'The full ordered list of text segments and blanks (replaces all existing components)',
          ),
        isCaseSensitive: z
          .boolean()
          .optional()
          .describe('Whether input blanks are checked case-sensitively'),
        isDetailedFeedback: z
          .boolean()
          .optional()
          .describe('Whether to show per-blank feedback'),
        isPartiallyCorrect: z
          .boolean()
          .optional()
          .describe(
            'Whether partial credit is awarded for partially correct answers',
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
      components,
      isCaseSensitive,
      isDetailedFeedback,
      isPartiallyCorrect,
      points,
    }) => {
      const step = await updateFillBlanksStep({
        stepId,
        position,
        question,
        components,
        isCaseSensitive,
        isDetailedFeedback,
        isPartiallyCorrect,
        points,
      });
      return {
        content: [
          {
            text: `Fill-in-the-blanks step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
