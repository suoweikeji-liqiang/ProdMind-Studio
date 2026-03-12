import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ProjectState, AssetWriter } from '@prodmind/shared-types';

export type RequirementArtifactType = 'idea' | 'spec' | 'acceptance' | 'tasks';

export interface RequirementDraftArtifact {
  artifactType: RequirementArtifactType;
  title: string;
  path: string;
  content: string;
  updatedAt: string;
}

export type RequirementDraftPack = Record<RequirementArtifactType, RequirementDraftArtifact>;

const REQUIREMENT_ARTIFACT_TITLES: Record<RequirementArtifactType, string> = {
  idea: '想法草稿',
  spec: '规格草稿',
  acceptance: '验收草稿',
  tasks: '任务草稿',
};

function describeClarityStage(stage: ProjectState['clarityStage']): string {
  if (stage === 'concept') {
    return '概念阶段';
  }
  if (stage === 'direction') {
    return '方向澄清';
  }
  if (stage === 'structure') {
    return '结构整理';
  }
  return '可执行阶段';
}

function readOpenPoints(state: ProjectState): string[] {
  const points: string[] = [];
  const projection = state.projection;

  if (!projection?.context?.trim()) {
    points.push('补清当前使用场景和推进背景。');
  }
  if (!projection?.actors?.trim()) {
    points.push('明确这件事主要影响哪些角色。');
  }
  if (!projection?.boundary?.trim()) {
    points.push('补齐边界条件和明确不做什么。');
  }
  if ((state.lastGuardWarnings ?? []).length > 0) {
    points.push(...(state.lastGuardWarnings ?? []));
  }

  if (points.length === 0) {
    points.push('继续细化当前压缩稿里的未决问题。');
  }

  return points;
}

export function createAssetWriter(): AssetWriter {
  return {
    async writeIdea(projectDir: string, state: ProjectState): Promise<string> {
      const compression = state.lastCompression;
      const openPoints = readOpenPoints(state);
      const projection = state.projection;

      const content = [
        '# 想法草稿',
        '',
        '## 项目',
        `- 会话 ID：${state.id}`,
        `- 核心议题：${state.idea}`,
        '',
        '## 一句话',
        compression?.oneLiner ?? '',
        '',
        '## 场景投射',
        `- 背景：${projection?.context ?? ''}`,
        `- 主要角色：${projection?.actors ?? ''}`,
        `- 本轮意图：${projection?.intent ?? ''}`,
        `- 推进机制：${projection?.mechanism ?? ''}`,
        `- 边界与排除：${projection?.boundary ?? ''}`,
        '',
        '## 三句话',
        compression?.threeLiner ?? '',
        '',
        '## 结构化底稿',
        '```json',
        compression?.structured ?? '{}',
        '```',
        '',
        '## 当前阶段',
        describeClarityStage(state.clarityStage),
        '',
        '## 待补问题',
        ...openPoints.map((value) => `- ${value}`),
        '',
      ].join('\n');

      const ideaPath = path.join(projectDir, 'idea.md');
      await fs.writeFile(ideaPath, content, 'utf8');
      return ideaPath;
    },

    async writeSpec(projectDir: string, state: ProjectState): Promise<string> {
      const projection = state.projection;
      const compression = state.lastCompression;

      const content = [
        '# 规格草稿',
        '',
        '## 项目',
        `- 会话 ID：${state.id}`,
        `- 核心议题：${state.idea}`,
        `- 当前阶段：${describeClarityStage(state.clarityStage)}`,
        '',
        '## 场景投射',
        `- 背景：${projection?.context ?? ''}`,
        `- 主要角色：${projection?.actors ?? ''}`,
        `- 本轮意图：${projection?.intent ?? ''}`,
        `- 推进机制：${projection?.mechanism ?? ''}`,
        `- 边界与排除：${projection?.boundary ?? ''}`,
        '',
        '## 压缩摘要',
        `- 一句话：${compression?.oneLiner ?? ''}`,
        '',
        '### 三句话',
        compression?.threeLiner ?? '',
        '',
        '### 结构化底稿',
        '```json',
        compression?.structured ?? '{}',
        '```',
        '',
      ].join('\n');

      const specPath = path.join(projectDir, 'spec.md');
      await fs.writeFile(specPath, content, 'utf8');
      return specPath;
    },

    async writeAcceptance(projectDir: string, state: ProjectState): Promise<string> {
      const warnings = state.lastGuardWarnings ?? [];
      const assumptions = state.lastBusinessAssumptions ?? [];

      const lines: string[] = [
        '# 验收草稿',
        '',
        `- 当前清晰度阶段：\`${describeClarityStage(state.clarityStage)}\``,
        '- 关联产物：`spec.md`、`acceptance.md`、`tasks.md`',
      ];

      if (assumptions.length > 0) {
        lines.push('', '### 业务假设', ...assumptions.map((value: string) => `- ${value}`));
      }

      if (warnings.length > 0) {
        lines.push('', '### 风险提醒', ...warnings.map((value: string) => `- ${value}`));
      }

      lines.push('');
      const content = lines.join('\n');

      const acceptancePath = path.join(projectDir, 'acceptance.md');
      await fs.writeFile(acceptancePath, content, 'utf8');
      return acceptancePath;
    },

    async writeTasks(projectDir: string, state: ProjectState): Promise<string> {
      const openPoints = readOpenPoints(state);
      const oneLiner = state.lastCompression?.oneLiner?.trim();

      const lines: string[] = ['# 任务草稿', ''];
      if (oneLiner) {
        lines.push(`- 先对齐当前范围：${oneLiner}`);
      }
      lines.push('- 继续补齐当前压缩稿里的未决问题。');
      lines.push(...openPoints.map((value) => `- ${value}`));
      lines.push('');
      const content = lines.join('\n');

      const tasksPath = path.join(projectDir, 'tasks.md');
      await fs.writeFile(tasksPath, content, 'utf8');
      return tasksPath;
    },
  };
}

export async function writeRequirementDraftArtifact(
  projectDir: string,
  state: ProjectState,
  artifactType: RequirementArtifactType
): Promise<RequirementDraftArtifact> {
  await fs.mkdir(projectDir, { recursive: true });
  const writer = createAssetWriter();

  let artifactPath: string;
  if (artifactType === 'idea') {
    artifactPath = await writer.writeIdea(projectDir, state);
  } else if (artifactType === 'spec') {
    artifactPath = await writer.writeSpec(projectDir, state);
  } else if (artifactType === 'acceptance') {
    artifactPath = await writer.writeAcceptance(projectDir, state);
  } else {
    artifactPath = await writer.writeTasks(projectDir, state);
  }

  const content = await fs.readFile(artifactPath, 'utf8');
  return {
    artifactType,
    title: REQUIREMENT_ARTIFACT_TITLES[artifactType],
    path: artifactPath,
    content,
    updatedAt: new Date().toISOString(),
  };
}

export async function writeRequirementDraftPack(projectDir: string, state: ProjectState): Promise<RequirementDraftPack> {
  const artifactTypes: RequirementArtifactType[] = ['idea', 'spec', 'acceptance', 'tasks'];
  const entries = await Promise.all(
    artifactTypes.map(async (artifactType) => [artifactType, await writeRequirementDraftArtifact(projectDir, state, artifactType)] as const)
  );

  return Object.fromEntries(entries) as RequirementDraftPack;
}
