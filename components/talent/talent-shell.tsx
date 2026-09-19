"use client";
import { hasRole } from "@/lib/access";
import Link from "next/link";
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
  const nav = [
    ["/talent", "Find jobs"],
    ["/talent/people", "Find professionals"],
    ["/talent/profile", "My career profile"],
    ["/talent/applications", "My applications"],
    ["/talent/messages", "Messages"],
    ["/talent/saved", "Saved jobs and alerts"],
    ["/talent/hiring", "Hiring workspace"],
  ];
  return (
    <AppShell
      sidebar={
        <>
          <Link href="/talent">
            <PaxLogo size="sm" />
          </Link>
          <p className="my-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Talent
          </p>
          <nav className="space-y-1" aria-label="Talent navigation">
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {label}
              </Link>
            ))}
            {session?.user &&
              hasRole(
                session.user.role,
                session.user.additionalRoles,
                "ADMIN",
              ) && (
                <Link
                  href="/talent/admin"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  Hiring administration
                </Link>
              )}
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
          <span className="text-sm font-semibold">PAX Talent</span>
          <span className="text-xs text-muted-foreground">
            Health-sector careers and evidence-backed impact
          </span>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
