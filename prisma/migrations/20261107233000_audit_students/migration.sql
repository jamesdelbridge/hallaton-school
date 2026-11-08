CREATE TABLE "AuditStudent" (
  "auditId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  CONSTRAINT "AuditStudent_pkey" PRIMARY KEY ("auditId", "studentId")
);
CREATE INDEX "AuditStudent_studentId_auditId_idx" ON "AuditStudent"("studentId", "auditId");
ALTER TABLE "AuditStudent" ADD CONSTRAINT "AuditStudent_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "AuditLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditStudent" ADD CONSTRAINT "AuditStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "AuditStudent" ("auditId", "studentId")
SELECT a."id", s."id" FROM "AuditLog" a JOIN "Student" s ON a."entityType" = 'Student' AND a."entityId" = s."id"
UNION
SELECT a."id", c."studentId" FROM "AuditLog" a JOIN "SafeguardingConcern" c ON a."entityType" = 'SafeguardingConcern' AND a."entityId" = c."id"
UNION
SELECT a."id", e."studentId" FROM "AuditLog" a JOIN "EnquiryStudent" e ON a."entityType" = 'ContactEnquiry' AND a."entityId" = e."enquiryId";
