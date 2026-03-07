import express from 'express';
import { workflowRouter } from './routes/workflow.js';
import { renderHome, renderWorkflow, renderResults } from './views/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pages
app.get('/', (req, res) => res.send(renderHome()));
app.get('/workflow', (req, res) => res.send(renderWorkflow()));
app.get('/results/:id', (req, res) => res.send(renderResults(req.params.id)));

// API
app.use('/api/workflow', workflowRouter);

app.listen(PORT, () => console.log(`Web server: http://localhost:${PORT}`));
