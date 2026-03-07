import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ProjectState, ProjectStore } from '@prodmind/shared-types';
import { ProjectStateSchema } from '@prodmind/shared-types';

async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, data, 'utf8');
  try {
    await fs.rename(tmpPath, filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      await fs.copyFile(tmpPath, filePath);
      await fs.unlink(tmpPath);
    } else {
      throw err;
    }
  }
}

async function readWithRecovery(filePath: string): Promise<string | null> {
  const tmpPath = filePath + '.tmp';
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    try {
      const recovered = await fs.readFile(tmpPath, 'utf8');
      await fs.rename(tmpPath, filePath);
      return recovered;
    } catch {
      return null;
    }
  }
}

export function createProjectStore(): ProjectStore {
  return {
    async read(projectDir: string): Promise<ProjectState | null> {
      const statePath = path.join(projectDir, 'state.json');
      const raw = await readWithRecovery(statePath);

      if (raw === null) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw);
        const result = ProjectStateSchema.safeParse(parsed);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    },

    async write(projectDir: string, state: ProjectState): Promise<void> {
      const updatedState: ProjectState = {
        ...state,
        updatedAt: new Date().toISOString(),
      };
      const statePath = path.join(projectDir, 'state.json');
      await atomicWrite(statePath, JSON.stringify(updatedState, null, 2));
    },

    create(id: string, idea: string): ProjectState {
      const now = new Date().toISOString();
      return {
        id,
        idea,
        clarityStage: 'concept',
        messages: [],
        createdAt: now,
        updatedAt: now,
        projection: {
          context: '',
          actors: '',
          intent: '',
          mechanism: '',
          boundary: '',
        },
      };
    },
  };
}
