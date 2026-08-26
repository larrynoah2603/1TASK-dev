-- 1TASK — contrôles de test réel Neon
--
-- Ce script est volontairement READ-ONLY.
-- Il ne crée pas de faux comptes Microsoft Entra, ne seed pas de données
-- métier et ne supprime aucun ticket. Exécutez-le après avoir configuré
-- de vrais utilisateurs via Microsoft Entra ID et l’interface Administration.
--
-- Remplacez les emails dans les requêtes 6 et 7 par les comptes de test réels.

-- 1. Migrations appliquées
SELECT "migration_name", "finished_at"
FROM "_prisma_migrations"
WHERE "finished_at" IS NOT NULL
ORDER BY "finished_at";

-- 2. Vérifier la migration de saisie libre
SELECT "column_name", "data_type", "is_nullable"
FROM information_schema.columns
WHERE "table_schema" = 'public'
  AND "table_name" = 'Ticket'
  AND "column_name" IN ('requestedService', 'serviceCatalogItemId', 'queueId', 'sourceDepartmentId')
ORDER BY "column_name";

-- 3. Départements actifs disponibles pour le test réel
SELECT "id", "code", "name", "isActive"
FROM "Department"
WHERE "isActive" = true
ORDER BY "code";

-- 4. Files actives et rattachement département
SELECT
  q."code" AS "queueCode",
  q."name" AS "queueName",
  d."code" AS "departmentCode",
  d."name" AS "departmentName",
  q."isActive"
FROM "Queue" q
JOIN "Department" d ON d."id" = q."departmentId"
WHERE q."isActive" = true
ORDER BY d."code", q."code";

-- 5. Équipes actives par file
SELECT
  d."code" AS "departmentCode",
  q."code" AS "queueCode",
  t."id" AS "teamId",
  t."name" AS "teamName",
  t."isActive" AS "teamActive",
  COUNT(tm."userId") FILTER (WHERE tm."isActive" = true) AS "activeMembers"
FROM "Team" t
JOIN "Queue" q ON q."id" = t."queueId"
JOIN "Department" d ON d."id" = q."departmentId"
LEFT JOIN "TeamMember" tm ON tm."teamId" = t."id"
WHERE q."isActive" = true
  AND t."isActive" = true
GROUP BY d."code", q."code", t."id", t."name", t."isActive"
ORDER BY d."code", q."code", t."name";

-- 6. Comptes réels utilisés pour le parcours.
-- Remplacez les deux emails avant exécution.
SELECT
  u."id",
  u."email",
  u."name",
  u."status",
  u."primaryRoleCode",
  d."code" AS "departmentCode",
  d."name" AS "departmentName",
  aq."code" AS "authorizedQueueCode",
  aq."name" AS "authorizedQueueName",
  pt."name" AS "primaryTeamName"
FROM "User" u
LEFT JOIN "Department" d ON d."id" = u."departmentId"
LEFT JOIN "Queue" aq ON aq."id" = u."authorizedQueueId"
LEFT JOIN "Team" pt ON pt."id" = u."primaryTeamId"
WHERE LOWER(u."email") IN (
  LOWER('requester.real@votre-domaine.tld'),
  LOWER('agent.real@votre-domaine.tld')
)
ORDER BY u."email";

-- 7. Rôles, scopes et appartenance équipe des comptes réels.
-- Remplacez les deux emails avant exécution.
SELECT
  u."email",
  r."code" AS "roleCode",
  ps."type" AS "scopeType",
  ps."name" AS "scopeName",
  tm."isActive" AS "teamMemberActive",
  tm."isAvailable" AS "teamMemberAvailable",
  t."name" AS "teamName",
  q."code" AS "queueCode",
  d."code" AS "departmentCode"
FROM "User" u
LEFT JOIN "UserRole" ur ON ur."userId" = u."id"
LEFT JOIN "Role" r ON r."id" = ur."roleId"
LEFT JOIN "PermissionScope" ps ON ps."id" = ur."scopeId"
LEFT JOIN "TeamMember" tm ON tm."userId" = u."id" AND tm."isActive" = true
LEFT JOIN "Team" t ON t."id" = tm."teamId" AND t."isActive" = true
LEFT JOIN "Queue" q ON q."id" = t."queueId" AND q."isActive" = true
LEFT JOIN "Department" d ON d."id" = q."departmentId"
WHERE LOWER(u."email") IN (
  LOWER('requester.real@votre-domaine.tld'),
  LOWER('agent.real@votre-domaine.tld')
)
ORDER BY u."email", r."code", q."code";

-- 8. Permissions inter-départementales présentes et associées aux rôles.
SELECT
  p."code" AS "permissionCode",
  r."code" AS "roleCode"
FROM "Permission" p
JOIN "RolePermission" rp ON rp."permissionId" = p."id"
JOIN "Role" r ON r."id" = rp."roleId"
WHERE p."code" IN ('ticket:create', 'ticket:create:cross-department', 'catalog:propose')
ORDER BY p."code", r."code";

