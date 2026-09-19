"use client";
import useSWR from "swr";

/** Resolve deployment-specific product links without baking hostnames into client bundles. */
export function ProductSwitcher() {
  const { data } = useSWR("/api/products", (url: string) =>
    fetch(url).then((response) => response.json()),
  );
  if (!data?.enabled) return null;
  return (
    <nav
      aria-label="PAX products"
      className="flex flex-wrap gap-x-4 gap-y-2 py-2 text-xs text-muted-foreground"
    >
      {data.links.map((link: { label: string; href: string }) => (
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
