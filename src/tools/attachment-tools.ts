import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  deleteAttachment,
  getLessonAttachments,
  uploadLessonAttachment,
} from '../services/attachments.js';

export default function registerAttachmentTools(server: McpServer) {
  server.registerTool(
    'uploadLessonFile',
    {
      description:
        'Upload a local file to a Stepik lesson as an attachment (the lesson\'s "files" block, downloadable by students). Returns the attachment id and its public URL, which can then be linked from a step\'s HTML.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
        filePath: z
          .string()
          .describe('Absolute path to the file on the local machine'),
        fileName: z
          .string()
          .optional()
          .describe(
            'File name to show on Stepik. Defaults to the base name of filePath',
          ),
      },
    },
    async ({ lessonId, filePath, fileName }) => {
      const attachment = await uploadLessonAttachment({
        lessonId,
        filePath,
        fileName,
      });
      return {
        content: [
          {
            text: JSON.stringify(attachment, null, 2),
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'getLessonFiles',
    {
      description:
        'List the files attached to a Stepik lesson: id, name, size in bytes and public URL.',
      inputSchema: {
        lessonId: z.number().describe('The ID of the lesson'),
      },
    },
    async ({ lessonId }) => {
      const attachments = await getLessonAttachments(lessonId);
      return {
        content: [
          {
            text: JSON.stringify(attachments, null, 2),
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'deleteLessonFile',
    {
      description:
        'Remove a file attachment from a Stepik lesson by attachment id (see getLessonFiles). Links to the file already placed in step texts may stop working.',
      inputSchema: {
        attachmentId: z.number().describe('The ID of the attachment'),
      },
    },
    async ({ attachmentId }) => {
      await deleteAttachment(attachmentId);
      return {
        content: [
          {
            text: `Attachment ${attachmentId} deleted`,
            type: 'text',
          },
        ],
      };
    },
  );
}
