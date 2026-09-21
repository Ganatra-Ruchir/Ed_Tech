ALTER TABLE "LeaveRequest" ADD COLUMN "handoverFacultyId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD COLUMN "handoverNotes" TEXT;

CREATE INDEX "LeaveRequest_handoverFacultyId_idx" ON "LeaveRequest"("handoverFacultyId");
