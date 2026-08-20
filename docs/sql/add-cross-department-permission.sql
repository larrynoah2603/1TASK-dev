BEGIN;

INSERT INTO "Permission" ("id", "code", "description")
VALUES (
  'c' || SUBSTRING(MD5('1task:permission:ticket:create:cross-department') FROM 1 FOR 24),
  'ticket:create:cross-department',
  'Créer un ticket vers une file d’un autre département'
)
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "code", "description")
VALUES (
  'c' || SUBSTRING(MD5('1task:permission:catalog:propose') FROM 1 FOR 24),
  'catalog:propose',
  'Proposer un nouveau service catalogue'
)
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" IN ('REQUESTER'::"RoleCode", 'AGENT'::"RoleCode", 'QUEUE_MANAGER'::"RoleCode")
  AND p."code" IN ('ticket:create:cross-department', 'catalog:propose')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

COMMIT;

SELECT p."code", COUNT(rp."roleId") AS "roleBindings"
FROM "Permission" p
LEFT JOIN "RolePermission" rp ON rp."permissionId" = p."id"
WHERE p."code" IN ('ticket:create:cross-department', 'catalog:propose')
GROUP BY p."code"
ORDER BY p."code";
