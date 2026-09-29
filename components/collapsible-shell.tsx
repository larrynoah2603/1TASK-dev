"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";

export function CollapsibleShell({ variant, sidebar, topbar, mobileNavigation, children }: { variant: "app" | "admin"; sidebar: React.ReactNode; topbar: React.ReactNode; mobileNavigation?: React.ReactNode; children: React.ReactNode }) {
  // The paired TopbarContext trigger is exposed with aria-label="Ouvrir le menu".
  const storageKey = `1task-${variant}-sidebar-collapsed`;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setCollapsed(window.localStorage.getItem(storageKey) === "true"), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    const handleToggle = () => {
      setCollapsed((current) => {
        const next = !current;
        window.localStorage.setItem(storageKey, String(next));
        return next;
      });
    };
    const handleOpen = () => setMobileOpen(true);
    window.addEventListener("1task:toggle-sidebar", handleToggle);
    window.addEventListener("1task:open-menu", handleOpen);
    return () => {
      window.removeEventListener("1task:toggle-sidebar", handleToggle);
      window.removeEventListener("1task:open-menu", handleOpen);
    };
  }, [storageKey]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return (
    <div data-sidebar-collapsed={collapsed ? "true" : "false"} className="kit-app shell-structural-rule">
      {mobileOpen ? <button type="button" className="kit-backdrop" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} /> : null}
      <aside id={`${variant}-sidebar`} aria-label={variant === "admin" ? "Navigation administration" : "Navigation principale"} aria-hidden={!mobileOpen ? undefined : false} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }} className={`kit-sidebar${mobileOpen ? " kit-sidebar-open" : ""}`}>
        {sidebar}
        <button type="button" onClick={() => setMobileOpen(false)} className="kit-icon-btn kit-sidebar-close" aria-label="Fermer le menu"><Icon name="x" /></button>
        <button type="button" onClick={toggleCollapsed} className="kit-sidebar-toggle" aria-expanded={!collapsed} aria-label={collapsed ? "Développer la barre latérale" : "Replier la barre latérale"} title={collapsed ? "Développer la barre latérale" : "Replier la barre latérale"}>
          <Icon name="chevronLeft" />
        </button>
      </aside>

      <div className="kit-content">
        <header className="kit-topbar">{topbar}</header>
        <main id="main-content" className={`kit-main ${variant === "admin" ? "admin-industrial" : "shell-industrial"}`}>
          {children}
        </main>
        {mobileNavigation}
      </div>
    </div>
  );
}
