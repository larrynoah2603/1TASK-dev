"use client";

import { useEffect, useState } from "react";

export type DensityPreference = "normal" | "compact";
const DENSITY_EVENT = "1task:density-preference";

function readDensity(): DensityPreference {
  try {
    return window.localStorage.getItem("1task-density") === "compact" ? "compact" : "normal";
  } catch {
    return "normal";
  }
}

export function DensityToggle() {
  const [density, setDensity] = useState<DensityPreference>("normal");

  useEffect(() => {
    const sync = () => {
      const value = readDensity();
      setDensity(value);
      document.documentElement.dataset.density = value;
    };
    const timer = window.setTimeout(sync, 0);
    window.addEventListener(DENSITY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(DENSITY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function select(next: DensityPreference) {
    setDensity(next);
    document.documentElement.dataset.density = next;
    try {
      window.localStorage.setItem("1task-density", next);
    } catch {
      // UI still updates during the current session.
    }
    window.dispatchEvent(new Event(DENSITY_EVENT));
  }

  return (
    <div className="kit-preference-segments" role="group" aria-label="Densité de l’interface">
      <button type="button" className="kit-preference-option" aria-pressed={density === "normal"} onClick={() => select("normal")}>Normale</button>
      <button type="button" className="kit-preference-option" aria-pressed={density === "compact"} onClick={() => select("compact")}>Compacte</button>
    </div>
  );
}
