-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "position" DOUBLE PRECISION NOT NULL DEFAULT 65536.0;

-- CreateIndex
CREATE INDEX "tasks_project_id_status_position_idx" ON "tasks"("project_id", "status", "position");
