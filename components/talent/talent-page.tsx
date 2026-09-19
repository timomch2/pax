"use client";
import Image from "next/image";
import Link from "next/link";
import { JobSearch, JobDetail } from "./jobs";
import { ProfileEditor } from "./profile";
import { HiringHome, HiringDetail, JobEditor } from "./hiring";
import {
  Applications,
  Messages,
  People,
  Saved,
  TeamInvitation,
  TalentAdmin,
} from "./recruitment";
import { Panel } from "./common";

export function TalentPage({
  path,
  initial,
  loginUrl,
}: {
  path: string[];
  initial?: any;
  loginUrl: string;
}) {
  const [area, id, child] = path;
  if (!area) return <JobSearch />;
  if (area === "jobs" && initial)
    return <JobDetail job={initial} loginUrl={loginUrl} />;
  if (area === "profile") return <ProfileEditor />;
  if (area === "hiring")
    return id === "jobs" ? (
      <JobEditor id={child === "new" ? undefined : child} />
    ) : id ? (
      <HiringDetail id={id} />
    ) : (
      <HiringHome />
    );
  if (area === "applications") return <Applications id={id} />;
  if (area === "messages") return <Messages />;
  if (area === "people") return <People initialProfile={initial} />;
  if (area === "saved") return <Saved />;
  if (area === "team-invitation") return <TeamInvitation />;
  if (area === "admin") return <TalentAdmin />;
  if (area === "companies" && initial)
    return (
      <div className="space-y-5">
        <Panel title={initial.name}>
          {initial.logoAssetId && (
            <div className="relative h-24 w-24">
              <Image
                src={`/api/talent/companies/${initial.slug}/logo`}
                alt={`${initial.name} logo`}
                fill
                sizes="96px"
              />
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm">{initial.description}</p>
          <p className="text-sm text-muted-foreground">
            {initial.location} · {initial.country}
          </p>
          {initial.website && (
            <a
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
              href={initial.website}
            >
              Organization website
            </a>
          )}
        </Panel>
        <Panel title="Open jobs">
          {initial.jobs.map((job: any) => (
            <Link
              className="block border-t border-border py-3 text-primary underline"
              key={job.id}
              href={`/talent/jobs/${job.id}`}
            >
              {job.title}
            </Link>
          ))}
          {!initial.jobs.length && <p>No open jobs right now.</p>}
        </Panel>
      </div>
    );
  return null;
}
