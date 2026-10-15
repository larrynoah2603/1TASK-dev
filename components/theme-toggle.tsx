"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";

export type ThemePreference = "auto" | "light" | "dark";
const THEME_EVENT = "1task:theme-preference";

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem("1task-theme");
    return saved === "auto" || saved === "light" || saved === "dark" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "auto") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyPreference(preference: ThemePreference) {
  document.documentElement.dataset.theme = resolveTheme(preference);
}

function savePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem("1task-theme", preference);
  } catch {
    // Preference remains active for the current session when storage is unavailable.
  }
  applyPreference(preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Uses the existing localStorage key, with a real OS-following Auto mode. */
export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "segmented" }) {
  const [preference, setPreference] = useState<ThemePreference>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const sync = () => {
      const current = readPreference();
      setPreference(current);
      setResolved(resolveTheme(current));
      applyPreference(current);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const timer = window.setTimeout(sync, 0);
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);
    media.addEventListener("change", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
      media.removeEventListener("change", sync);
    };
  }, []);

  const select = (next: ThemePreference) => {
    setPreference(next);
    setResolved(resolveTheme(next));
    savePreference(next);
  };

  if (variant === "segmented") {
    return (
      <div className="kit-preference-segments" role="group" aria-label="Thème de l’interface">
        {([
          ["auto", "Auto"],
          ["light", "Clair"],
          ["dark", "Sombre"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="kit-preference-option"
            aria-pressed={preference === value}
            onClick={() => select(value)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => select(resolved === "dark" ? "light" : "dark")}
      className="kit-icon-btn"
      aria-label={resolved === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
      title={resolved === "dark" ? "Mode clair" : "Mode sombre"}
    >
      <Icon name={resolved === "dark" ? "sun" : "moon"} />
    </button>
  );
}
