export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
import { TalentShell } from "@/components/talent/talent-shell";
import { TalentPage } from "@/components/talent/talent-page";
import { talentEnabled, productUrl } from "@/lib/product-hosts";
import { publicTalentJob } from "@/lib/talent-jobs";
import { viewTalentProfile } from "@/lib/talent-profiles";
import { dispatchTalent } from "@/lib/talent-api";
import { TalentError, talentAdmin } from "@/lib/talent-access";

const titles: Record<string, string> = {
  "": "Find your next opportunity",
  jobs: "Job opportunity",
  profile: "Your professional profile",
  hiring: "Hiring workspace",
  applications: "Applications",
  messages: "Recruitment messages",
  people: "Professional profiles",
  saved: "Saved jobs and alerts",
  "team-invitation": "Hiring team invitation",
  admin: "Talent administration",
  companies: "Company profile",
};
export async function generateMetadata({
  params,
}: {
  params: { path?: string[] };
}): Promise<Metadata> {
  const [area = "", id] = params.path || [];
  if (!talentEnabled()) return { robots: { index: false, follow: false } };
  if (area === "jobs" && id) {
    try {
      const job = await publicTalentJob(id);
      return {
        title: `${job.title} at ${job.organization} | PAX Talent`,
        description: job.summary.slice(0, 160),
        alternates: { canonical: productUrl("talent", `/talent/jobs/${id}`) },
      };
    } catch {
      return { robots: { index: false, follow: false } };
    }
  }
  if (area === "people" && id) {
    try {
      const profile = await viewTalentProfile(id);
      return {
        title: `${profile.name} | PAX Talent`,
        description: profile.headline,
        alternates: { canonical: productUrl("talent", `/talent/people/${id}`) },
      };
    } catch {
      return {
        title: "Professional profile | PAX Talent",
        robots: { index: false, follow: false },
      };
    }
  }
  return {
    title: `${titles[area] || "Talent"} | PAX`,
    robots: {
      index: ["", "people", "companies"].includes(area),
      follow: ["", "people", "companies"].includes(area),
    },
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: { path?: string[] };
  searchParams: { preview?: string };
}) {
  if (!talentEnabled()) notFound();
  const path = params.path || [],
    [area = "", id] = path;
  if (!(area in titles)) notFound();
  const session = await getServerSession(authOptions);
  const currentPath = `/talent${path.length ? `/${path.join("/")}` : ""}`;
  const loginUrl = productUrl(
    "accounts",
    `/login?callbackUrl=${encodeURIComponent(productUrl("talent", currentPath))}`,
  );
  if (
    !["", "jobs", "people", "companies", "team-invitation"].includes(area) &&
    !session?.user?.id
  )
    redirect(loginUrl);
  let initial: unknown;
  try {
    if (area === "jobs" && id) initial = await publicTalentJob(id);
    if (area === "people" && id)
      initial = await viewTalentProfile(
        id,
        session?.user?.id,
        searchParams.preview,
      );
    if (area === "companies" && id)
      initial = (
        (await dispatchTalent(
          "GET",
          ["companies", id],
          new URL("http://localhost"),
          undefined,
          undefined,
        )) as { profile: unknown }
      ).profile;
    if (area === "admin") await talentAdmin(session!.user.id);
  } catch (error) {
    if (error instanceof TalentError) notFound();
    throw error;
  }
  const job =
    area === "jobs"
      ? (initial as Awaited<ReturnType<typeof publicTalentJob>>)
      : null;
  const jsonLd = job
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: [job.summary, job.responsibilities, job.requirements].join(
          "\n\n",
        ),
        datePosted: job.publishedAt?.toISOString(),
        validThrough: job.closesAt?.toISOString(),
        hiringOrganization: {
          "@type": "Organization",
          name: job.organization,
          sameAs: job.hiringProfile?.website || undefined,
        },
        ...(job.workMode === "REMOTE"
          ? {
              jobLocationType: "TELECOMMUTE",
              ...(job.remoteCountries.length
                ? {
                    applicantLocationRequirements: job.remoteCountries.map(
                      (name) => ({ "@type": "Country", name }),
                    ),
                  }
                : {}),
            }
          : {
              jobLocation: {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: job.location,
                  addressCountry: job.country,
                },
              },
            }),
      }
    : null;
  return (
    <TalentShell
      links={{
        main: productUrl("main", "/"),
        practice: productUrl("practice", "/practice"),
        accounts: productUrl("accounts", "/account"),
        login: loginUrl,
        register: productUrl(
          "accounts",
          `/talent/register?callbackUrl=${encodeURIComponent(productUrl("talent", "/talent/profile"))}`,
        ),
      }}
    >
      <Container size="xl" className="space-y-6">
        <PageHeader
          title={titles[area]}
          description="Build your professional record. Find meaningful work. Hire with evidence."
        />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <TalentPage
          path={path}
          initial={initial ? JSON.parse(JSON.stringify(initial)) : undefined}
          loginUrl={loginUrl}
        />
      </Container>
    </TalentShell>
  );
}
