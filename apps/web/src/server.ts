import express from 'express';
import { loadEnvFiles } from './config.js';
import { workflowRouter } from './routes/workflow.js';
import { renderHome, renderWorkflow, renderResults, renderHistoryListPage, renderHistoryDetailPage } from './views/index.js';

loadEnvFiles();

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => console.log(`Web server: http://localhost:${PORT}`));
