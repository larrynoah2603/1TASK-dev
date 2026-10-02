INSERT INTO "Permission" ("id", "code", "description")
VALUES ('v1_ticket_qualify_global_triage', 'ticket:qualify:global-triage', 'Qualifier un ticket de la file globale vers un service autorisé')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'ticket:qualify:global-triage'
WHERE r."code" IN ('AGENT', 'QUEUE_MANAGER', 'FUNCTIONAL_ADMIN')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
