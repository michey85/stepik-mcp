import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import registerCommentsTools from './tools/comments-tools.js';
import registerReviewTools from './tools/review-tools.js';
import registerPromocodeTools from './tools/promocode-tools.js';
import registerCertificateTools from './tools/certificate-tools.js';
import registerChallengesTools from './tools/challenges-tools.js';
import registerQuizTools from './tools/quiz-tools.js';
import registerFillBlanksTools from './tools/fillblanks-tools.js';
import registerContentTools from './tools/content-tools.js';
import registerBenefitsTools from './tools/benefits-tools.js';
import registerNotificationsTools from './tools/notifications-tools.js';
import registerCourseStructureTools from './tools/course-structure-tools.js';
import registerMonthlyReportTools from './tools/monthly-report-tools.js';
import registerPeriodStatisticsTools from './tools/period-statistics-tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { name, version } = JSON.parse(
  readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8'),
) as { name: string; version: string };

const server = new McpServer({
  name,
  version,
});

registerNotificationsTools(server);
registerBenefitsTools(server);
registerContentTools(server);
registerCommentsTools(server);
registerReviewTools(server);
registerPromocodeTools(server);
registerCertificateTools(server);
registerChallengesTools(server);
registerQuizTools(server);
registerFillBlanksTools(server);
registerCourseStructureTools(server);
registerMonthlyReportTools(server);
registerPeriodStatisticsTools(server);

export default server;
