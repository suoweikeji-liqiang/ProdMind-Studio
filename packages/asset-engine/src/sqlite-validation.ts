import type { WorkflowResult, WorkflowRun } from '@prodmind/shared-types';
import { createSqliteRepository } from './persistence/sqlite-repository.js';

export interface SqliteEnvironmentProbe {
  available: boolean;
  reason?: string;
}

export interface SqliteValidationInput {
  dbPath: string;
  run: WorkflowRun;
  result?: WorkflowResult;
}

export interface SqliteValidationResult extends SqliteEnvironmentProbe {
  validated: boolean;
  dbPath: string;
  retrievedRun?: WorkflowRun | null;
  retrievedResult?: WorkflowResult | null;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function probeSqliteEnvironment(dbPath: string): SqliteEnvironmentProbe {
  try {
    createSqliteRepository(dbPath);
    return { available: true };
  } catch (error) {
    return {
      available: false,
      reason: formatError(error),
    };
  }
}

export async function validateSqliteRoundTrip(
  input: SqliteValidationInput
): Promise<SqliteValidationResult> {
  const probe = probeSqliteEnvironment(input.dbPath);
  if (!probe.available) {
    return {
      available: false,
      validated: false,
      dbPath: input.dbPath,
      reason: probe.reason,
    };
  }

  try {
    const repository = createSqliteRepository(input.dbPath);
    await repository.saveRun(input.run);
    const retrievedRun = await repository.getRun(input.run.runId);

    if (!retrievedRun) {
      return {
        available: true,
        validated: false,
        dbPath: input.dbPath,
        reason: 'SQLite validation could not retrieve the saved run',
      };
    }

    let retrievedResult: WorkflowResult | null | undefined;
    if (input.result) {
      await repository.saveResult(input.result);
      retrievedResult = await repository.getResult(input.result.runId);

      if (!retrievedResult) {
        return {
          available: true,
          validated: false,
          dbPath: input.dbPath,
          retrievedRun,
          reason: 'SQLite validation could not retrieve the saved result',
        };
      }
    }

    return {
      available: true,
      validated: true,
      dbPath: input.dbPath,
      retrievedRun,
      retrievedResult,
    };
  } catch (error) {
    return {
      available: true,
      validated: false,
      dbPath: input.dbPath,
      reason: formatError(error),
    };
  }
}
