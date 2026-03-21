import type { SharedContext } from '@prodmind/shared-types';
import { SHARED_CONTEXT_PREFIXES } from './constants.js';

export function toUniqueStrings(values: string[]): string[] {
  return Array.from(new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

export function splitInlineList(value: string): string[] {
  return value
    .split(/[;；|｜]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseSharedContextPatch(content: string): Partial<SharedContext> {
  const patch: SharedContext = {
    hardConstraints: [],
    confirmedFacts: [],
    sourceReferences: [],
  };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(/^([A-Za-z]+|事实|约束|限制|参考|引用)\s*[:：]\s*(.+)$/u);
    if (!match) {
      continue;
    }

    const rawPrefix = match[1] ?? '';
    const key = SHARED_CONTEXT_PREFIXES[rawPrefix.toLowerCase()] ?? SHARED_CONTEXT_PREFIXES[rawPrefix];
    const value = match[2]?.trim();
    if (!key || !value) {
      continue;
    }

    patch[key].push(value);
  }

  return patch;
}

export function hasSharedContextPatch(patch: Partial<SharedContext>): boolean {
  return Boolean(
    patch.confirmedFacts?.length ||
    patch.hardConstraints?.length ||
    patch.sourceReferences?.length
  );
}

export function buildSharedContextSections(sharedContext: SharedContext): string[] {
  const sections: string[] = [];

  if (sharedContext.confirmedFacts.length > 0) {
    sections.push(`已确认事实：${sharedContext.confirmedFacts.join(' | ')}`);
  }
  if (sharedContext.hardConstraints.length > 0) {
    sections.push(`硬约束：${sharedContext.hardConstraints.join(' | ')}`);
  }
  if (sharedContext.sourceReferences.length > 0) {
    sections.push(`参考资料：${sharedContext.sourceReferences.join(' | ')}`);
  }

  return sections;
}

export function buildSharedContextPrompt(sharedContext: SharedContext): string {
  const sections = buildSharedContextSections(sharedContext);
  if (sections.length === 0) {
    return '';
  }

  return ['共享底稿：', ...sections].join('\n');
}

export function appendSharedContextSummary(summary: string, sharedContext: SharedContext): string {
  const sections = buildSharedContextSections(sharedContext);
  if (sections.length === 0) {
    return summary;
  }

  return [summary, '', '共享底稿', ...sections].join('\n');
}
