import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { getCommentById, postCommentReply } from '../services/comments.js';
import { toPlain } from '../helpers/html.js';

export default function registerCommentsTools(server: McpServer) {
  server.registerTool(
    'answerComment',
    {
      description:
        'Post a reply to a Stepik comment/question (answers a student on the discussion)',
      inputSchema: {
        parentCommentId: z
          .number()
          .describe('The ID of the comment to reply to'),
        text: z.string().describe('The reply text'),
      },
    },
    async ({ parentCommentId, text }) => {
      const reply = await postCommentReply(parentCommentId, text);
      return {
        content: [
          {
            text: `Reply posted with id ${reply.id}`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'getCommentById',
    {
      description: 'Get a single Stepik comment/question by its ID',
      inputSchema: {
        commentId: z.number().describe('The ID of the comment'),
      },
    },
    async ({ commentId }) => {
      const comment = await getCommentById(commentId);
      return {
        content: [
          {
            text: toPlain(comment.text || ''),
            type: 'text',
          },
        ],
      };
    },
  );
}
