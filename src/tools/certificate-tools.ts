import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  getCertificatePoints,
  updateCertificatePoints,
} from '../services/certificates.js';

export default function registerCertificateTools(server: McpServer) {
  server.registerTool(
    'getCertificatePoints',
    {
      description:
        'Get the current certificate point thresholds (regular and distinction) for a course, along with the maximum possible points in the course',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
      },
    },
    async ({ courseId }) => {
      const points = await getCertificatePoints(courseId);
      return {
        content: [
          {
            text: `Max points: ${points.maxPoints}. Regular certificate threshold: ${points.regularThreshold}. Distinction certificate threshold: ${points.distinctionThreshold}.`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateCertificatePoints',
    {
      description:
        "Update a course's certificate point thresholds. Defaults to values based on the course's maximum possible points (distinction = max points - 3, regular = max points - 10); pass regularThreshold and/or distinctionThreshold to override either one explicitly.",
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        regularThreshold: z
          .number()
          .optional()
          .describe(
            'Optional regular certificate threshold (default: max points - 10)',
          ),
        distinctionThreshold: z
          .number()
          .optional()
          .describe(
            'Optional distinction certificate threshold (default: max points - 3)',
          ),
      },
    },
    async ({ courseId, regularThreshold, distinctionThreshold }) => {
      const points = await updateCertificatePoints(courseId, {
        regularThreshold,
        distinctionThreshold,
      });
      return {
        content: [
          {
            text: `Updated. Max points: ${points.maxPoints}. Regular certificate threshold: ${points.regularThreshold}. Distinction certificate threshold: ${points.distinctionThreshold}.`,
            type: 'text',
          },
        ],
      };
    },
  );
}
