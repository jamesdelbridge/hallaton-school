CREATE TABLE "EnquirySettings" (
    "id" TEXT NOT NULL DEFAULT 'school',
    "notificationEmail" TEXT,
    "teacherAccess" BOOLEAN NOT NULL DEFAULT true,
    "safeguardingLeadAccess" BOOLEAN NOT NULL DEFAULT false,
    "reviewAfterDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnquirySettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContactEnquiry" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "EnquiryStudent" (
    "enquiryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    CONSTRAINT "EnquiryStudent_pkey" PRIMARY KEY ("enquiryId", "studentId")
);
CREATE TABLE "EnquiryShare" (
    "enquiryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentLinkId" TEXT NOT NULL,
    CONSTRAINT "EnquiryShare_pkey" PRIMARY KEY ("enquiryId", "userId", "studentId")
);
CREATE TABLE "EnquiryReview" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "encryptedDecision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnquiryReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnquiryReview_enquiryId_createdAt_idx" ON "EnquiryReview"("enquiryId", "createdAt");
CREATE TABLE "EnquiryDeletion" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "authorisedById" TEXT NOT NULL,
    "encryptedJustification" TEXT NOT NULL,
    "encryptedReview" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnquiryDeletion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "EnquiryStudent" ADD CONSTRAINT "EnquiryStudent_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "ContactEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryStudent" ADD CONSTRAINT "EnquiryStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryShare" ADD CONSTRAINT "EnquiryShare_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "ContactEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryShare" ADD CONSTRAINT "EnquiryShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryShare" ADD CONSTRAINT "EnquiryShare_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryShare" ADD CONSTRAINT "EnquiryShare_parentLinkId_fkey" FOREIGN KEY ("parentLinkId") REFERENCES "ParentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryReview" ADD CONSTRAINT "EnquiryReview_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "ContactEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnquiryReview" ADD CONSTRAINT "EnquiryReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnquiryDeletion" ADD CONSTRAINT "EnquiryDeletion_authorisedById_fkey" FOREIGN KEY ("authorisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
