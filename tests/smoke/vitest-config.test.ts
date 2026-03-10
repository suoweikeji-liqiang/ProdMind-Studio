import { describe, expect, it } from 'vitest';
import config from '../../vitest.config.ts';

describe('vitest root config', () => {
  it('excludes nested git worktrees from test discovery', () => {
    const exclude = config.test?.exclude ?? [];

    expect(exclude).toContain('.worktrees/**');
  });
});
