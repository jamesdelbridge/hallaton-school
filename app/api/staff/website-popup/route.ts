import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeEnquiryRole } from "@/lib/enquiry-access";
import { canManageSchoolContent } from "@/lib/permissions";
import { popupImageLimit, popupImageType, popupInput } from "@/lib/website-popup";

async function authorised() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canManageSchoolContent(session.user.role) || !(await activeEnquiryRole(session.user.id, session.user.role))) return null;
  return session.user;
}

export async function GET() {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const popup = await db.websitePopup.findUnique({ where: { id: "draft" }, select: { tagline: true, imageAlt: true, linkUrl: true, linkLabel: true, startsAt: true, endsAt: true, enabled: true, updatedAt: true } });
  await db.auditLog.create({ data: { actorId: user.id, action: "READ_WEBSITE_POPUP", entityType: "WebsitePopup", entityId: "school" } });
  return NextResponse.json(popup, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const user = await authorised();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (length > popupImageLimit + 65536) return NextResponse.json({ error: "Image must be 5 MB or less." }, { status: 413 });
  const form = await request.formData();
  const parsed = popupInput.safeParse({
    tagline: form.get("tagline"), imageAlt: form.get("imageAlt"), linkUrl: form.get("linkUrl"),
    linkLabel: form.get("linkLabel"), startsAt: form.get("startsAt"), endsAt: form.get("endsAt"),
    enabled: form.get("enabled") === "true",
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid popup details." }, { status: 400 });
  const file = form.get("image");
  let image: Buffer | undefined;
  let imageType: string | undefined;
  if (file instanceof File && file.size) {
    if (file.size > popupImageLimit) return NextResponse.json({ error: "Image must be 5 MB or less." }, { status: 400 });
    image = Buffer.from(await file.arrayBuffer());
    imageType = popupImageType(image) ?? undefined;
    if (!imageType) return NextResponse.json({ error: "Choose a PNG, JPEG or WebP image." }, { status: 400 });
  }
  const data = { ...parsed.data, startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt) };
  const baseVersion = form.get("baseVersion");
  if (typeof baseVersion !== "string") return NextResponse.json({ error: "Reload the draft before saving." }, { status: 400 });
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.websitePopup.findUnique({ where: { id: "draft" }, select: { id: true, updatedAt: true } });
    if (!existing && (!image || !imageType)) return false;
    if (existing) {
      if (existing.updatedAt.toISOString() !== baseVersion) return "conflict";
      const updated = await tx.websitePopup.updateMany({ where: { id: "draft", updatedAt: existing.updatedAt }, data: { ...data, ...(image && imageType ? { image, imageType } : {}) } });
      if (!updated.count) return "conflict";
    } else if (baseVersion) return "conflict";
    else if (image && imageType) {
      const live = await tx.websitePopup.findUnique({ where: { id: "school" }, select: { updatedAt: true } });
      await tx.websitePopup.create({ data: { id: "draft", ...data, image, imageType, baseUpdatedAt: live?.updatedAt ?? null } });
    }
    await tx.auditLog.create({ data: { actorId: user.id, action: "UPDATE_WEBSITE_POPUP_DRAFT", entityType: "WebsitePopup", entityId: "draft" } });
    return "saved";
  });
  if (!result) return NextResponse.json({ error: "Choose an image for the popup." }, { status: 400 });
  if (result === "conflict") return NextResponse.json({ error: "Another editor changed this draft. Reload before saving." }, { status: 409 });
  return NextResponse.json({ saved: true });
}
