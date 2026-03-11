// Web composition layer entry point

// Primary session-first API
export { sessionsRouter } from './routes/sessions.js';
export { renderHome, renderSessionPage, renderSessionHistoryPage, renderSessionReplayPage } from './views/index.js';

// Legacy compatibility exports — kept for backward compat only; do NOT use in new code
export { workflowRouter } from './routes/workflow.js';
