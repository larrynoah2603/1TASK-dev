"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("1task-theme");
    const next = saved ? saved === "dark" : true;
    const timer = window.setTimeout(() => {
      setDark(next);
      document.documentElement.dataset.theme = next ? "dark" : "light";
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("1task-theme", next ? "dark" : "light");
  }

  return (
    <button type="button" onClick={toggle} className="kit-icon-btn" aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"} title={dark ? "Mode clair" : "Mode sombre"}>
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
