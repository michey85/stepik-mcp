import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { createTextStep, updateTextStep } from '../services/stepSources.js';

export default function registerTextTools(server: McpServer) {
  server.registerTool(
    'addTextStep',
    {
      description:
        'Add a new "text" (theory) step to a Stepik lesson. Text steps just display HTML content and are not graded.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        position: z
          .number()
          .describe('Position of the step within the lesson'),
        text: z.string().describe('The HTML content of the step'),
      },
    },
    async ({ lessonId, position, text }) => {
      const step = await createTextStep({ lessonId, position, text });
      return {
        content: [
          {
            text: `Text step created with id ${step.id} at position ${step.position} in lesson ${step.lesson}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateTextStep',
    {
      description:
        'Update an existing "text" (theory) step. Only the provided fields are changed; everything else is left as-is.',
      inputSchema: {
        stepId: z.number().describe('The ID of the text step to update'),
        position: z
          .number()
          .optional()
          .describe('New position of the step within the lesson'),
        text: z.string().optional().describe('The HTML content of the step'),
      },
    },
    async ({ stepId, position, text }) => {
      const step = await updateTextStep({ stepId, position, text });
      return {
        content: [
          {
            text: `Text step ${step.id} updated (position ${step.position} in lesson ${step.lesson})`,
            type: 'text',
          },
        ],
      };
    },
  );
}
