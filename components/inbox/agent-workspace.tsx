import type { ReactNode } from "react";

export function AgentWorkspace({ children }: { children: ReactNode }) {
  return <div className="agent-workspace">{children}</div>;
}

export function AgentWorkspaceHeader({ children }: { children: ReactNode }) {
  return <header className="agent-workspace-header">{children}</header>;
}

export function AgentWorkspaceGrid({ children }: { children: ReactNode }) {
  return <div className="agent-workspace-grid">{children}</div>;
}
