import type { ReactNode } from "react";

export function AgentWorkspace({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`agent-workspace ${className}`.trim()}>{children}</div>;
}

export function AgentWorkspaceHeader({ children }: { children: ReactNode }) {
  return <header className="agent-workspace-header">{children}</header>;
}

export function AgentWorkspaceGrid({ children }: { children: ReactNode }) {
  return <div className="agent-workspace-grid">{children}</div>;
}
