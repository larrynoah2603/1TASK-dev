-- PostgreSQL requires the new enum value to be committed before it can be
-- used by a default, column, or data statement. Keep this migration limited
-- to the enum change; the managed profile objects are applied by the next
-- migration after Prisma commits this one.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_ASSIGNMENT';
