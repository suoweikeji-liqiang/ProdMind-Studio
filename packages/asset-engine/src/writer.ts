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
  idea: 'Idea Draft',
  spec: 'Spec Draft',
  acceptance: 'Acceptance Draft',
  tasks: 'Tasks Draft',
};

function readOpenPoints(state: ProjectState): string[] {
  const points: string[] = [];
  const projection = state.projection;

  if (!projection?.context?.trim()) {
    points.push('Clarify the operational context.');
  }
  if (!projection?.actors?.trim()) {
    points.push('Identify primary actors.');
  }
  if (!projection?.boundary?.trim()) {
    points.push('Define boundaries and exclusions.');
  }
  if ((state.lastGuardWarnings ?? []).length > 0) {
    points.push(...(state.lastGuardWarnings ?? []));
  }

  if (points.length === 0) {
    points.push('Refine open points from current compression.');
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
        '# Idea',
        '',
        `## Project`,
        `- ID: ${state.id}`,
        `- Idea: ${state.idea}`,
        '',
        '## One-Liner',
        compression?.oneLiner ?? '',
        '',
        '## Projection',
        `- Context: ${projection?.context ?? ''}`,
        `- Actors: ${projection?.actors ?? ''}`,
        `- Intent: ${projection?.intent ?? ''}`,
        `- Mechanism: ${projection?.mechanism ?? ''}`,
        `- Boundary: ${projection?.boundary ?? ''}`,
        '',
        '## Three-Liner',
        compression?.threeLiner ?? '',
        '',
        '## Structured',
        '```json',
        compression?.structured ?? '{}',
        '```',
        '',
        '## Stage',
        state.clarityStage,
        '',
        '## Open Points',
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
        '# Spec',
        '',
        `## Project`,
        `- ID: ${state.id}`,
        `- Idea: ${state.idea}`,
        `- Stage: ${state.clarityStage}`,
        '',
        '## Projection',
        `- Context: ${projection?.context ?? ''}`,
        `- Actors: ${projection?.actors ?? ''}`,
        `- Intent: ${projection?.intent ?? ''}`,
        `- Mechanism: ${projection?.mechanism ?? ''}`,
        `- Boundary: ${projection?.boundary ?? ''}`,
        '',
        '## Compression',
        `- One-liner: ${compression?.oneLiner ?? ''}`,
        '',
        '### Three-liner',
        compression?.threeLiner ?? '',
        '',
        '### Structured',
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
        '# Acceptance Criteria',
        '',
        `- Clarity stage is \`${state.clarityStage}\``,
        '- Output artifacts exist: `spec.md`, `acceptance.md`, `tasks.md`',
      ];

      if (assumptions.length > 0) {
        lines.push('', '### Business Assumptions', ...assumptions.map((value: string) => `- ${value}`));
      }

      if (warnings.length > 0) {
        lines.push('', '### Guard Warnings', ...warnings.map((value: string) => `- ${value}`));
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

      const lines: string[] = ['# Tasks', ''];
      if (oneLiner) {
        lines.push(`- Align implementation with scope: ${oneLiner}`);
      }
      lines.push('- Refine open points from current compression.');
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
