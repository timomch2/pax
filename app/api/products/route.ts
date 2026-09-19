import { NextResponse } from "next/server";
import { productUrl, talentEnabled } from "@/lib/product-hosts";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    enabled: talentEnabled(),
    links: [
      { label: "PAX", href: productUrl("main", "/") },
      {
        label: "Practitioners",
        href: productUrl("practice", "/dashboard/practice"),
      },
      { label: "Talent", href: productUrl("talent", "/talent") },
      { label: "Account", href: productUrl("accounts", "/account") },
    ],
  });
}
