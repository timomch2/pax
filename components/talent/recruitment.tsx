"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { talentLabel } from "@/lib/pax-labels";
import {
  api,
  Panel,
  Loading,
  Action,
  TalentForm,
  formatTalentDate,
  options,
  reportError,
} from "./common";
import { CareerView } from "./profile";

export function Applications({ id }: { id?: string }) {
  const params = useSearchParams();
  const jobId = params.get("jobId");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, error, mutate } = useSWR(
    id
      ? `applications/${id}`
      : `applications?page=${page}${jobId ? `&jobId=${jobId}` : ""}${status ? `&status=${status}` : ""}`,
    api,
  );
  if (!data) return <Loading error={error} />;
  if (!id)
    return (
      <div className="space-y-4">
        <label className="block text-sm">
          Application status
          <select
            className="ml-3 rounded-md border border-input bg-background p-2"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {options([
              "SUBMITTED",
              "UNDER_REVIEW",
              "SHORTLISTED",
              "INTERVIEW",
              "OFFERED",
              "HIRED",
              "REJECTED",
              "WITHDRAWN",
            ]).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!data.applications.length && <Panel>No applications to show.</Panel>}
        {data.applications.map((app: any) => (
          <Panel key={app.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{app.job.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {app.job.organization}
                  {jobId
                    ? ` · ${app.redactedAt ? "Personal content removed" : app.applicant.name}`
                    : ""}
                </p>
              </div>
              <Badge variant="secondary">{talentLabel(app.status)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted {formatTalentDate(app.submittedAt)}
            </p>
            <Button asChild variant="outline">
              <Link href={`/talent/applications/${app.id}`}>
                View application
              </Link>
            </Button>
          </Panel>
        ))}
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page * 20 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  const app = data.application;
  return (
    <div className="space-y-5">
      <Panel title={app.job.title}>
        <Badge>{talentLabel(app.status)}</Badge>
        <p className="text-sm text-muted-foreground">
          {app.job.organization} · Submitted {formatTalentDate(app.submittedAt)}
        </p>
        {app.redactedAt && (
          <p className="text-sm">
            Personal content was removed under the recruitment retention policy.
          </p>
        )}
        {app.isCandidate &&
          !["HIRED", "REJECTED", "WITHDRAWN"].includes(app.status) && (
            <Action
              onAction={async () => {
                if (
                  !window.confirm(
                    "Withdraw this application? You cannot reapply to the same job.",
                  )
                )
                  return;
                await api(`applications/${id}`, "PATCH", {
                  status: "WITHDRAWN",
                  expectedStatus: app.status,
                });
                await mutate();
              }}
            >
              Withdraw application
            </Action>
          )}
        {app.canManage && (
          <div className="flex flex-wrap gap-2">
            {app.allowedStatuses.map((status: string) => (
              <Action
                key={status}
                onAction={async () => {
                  await api(`applications/${id}`, "PATCH", {
                    status,
                    expectedStatus: app.status,
                  });
                  await mutate();
                }}
              >
                Mark {talentLabel(status).toLowerCase()}
              </Action>
            ))}
          </div>
        )}
        <Link
          className="text-sm text-primary underline"
          href="/talent/messages"
        >
          Recruitment messages
        </Link>
      </Panel>
      {app.snapshot?.profile ? (
        <CareerView profile={app.snapshot.profile} />
      ) : (
        !app.redactedAt && (
          <Panel>
            No career-profile snapshot is available for this submission.
          </Panel>
        )
      )}
      {app.snapshot && (
        <Panel title="Submitted answers and documents">
          {app.snapshot.contact?.email && (
            <p className="text-sm">
              Applicant email:{" "}
              <span suppressHydrationWarning>{app.snapshot.contact.email}</span>
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm">{app.coverLetter}</p>
          {app.snapshot.job?.applicationConfig?.questions.map((q: any) => (
            <div key={q.id}>
              <h3 className="text-sm font-semibold">{q.label}</h3>
              <p className="whitespace-pre-wrap text-sm">
                {app.answers?.[q.id] || "Not answered"}
              </p>
            </div>
          ))}
          {[app.resumeAssetId, ...app.attachmentIds]
            .filter(Boolean)
            .map((assetId: string, i: number) => (
              <Button key={assetId} asChild variant="outline">
                <a
                  href={`/api/uploads/${assetId}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {assetId === app.resumeAssetId
                    ? "Open CV"
                    : `Open document ${i + 1}`}
                </a>
              </Button>
            ))}
        </Panel>
      )}
      <Panel title="Application history">
        {app.statusEvents.map((event: any, i: number) => (
          <p className="text-sm" key={i}>
            {talentLabel(event.toStatus)} · {formatTalentDate(event.createdAt)}
          </p>
        ))}
      </Panel>
      {!app.isCandidate && app.notes && (
        <Panel title="Internal hiring notes">
          <p className="text-xs text-muted-foreground">
            Only the authorized hiring team can see these notes.
          </p>
          {app.notes.map((note: any) => (
            <div key={note.id} className="border-t border-border py-3">
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
              <p className="text-xs text-muted-foreground">
                {formatTalentDate(note.createdAt)}
              </p>
            </div>
          ))}
          <TalentForm
            fields={[
              {
                name: "body",
                label: "Private team note",
                type: "textarea",
                required: true,
              },
            ]}
            defaults={{ body: "" }}
            submitLabel="Add internal note"
            onSave={async (values) => {
              await api(`applications/${id}/notes`, "POST", values);
              toast.success("Internal note added");
              await mutate();
            }}
          />
        </Panel>
      )}
    </div>
  );
}
export function Messages() {
  const [listPage, setListPage] = useState(1);
  const { data, error } = useSWR(`conversations?page=${listPage}`, api, {
    refreshInterval: 15000,
  });
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Conversations">
        {!data.conversations.length && (
          <p className="text-sm text-muted-foreground">
            Conversations start with an application or an accepted job
            invitation.
          </p>
        )}
        {data.conversations.map((conversation: any) => (
          <button
            className="block w-full space-y-1 rounded-lg border border-border p-3 text-left hover:bg-muted"
            key={conversation.id}
            onClick={() => setSelected(conversation.id)}
          >
            <span className="block text-sm font-semibold">
              {conversation.job.title}
            </span>
            <span className="block text-xs text-muted-foreground">
              {conversation.job.organization} · {conversation.candidate.name}
            </span>
            <span className="block text-xs">
              {talentLabel(conversation.status)}
            </span>
          </button>
        ))}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            disabled={listPage === 1}
            onClick={() => setListPage(listPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            disabled={data.conversations.length < 50}
            onClick={() => setListPage(listPage + 1)}
          >
            Next
          </Button>
        </div>
      </Panel>
      {selected ? (
        <Conversation key={selected} id={selected} />
      ) : (
        <Panel>Select a conversation.</Panel>
      )}
    </div>
  );
}
function Conversation({ id }: { id: string }) {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const { data, error, mutate } = useSWR(
    `conversations/${id}?page=${page}`,
    api,
    { refreshInterval: 10000 },
  );
  if (!data) return <Loading error={error} />;
  const conversation = data.conversation;
  const candidate = session?.user?.id === conversation.candidateId;
  return (
    <Panel title={conversation.title}>
      <p className="text-sm text-muted-foreground">
        {conversation.organization}
      </p>
      <Badge variant="outline">{talentLabel(conversation.status)}</Badge>
      {conversation.status === "INVITED" && candidate && (
        <div className="space-y-3">
          <p className="text-sm">
            This hiring team wants to discuss a specific job. Accept to allow
            messages.
          </p>
          <Link
            className="text-primary underline"
            href={`/talent/jobs/${conversation.jobId}`}
          >
            Review the job
          </Link>
          <div className="flex gap-2">
            <Action
              variant="default"
              onAction={async () => {
                await api(`conversations/${id}`, "PATCH", { accept: true });
                await mutate();
              }}
            >
              Accept invitation
            </Action>
            <Action
              onAction={async () => {
                await api(`conversations/${id}`, "PATCH", { accept: false });
                await mutate();
              }}
            >
              Decline
            </Action>
          </div>
        </div>
      )}
      {data.messages.map((message: any) => (
        <div
          key={message.id}
          className={`max-w-prose space-y-1 rounded-lg p-3 ${message.senderId === session?.user?.id ? "ml-auto bg-primary/10" : "bg-muted"}`}
        >
          <p className="text-xs font-medium">
            {message.senderId === session?.user?.id
              ? "You"
              : message.senderId === conversation.candidateId
                ? "Candidate"
                : "Hiring team"}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.body}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTalentDate(message.createdAt)}
          </p>
        </div>
      ))}
      <div className="flex gap-2">
        {page > 1 && (
          <Button variant="ghost" onClick={() => setPage(page - 1)}>
            Newer messages
          </Button>
        )}
        {data.hasMore && (
          <Button variant="ghost" onClick={() => setPage(page + 1)}>
            Older messages
          </Button>
        )}
      </div>
      {conversation.status === "ACCEPTED" && !data.blocked && (
        <TalentForm
          key={data.messages.at(-1)?.id || "message"}
          defaults={{ body: "" }}
          fields={[
            {
              name: "body",
              label: "Message",
              type: "textarea",
              required: true,
            },
          ]}
          submitLabel="Send message"
          onSave={async (values) => {
            await api(`conversations/${id}/messages`, "POST", {
              body: values.body,
              clientId: crypto.randomUUID(),
            });
            await mutate();
          }}
        />
      )}
      {candidate && (
        <Action
          onAction={async () => {
            await api(
              `blocks/${conversation.hiringProfileId}`,
              data.blocked ? "DELETE" : "POST",
              {},
            );
            await mutate();
          }}
        >
          {data.blocked ? "Unblock hiring team" : "Block hiring team"}
        </Action>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Report this conversation
        </summary>
        <TalentForm
          defaults={{ reason: "" }}
          fields={[
            {
              name: "reason",
              label: "Reason",
              type: "textarea",
              required: true,
            },
          ]}
          submitLabel="Report conversation"
          onSave={async (values) => {
            await api("reports", "POST", {
              targetType: "CONVERSATION",
              targetId: id,
              reason: values.reason,
            });
            toast.success("Report sent");
          }}
        />
      </details>
    </Panel>
  );
}
export function People({ initialProfile }: { initialProfile?: any }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, error } = useSWR(
    initialProfile ? null : `people?q=${encodeURIComponent(q)}&page=${page}`,
    api,
  );
  const { data: me } = useSWR("me", api);
  const { data: managed } = useSWR(me ? "jobs?mine=1" : null, api);
  if (initialProfile)
    return (
      <div className="space-y-5">
        <CareerView profile={initialProfile} />
        {managed?.jobs?.length > 0 && (
          <Panel title="Invite to a job">
            <TalentForm
              defaults={{ jobId: managed.jobs[0].id }}
              fields={[
                {
                  name: "jobId",
                  label: "Job",
                  type: "select",
                  options: managed.jobs.map((job: any) => ({
                    value: job.id,
                    label: job.title,
                  })),
                },
              ]}
              submitLabel="Invite candidate"
              onSave={async (values) => {
                await api(`jobs/${values.jobId}/invite`, "POST", {
                  candidateId: initialProfile.userId,
                });
                toast.success(
                  "Invitation sent. Messaging starts after acceptance.",
                );
              }}
            />
          </Panel>
        )}
      </div>
    );
  return (
    <div className="space-y-4">
      <TalentForm
        defaults={{ q: "" }}
        fields={[{ name: "q", label: "Name, headline, specialty or skill" }]}
        submitLabel="Search professionals"
        onSave={async (values) => {
          setQ(values.q);
          setPage(1);
        }}
      />
      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Only members who chose to share their profiles appear here.
          </p>
          {!data.results.length && (
            <Panel>No shared profiles match your search.</Panel>
          )}
          {data.results.map((profile: any) => (
            <Panel key={profile.userId} title={profile.user.name}>
              <p className="text-sm">{profile.headline}</p>
              <p className="text-sm text-muted-foreground">
                {profile.location} · {profile.specialty}
              </p>
              <p className="text-xs text-muted-foreground">
                GPS credibility: {profile.user.credibilityScore}
              </p>
              <Link
                className="text-primary underline"
                href={`/talent/people/${profile.userId}`}
              >
                View professional profile
              </Link>
            </Panel>
          ))}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!data.hasMore}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export function Saved() {
  const { data, error, mutate } = useSWR("saved-jobs", api);
  const { data: searches, mutate: refreshSearches } = useSWR(
    "saved-searches",
    api,
  );
  if (!data) return <Loading error={error} />;
  return (
    <div className="space-y-5">
      <Panel title="Saved jobs">
        {!data.saved.length && (
          <p className="text-sm text-muted-foreground">
            Save interesting jobs while you browse.
          </p>
        )}
        {data.saved.map((saved: any) => (
          <div
            key={saved.jobId}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"
          >
            <Link
              className="text-primary underline"
              href={`/talent/jobs/${saved.jobId}`}
            >
              {saved.job.title} · {saved.job.organization}
            </Link>
            <Action
              onAction={async () => {
                await api(`saved-jobs/${saved.jobId}`, "DELETE");
                await mutate();
              }}
            >
              Remove
            </Action>
          </div>
        ))}
      </Panel>
      <Panel title="Saved searches and daily alerts">
        {searches?.searches.map((search: any) => (
          <div
            key={search.id}
            className="space-y-2 border-t border-border py-3"
          >
            <h3 className="font-medium">
              <Link
                className="text-primary underline"
                href={`/talent?${new URLSearchParams(Object.fromEntries(Object.entries(search.filters).map(([key, value]) => [key, String(value)]))).toString()}`}
              >
                {search.name}
              </Link>
            </h3>
            <p className="text-xs text-muted-foreground">
              {search.alertsEnabled ? "Daily alerts enabled" : "Alerts paused"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Action
                onAction={async () => {
                  await api(`saved-searches/${search.id}`, "PUT", {
                    name: search.name,
                    filters: search.filters,
                    alertsEnabled: !search.alertsEnabled,
                  });
                  await refreshSearches();
                }}
              >
                {search.alertsEnabled ? "Pause alerts" : "Enable alerts"}
              </Action>
              <Action
                onAction={async () => {
                  await api(`saved-searches/${search.id}`, "DELETE");
                  await refreshSearches();
                }}
              >
                Delete search
              </Action>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
export function TeamInvitation() {
  const { data: session } = useSession();
  const [token, setToken] = useState("");
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    const code =
      window.location.hash.slice(1) ||
      sessionStorage.getItem("talent-team-invitation") ||
      "";
    setToken(code);
    if (code) sessionStorage.setItem("talent-team-invitation", code);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return (
    <Panel title="Join a hiring team">
      {accepted ? (
        <>
          <p>You have joined the hiring team.</p>
          <Link href="/talent/hiring" className="text-primary underline">
            Open hiring workspace
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm">
            You must sign in using the email address that received this
            invitation.
          </p>
          <label className="block text-sm">
            Invitation code
            <Input value={token} onChange={(e) => setToken(e.target.value)} />
          </label>
          {session ? (
            <Action
              disabled={!token}
              variant="default"
              onAction={async () => {
                await api("team-invitations", "POST", { token });
                sessionStorage.removeItem("talent-team-invitation");
                setAccepted(true);
              }}
            >
              Accept team invitation
            </Action>
          ) : (
            <Button asChild>
              <a
                href="/login?callbackUrl=/talent/team-invitation"
                onClick={() =>
                  sessionStorage.setItem("talent-team-invitation", token)
                }
              >
                Sign in to accept
              </a>
            </Button>
          )}
        </>
      )}
    </Panel>
  );
}
export function TalentAdmin() {
  const { data, error, mutate } = useSWR("admin", api);
  if (!data) return <Loading error={error} />;
  return (
    <div className="space-y-5">
      <Panel title="Hiring identity review">
        {data.profiles.map((profile: any) => (
          <section
            className="space-y-3 border-t border-border pt-4"
            key={profile.id}
          >
            <h3 className="font-semibold">{profile.name}</h3>
            <Badge variant="outline">{talentLabel(profile.verification)}</Badge>
            <p className="text-sm">{profile.verificationStatement}</p>
            {profile.website && (
              <a
                className="text-primary underline"
                href={profile.website}
                target="_blank"
                rel="noreferrer"
              >
                Organization website
              </a>
            )}
            <div className="flex flex-wrap gap-2">
              {profile.verificationAssetIds.map((id: string) => (
                <a
                  key={id}
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/uploads/${id}/download`}
                >
                  Review evidence
                </a>
              ))}
            </div>
            <TalentForm
              defaults={{ verification: "VERIFIED", note: "" }}
              fields={[
                {
                  name: "verification",
                  label: "Decision",
                  type: "select",
                  options: options(["VERIFIED", "REJECTED", "SUSPENDED"]),
                },
                {
                  name: "note",
                  label: "Review reason",
                  type: "textarea",
                  required: true,
                },
              ]}
              submitLabel="Record review"
              onSave={async (values) => {
                await api(`admin/hiring/${profile.id}`, "PATCH", values);
                toast.success("Review recorded");
                await mutate();
              }}
            />
          </section>
        ))}
      </Panel>
      <Panel title="Reported content">
        {!data.reports.length && (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        )}
        {data.reports.map((report: any) => (
          <section
            key={report.id}
            className="space-y-3 border-t border-border pt-4"
          >
            <p className="text-sm">{report.reason}</p>
            <ReportContent id={report.id} />
            <TalentForm
              defaults={{ resolution: "", closeJob: false }}
              fields={[
                {
                  name: "resolution",
                  label: "Resolution",
                  type: "textarea",
                  required: true,
                },
                ...(report.targetType === "JOB"
                  ? [
                      {
                        name: "closeJob",
                        label: "Close this job to new applications",
                        type: "checkbox" as const,
                      },
                    ]
                  : []),
              ]}
              submitLabel="Resolve report"
              onSave={async (values) => {
                await api(`admin/reports/${report.id}`, "PATCH", values);
                await mutate();
              }}
            />
          </section>
        ))}
      </Panel>
      <Panel title="Recruitment retention hold">
        <TalentForm
          defaults={{ applicationId: "", retentionHold: true, holdReason: "" }}
          fields={[
            { name: "applicationId", label: "Application ID", required: true },
            {
              name: "retentionHold",
              label: "Hold recruitment content from automatic deletion",
              type: "checkbox",
            },
            {
              name: "holdReason",
              label: "Recorded reason",
              type: "textarea",
              required: true,
            },
          ]}
          submitLabel="Update retention hold"
          onSave={async (values) => {
            await api(`admin/holds/${values.applicationId}`, "PATCH", {
              retentionHold: values.retentionHold,
              holdReason: values.holdReason,
            });
            toast.success("Retention hold updated");
          }}
        />
      </Panel>
    </div>
  );
}

function ReportContent({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { data, error } = useSWR(open ? `admin/reports/${id}` : null, api);
  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(!open)}>
        {open ? "Hide reported content" : "Review reported content"}
      </Button>
      {open &&
        (data ? (
          <div className="mt-3 space-y-3 rounded bg-muted p-3 text-sm">
            {!data.content || data.content.redactedAt ? (
              <p>Personal content is no longer retained.</p>
            ) : data.content.messages ? (
              data.content.messages.map((message: any, index: number) => (
                <div key={index}>
                  <p className="whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTalentDate(message.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <>
                <h3 className="font-semibold">{data.content.title}</h3>
                {[
                  data.content.summary,
                  data.content.responsibilities,
                  data.content.requirements,
                ].map((text: string, index: number) => (
                  <p className="whitespace-pre-wrap" key={index}>
                    {text}
                  </p>
                ))}
              </>
            )}
          </div>
        ) : (
          <Loading error={error} />
        ))}
    </div>
  );
}
