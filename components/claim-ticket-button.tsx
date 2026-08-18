"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";

export function ClaimTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  async function claim() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${ticketId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Prise en charge refusée.");
        toast(data.error ?? "Prise en charge refusée.", "error");
        return;
      }
      toast("Ticket pris en charge.");
      router.refresh();
    } catch {
      setError("La prise en charge n’a pas pu être envoyée.");
      toast("La prise en charge n’a pas pu être envoyée.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="button-primary min-h-8 px-2.5 text-[11px]"
      >
        {busy ? "Prise en charge…" : "Prendre en charge"}
      </button>
      {error ? <span className="max-w-40 text-[11px] text-rose-700">{error}</span> : null}
      <ConfirmDialog open={confirmOpen} title="Confirmer la prise en charge" description="Vous deviendrez l’agent responsable de ce ticket. L’action sera enregistrée dans l’historique." confirmLabel="Prendre en charge" busy={busy} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); void claim(); }} />
    </div>
  );
}
