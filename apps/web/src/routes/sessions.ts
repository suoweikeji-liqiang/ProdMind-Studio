import { Router } from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { runChallengeRound } from '@prodmind/challenge-engine';
import { buildDecisionModeOutput, createDecisionSession, runDecisionOrchestration } from '@prodmind/decision-engine';
import { createRuntimeAdapter } from '@prodmind/llm-adapter';
import { createProjectStore, createSessionStore, writeRequirementDraftPack } from '@prodmind/asset-engine';
import type { ArtifactVersion, ModeMessage, ModeState, ProjectState, RoleIdentity } from '@prodmind/shared-types';
import { ConversationModeSchema } from '@prodmind/shared-types';
import { loadProviderConfig } from '../config.js';
import {
  appendLiveRoleMessages,
  appendLiveUserMessage,
  createLiveSession,
  getLiveSession,
  replaceLiveModeState,
  switchLiveSessionMode,
} from '../state/session-store.js';

export const sessionsRouter: Router = Router();
const sessionPersistence = createSessionStore();

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

const DECISION_FAKE_RESPONSE = [
  'hypothesis: session-first history improves continuity',
  'risk: switching modes too early may fragment the discussion',
  'option: keep one topic per session and isolate mode-local history',
  'summary: use a single session shell, but keep challenge and decision state separated',
].join('\n');

const CHALLENGE_ROLE_SET: RoleIdentity[] = [
  { roleId: 'architect', roleName: '架构师' },
  { roleId: 'assassin', roleName: '刺客' },
  { roleId: 'userGhost', roleName: '用户幽灵' },
  { roleId: 'grounder', roleName: '锚点官' },
];

const REQUIREMENT_ROLE_SET: RoleIdentity[] = [
  { roleId: 'requirements', roleName: '需求师' },
  { roleId: 'user-representative', roleName: '用户代表' },
  { roleId: 'implementation', roleName: '实施工程师' },
  { roleId: 'acceptance', roleName: '验收官' },
];

const REQUIREMENT_ARTIFACT_TYPES = ['idea', 'spec', 'acceptance', 'tasks'] as const;
type RequirementArtifactType = (typeof REQUIREMENT_ARTIFACT_TYPES)[number];

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

