CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high');

ALTER TABLE "Task"
ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'normal';

ALTER TABLE "Project"
ADD COLUMN "color" TEXT NOT NULL DEFAULT 'sky';

ALTER TABLE "Area"
ADD COLUMN "color" TEXT NOT NULL DEFAULT 'mint';
