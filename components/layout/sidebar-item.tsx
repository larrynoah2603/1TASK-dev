import type { ReactNode } from "react";
import { ShellNavLink } from "@/components/shell-nav-link";

export function SidebarItem({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return <ShellNavLink href={href} icon={icon} className="enterprise-sidebar-item">{children}</ShellNavLink>;
}
