-- 1TASK — Files, équipes et services techniques de triage
-- Script idempotent pour une base Neon existante.
-- À exécuter après la migration Prisma 20260821130000_add_requested_service.
-- Les identifiants sont déterministes, uniques et compatibles avec le format CUID.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "SLA" WHERE "code" = 'SLA-STD' AND "isActive" = true) THEN
    RAISE EXCEPTION 'Le SLA SLA-STD actif est requis avant le seed triage.';
  END IF;
END $$;

WITH department_specs("code", "name") AS (
  VALUES
    ('EXP', 'Expertise comptable'),
    ('SOCIAL', 'Social et Paie'),
    ('JUR', 'Juridique et secrétariat juridique'),
    ('AUDIT', 'Audit légal et commissariat aux comptes'),
    ('IT', 'Informatique'),
    ('RH', 'Ressources humaines'),
    ('ADM', 'Administratif, facturation et recouvrement'),
    ('ACCUEIL', 'Accueil et services généraux'),
    ('DIR', 'Direction et collège des associés')
)
INSERT INTO "Queue" (
  "id", "code", "name", "departmentId", "isActive", "autoAssignment", "createdAt", "updatedAt"
)
SELECT
  'c' || SUBSTRING(MD5('triage-queue-' || ds."code") FROM 1 FOR 24),
  'TRIAGE-' || ds."code",
  'Triage ' || ds."code",
  d."id",
  true,
  false,
  NOW(),
  NOW()
FROM department_specs ds
JOIN "Department" d ON d."code" = ds."code" AND d."isActive" = true
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "departmentId" = EXCLUDED."departmentId",
  "isActive" = true,
  "autoAssignment" = false,
  "updatedAt" = NOW();

WITH department_specs("code") AS (
  VALUES ('EXP'), ('SOCIAL'), ('JUR'), ('AUDIT'), ('IT'), ('RH'), ('ADM'), ('ACCUEIL'), ('DIR')
)
INSERT INTO "Team" (
  "id", "name", "queueId", "isActive", "createdAt", "updatedAt"
)
SELECT
  'c' || SUBSTRING(MD5('triage-team-' || ds."code") FROM 1 FOR 24),
  'Équipe triage ' || ds."code",
  q."id",
  true,
  NOW(),
  NOW()
FROM department_specs ds
JOIN "Queue" q ON q."code" = 'TRIAGE-' || ds."code" AND q."isActive" = true
ON CONFLICT ("queueId", "name") DO UPDATE SET
  "isActive" = true,
  "updatedAt" = NOW();

WITH department_specs("code", "name") AS (
  VALUES
    ('EXP', 'Expertise comptable'),
    ('SOCIAL', 'Social et Paie'),
    ('JUR', 'Juridique et secrétariat juridique'),
    ('AUDIT', 'Audit légal et commissariat aux comptes'),
    ('IT', 'Informatique'),
    ('RH', 'Ressources humaines'),
    ('ADM', 'Administratif, facturation et recouvrement'),
    ('ACCUEIL', 'Accueil et services généraux'),
    ('DIR', 'Direction et collège des associés')
)
INSERT INTO "ServiceCatalogItem" (
  "id", "code", "name", "description", "ticketType", "category", "keywords",
  "queueId", "priorityDefault", "slaId", "isActive", "createdAt", "updatedAt"
)
SELECT
  'c' || SUBSTRING(MD5('triage-service-' || ds."code") FROM 1 FOR 24),
  'TRIAGE-' || ds."code",
  'Besoin spécifique à qualifier — ' || ds."name",
  'Service technique utilisé pour qualifier les besoins saisis librement dans le département ' || ds."name" || '.',
  'SERVICE_REQUEST'::"TicketType",
  'À qualifier',
  ARRAY['triage', LOWER(ds."code")]::text[],
  q."id",
  'MEDIUM'::"Priority",
  s."id",
  true,
  NOW(),
  NOW()
FROM department_specs ds
JOIN "Queue" q ON q."code" = 'TRIAGE-' || ds."code" AND q."isActive" = true
CROSS JOIN LATERAL (
  SELECT "id" FROM "SLA" WHERE "code" = 'SLA-STD' AND "isActive" = true LIMIT 1
) s
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "ticketType" = EXCLUDED."ticketType",
  "category" = EXCLUDED."category",
  "keywords" = EXCLUDED."keywords",
  "queueId" = EXCLUDED."queueId",
  "priorityDefault" = EXCLUDED."priorityDefault",
  "slaId" = EXCLUDED."slaId",
  "isActive" = true,
  "updatedAt" = NOW();

-- Rend les agents et responsables actifs de leur département membres
-- de l’équipe de triage correspondante. Aucun utilisateur n’est déplacé
-- de son équipe principale et aucun scope existant n’est supprimé.
WITH department_specs("code") AS (
  VALUES ('EXP'), ('SOCIAL'), ('JUR'), ('AUDIT'), ('IT'), ('RH'), ('ADM'), ('ACCUEIL'), ('DIR')
)
INSERT INTO "TeamMember" (
  "id", "teamId", "userId", "isActive", "isAvailable", "skills", "joinedAt"
)
SELECT
  'c' || SUBSTRING(MD5('triage-member-' || d."code" || '-' || u."id") FROM 1 FOR 24),
  t."id",
  u."id",
  true,
  true,
  ARRAY['triage']::text[],
  NOW()
FROM department_specs ds
JOIN "Department" d ON d."code" = ds."code" AND d."isActive" = true
JOIN "Team" t ON t."name" = 'Équipe triage ' || ds."code" AND t."isActive" = true
JOIN "User" u ON u."departmentId" = d."id"
  AND u."status" = 'ACTIVE'::"UserStatus"
  AND u."primaryRoleCode" IN ('AGENT'::"RoleCode", 'QUEUE_MANAGER'::"RoleCode")
ON CONFLICT ("teamId", "userId") DO UPDATE SET
  "isActive" = true,
  "isAvailable" = true;

COMMIT;

-- Vérification finale
SELECT
  q."code" AS "queueCode",
  q."name" AS "queueName",
  q."isActive" AS "queueActive",
  t."name" AS "teamName",
  t."isActive" AS "teamActive",
  s."code" AS "serviceCode",
  s."isActive" AS "serviceActive",
  COUNT(tm."userId") AS "activeMembers"
FROM "Queue" q
JOIN "Team" t ON t."queueId" = q."id"
  AND t."name" = 'Équipe triage ' || REPLACE(q."code", 'TRIAGE-', '')
JOIN "ServiceCatalogItem" s ON s."queueId" = q."id"
  AND s."code" = q."code"
LEFT JOIN "TeamMember" tm ON tm."teamId" = t."id" AND tm."isActive" = true
WHERE q."code" LIKE 'TRIAGE-%'
GROUP BY q."code", q."name", q."isActive", t."name", t."isActive", s."code", s."isActive"
ORDER BY q."code";
