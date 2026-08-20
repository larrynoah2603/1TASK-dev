-- Additive migration: preserve isPublished while introducing an explicit article lifecycle.
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "KnowledgeArticle"
ADD COLUMN "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "KnowledgeArticle"
SET "status" = 'PUBLISHED'
WHERE "isPublished" = true;

CREATE INDEX "KnowledgeArticle_status_departmentId_isPublished_idx"
ON "KnowledgeArticle"("status", "departmentId", "isPublished");