function createDecisionAdapter() {
  return createRuntimeAdapter(
    loadProviderConfig(),
    { default: DECISION_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 90,
            outputTokens: 60,
            totalTokens: 150,
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

function toAssistantContent(message: ModeMessage): string {
  if (message.roleName) {
    return `${message.roleName}: ${message.content}`;
  }

  return message.content;
}

function summarizeDraftContent(content: string, fallbackLabel: string): string {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.length > 0 ? lines.join('\n') : fallbackLabel;
}

function buildRequirementProjectState(sessionId: string, topic: string, modeState: ModeState, latestInput: string): ProjectState {
  const projectStore = createProjectStore();
  const baseState = projectStore.create(sessionId, topic);
  const userTurns = modeState.messages.filter((message) => message.speaker === 'user').length;

  return {
    ...baseState,
    updatedAt: new Date().toISOString(),
    clarityStage: userTurns > 1 ? 'structure' : 'direction',
    messages: modeState.messages.map((message) => ({
      role: message.speaker === 'user' ? 'user' : 'assistant',
      content: message.speaker === 'user' ? message.content : toAssistantContent(message),
      timestamp: message.timestamp,
    })),
    projection: {
      context: topic,
      actors: '公司内部需要系统化思考的使用者',
      intent: latestInput,
      mechanism: '通过中文多轮对话、模式切换和可见角色发言共同沉淀结构化需求资产。',
      boundary: '单议题会话，不考虑协同，产物通过草稿与定稿版本持续累积。',
    },
    lastCompression: {
      oneLiner: `${topic} 的 requirement-build 草稿`,
      threeLiner: [
        `议题：${topic}`,
        `当前输入：${latestInput}`,
        '目标：产出 idea/spec/acceptance/tasks 四份可持续更新的草稿。',
      ].join('\n'),
      structured: JSON.stringify(
        {
          topic,
          latestInput,
          messageCount: modeState.messages.length,
          currentMode: 'requirement-build',
        },
        null,
        2
      ),
    },
    lastBusinessAssumptions: [
      '使用者会先用多轮对话澄清问题，再手动定稿结构化产物。',
    ],
    lastGuardWarnings: [],
  };
}

function buildRequirementRoleMessages(
  drafts: Record<RequirementArtifactType, { content: string }>
): ModeMessage[] {
  const timestamp = new Date().toISOString();

  return [
    {
      speaker: 'role',
      roleId: 'requirements',
      roleName: '需求师',
      content: `已整理 idea 草稿。\n${summarizeDraftContent(drafts.idea.content, '尚未形成 idea 草稿。')}`,
      timestamp,
    },
    {
      speaker: 'role',
      roleId: 'user-representative',
      roleName: '用户代表',
      content: `已补充 spec 里的用户价值与使用方式。\n${summarizeDraftContent(drafts.spec.content, '尚未形成 spec 草稿。')}`,
      timestamp,
    },
    {
      speaker: 'role',
      roleId: 'implementation',
      roleName: '实施工程师',
      content: `已整理 tasks 草稿里的实现拆分。\n${summarizeDraftContent(drafts.tasks.content, '尚未形成 tasks 草稿。')}`,
      timestamp,
    },
    {
      speaker: 'role',
      roleId: 'acceptance',
      roleName: '验收官',
      content: `已补充 acceptance 草稿里的验收边界。\n${summarizeDraftContent(drafts.acceptance.content, '尚未形成 acceptance 草稿。')}`,
      timestamp,
    },
  ];
}

function buildRequirementDraftSummary(drafts: Record<RequirementArtifactType, { updatedAt: string }>): string {
  return `requirement-build 已更新 ${REQUIREMENT_ARTIFACT_TYPES.length} 份草稿：${REQUIREMENT_ARTIFACT_TYPES.join(' / ')}。最近更新时间 ${drafts.spec.updatedAt}。`;
}

async function loadModeArtifacts(projectPath: string, sessionId: string, mode: ModeState['mode']) {
  if (mode !== 'requirement-build') {
    return {
      drafts: {} as Record<string, unknown>,
      finalized: {} as Record<string, ArtifactVersion[]>,
    };
  }

  const drafts = await sessionPersistence.listDraftArtifacts(projectPath, sessionId, mode);
  const finalizedEntries = await Promise.all(
    REQUIREMENT_ARTIFACT_TYPES.map(async (artifactType) => {
      const versions = await sessionPersistence.listArtifactVersions(projectPath, sessionId, mode, artifactType);
      return [artifactType, versions] as const;
    })
  );

  return {
    drafts,
    finalized: Object.fromEntries(finalizedEntries) as Record<string, ArtifactVersion[]>,
  };
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
    artifacts: await loadModeArtifacts(projectPath, id, state.session.currentMode),
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
    artifacts: await loadModeArtifacts(projectPath, id, state.session.currentMode),
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
    if (result.state.session.currentMode === 'decision') {
      try {
        const adapter = createDecisionAdapter();
        const decisionSession = createDecisionSession(`${result.state.session.topic}\n\n最新用户输入：${content}`);
        const completed = await runDecisionOrchestration(decisionSession, adapter);
        const decisionOutput = buildDecisionModeOutput(completed);
        const updated = await appendLiveRoleMessages(projectPath, id, decisionOutput.messages, {
          roleSet: decisionOutput.roleSet,
          draftSummary: {
            summary: decisionOutput.draftSummary,
            updatedAt: new Date().toISOString(),
          },
        });

        if (!updated) {
          return res.status(404).json({ error: 'Session not found' });
        }

        return res.status(200).json({
          session: updated.state.session,
          modeState: updated.state.modeStates[updated.state.session.currentMode] ?? null,
          event: result.event,
          artifacts: await loadModeArtifacts(projectPath, id, updated.state.session.currentMode),
        });
      } catch (error) {
        return res.status(502).json({
          error: error instanceof Error ? error.message : 'Decision turn failed',
        });
      }
    }

    if (result.state.session.currentMode === 'requirement-build') {
      try {
        const modeState = result.state.modeStates['requirement-build'];
        if (!modeState) {
          return res.status(404).json({ error: 'Mode state not found' });
        }

        const projectState = buildRequirementProjectState(id, result.state.session.topic, modeState, content);
        const draftDir = path.join(projectPath, '.prodmind', 'sessions', id, 'workspace', 'requirement-build', 'draft');
        const drafts = await writeRequirementDraftPack(draftDir, projectState);

        await Promise.all(
          REQUIREMENT_ARTIFACT_TYPES.map((artifactType) =>
            sessionPersistence.saveDraftArtifact(projectPath, id, 'requirement-build', artifactType, drafts[artifactType])
          )
        );

        const roleMessages = buildRequirementRoleMessages(drafts);
        const updatedModeState: ModeState = {
          ...modeState,
          roleSet: REQUIREMENT_ROLE_SET,
          messages: [...modeState.messages, ...roleMessages],
          draftSummary: {
            summary: buildRequirementDraftSummary(drafts),
            updatedAt: new Date().toISOString(),
          },
          draftArtifacts: [...REQUIREMENT_ARTIFACT_TYPES],
          finalArtifacts: modeState.finalArtifacts,
        };

        const updated = await replaceLiveModeState(projectPath, id, updatedModeState);
        if (!updated) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const timestamp = new Date().toISOString();
        for (const message of roleMessages) {
          await sessionPersistence.appendEvent(projectPath, {
            type: 'role_message',
            eventId: `${id}-requirement-role-${message.roleId}-${Date.now()}`,
            sessionId: id,
            mode: 'requirement-build',
            timestamp: message.timestamp,
            roleId: message.roleId ?? 'unknown',
            roleName: message.roleName ?? '系统',
            content: message.content,
          });
        }
        await sessionPersistence.appendEvent(projectPath, {
          type: 'draft_updated',
          eventId: `${id}-requirement-draft-${Date.now()}`,
          sessionId: id,
          mode: 'requirement-build',
          timestamp,
          summary: updatedModeState.draftSummary?.summary ?? '',
        });

        return res.status(200).json({
          session: updated.session,
          modeState: updated.modeStates[updated.session.currentMode] ?? null,
          event: result.event,
          artifacts: await loadModeArtifacts(projectPath, id, updated.session.currentMode),
        });
      } catch (error) {
        return res.status(502).json({
          error: error instanceof Error ? error.message : 'Requirement build turn failed',
        });
      }
    }

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
      artifacts: await loadModeArtifacts(projectPath, id, updated.state.session.currentMode),
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Challenge round failed',
    });
  }

});

