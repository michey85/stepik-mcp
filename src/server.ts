import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { convertToMessage, getCourseBenefits } from './services/money.js';
import {
  getCommentById,
  getUnansweredQuestionsFromBestInItCourse,
  postCommentReply,
} from './services/comments.js';
import { getReviews, getReviewsByCourse } from './services/reviews.js';
import { getNotifications } from './services/notifications.js';
import { getLessonContent, getStepContent } from './services/lessons.js';
import {
  createPromoCode,
  getActivePromoCodesByCourse,
} from './services/promoCodes.js';
import { createChoiceStep } from './services/stepSources.js';
import { toPlain } from './helpers/html.js';
import { COURSES, COURSES_URI } from './resources/courses.js';

const server = new McpServer({
  name: 'stepik-mcp',
  version: '1.0.0',
});

server.registerTool(
  'getCourseBenefits',
  {
    description: 'Get course benefits for the given period or last 24 hours',
    inputSchema: {
      period: z.number().min(1).describe('Period in hours (default: 24)'),
    },
  },
  async ({ period = 24 }) => {
    const benefits = await getCourseBenefits();
    const message = convertToMessage(benefits, period);

    return {
      content: [{ text: message, type: 'text' }],
    };
  },
);

server.registerTool(
  'getUnansweredQuestionsFromBestInItCourse',
  {
    description: 'Get unanswered questions from the Best in IT course',
    inputSchema: {},
  },
  async () => {
    const unanswered = await getUnansweredQuestionsFromBestInItCourse();
    return {
      content: unanswered.map((q) => ({
        text: `${q.text} with URL: ${q.discussion_url}`,
        type: 'text',
      })),
    };
  },
);

server.registerTool(
  'answerComment',
  {
    description:
      'Post a reply to a Stepik comment/question (answers a student on the discussion)',
    inputSchema: {
      parentCommentId: z.number().describe('The ID of the comment to reply to'),
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

server.registerTool(
  'getCorsesReviews',
  {
    description:
      'Get the list of 5 starts review from all my courses, paginated',
    inputSchema: {
      page: z
        .number()
        .default(1)
        .describe(
          'page query param for pagination (default: 1), 20 reviews per page',
        ),
    },
  },
  async ({ page }) => {
    const reviews = await getReviews(page);
    return {
      content: reviews.map((r) => ({
        text: r.text,
        type: 'text',
      })),
    };
  },
);

server.registerTool(
  'getCourseList',
  {
    description: 'Get the list of all my courses with ID and names',
    inputSchema: {},
  },
  async () => {
    const courses = COURSES;
    return {
      content: courses.map((c) => ({
        text: `${c.id}: ${c.title}`,
        type: 'text',
      })),
    };
  },
);

server.registerTool(
  'getReviewsByCourse',
  {
    description: 'Get the list of reviews for a specific course, paginated',
    inputSchema: {
      courseId: z.number().describe('The ID of the course'),
      page: z
        .number()
        .default(1)
        .describe(
          'page query param for pagination (default: 1), 20 reviews per page',
        ),
    },
  },
  async ({ courseId, page }) => {
    const reviews = await getReviewsByCourse(courseId, page);
    return {
      content: reviews.map((r) => ({
        text: r.text,
        type: 'text',
      })),
    };
  },
);

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
    return {
      content: notifications.map((n) => {
        const courseNames = (n.courses || [])
          .map((id) => COURSES.find((c) => c.id === id)?.title)
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

server.registerTool(
  'getLessonContent',
  {
    description:
      'Get the content (title and step texts) of a Stepik lesson by its ID. Optionally filter to a single step by its step ID.',
    inputSchema: {
      lessonId: z.number().describe('The ID of the lesson'),
      stepId: z
        .number()
        .optional()
        .describe('Optional step ID to get content for only that step'),
    },
  },
  async ({ lessonId, stepId }) => {
    const lesson = await getLessonContent(lessonId, stepId);
    return {
      content: [
        {
          text: `${lesson.title} (${lesson.url})\n\n${lesson.steps
            .map(
              (s) =>
                `Step ${s.id} (position ${s.position}) [${s.type}]: ${s.text}`,
            )
            .join('\n\n')}`,
          type: 'text',
        },
      ],
    };
  },
);

server.registerTool(
  'getStepContent',
  {
    description:
      'Get the content of a single Stepik lesson step by its step ID',
    inputSchema: {
      stepId: z.number().describe('The ID of the step'),
    },
  },
  async ({ stepId }) => {
    const step = await getStepContent(stepId);
    return {
      content: [
        {
          text: `Step ${step.id} (position ${step.position}) [${step.type}]: ${step.text}`,
          type: 'text',
        },
      ],
    };
  },
);

server.registerTool(
  'getActivePromoCodesByCourse',
  {
    description:
      'Get the list of currently active promo codes for a specific course. Paginated. Request all pages to get active promo codes for a course.',
    inputSchema: {
      courseId: z.number().describe('The ID of the course'),
      page: z
        .number()
        .default(1)
        .describe('page query param for pagination (default: 1)'),
    },
  },
  async ({ courseId, page }) => {
    const promoCodes = await getActivePromoCodesByCourse(courseId, page);
    return {
      content: promoCodes.map((p) => ({
        text: `${p.id}: ${p.name} - discount ${p.discount}${p.is_percent_discount ? '%' : ''}${p.expire_date ? `, expires ${p.expire_date}` : ''}`,
        type: 'text',
      })),
    };
  },
);

server.registerTool(
  'addPromoCode',
  {
    description: 'Create a new promo code for a specific course',
    inputSchema: {
      courseId: z.number().describe('The ID of the course'),
      name: z.string().describe('The promo code name (the code itself)'),
      discount: z
        .number()
        .describe(
          'The discount amount (percent or absolute, see isPercentDiscount)',
        ),
      isPercentDiscount: z
        .boolean()
        .optional()
        .describe('Whether discount is a percentage (default: false)'),
      description: z.string().optional().describe('Optional description'),
      limitPerUser: z
        .number()
        .optional()
        .describe('Optional usage limit per user'),
      startDate: z
        .string()
        .optional()
        .describe('Optional ISO datetime when the promo code becomes active'),
      expireDate: z
        .string()
        .optional()
        .describe('Optional ISO datetime when the promo code expires'),
    },
  },
  async ({
    courseId,
    name,
    discount,
    isPercentDiscount,
    description,
    limitPerUser,
    startDate,
    expireDate,
  }) => {
    const promoCode = await createPromoCode({
      courseId,
      name,
      discount,
      isPercentDiscount,
      description,
      limitPerUser,
      startDate,
      expireDate,
    });
    return {
      content: [
        {
          text: `Promo code created with id ${promoCode.id}: ${promoCode.name}`,
          type: 'text',
        },
      ],
    };
  },
);

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
      preserveOrder: z
        .boolean()
        .optional()
        .describe('Whether to keep options in the given order (default: false, i.e. shuffled)'),
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
    },
  },
  async ({
    lessonId,
    position,
    question,
    options,
    isMultipleChoice,
    preserveOrder,
    isOptionsFeedback,
    feedbackCorrect,
    feedbackWrong,
  }) => {
    const step = await createChoiceStep({
      lessonId,
      position,
      question,
      options,
      isMultipleChoice,
      preserveOrder,
      isOptionsFeedback,
      feedbackCorrect,
      feedbackWrong,
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

server.registerResource(
  'list-of-my-courses',
  COURSES_URI,
  {
    title: 'List of My Courses',
    description: 'List of my Stepik courses',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(COURSES),
      },
    ],
  }),
);

export default server;
