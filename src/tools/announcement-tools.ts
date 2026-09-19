import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import {
  abortAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncementsByCourse,
  sendAnnouncement,
  testAnnouncement,
  updateAnnouncement,
  type Announcement,
} from '../services/announcements.js';

function formatAnnouncement(a: Announcement): string {
  const flags = [
    a.on_enroll ? 'on_enroll' : null,
    a.is_scheduled ? `scheduled from ${a.start_date}` : null,
    a.is_restricted_by_score
      ? `score ${a.score_percent_min}-${a.score_percent_max}%`
      : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    `${a.id}: "${a.subject}" [${a.status}]` +
    (flags ? ` (${flags})` : '') +
    ` — published ${a.publish_count}, sent ${a.sent_count}, opened ${a.open_count}, clicked ${a.click_count}` +
    (a.sent_date ? `, last sent ${a.sent_date}` : '')
  );
}

const announcementFields = {
  subject: z.string().describe('Announcement subject (email subject line)'),
  text: z
    .string()
    .describe(
      'Announcement body as HTML. Supports the {{user_name}} placeholder which is replaced with the learner name.',
    ),
  onEnroll: z
    .boolean()
    .optional()
    .describe(
      'Send automatically to every learner who enrolls (welcome letter). Default: false',
    ),
  isScheduled: z
    .boolean()
    .optional()
    .describe('Schedule the send for startDate instead of sending immediately'),
  startDate: z
    .string()
    .optional()
    .describe('ISO datetime for scheduled send (requires isScheduled)'),
  mailPeriodDays: z
    .number()
    .optional()
    .describe('Days between repeated sends for a series (default: 7)'),
  mailQuantity: z
    .number()
    .optional()
    .describe('Number of sends in a series (default: 1)'),
  isInfinite: z
    .boolean()
    .optional()
    .describe('Repeat the series indefinitely, ignoring mailQuantity'),
  isRestrictedByScore: z
    .boolean()
    .optional()
    .describe('Only send to learners whose course score is within the range'),
  scorePercentMin: z
    .number()
    .optional()
    .describe('Minimum score percent, 0-100 (with isRestrictedByScore)'),
  scorePercentMax: z
    .number()
    .optional()
    .describe('Maximum score percent, 0-100 (with isRestrictedByScore)'),
};

export default function registerAnnouncementTools(server: McpServer) {
  server.registerTool(
    'getCourseAnnouncements',
    {
      description:
        'Get the list of announcements (course news / mailings) for a specific course with their status and delivery stats. Paginated. ' +
        'The response includes a "hasNext" flag and the current "page" number: ' +
        'if hasNext is true, call this tool again with page + 1 to get the next page.',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        page: z
          .number()
          .default(1)
          .describe('page query param for pagination (default: 1)'),
      },
    },
    async ({ courseId, page }) => {
      const {
        announcements,
        hasNext,
        page: currentPage,
      } = await getAnnouncementsByCourse(courseId, page);
      const summary = `Page ${currentPage}, ${announcements.length} announcement(s). hasNext: ${hasNext}${hasNext ? ` (call again with page: ${currentPage + 1} for more)` : ''}`;
      return {
        content: [
          { text: summary, type: 'text' },
          ...announcements.map((a) => ({
            text: formatAnnouncement(a),
            type: 'text' as const,
          })),
        ],
      };
    },
  );

  server.registerTool(
    'getAnnouncement',
    {
      description:
        'Get a single announcement by ID, including its full HTML text.',
      inputSchema: {
        announcementId: z.number().describe('The ID of the announcement'),
      },
    },
    async ({ announcementId }) => {
      const a = await getAnnouncementById(announcementId);
      return {
        content: [
          { text: formatAnnouncement(a), type: 'text' },
          { text: a.text, type: 'text' },
        ],
      };
    },
  );

  server.registerTool(
    'addAnnouncement',
    {
      description:
        'Create a new announcement (course news / mailing) for a course as a draft. ' +
        'It is NOT sent until you call sendAnnouncement (or testAnnouncement to preview). ' +
        'With onEnroll=true it becomes a welcome letter sent to each new learner automatically after sendAnnouncement.',
      inputSchema: {
        courseId: z.number().describe('The ID of the course'),
        ...announcementFields,
      },
    },
    async ({ courseId, ...fields }) => {
      const a = await createAnnouncement({ courseId, ...fields });
      return {
        content: [
          {
            text: `Announcement created with id ${a.id} (status: ${a.status}). Call sendAnnouncement(${a.id}) to publish it, or testAnnouncement(${a.id}) to receive a test copy first.`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'updateAnnouncement',
    {
      description:
        'Update an existing announcement. Only the provided fields are changed; the rest are preserved.',
      inputSchema: {
        announcementId: z.number().describe('The ID of the announcement'),
        ...announcementFields,
        subject: announcementFields.subject.optional(),
        text: announcementFields.text.optional(),
      },
    },
    async ({ announcementId, ...fields }) => {
      const a = await updateAnnouncement(announcementId, fields);
      return {
        content: [
          {
            text: `Announcement ${a.id} updated (status: ${a.status}): "${a.subject}"`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'sendAnnouncement',
    {
      description:
        'Publish an announcement: queue it for delivery to all course learners (by email and in the course news feed). ' +
        'This cannot be undone once delivered — confirm with the user before calling.',
      inputSchema: {
        announcementId: z.number().describe('The ID of the announcement'),
      },
    },
    async ({ announcementId }) => {
      await sendAnnouncement(announcementId);
      const a = await getAnnouncementById(announcementId);
      return {
        content: [
          {
            text: `Announcement ${a.id} queued for sending (status: ${a.status})`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'testAnnouncement',
    {
      description:
        'Send a test copy of an announcement to the course author only (no learners receive it).',
      inputSchema: {
        announcementId: z.number().describe('The ID of the announcement'),
      },
    },
    async ({ announcementId }) => {
      await testAnnouncement(announcementId);
      return {
        content: [
          {
            text: `Test copy of announcement ${announcementId} sent to the author`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'abortAnnouncement',
    {
      description:
        'Cancel a scheduled or queued announcement so it is no longer sent.',
      inputSchema: {
        announcementId: z.number().describe('The ID of the announcement'),
      },
    },
    async ({ announcementId }) => {
      await abortAnnouncement(announcementId);
      const a = await getAnnouncementById(announcementId);
      return {
        content: [
          {
            text: `Announcement ${a.id} aborted (status: ${a.status})`,
            type: 'text',
          },
        ],
      };
    },
  );

  server.registerTool(
    'deleteAnnouncement',
    {
      description:
        'Permanently delete an announcement. Confirm with the user before calling.',
      inputSchema: {
        announcementId: z.number().describe('The ID of the announcement'),
      },
    },
    async ({ announcementId }) => {
      await deleteAnnouncement(announcementId);
      return {
        content: [
          { text: `Announcement ${announcementId} deleted`, type: 'text' },
        ],
      };
    },
  );
}
