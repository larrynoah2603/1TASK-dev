"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";

export function CollapsibleShell({ variant, sidebar, topbar, mobileNavigation, children }: { variant: "app" | "admin"; sidebar: React.ReactNode; topbar: React.ReactNode; mobileNavigation?: React.ReactNode; children: React.ReactNode }) {
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
    window.addEventListener("1task:toggle-sidebar", handleToggle);
    return () => window.removeEventListener("1task:toggle-sidebar", handleToggle);
  }, [storageKey]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return (
    <div data-sidebar-collapsed={collapsed ? "true" : "false"} className={`${variant === "admin" ? "admin-background" : "app-background"} shell-root shell-industrial min-h-screen`}>
      {mobileOpen ? <button type="button" className="shell-mobile-backdrop lg:hidden" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} /> : null}
      <aside id={`${variant}-sidebar`} aria-label={variant === "admin" ? "Navigation administration" : "Navigation principale"} aria-hidden={!mobileOpen ? undefined : false} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }} className={`shell-sidebar shell-sidebar-industrial ${mobileOpen ? "shell-sidebar-mobile-open" : ""}`}>
        <div className="shell-mobile-toolbar">
          <button type="button" onClick={() => setMobileOpen(false)} className="shell-mobile-close" aria-label="Fermer le menu">Fermer</button>
        </div>
        {sidebar}
        <button type="button" onClick={toggleCollapsed} className="sidebar-collapse-rail hidden lg:inline-flex" aria-expanded={!collapsed} aria-label={collapsed ? "Développer la barre latérale" : "Replier la barre latérale"} title={collapsed ? "Développer la barre latérale" : "Replier la barre latérale"}>
          <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
        </button>
      </aside>

      <div className="shell-content">
        <header className="app-topbar shell-topbar shell-topbar-fixed shell-topbar-industrial sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 sm:px-6 md:px-8 md:py-3.5">
          <button type="button" onClick={() => setMobileOpen(true)} className="topbar-icon-button lg:hidden" aria-expanded={mobileOpen} aria-controls={`${variant}-sidebar`} aria-label="Ouvrir le menu">☰</button>
          <div className="min-w-0 flex-1">{topbar}</div>
        </header>
        <div className="shell-structural-rule" aria-hidden="true" />
        <main id="main-content" className="shell-main mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
          <Breadcrumbs />
          {children}
        </main>
        {mobileNavigation}
      </div>
    </div>
  );
}
