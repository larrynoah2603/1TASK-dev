-- Allow the Prisma/Auth.js adapter to create a user before Entra synchronisation.
ALTER TABLE "User" ALTER COLUMN "entraObjectId" DROP NOT NULL;

-- Microsoft Entra can return this provider-specific token lifetime field.
-- IF NOT EXISTS keeps this migration safe if it was added manually already.
