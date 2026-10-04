INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."code" IN ('ticket:claim', 'ticket:process')
WHERE role."code" = 'QUEUE_MANAGER'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
