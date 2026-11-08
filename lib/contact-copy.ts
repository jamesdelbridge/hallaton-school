import { z } from "zod";

export const defaultContactCopy = {
  eyebrow: "We would love to hear from you",
  nameLabel: "Your name",
  emailLabel: "Email address",
  messageLabel: "Your message",
  safeguardingNotice: "Please do not include sensitive medical or safeguarding information in this form. For urgent concerns, contact the school directly or the emergency services.",
  privacyNotice: "Your name, email and message are stored for the school team to respond. Staff may link the message to a pupil record and, after review, share it with a named parent. The school must publish its approved privacy notice and retention schedule before launch.",
  sendLabel: "Send message",
  sendingLabel: "Sending…",
  successMessage: "Thank you. Your message has been saved for the school team.",
};
export type ContactCopy = typeof defaultContactCopy;
const shape = Object.fromEntries(Object.entries(defaultContactCopy).map(([key, value]) => [key, z.string().trim().min(1).max(1000).default(value)])) as { [K in keyof ContactCopy]: z.ZodDefault<z.ZodString> };
export const contactCopyInput = z.object(shape).strict();
export function readContactCopy(body: string | null | undefined): ContactCopy {
  return body == null ? { ...defaultContactCopy } : contactCopyInput.parse(JSON.parse(body));
}
