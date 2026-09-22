"use client";

import { FormEvent, useState } from "react";
import { MessageVisibility } from "@prisma/client";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

export type TicketComment = {
  id: string;
  author: { name: string };
  visibility: MessageVisibility;
  body: string;
  createdAt: Date;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export function TicketCommentThread({
  ticketId,
  messages,
  canPostPublic,
  canPostInternal,
}: {
  ticketId: string;
  messages: TicketComment[];
  canPostPublic: boolean;
  canPostInternal: boolean;
}) {
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [currentMessages, setCurrentMessages] = useState(messages);
  const [visibility, setVisibility] = useState<MessageVisibility>(MessageVisibility.REQUESTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, visibility }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Le commentaire n’a pas pu être publié.");
        toast(data.error ?? "Le commentaire n’a pas pu être publié.", "error");
        return;
      }
      setBody("");
      setCurrentMessages((current) => [
        ...current,
        { ...data, createdAt: new Date(data.createdAt) } as TicketComment,
      ]);
      toast("Commentaire publié.");
    } catch {
      setError("Le commentaire n’a pas pu être publié.");
      toast("Le commentaire n’a pas pu être publié.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ticket-comment-thread panel" aria-labelledby="ticket-comments-title">
      <div className="ticket-section-heading">
        <div>
          <p className="eyebrow">Échanges</p>
          <h2 id="ticket-comments-title">Commentaires</h2>
          <p>Les messages publics restent visibles par le demandeur ; les messages internes restent réservés à l’équipe habilitée.</p>
        </div>
        <span className="ticket-section-count">{currentMessages.length}</span>
      </div>
      <div className="ticket-comment-list">
        {currentMessages.map((message) => (
          <article key={message.id} className={`ticket-comment${message.visibility === MessageVisibility.INTERNAL ? " ticket-comment-internal" : ""}`}>
            <div className="ticket-comment-meta">
              <strong>{message.author.name}</strong>
              <span>{message.visibility === MessageVisibility.INTERNAL ? "Interne" : "Public"} · {formatDate(message.createdAt)}</span>
            </div>
            <p>{message.body}</p>
          </article>
        ))}
        {!currentMessages.length ? <p className="ticket-empty-state">Aucun commentaire pour le moment.</p> : null}
      </div>
      {canPostPublic ? (
        <form onSubmit={submit} className="ticket-comment-composer">
          {error ? <p role="alert" className="ticket-inline-error">{error}</p> : null}
          <textarea required minLength={1} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Écrivez une information ou une réponse…" className="field-control" />
          <div className="ticket-comment-composer-actions">
            {canPostInternal ? (
              <Combobox
                value={visibility}
                onChange={(next) => setVisibility(next as MessageVisibility)}
                options={[
                  { value: MessageVisibility.REQUESTER, label: "Commentaire public" },
                  { value: MessageVisibility.INTERNAL, label: "Commentaire interne" },
                ]}
              />
            ) : <span className="ticket-comment-helper">Votre message sera visible par le demandeur.</span>}
            <button type="submit" disabled={busy || !body.trim()} className="button-primary">{busy ? "Publication…" : "Publier le commentaire"}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
