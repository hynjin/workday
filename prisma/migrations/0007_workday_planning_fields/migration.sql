ALTER TABLE "WorkdayItem"
  ADD COLUMN "isKeyTask" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "WorkdayItem_workdayId_sortOrder_idx"
  ON "WorkdayItem"("workdayId", "sortOrder");
