import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { canManageSchoolContent } from "@/lib/permissions";
import { uploadPrivateFile } from "@/lib/storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "A file is required" }, { status: 400 });
  try {
    const result = await uploadPrivateFile(Buffer.from(await file.arrayBuffer()), file.type);
    await db.auditLog.create({ data: { actorId: session.user.id, action: "UPLOAD_FILE", entityType: "PrivateFile", entityId: result.key } });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "Private S3 storage is not configured") {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (message === "Unsupported file type" || message === "File exceeds 10 MB limit") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
