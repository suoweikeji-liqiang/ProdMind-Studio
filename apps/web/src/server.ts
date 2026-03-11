import express from 'express';
import type { Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './config.js';
import { sessionsRouter } from './routes/sessions.js';
import { workflowRouter } from './routes/workflow.js';
import {
  renderHome,
  renderSessionHistoryPage,
  renderSessionPage,
  renderSessionReplayPage,
} from './views/index.js';

export function createApp(): Express {
  loadEnvFiles();

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Pages
  app.get('/', (req, res) => res.send(renderHome()));
  app.get('/sessions', (req, res) => res.send(renderSessionHistoryPage()));
  app.get('/sessions/:id/replay', (req, res) => res.send(renderSessionReplayPage(req.params.id)));
  app.get('/sessions/:id', (req, res) => res.send(renderSessionPage(req.params.id)));
  app.get('/workflow', (req, res) => res.redirect(302, '/'));
  app.get('/results/:id', (req, res) => res.redirect(302, `/sessions/${encodeURIComponent(req.params.id)}/replay`));
  app.get('/history', (req, res) => res.redirect(302, '/sessions'));
  app.get('/history/:runId', (req, res) => res.redirect(302, `/sessions/${encodeURIComponent(req.params.runId)}/replay`));

  // API
  app.use('/api/workflow', workflowRouter);
  app.use('/api/sessions', sessionsRouter);

  return app;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);

if (entryPath && currentPath === entryPath) {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Web server: http://localhost:${PORT}`));
}
