import { NextResponse } from "next/server";
import { serviceLinks } from "@/lib/service-navigation";
import { productUrl, talentEnabled } from "@/lib/product-hosts";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    enabled: talentEnabled(),
    homeHref: productUrl('main', '/dashboard/feed'),
    services: serviceLinks(),
    accountHref: productUrl("accounts", "/account"),
    logoutHref: productUrl("accounts", "/login"),
    links: [
      ...serviceLinks().map(({ label, href }) => ({ label, href })),
      { label: "Account", href: productUrl("accounts", "/account") },
    ],
  });
}
