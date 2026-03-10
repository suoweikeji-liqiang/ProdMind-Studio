import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  ArtifactVersion,
  ConversationEvent,
  ConversationMode,
  ConversationSession,
  ModeState,
} from '@prodmind/shared-types';
import {
  ArtifactVersionSchema,
  ConversationEventSchema,
  ConversationSessionSchema,
  ModeStateSchema,
} from '@prodmind/shared-types';

export interface SessionStore {
  saveSession(projectPath: string, session: ConversationSession): Promise<void>;
  getSession(projectPath: string, sessionId: string): Promise<ConversationSession | null>;
  appendEvent(projectPath: string, event: ConversationEvent): Promise<void>;
  listEvents(projectPath: string, sessionId: string): Promise<ConversationEvent[]>;
  saveModeState(projectPath: string, sessionId: string, state: ModeState): Promise<void>;
  getModeState(projectPath: string, sessionId: string, mode: ConversationMode): Promise<ModeState | null>;
  saveDraftArtifact(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string, content: unknown): Promise<void>;
  getDraftArtifact(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string): Promise<unknown | null>;
  finalizeArtifact(projectPath: string, sessionId: string, artifact: ArtifactVersion): Promise<void>;
  listArtifactVersions(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string): Promise<ArtifactVersion[]>;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function atomicWrite(filePath: string, data: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, data, 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getSessionRoot(projectPath: string, sessionId: string): string {
  return path.join(projectPath, '.prodmind', 'sessions', sessionId);
}

function getSessionFile(projectPath: string, sessionId: string): string {
  return path.join(getSessionRoot(projectPath, sessionId), 'session.json');
}

function getEventsFile(projectPath: string, sessionId: string): string {
  return path.join(getSessionRoot(projectPath, sessionId), 'events.json');
}

function getModeFile(projectPath: string, sessionId: string, mode: ConversationMode): string {
  return path.join(getSessionRoot(projectPath, sessionId), 'modes', `${mode}.json`);
}

function getDraftArtifactFile(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string): string {
  return path.join(getSessionRoot(projectPath, sessionId), 'artifacts', mode, `${artifactType}.draft.json`);
}

function getVersionArtifactFile(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string, version: number): string {
  return path.join(getSessionRoot(projectPath, sessionId), 'artifacts', mode, `${artifactType}.v${version}.json`);
}

export function createSessionStore(): SessionStore {
  return {
    async saveSession(projectPath: string, session: ConversationSession): Promise<void> {
      const validated = ConversationSessionSchema.parse(session);
      await atomicWrite(getSessionFile(projectPath, session.sessionId), JSON.stringify(validated, null, 2));
    },

    async getSession(projectPath: string, sessionId: string): Promise<ConversationSession | null> {
      const raw = await readJson<unknown>(getSessionFile(projectPath, sessionId));
      if (raw === null) {
        return null;
      }
      const parsed = ConversationSessionSchema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    },

    async appendEvent(projectPath: string, event: ConversationEvent): Promise<void> {
      const validated = ConversationEventSchema.parse(event);
      const events = await this.listEvents(projectPath, event.sessionId);
      events.push(validated);
      await atomicWrite(getEventsFile(projectPath, event.sessionId), JSON.stringify(events, null, 2));
    },

    async listEvents(projectPath: string, sessionId: string): Promise<ConversationEvent[]> {
      const raw = await readJson<unknown[]>(getEventsFile(projectPath, sessionId));
      if (raw === null) {
        return [];
      }
      return raw
        .map((item) => ConversationEventSchema.safeParse(item))
        .filter((item): item is { success: true; data: ConversationEvent } => item.success)
        .map((item) => item.data);
    },

    async saveModeState(projectPath: string, sessionId: string, state: ModeState): Promise<void> {
      const validated = ModeStateSchema.parse(state);
      await atomicWrite(getModeFile(projectPath, sessionId, state.mode), JSON.stringify(validated, null, 2));
    },

    async getModeState(projectPath: string, sessionId: string, mode: ConversationMode): Promise<ModeState | null> {
      const raw = await readJson<unknown>(getModeFile(projectPath, sessionId, mode));
      if (raw === null) {
        return null;
      }
      const parsed = ModeStateSchema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    },

    async saveDraftArtifact(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string, content: unknown): Promise<void> {
      await atomicWrite(getDraftArtifactFile(projectPath, sessionId, mode, artifactType), JSON.stringify(content, null, 2));
    },

    async getDraftArtifact(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string): Promise<unknown | null> {
      return readJson(getDraftArtifactFile(projectPath, sessionId, mode, artifactType));
    },

    async finalizeArtifact(projectPath: string, sessionId: string, artifact: ArtifactVersion): Promise<void> {
      const validated = ArtifactVersionSchema.parse(artifact);
      await atomicWrite(
        getVersionArtifactFile(projectPath, sessionId, validated.sourceMode, validated.artifactType, validated.version),
        JSON.stringify(validated, null, 2)
      );
    },

    async listArtifactVersions(projectPath: string, sessionId: string, mode: ConversationMode, artifactType: string): Promise<ArtifactVersion[]> {
      const artifactDir = path.join(getSessionRoot(projectPath, sessionId), 'artifacts', mode);
      try {
        const files = await fs.readdir(artifactDir);
        const matching = files.filter((file) => file.startsWith(`${artifactType}.v`) && file.endsWith('.json'));
        const versions = await Promise.all(
          matching.map(async (file) => {
            const raw = await readJson<unknown>(path.join(artifactDir, file));
            const parsed = ArtifactVersionSchema.safeParse(raw);
            return parsed.success ? parsed.data : null;
          })
        );
        return versions
          .filter((item): item is ArtifactVersion => item !== null)
          .sort((left, right) => left.version - right.version);
      } catch {
        return [];
      }
    },
  };
}
