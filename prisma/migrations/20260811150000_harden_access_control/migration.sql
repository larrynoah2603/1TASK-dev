-- Add granular permissions used by the server-side access policy. Existing
-- broad permissions remain for compatibility; the application now checks the
-- narrower permission for each sensitive operation.
INSERT INTO "Permission" ("id", "code", "description") VALUES
  ('permission-ticket-comment-public', 'ticket:comment:public', 'Ajouter un commentaire public'),
  ('permission-ticket-comment-internal', 'ticket:comment:internal', 'Ajouter un commentaire interne'),
  ('permission-ticket-process', 'ticket:process', 'Démarrer et poursuivre le traitement'),
  ('permission-ticket-block', 'ticket:block', 'Bloquer ou mettre un ticket en attente'),
  ('permission-ticket-resolve', 'ticket:resolve', 'Soumettre une résolution'),
  ('permission-ticket-confirm-resolution', 'ticket:confirm-resolution', 'Confirmer une résolution'),
  ('permission-ticket-reopen', 'ticket:reopen', 'Rouvrir un ticket avec justification'),
  ('permission-ticket-export', 'ticket:export', 'Exporter les tickets non confidentiels autorisés'),
  ('permission-reporting-export', 'reporting:export', 'Exporter les indicateurs autorisés')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN (
  'ticket:comment:public', 'ticket:comment:internal', 'ticket:process',
  'ticket:block', 'ticket:resolve', 'ticket:confirm-resolution',
  'ticket:reopen', 'ticket:export', 'reporting:export'
)
WHERE r."code" = 'FUNCTIONAL_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN (
  'ticket:comment:public', 'ticket:comment:internal', 'ticket:process',
  'ticket:block', 'ticket:resolve'
)
WHERE r."code" = 'AGENT'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN (
  'ticket:comment:public', 'ticket:comment:internal', 'ticket:block',
  'ticket:resolve', 'ticket:export'
)
WHERE r."code" = 'QUEUE_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN (
  'ticket:comment:public', 'ticket:confirm-resolution', 'ticket:reopen'
)
WHERE r."code" = 'REQUESTER'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'reporting:export'
WHERE r."code" = 'REPORTING_READER'
ON CONFLICT DO NOTHING;

-- Preserve the append-only history even when a database user bypasses the
-- application layer. Tickets themselves are already protected by the prior
-- migration; these triggers cover their event, assignment and audit records.
CREATE OR REPLACE FUNCTION prevent_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% history is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_append_only ON "AuditLog";
CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();

DROP TRIGGER IF EXISTS ticket_event_append_only ON "TicketEvent";
CREATE TRIGGER ticket_event_append_only
BEFORE UPDATE OR DELETE ON "TicketEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();

DROP TRIGGER IF EXISTS ticket_assignment_append_only ON "TicketAssignment";
CREATE TRIGGER ticket_assignment_append_only
BEFORE UPDATE OR DELETE ON "TicketAssignment"
FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
