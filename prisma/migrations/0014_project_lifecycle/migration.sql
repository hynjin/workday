CREATE TYPE "ProjectStatus" AS ENUM ('active', 'completed', 'archived');

ALTER TABLE "Project" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project"
  ALTER COLUMN "status" TYPE "ProjectStatus"
  USING ("status"::text::"ProjectStatus");
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'active';

-- Existing active/archived values are preserved. completedAt is written only by
-- an explicit completion action after this migration.
