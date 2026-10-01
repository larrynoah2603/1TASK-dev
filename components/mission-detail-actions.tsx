"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

export function MissionDetailActions({ missionId, status, canManage }: { missionId: string; status: string; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (!canManage || ["COMPLETED", "ARCHIVED"].includes(status)) return null;

  async function completeMission() {
    if (!window.confirm("Confirmer la clôture de cette mission ? Cette action est tracée.")) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/production/missions/${missionId}/complete`, { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        const message = data.error ?? "La mission n’a pas pu être clôturée.";
        setError(message);
        toast(message, "error");
        return;
      }
      toast("Mission clôturée avec succès.");
      router.refresh();
    } catch {
      const message = "Le serveur n’a pas pu clôturer la mission.";
      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="flex flex-col items-end gap-2"><button type="button" className="button-primary" disabled={submitting} aria-busy={submitting} onClick={completeMission}>{submitting ? "Clôture…" : "Clôturer la mission"}</button>{error ? <p role="alert" className="max-w-xs text-right text-xs text-rose-700">{error}</p> : null}</div>;
}
