import type { PersistenceRepository, PersistenceConfig } from '@prodmind/shared-types';
import { createFileRepository } from './file-repository.js';
import { createSqliteRepository } from './sqlite-repository.js';
import * as path from 'path';

export function createRepository(config: PersistenceConfig): PersistenceRepository {
  if (config.backend === 'sqlite') {
    const dbPath = config.connectionString || path.join(config.basePath || '.', '.prodmind', 'history.db');
    return createSqliteRepository(dbPath);
  }

  const basePath = config.basePath || '.';
  return createFileRepository(basePath);
}
