import { z } from "zod";

export const popupInput = z.object({
  tagline: z.string().trim().min(1).max(160),
  imageAlt: z.string().trim().min(1).max(250),
  linkUrl: z.string().trim().max(2048).refine((value) => {
    if (/[\u0000-\u001f\u007f\\]/.test(value)) return false;
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch { return false; }
  }, "Use a local path or an HTTPS link."),
  linkLabel: z.string().trim().min(1).max(80),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  enabled: z.boolean(),
}).refine((value) => new Date(value.startsAt) < new Date(value.endsAt), {
  path: ["endsAt"], message: "The end must be after the start.",
});

export const popupImageLimit = 5 * 1024 * 1024;
export function popupImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "image/webp";
  return null;
}
