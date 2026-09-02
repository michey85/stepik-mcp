import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import registerCommentsTools from './tools/comments-tools.js';
import registerReviewTools from './tools/review-tools.js';
import registerPromocodeTools from './tools/promocode-tools.js';
import registerCertificateTools from './tools/certificate-tools.js';
import registerChallengesTools from './tools/challenges-tools.js';
import registerQuizTools from './tools/quiz-tools.js';
import registerContentTools from './tools/content-tools.js';
import registerBenefitsTools from './tools/benefits-tools.js';
import registerNotificationsTools from './tools/notifications-tools.js';

const server = new McpServer({
  name: 'stepik-mcp',
  version: '1.0.0',
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

export default server;
