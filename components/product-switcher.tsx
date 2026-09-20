"use client";
import { useState } from "react";
import { BriefcaseBusiness, Grip, House, Stethoscope } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ProductLink = { label: string; href: string };

const LAUNCHER_SERVICES = [
  { sourceLabel: "PAX", label: "Home", icon: House },
  { sourceLabel: "Practitioners", label: "Practitioner", icon: Stethoscope },
  { sourceLabel: "Talent", label: "Talent", icon: BriefcaseBusiness },
];

/** Resolve deployment-specific product links without baking hostnames into client bundles. */
export function ProductSwitcher({ variant = "links" }: { variant?: "links" | "launcher" }) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ enabled: boolean; links: ProductLink[] }>("/api/products", (url: string) =>
    fetch(url).then((response) => response.json()),
  );
  if (!data?.enabled) return null;

  if (variant === "launcher") {
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
            {LAUNCHER_SERVICES.map(({ sourceLabel, label, icon: Icon }) => {
              const link = data.links.find((item) => item.label === sourceLabel);
              if (!link) return null;
              return (
                <a
                  key={sourceLabel}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-3 rounded-xl px-1 py-4 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:underline focus-visible:outline-none"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  {label}
                </a>
              );
            })}
          </nav>
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
