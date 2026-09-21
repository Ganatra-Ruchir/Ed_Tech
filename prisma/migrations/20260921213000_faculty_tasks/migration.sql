-- CreateTable
CREATE TABLE "FacultyTask" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacultyTask_facultyId_status_dueDate_idx" ON "FacultyTask"("facultyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FacultyTask_facultyId_createdAt_idx" ON "FacultyTask"("facultyId", "createdAt");

-- AddForeignKey
ALTER TABLE "FacultyTask" ADD CONSTRAINT "FacultyTask_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
