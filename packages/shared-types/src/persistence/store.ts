import type { ProjectState } from '../domain/project.js';

export interface ProjectStore {
  read(projectDir: string): Promise<ProjectState | null>;
  write(projectDir: string, state: ProjectState): Promise<void>;
  create(id: string, idea: string): ProjectState;
}

export interface AssetWriter {
  writeIdea(projectDir: string, state: ProjectState): Promise<string>;
  writeSpec(projectDir: string, state: ProjectState): Promise<string>;
  writeAcceptance(projectDir: string, state: ProjectState): Promise<string>;
  writeTasks(projectDir: string, state: ProjectState): Promise<string>;
}