-- 9. Services triage existants, avec SLA actif
SELECT
  s."code" AS "serviceCode",
  s."name" AS "serviceName",
  s."isActive" AS "serviceActive",
  q."code" AS "queueCode",
  d."code" AS "departmentCode",
  sla."code" AS "slaCode",
  sla."isActive" AS "slaActive"
FROM "ServiceCatalogItem" s
JOIN "Queue" q ON q."id" = s."queueId"
JOIN "Department" d ON d."id" = q."departmentId"
LEFT JOIN "SLA" sla ON sla."id" = s."slaId"
WHERE s."code" LIKE 'TRIAGE-%'
ORDER BY s."code";

-- 10. Après le test réel dans l’interface, rechercher les tickets récents.
-- Cette requête ne modifie rien.
SELECT
  t."reference",
  t."title",
  t."status",
  t."requestedService",
  t."createdAt",
  t."updatedAt",
  source."code" AS "sourceDepartmentCode",
  target."code" AS "targetDepartmentCode",
  q."code" AS "queueCode",
  q."name" AS "queueName",
  s."code" AS "serviceCode",
  sla."code" AS "slaCode"
FROM "Ticket" t
LEFT JOIN "Department" source ON source."id" = t."sourceDepartmentId"
JOIN "Queue" q ON q."id" = t."queueId"
JOIN "Department" target ON target."id" = q."departmentId"
JOIN "ServiceCatalogItem" s ON s."id" = t."serviceCatalogItemId"
LEFT JOIN "SLA" sla ON sla."id" = t."slaId"
WHERE t."createdAt" >= NOW() - INTERVAL '2 hours'
ORDER BY t."createdAt" DESC;

-- 11. Contrôle d’un ticket précis après son retour dans l’interface.
-- Remplacez la référence.
SELECT
  t."reference",
  t."status",
  t."requestedService",
  t."createdAt",
  t."updatedAt",
  q."code" AS "queueCode",
  d."code" AS "targetDepartmentCode",
  s."code" AS "serviceCode",
  sla."code" AS "slaCode",
  t."firstResponseDueAt",
  t."resolutionDueAt",
  t."assignedToId"
FROM "Ticket" t
JOIN "Queue" q ON q."id" = t."queueId"
JOIN "Department" d ON d."id" = q."departmentId"
JOIN "ServiceCatalogItem" s ON s."id" = t."serviceCatalogItemId"
LEFT JOIN "SLA" sla ON sla."id" = t."slaId"
WHERE t."reference" = 'TCK-REMPLACER-PAR-REFERENCE';

-- 12. Historique append-only du ticket précis.
SELECT
  e."createdAt",
  e."eventType",
  e."actorId",
  e."queueId",
  e."metadata"
FROM "TicketEvent" e
JOIN "Ticket" t ON t."id" = e."ticketId"
WHERE t."reference" = 'TCK-REMPLACER-PAR-REFERENCE'
ORDER BY e."createdAt";

-- 13. Notifications générées pour le ticket précis.
SELECT
  n."createdAt",
  n."status",
  n."title",
  n."body",
  u."email" AS "recipientEmail"
FROM "Notification" n
JOIN "User" u ON u."id" = n."recipientId"
JOIN "Ticket" t ON t."id" = n."ticketId"
WHERE t."reference" = 'TCK-REMPLACER-PAR-REFERENCE'
ORDER BY n."createdAt";

-- 14. Contrôle de périmètre pour l’agent destinataire.
-- Remplacez l’email de l’agent et la référence du ticket.
SELECT
  u."email",
  u."status",
  u."primaryRoleCode",
  ud."code" AS "userDepartmentCode",
  aq."code" AS "authorizedQueueCode",
  t."reference",
  td."code" AS "ticketDepartmentCode",
  q."code" AS "ticketQueueCode",
  CASE
    WHEN u."status" = 'ACTIVE'::"UserStatus"
     AND u."authorizedQueueId" = t."queueId"
     AND EXISTS (
       SELECT 1
       FROM "TeamMember" tm
       JOIN "Team" team ON team."id" = tm."teamId"
       WHERE tm."userId" = u."id"
         AND tm."isActive" = true
         AND team."isActive" = true
         AND team."queueId" = t."queueId"
     )
    THEN 'PERIMETRE_COMPATIBLE'
    ELSE 'PERIMETRE_A_VERIFIER'
  END AS "visibilityCheck"
FROM "User" u
JOIN "Ticket" t ON t."reference" = 'TCK-REMPLACER-PAR-REFERENCE'
JOIN "Queue" q ON q."id" = t."queueId"
JOIN "Department" td ON td."id" = q."departmentId"
LEFT JOIN "Department" ud ON ud."id" = u."departmentId"
LEFT JOIN "Queue" aq ON aq."id" = u."authorizedQueueId"
WHERE LOWER(u."email") = LOWER('agent.real@votre-domaine.tld');
