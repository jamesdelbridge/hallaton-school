CREATE TABLE "EnquiryContact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnquiryContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactEnquiry" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "parentId" TEXT,
    "senderName" TEXT NOT NULL,
    "encryptedBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnquiryContact_email_key" ON "EnquiryContact"("email");
CREATE INDEX "ContactEnquiry_contactId_createdAt_idx" ON "ContactEnquiry"("contactId", "createdAt");
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "EnquiryContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
