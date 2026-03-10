import { Router } from 'express';
import type { Request, Response } from 'express';
import { ConversationModeSchema } from '@prodmind/shared-types';
import { appendLiveUserMessage, createLiveSession, getLiveSession, switchLiveSessionMode } from '../state/session-store.js';

export const sessionsRouter: Router = Router();

sessionsRouter.post('/', async (req: Request, res: Response) => {
  const { topic, projectPath = './prodmind-project' } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'topic required' });
  }

  const state = await createLiveSession(projectPath, topic);
  return res.status(201).json({
    session: state.session,
    modeState: state.modeStates[state.session.currentMode] ?? null,
  });
});

sessionsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const state = await getLiveSession(projectPath, id);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    session: state.session,
    modeState: state.modeStates[state.session.currentMode] ?? null,
  });
});

sessionsRouter.post('/:id/mode', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mode, projectPath = './prodmind-project' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const parsed = ConversationModeSchema.safeParse(mode);
  if (!parsed.success) {
    return res.status(400).json({ error: 'valid mode required' });
  }

  const state = await switchLiveSessionMode(projectPath, id, parsed.data);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    session: state.session,
    modeState: state.modeStates[state.session.currentMode] ?? null,
  });
});

sessionsRouter.post('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, projectPath = './prodmind-project' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }

  const result = await appendLiveUserMessage(projectPath, id, content);
  if (!result) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.status(202).json({
    session: result.state.session,
    modeState: result.state.modeStates[result.state.session.currentMode] ?? null,
    event: result.event,
  });
});
