import Image from "next/image";
import { defaultWebsiteIdentity } from "@/lib/website-identity";

export function SchoolLogo({ src = defaultWebsiteIdentity.logoUrl }: { src?: string }) {
  return (
    <Image
      className="school-logo"
      src={src}
      alt=""
      width={64}
      height={64}
      unoptimized
    />
  );
}
