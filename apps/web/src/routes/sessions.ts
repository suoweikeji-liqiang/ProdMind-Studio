import { Router } from 'express';
import type { Request, Response } from 'express';
import { runChallengeRound } from '@prodmind/challenge-engine';
import { createRuntimeAdapter } from '@prodmind/llm-adapter';
import type { ModeMessage, RoleIdentity } from '@prodmind/shared-types';
import { ConversationModeSchema } from '@prodmind/shared-types';
import { loadProviderConfig } from '../config.js';
import {
  appendLiveRoleMessages,
  appendLiveUserMessage,
  createLiveSession,
  getLiveSession,
  switchLiveSessionMode,
} from '../state/session-store.js';

export const sessionsRouter: Router = Router();

const CHALLENGE_FAKE_RESPONSE = [
  '## 当前最强假设',
  '1. 用户需要围绕一个议题持续进行多轮对话。',
  '',
  '## MVP边界',
  '先聚焦中文 Web 会话、手动模式切换和完整过程沉淀。',
  '',
  '## 本轮证伪检查',
  '当前最重要假设：多角色可见发言会提升团队思考质量。',
  '如果我是错的：用户会觉得信息过载，不愿意继续多轮推进。',
  '最小动作：先在内部团队试跑 1 周，再根据使用反馈调节角色密度。',
].join('\n');

const CHALLENGE_ROLE_SET: RoleIdentity[] = [
  { roleId: 'architect', roleName: '架构师' },
  { roleId: 'assassin', roleName: '刺客' },
  { roleId: 'userGhost', roleName: '用户幽灵' },
  { roleId: 'grounder', roleName: '锚点官' },
];

function createChallengeAdapter() {
  return createRuntimeAdapter(
    loadProviderConfig(),
    { default: CHALLENGE_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 100,
            outputTokens: 80,
            totalTokens: 180,
          },
        },
      },
    }
  );
}

function buildChallengeRoleMessages(round: Awaited<ReturnType<typeof runChallengeRound>>): ModeMessage[] {
  const timestamp = new Date().toISOString();

  return [
    { speaker: 'role', roleId: 'architect', roleName: '架构师', content: round.architect, timestamp },
    { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: round.assassin, timestamp },
    { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: round.userGhost, timestamp },
    { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: round.grounder, timestamp },
  ];
}

function buildChallengeDraftSummary(roundNumber: number, roleMessages: ModeMessage[], conflictCount: number): string {
  return `第 ${roundNumber} 轮 challenge 已完成，记录了 ${roleMessages.length} 个角色发言，当前发现 ${conflictCount} 个冲突信号。`;
}

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

  if (result.state.session.currentMode !== 'challenge') {
    return res.status(202).json({
      session: result.state.session,
      modeState: result.state.modeStates[result.state.session.currentMode] ?? null,
      event: result.event,
    });
  }

  try {
    const challengeModeState = result.state.modeStates.challenge;
    const roundNumber = challengeModeState?.messages.filter(message => message.speaker === 'user').length ?? 1;
    const adapter = createChallengeAdapter();
    const round = await runChallengeRound(
      adapter,
      {
        idea: result.state.session.topic,
        userConfirm: content,
        userResponse: content,
      },
      roundNumber
    );

    const roleMessages = buildChallengeRoleMessages(round);
    const draftSummary = {
      summary: buildChallengeDraftSummary(roundNumber, roleMessages, round.conflicts?.length ?? 0),
      updatedAt: new Date().toISOString(),
    };

    const updated = await appendLiveRoleMessages(projectPath, id, roleMessages, {
      roleSet: CHALLENGE_ROLE_SET,
      draftSummary,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      session: updated.state.session,
      modeState: updated.state.modeStates[updated.state.session.currentMode] ?? null,
      event: result.event,
      round,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Challenge round failed',
    });
  }

});
