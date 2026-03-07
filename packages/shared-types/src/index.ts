export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Session {
  id: string;
  projectId: string;
  mode: "challenge" | "decision" | "build";
}

export interface Hypothesis {
  id: string;
  statement: string;
  status?: "open" | "validated" | "rejected";
}

export interface Risk {
  id: string;
  title: string;
  severity?: "low" | "medium" | "high";
}

export interface Decision {
  id: string;
  title: string;
  rationale?: string;
}

export interface Snapshot {
  id: string;
  createdAt: string;
  summary?: string;
}
