-- Keep existing linked Microsoft accounts usable after the provider id rename.
UPDATE "Account"
SET "provider" = 'microsoft-entra-id'
WHERE "provider" = 'azure-ad';
