CREATE INDEX "WorkdayItem_taskId_idx" ON "WorkdayItem"("taskId");
CREATE INDEX "WorkdayItem_carriedFromItemId_idx" ON "WorkdayItem"("carriedFromItemId");

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workday" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkdayItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FocusSession" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
REVOKE ALL ON TABLE "Project" FROM anon, authenticated;
REVOKE ALL ON TABLE "Section" FROM anon, authenticated;
REVOKE ALL ON TABLE "Task" FROM anon, authenticated;
REVOKE ALL ON TABLE "Workday" FROM anon, authenticated;
REVOKE ALL ON TABLE "WorkdayItem" FROM anon, authenticated;
REVOKE ALL ON TABLE "FocusSession" FROM anon, authenticated;
