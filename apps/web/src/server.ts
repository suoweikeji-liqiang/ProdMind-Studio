import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './config.js';
import { sessionsRouter } from './routes/sessions.js';
import { workflowRouter } from './routes/workflow.js';
import { renderHome, renderWorkflow, renderResults, renderHistoryListPage, renderHistoryDetailPage } from './views/index.js';

export function createApp() {
  loadEnvFiles();

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Pages
  app.get('/', (req, res) => res.send(renderHome()));
  app.get('/workflow', (req, res) => res.send(renderWorkflow()));
  app.get('/results/:id', (req, res) => res.send(renderResults(req.params.id)));
  app.get('/history', (req, res) => res.send(renderHistoryListPage()));
  app.get('/history/:runId', (req, res) => res.send(renderHistoryDetailPage(req.params.runId)));

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