sessionsRouter.post('/:id/artifacts/finalize', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { projectPath = './prodmind-project', note } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const state = await getLiveSession(projectPath, id);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (state.session.currentMode !== 'requirement-build') {
    return res.status(400).json({ error: 'Artifacts can only be finalized in requirement-build mode' });
  }

  const drafts = await sessionPersistence.listDraftArtifacts(projectPath, id, 'requirement-build');
  if (Object.keys(drafts).length === 0) {
    return res.status(400).json({ error: 'No draft artifacts available' });
  }

  const finalizedLabels: string[] = [];
  for (const artifactType of REQUIREMENT_ARTIFACT_TYPES) {
    const draft = drafts[artifactType];
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      continue;
    }

    const previousVersions = await sessionPersistence.listArtifactVersions(projectPath, id, 'requirement-build', artifactType);
    const nextVersion = previousVersions.length + 1;
    const artifact: ArtifactVersion = {
      artifactId: `${id}-${artifactType}`,
      sourceMode: 'requirement-build',
      artifactType,
      version: nextVersion,
      content: draft as Record<string, unknown>,
      finalizedAt: new Date().toISOString(),
      ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
    };

    await sessionPersistence.finalizeArtifact(projectPath, id, artifact);
    await sessionPersistence.appendEvent(projectPath, {
      type: 'artifact_finalized',
      eventId: `${id}-${artifactType}-v${nextVersion}`,
      sessionId: id,
      mode: 'requirement-build',
      timestamp: artifact.finalizedAt,
      artifactId: artifact.artifactId,
      artifactType,
      version: nextVersion,
    });
    finalizedLabels.push(`${artifactType}:v${nextVersion}`);
  }

  const modeState = state.modeStates['requirement-build'];
  if (!modeState) {
    return res.status(404).json({ error: 'Mode state not found' });
  }

  const updated = await replaceLiveModeState(projectPath, id, {
    ...modeState,
    draftArtifacts: [...REQUIREMENT_ARTIFACT_TYPES],
    finalArtifacts: [...modeState.finalArtifacts, ...finalizedLabels],
  });
  if (!updated) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.status(200).json({
    session: updated.session,
    modeState: updated.modeStates[updated.session.currentMode] ?? null,
    artifacts: await loadModeArtifacts(projectPath, id, updated.session.currentMode),
  });
});
