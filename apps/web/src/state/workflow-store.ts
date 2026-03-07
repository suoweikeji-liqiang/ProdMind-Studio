// In-memory workflow status store (minimal implementation)
type WorkflowStatus = 'queued' | 'running_challenge' | 'running_decision' | 'running_assets' | 'completed' | 'failed';

interface WorkflowState {
  workflowId: string;
  status: WorkflowStatus;
  currentStage?: string;
  result?: any;
  error?: string;
}

const workflows = new Map<string, WorkflowState>();

export function setWorkflowStatus(id: string, status: WorkflowStatus, currentStage?: string) {
  const existing = workflows.get(id) || { workflowId: id, status: 'queued' };
  workflows.set(id, { ...existing, status, currentStage });
}

export function setWorkflowResult(id: string, result: any) {
  const existing = workflows.get(id);
  if (existing) workflows.set(id, { ...existing, result, status: 'completed' });
}

export function setWorkflowError(id: string, error: string) {
  const existing = workflows.get(id);
  if (existing) workflows.set(id, { ...existing, error, status: 'failed' });
}

export function getWorkflowStatus(id: string): WorkflowState | undefined {
  return workflows.get(id);
}
