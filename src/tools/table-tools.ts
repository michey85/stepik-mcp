import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  createTableStep,
  updateTableStep,
} from '../services/stepSources/table.js';

const rowsSchema = z.array(
  z.object({
    name: z.string().describe('Row label (HTML allowed)'),
    choices: z
      .array(z.boolean())
      .describe(
        'One flag per column, in column order: true if that cell is a correct answer',
      ),
  }),
);

export default function registerTableTools(server: McpServer) {
  server.registerTool(
    'addTableTask',
    {
      description:
        'Add a new table step ("Табличная задача") to a Stepik lesson. Students tick cells in a grid of rows × columns. By default each row has exactly one correct column; set isCheckbox to allow several per row.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z.number().describe('Position of the step within the lesson'),
        question: z.string().describe('The step instructions/question text'),
        description: z
          .string()
          .describe(
            'Header of the row-label column (top-left cell), e.g. "Число:"',
          ),
        columns: z
          .array(z.string())
          .min(1)
          .describe('Column headers (HTML allowed)'),
        rows: rowsSchema.min(1).describe('Table rows with their correct cells'),
        isCheckbox: z
          .boolean()
          .optional()
          .describe(
            'Allow several correct columns per row (checkboxes instead of radio buttons; default: false)',
          ),
        isRandomizeRows: z
          .boolean()
          .optional()
          .describe('Shuffle rows for each student (default: true)'),
        isRandomizeColumns: z
          .boolean()
          .optional()
          .describe('Shuffle columns for each student (default: true)'),
        isAlwaysCorrect: z
          .boolean()
          .optional()
          .describe(
            'Accept any answer as correct, e.g. for surveys (default: false)',
          ),
        feedbackCorrect: z
          .string()
          .optional()
          .describe('Optional hint shown when the answer is correct'),
        feedbackWrong: z
          .string()
          .optional()
          .describe('Optional hint shown when the answer is wrong'),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step (default: 1)'),
      },
    },
    async (params) => {
      const step = await createTableStep(params);
      return {
        content: [
          {
            text: `Table step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateTableTask',
    {
      description:
        'Update an existing table step ("Табличная задача"). Only the provided fields are changed; everything else is left as-is. When changing columns, pass rows too so every row has one choice per column.',
      inputSchema: {
        stepId: z.number().describe('The ID of the table step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        question: z
          .string()
          .optional()
          .describe('The step instructions/question text'),
        description: z
          .string()
          .optional()
          .describe('Header of the row-label column (top-left cell)'),
        columns: z
          .array(z.string())
          .min(1)
          .optional()
          .describe('The full list of column headers (replaces all columns)'),
        rows: rowsSchema
          .min(1)
          .optional()
          .describe('The full list of rows (replaces all rows)'),
        isCheckbox: z
          .boolean()
          .optional()
          .describe('Allow several correct columns per row'),
        isRandomizeRows: z
          .boolean()
          .optional()
          .describe('Shuffle rows for each student'),
        isRandomizeColumns: z
          .boolean()
          .optional()
          .describe('Shuffle columns for each student'),
        isAlwaysCorrect: z
          .boolean()
          .optional()
          .describe('Accept any answer as correct'),
        feedbackCorrect: z
          .string()
          .optional()
          .describe('Hint shown when the answer is correct'),
        feedbackWrong: z
          .string()
          .optional()
          .describe('Hint shown when the answer is wrong'),
        points: z
          .number()
          .optional()
          .describe('Points awarded for completing the step'),
      },
    },
    async (params) => {
      const step = await updateTableStep(params);
      return {
        content: [
          {
            text: `Table step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
