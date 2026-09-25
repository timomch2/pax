"use client";
import { useState } from "react";
import { BriefcaseBusiness, Grip, House, Stethoscope, Store, MessagesSquare, Lightbulb, TrendingUp, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import type { ServiceSummary } from "@/lib/service-enrollment";
import { serviceFetcher } from "@/components/account/account-services";
import type { ServiceId } from "@/lib/service-navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ProductLink = { label: string; href: string };

const SERVICE_ICONS = { home: House, practice: Stethoscope, talent: BriefcaseBusiness, market: Store, community: MessagesSquare, innovation: Lightbulb, investment: TrendingUp, safety: ShieldCheck };
export type ProductsResponse = {
  enabled: boolean;
  homeHref: string;
  links: ProductLink[];
  services: (ProductLink & { id: ServiceId; profileHref: string | null })[];
  accountHref: string;
  logoutHref: string;
};

/** Resolve deployment-specific product links without baking hostnames into client bundles. */
export function ProductSwitcher({ variant = "links" }: { variant?: "links" | "launcher" }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const { data } = useSWR<ProductsResponse>("/api/products", (url: string) =>
    fetch(url).then((response) => response.json()),
  );
  const { data: enrollment } = useSWR<{ services: ServiceSummary[] }>(session?.user?.id && variant === "launcher" ? ["/api/account/services", session.user.id!] as const : null, serviceFetcher);
  if (!data || (variant === "launcher" ? !session?.user?.id : !data.enabled)) return null;

  if (variant === "launcher") {
    if (!data.services) return null;
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted [&_svg]:h-5 [&_svg]:w-5"
            aria-label="PAX apps"
            title="PAX apps"
          >
            <Grip aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="PAX apps"
          className="w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border-border/50 p-4 shadow-[var(--shadow-lg)]"
        >
          <p className="mb-3 px-2 text-sm font-semibold">PAX apps</p>
          <nav aria-label="PAX services" className="grid grid-cols-3 gap-1">
            {data.services.map((link) => {
              const Icon = SERVICE_ICONS[link.id];
              const service = enrollment?.services.find(item => item.id === link.id);
              const href = link.id === "home" ? data.homeHref : link.id === "safety" || (service?.state === "ENABLED" && service.canOpen) ? link.href : `${data.accountHref}?service=${link.id}#my-services`;
              return (
                <a
                  key={link.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-3 rounded-xl text-center px-1 py-4 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:underline focus-visible:outline-none"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  {link.label}
                  {service?.state === "ENABLED" && !service.canOpen && <span className="text-[10px] font-normal text-muted-foreground">Access details</span>}
                  {service && link.id !== "safety" && service.state !== "ENABLED" && <span className="text-[10px] font-normal text-muted-foreground">Enable service</span>}
                </a>
              );
            })}
          </nav>
          <a className="mt-3 block border-t border-border pt-3 text-center text-sm text-primary hover:underline" href={`${data.accountHref}#my-services`}>Manage my services</a>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <nav
      aria-label="PAX products"
      className="flex flex-wrap gap-x-4 gap-y-2 py-2 text-xs text-muted-foreground"
    >
      {data.links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="hover:text-primary hover:underline"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
