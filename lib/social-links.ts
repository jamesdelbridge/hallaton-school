import { z } from "zod";

export const socialPlatforms = ["Instagram", "Facebook", "YouTube"] as const;
export type SocialPlatform = typeof socialPlatforms[number];
const hosts: Record<SocialPlatform, string[]> = {
  Instagram: ["instagram.com", "www.instagram.com"],
  Facebook: ["facebook.com", "www.facebook.com"],
  YouTube: ["youtube.com", "www.youtube.com"],
};

export const socialLinkInput = z.object({
  platform: z.enum(socialPlatforms),
  url: z.string().trim().max(2048),
  enabled: z.boolean(),
}).superRefine((item, ctx) => {
  if (!item.url && !item.enabled) return;
  try {
    const url = new URL(item.url);
    if (url.protocol === "https:" && !url.username && !url.password && hosts[item.platform].includes(url.hostname.toLowerCase())) return;
  } catch {
    // Report the same validation error for malformed and unsupported URLs.
  }
  ctx.addIssue({ code: "custom", path: ["url"], message: `Enter a valid HTTPS ${item.platform} URL.` });
});
