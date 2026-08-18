-- The role and permission catalog is part of the application schema. It must
-- not depend on prisma/seed.ts, because a real Microsoft Entra user can be
-- the first administrator in a production database.

INSERT INTO "Role" ("id", "code", "name", "description") VALUES
  ('role-requester', 'REQUESTER', 'Demandeur', 'Crée et suit ses propres tickets.'),
  ('role-agent', 'AGENT', 'Agent / traitant', 'Traite les tickets de ses files ou équipes.'),
  ('role-queue-manager', 'QUEUE_MANAGER', 'Responsable de file', 'Affecte, réaffecte et supervise une ou plusieurs files.'),
  ('role-functional-admin', 'FUNCTIONAL_ADMIN', 'Administrateur fonctionnel', 'Configure l’organisation, le catalogue, les rôles et les SLA.'),
  ('role-technical-admin', 'TECHNICAL_ADMIN', 'Administrateur technique', 'Gère la configuration technique explicitement autorisée.'),
  ('role-reporting-reader', 'REPORTING_READER', 'Lecteur de reporting', 'Consulte uniquement les rapports autorisés en lecture seule.')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "code", "description") VALUES
  ('permission-ticket-create', 'ticket:create', 'Créer un ticket'),
  ('permission-ticket-read', 'ticket:read', 'Lire les tickets autorisés'),
  ('permission-ticket-update', 'ticket:update', 'Modifier un ticket autorisé'),
  ('permission-ticket-comment-public', 'ticket:comment:public', 'Ajouter un commentaire public'),
  ('permission-ticket-comment-internal', 'ticket:comment:internal', 'Ajouter un commentaire interne'),
  ('permission-ticket-process', 'ticket:process', 'Démarrer et poursuivre le traitement'),
  ('permission-ticket-block', 'ticket:block', 'Bloquer ou mettre un ticket en attente'),
  ('permission-ticket-resolve', 'ticket:resolve', 'Soumettre une résolution'),
  ('permission-ticket-confirm-resolution', 'ticket:confirm-resolution', 'Confirmer une résolution'),
  ('permission-ticket-reopen', 'ticket:reopen', 'Rouvrir un ticket avec justification'),
  ('permission-ticket-assign', 'ticket:assign', 'Affecter un ticket dans une file autorisée'),
  ('permission-ticket-claim', 'ticket:claim', 'Prendre en charge un ticket de sa file'),
  ('permission-ticket-transfer', 'ticket:transfer', 'Transférer un ticket vers une file autorisée'),
  ('permission-ticket-confidential-access', 'ticket:confidential-access', 'Accorder un accès nominatif à un ticket confidentiel'),
  ('permission-ticket-internal-comment', 'ticket:internal-comment', 'Ajouter un commentaire interne'),
  ('permission-ticket-export', 'ticket:export', 'Exporter les tickets non confidentiels autorisés'),
  ('permission-catalog-manage', 'catalog:manage', 'Administrer le catalogue'),
  ('permission-organization-manage', 'organization:manage', 'Administrer l’organisation'),
  ('permission-role-manage', 'role:manage', 'Administrer les rôles et les droits'),
  ('permission-entra-department-manage', 'entra-department:manage', 'Gérer les correspondances Entra-département'),
  ('permission-user-validate', 'user:validate', 'Valider le provisioning d’un utilisateur'),
  ('permission-sla-manage', 'sla:manage', 'Administrer les SLA et calendriers'),
  ('permission-reporting-read', 'reporting:read', 'Lire les indicateurs autorisés'),
  ('permission-reporting-export', 'reporting:export', 'Exporter les indicateurs autorisés'),
  ('permission-audit-read', 'audit:read', 'Lire le journal d’audit'),
  ('permission-technical-manage', 'technical:manage', 'Gérer la configuration technique autorisée')
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description";

-- The functional administrator owns the complete functional catalog. The
-- technical permission remains present because this role is used by the
-- existing functional-admin policy and is not a login or a local account.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON r."code" = 'FUNCTIONAL_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM (VALUES
  ('REQUESTER', 'ticket:create'),
  ('REQUESTER', 'ticket:read'),
  ('REQUESTER', 'ticket:update'),
  ('REQUESTER', 'ticket:comment:public'),
  ('REQUESTER', 'ticket:confirm-resolution'),
  ('REQUESTER', 'ticket:reopen'),
  ('AGENT', 'ticket:read'),
  ('AGENT', 'ticket:update'),
  ('AGENT', 'ticket:comment:public'),
  ('AGENT', 'ticket:comment:internal'),
  ('AGENT', 'ticket:claim'),
  ('AGENT', 'ticket:internal-comment'),
  ('AGENT', 'ticket:process'),
  ('AGENT', 'ticket:block'),
  ('AGENT', 'ticket:resolve'),
  ('QUEUE_MANAGER', 'ticket:read'),
  ('QUEUE_MANAGER', 'ticket:update'),
  ('QUEUE_MANAGER', 'ticket:comment:public'),
  ('QUEUE_MANAGER', 'ticket:comment:internal'),
  ('QUEUE_MANAGER', 'ticket:assign'),
  ('QUEUE_MANAGER', 'ticket:transfer'),
  ('QUEUE_MANAGER', 'ticket:confidential-access'),
  ('QUEUE_MANAGER', 'ticket:internal-comment'),
  ('QUEUE_MANAGER', 'ticket:block'),
  ('QUEUE_MANAGER', 'ticket:resolve'),
  ('QUEUE_MANAGER', 'ticket:export'),
  ('QUEUE_MANAGER', 'reporting:read'),
  ('TECHNICAL_ADMIN', 'technical:manage'),
  ('REPORTING_READER', 'reporting:read'),
  ('REPORTING_READER', 'reporting:export')
) AS desired("roleCode", "permissionCode")
JOIN "Role" r ON r."code"::text = desired."roleCode"
JOIN "Permission" p ON p."code" = desired."permissionCode"
ON CONFLICT DO NOTHING;
