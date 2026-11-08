import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encryptPrivateData } from "@/lib/encryption";

const enquiryInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check your message and try again." }, { status: 400 });
  }
  const parsed = enquiryInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your name, a valid email address and a message of at least 10 characters." }, { status: 400 });
  }
  try {
    const encryptedBody = encryptPrivateData(parsed.data.message);
    await db.$transaction(async (transaction) => {
      const contact = await transaction.enquiryContact.upsert({
        where: { email: parsed.data.email },
        create: { email: parsed.data.email, name: parsed.data.name },
        update: { name: parsed.data.name },
      });
      const parent = await transaction.user.findFirst({
        where: { email: { equals: parsed.data.email, mode: "insensitive" }, role: Role.PARENT },
        select: { id: true },
      });
      await transaction.contactEnquiry.create({
        data: { contactId: contact.id, parentId: parent?.id, senderName: parsed.data.name, encryptedBody },
      });
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Could not save contact enquiry", error);
    return NextResponse.json({ error: "Your message could not be saved. Please try again later." }, { status: 503 });
  }
}
