import { NextResponse } from "next/server";
import { serviceLinks } from "@/lib/service-navigation";
import { productUrl, talentEnabled } from "@/lib/product-hosts";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    enabled: talentEnabled(),
    services: serviceLinks(),
    accountHref: productUrl("accounts", "/account"),
    logoutHref: productUrl("accounts", "/login"),
    links: [
      { label: "PAX", href: productUrl("main", "/") },
      {
        label: "Practitioners",
        href: productUrl("practice", "/practice"),
      },
      { label: "Talent", href: productUrl("talent", "/talent") },
      { label: "Account", href: productUrl("accounts", "/account") },
    ],
  });
}
