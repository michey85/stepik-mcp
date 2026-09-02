import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { toPlain } from '../helpers/html.js';
import { loadCourses } from '../constants/courses.js';
import { getNotifications } from '../services/notifications.js';

export default function registerNotificationsTools(server: McpServer) {
  server.registerTool(
    'getNotifications',
    {
      description: 'Get my Stepik notifications, paginated',
      inputSchema: {
        page: z
          .number()
          .default(1)
          .describe('page query param for pagination (default: 1)'),
        isUnread: z.boolean().optional().describe('Filter by unread status'),
      },
    },
    async ({ page, isUnread }) => {
      const notifications = await getNotifications(page, isUnread);
      const courses = loadCourses();
      return {
        content: notifications.map((n) => {
          const courseNames = (n.courses || [])
            .map((id) => courses.find((c) => c.id === id)?.title)
            .filter(Boolean);
          const coursePrefix =
            courseNames.length > 0 ? `[${courseNames.join(', ')}] ` : '';
          return {
            text: `${coursePrefix}[${n.time}] ${n.type}: ${toPlain(n.html_text)} Action URL: ${n.context.action_url}. Lesson: ${n.context.target.lesson_id}, step: ${n.context.target.step_id}`,
            type: 'text',
          };
        }),
      };
    },
  );
}
