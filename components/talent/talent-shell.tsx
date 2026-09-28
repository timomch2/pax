"use client";
import { hasRole } from "@/lib/access";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Briefcase,
  Building2,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { AppShell } from "@/components/layouts/app-shell";
import { PaxLogo } from "@/components/brand/pax-logo";
import { Button } from "@/components/ui/button";

export function TalentShell({
  children,
  links,
}: {
  children: React.ReactNode;
  links: {
    main: string;
    practice: string;
    accounts: string;
    login: string;
    register: string;
  };
}) {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "";
  const nav = [
    {
      href: "/talent",
      label: "Find jobs",
      icon: Briefcase,
      active: pathname === "/talent" || pathname.startsWith("/talent/jobs/"),
    },
    { href: "/talent/people", label: "Find professionals", icon: Users },
    { href: "/talent/profile", label: "My career profile", icon: UserCircle },
    { href: "/talent/applications", label: "My applications", icon: FileCheck },
    { href: "/talent/messages", label: "Messages", icon: MessageSquare },
    { href: "/talent/saved", label: "Saved jobs and alerts", icon: Bookmark },
    { href: "/talent/hiring", label: "Hiring workspace", icon: Building2 },
    ...(session?.user &&
    hasRole(session.user.role, session.user.additionalRoles, "ADMIN")
      ? [
          {
            href: "/talent/admin",
            label: "Hiring administration",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];
  return (
    <AppShell
      sidebar={
        <>
          <Link href="/talent">
            <PaxLogo size="sm" />
          </Link>
          <p className="my-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Talent Marketplace
          </p>
          <nav className="space-y-1" aria-label="Talent navigation">
            {nav.map(({ href, label, icon: Icon, active }) => {
              const isActive =
                active ??
                (pathname === href || pathname.startsWith(`${href}/`));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3 pt-8">
            <a
              className="block text-sm text-muted-foreground"
              href={links.practice}
            >
              Open Practice
            </a>
            <a
              className="block text-sm text-muted-foreground"
              href={links.main}
            >
              Main PAX platform
            </a>
            <a
              className="block text-sm text-muted-foreground"
              href={links.accounts}
            >
              Account and security
            </a>
            {session ? (
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: links.login })}
              >
                Sign out
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button asChild>
                  <a href={links.login}>Sign in</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={links.register}>Join Talent</a>
                </Button>
              </div>
            )}
          </div>
        </>
      }
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold">
            Talent Marketplace
          </span>
          <span className="hidden text-xs text-muted-foreground lg:inline">
            Health-sector careers and evidence-backed impact
          </span>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
