ALTER TABLE "User" ADD COLUMN "sportsCoordinator" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "StaffClassAssignment" (
  "userId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  CONSTRAINT "StaffClassAssignment_pkey" PRIMARY KEY ("userId", "classGroupId")
);
ALTER TABLE "StaffClassAssignment" ADD CONSTRAINT "StaffClassAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffClassAssignment" ADD CONSTRAINT "StaffClassAssignment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolEvent" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "createdById" TEXT;
UPDATE "SchoolEvent" SET "approved" = true;
CREATE TABLE "EventFeedback" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "encryptedBody" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventFeedback_eventId_studentId_idx" ON "EventFeedback"("eventId", "studentId");
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SchoolEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "CurriculumFeedback" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "encryptedBody" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurriculumFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CurriculumFeedback_studentId_createdAt_idx" ON "CurriculumFeedback"("studentId", "createdAt");
ALTER TABLE "CurriculumFeedback" ADD CONSTRAINT "CurriculumFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumFeedback" ADD CONSTRAINT "CurriculumFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
