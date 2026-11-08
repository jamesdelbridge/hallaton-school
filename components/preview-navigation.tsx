"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

export function PreviewNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  function navigate(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as Element).closest("a");
    if (!anchor || event.defaultPrevented) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    if (href.startsWith("/staff/website-preview")) return;
    if (href.startsWith("/page?") || href === "/contact" || href === "/" || href.startsWith("/#")) {
      event.preventDefault();
      router.push(`/staff/website-preview${href === "/" ? "" : href}`);
    } else if (!/\.pdf(?:$|[?#])|[?&]type=pdf(?:&|$)/i.test(href)) {
      event.preventDefault();
    }
  }
  return <div onClickCapture={navigate}>{children}</div>;
}
