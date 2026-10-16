-- CreateEnum
CREATE TYPE "project_role" AS ENUM ('OWNER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_by_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "project_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "parent_task_id" UUID,
    "assignee_id" UUID,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'TODO',
    "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM',
    "due_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_created_by_id_idx" ON "projects"("created_by_id");

-- CreateIndex
CREATE INDEX "projects_archived_at_idx" ON "projects"("archived_at");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE INDEX "project_members_project_id_role_idx" ON "project_members"("project_id", "role");

-- Prisma does not currently model PostgreSQL partial unique indexes.
CREATE UNIQUE INDEX "project_members_one_owner_per_project_key"
ON "project_members"("project_id")
WHERE "role" = 'OWNER';

-- CreateIndex
CREATE INDEX "tasks_project_id_status_deleted_at_idx" ON "tasks"("project_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "tasks_project_id_due_at_idx" ON "tasks"("project_id", "due_at");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_status_idx" ON "tasks"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_project_id_id_key" ON "tasks"("project_id", "id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_parent_task_id_fkey" FOREIGN KEY ("project_id", "parent_task_id") REFERENCES "tasks"("project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
