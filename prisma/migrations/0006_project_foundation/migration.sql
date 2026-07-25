CREATE TYPE "ProjectViewMode" AS ENUM ('list', 'board');

ALTER TABLE "Project"
  ADD COLUMN "viewMode" "ProjectViewMode" NOT NULL DEFAULT 'list',
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Section" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Section_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE INDEX "Section_projectId_sortOrder_idx" ON "Section"("projectId", "sortOrder");
CREATE UNIQUE INDEX "Section_project_title_normalized_key"
  ON "Section"("projectId", LOWER("title"));

ALTER TABLE "Task"
  ADD COLUMN "sectionId" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reusable" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "estimatedMinutes" INTEGER;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL;

CREATE INDEX "Task_sectionId_sortOrder_idx" ON "Task"("sectionId", "sortOrder");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_estimatedMinutes_check"
  CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0);
