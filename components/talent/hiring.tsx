"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { talentLabel } from "@/lib/pax-labels";
import { employmentTypes, workModes } from "@/lib/talent-validation";
import {
  api,
  Panel,
  Loading,
  TalentForm,
  Action,
  UploadPicker,
  splitTags,
  options,
  type FieldSpec,
} from "./common";

export function HiringHome() {
  const { data, error, mutate } = useSWR("hiring", api);
  const { data: jobs, mutate: refreshJobs } = useSWR("jobs?mine=1", api);
  const [creating, setCreating] = useState(false);
  if (!data) return <Loading error={error} />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCreating(!creating)}>
          Create hiring profile
        </Button>
        <Button asChild variant="outline">
          <Link href="/talent/hiring/jobs/new">Post a job</Link>
        </Button>
      </div>
      {creating && (
        <HiringProfileForm
          onSaved={async () => {
            setCreating(false);
            await mutate();
          }}
        />
      )}
      {!data.profiles.length && (
        <Panel title="Start hiring">
          <p className="text-sm text-muted-foreground">
            Create a personal or company hiring profile. You can prepare jobs
            immediately; publication starts after an administrator verifies your
            hiring identity.
          </p>
        </Panel>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {data.profiles.map((profile: any) => (
          <Panel key={profile.id} title={profile.name}>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {talentLabel(profile.verification)}
              </Badge>
              <Badge variant="outline">{talentLabel(profile.myRole)}</Badge>
            </div>
            <p className="text-sm">{profile.description}</p>
            <Button asChild variant="outline">
              <Link href={`/talent/hiring/${profile.id}`}>
                Manage hiring profile
              </Link>
            </Button>
          </Panel>
        ))}
      </div>
      <Panel title="Your jobs">
        {jobs?.jobs.length ? (
          jobs.jobs.map((job: any) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"
            >
              <div>
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {job.organization} · {talentLabel(job.status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/talent/hiring/jobs/${job.id}`}>Manage job</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/talent/applications?jobId=${job.id}`}>
                    {job._count.applications} applications
                  </Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No jobs yet.</p>
        )}
      </Panel>
      {jobs?.legacyCount > 0 && (
        <Panel title="Existing PAX jobs">
          <p className="text-sm">
            You have {jobs.legacyCount} existing jobs. Link them to one of your
            hiring profiles to use the new team workflow. They become publicly
            discoverable after hiring verification.
          </p>
          {data.profiles
            .filter((p: any) => p.myRole === "OWNER")
            .map((profile: any) => (
              <Action
                key={profile.id}
                onAction={async () => {
                  await api(`hiring/${profile.id}/legacy`, "POST", {});
                  await refreshJobs();
                }}
              >
                Link existing jobs to {profile.name}
              </Action>
            ))}
        </Panel>
      )}
    </div>
  );
}
export function HiringProfileForm({
  profile,
  onSaved,
}: {
  profile?: any;
  onSaved: () => Promise<unknown>;
}) {
  const [logo, setLogo] = useState<string | null>(profile?.logoAssetId || null);
  const [evidence, setEvidence] = useState<string | null>(
    profile?.verificationAssetIds?.[0] || null,
  );
  return (
    <Panel title={profile ? "Hiring profile details" : "New hiring profile"}>
      <TalentForm
        defaults={{
          kind: profile?.kind || "ORGANIZATION",
          name: profile?.name || "",
          description: profile?.description || "",
          website: profile?.website || "",
          location: profile?.location || "",
          country: profile?.country || "KE",
          verificationStatement: profile?.verificationStatement || "",
        }}
        fields={[
          {
            name: "kind",
            label: "Hiring as",
            type: "select",
            options: options(
              profile ? [profile.kind] : ["PERSONAL", "ORGANIZATION"],
            ),
          },
          { name: "name", label: "Hiring name", required: true },
          {
            name: "description",
            label: "About you or your organization",
            type: "textarea",
          },
          { name: "website", label: "Website (https://…)" },
          { name: "location", label: "City or region" },
          { name: "country", label: "Country code", required: true },
          {
            name: "verificationStatement",
            label: "Hiring identity and authority",
            type: "textarea",
            hint: "Explain who you are and your authority to hire. An administrator reviews this privately.",
          },
        ]}
        onSave={async (values) => {
          await api(
            profile ? `hiring/${profile.id}` : "hiring",
            profile ? "PUT" : "POST",
            {
              ...values,
              website: values.website || null,
              country: values.country.toUpperCase(),
              logoAssetId: logo,
              verificationAssetIds: evidence ? [evidence] : [],
            },
          );
          toast.success("Hiring profile saved");
          await onSaved();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadPicker
            label="Company logo or hiring photo"
            purpose="PROFILE_IMAGE"
            value={logo}
            onChange={setLogo}
            accept=".jpg,.jpeg,.png"
          />
          <UploadPicker
            label="Private verification evidence (optional)"
            purpose="VERIFICATION_DOCUMENT"
            value={evidence}
            onChange={setEvidence}
            accept=".pdf,.jpg,.jpeg,.png"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Changing the hiring name or website requires a new identity review and
          closes published jobs to new applications.
        </p>
      </TalentForm>
    </Panel>
  );
}
export function HiringDetail({ id }: { id: string }) {
  const { data, error, mutate } = useSWR(`hiring/${id}`, api);
  const [link, setLink] = useState("");
  if (!data) return <Loading error={error} />;
  const canManage = ["OWNER", "ADMIN"].includes(data.myRole);
  return (
    <div className="space-y-5">
      <Panel title={data.profile.name}>
        <Badge>{talentLabel(data.profile.verification)}</Badge>
        {data.profile.verificationNote && (
          <p className="text-sm">
            Review note: {data.profile.verificationNote}
          </p>
        )}
        {canManage &&
          ["DRAFT", "REJECTED"].includes(data.profile.verification) && (
            <Action
              variant="default"
              onAction={async () => {
                await api(`hiring/${id}/verify`, "POST", {});
                toast.success("Submitted for verification");
                await mutate();
              }}
            >
              Request identity verification
            </Action>
          )}
      </Panel>
      {canManage && (
        <HiringProfileForm
          key={data.profile.updatedAt}
          profile={data.profile}
          onSaved={() => mutate()}
        />
      )}
      {canManage && data.profile.kind === "ORGANIZATION" && (
        <>
          <Panel title="Invite a teammate">
            <TalentForm
              defaults={{ email: "", role: "RECRUITER" }}
              fields={[
                {
                  name: "email",
                  label: "Email address",
                  type: "email",
                  required: true,
                },
                {
                  name: "role",
                  label: "Team role",
                  type: "select",
                  options: options(["ADMIN", "RECRUITER", "REVIEWER"]),
                },
              ]}
              submitLabel="Create invitation"
              onSave={async (values) => {
                const invitation = await api(
                  `hiring/${id}/invitations`,
                  "POST",
                  values,
                );
                setLink(
                  `${window.location.origin}/talent/team-invitation#${invitation.token}`,
                );
                toast.success("Invitation created");
                await mutate();
              }}
            />
            {link && (
              <div className="space-y-2">
                <p className="text-sm">
                  Invitation link (expires in seven days; only the invited email
                  can accept):
                </p>
                <Input readOnly value={link} aria-label="Invitation link" />
                <Action
                  onAction={async () => {
                    await navigator.clipboard.writeText(link);
                    toast.success("Invitation link copied");
                  }}
                >
                  Copy invitation link
                </Action>
              </div>
            )}
          </Panel>
          <Panel title="Team members">
            {data.members.map((member: any) => (
              <div
                className="space-y-2 border-t border-border py-3"
                key={member.id}
              >
                <p className="font-medium">{member.user.name}</p>
                <p className="text-sm">
                  <span suppressHydrationWarning>{member.user.email}</span> ·{" "}
                  {member.revokedAt
                    ? "Access revoked"
                    : talentLabel(member.role)}
                </p>
                {!member.revokedAt && (
                  <div className="flex flex-wrap gap-2">
                    {["ADMIN", "RECRUITER", "REVIEWER"]
                      .filter((role) => role !== member.role)
                      .map((role) => (
                        <Action
                          key={role}
                          onAction={async () => {
                            await api(
                              `hiring/${id}/members/${member.id}`,
                              "PATCH",
                              { action: "ROLE", role },
                            );
                            await mutate();
                          }}
                        >
                          Make {talentLabel(role).toLowerCase()}
                        </Action>
                      ))}
                    <Action
                      onAction={async () => {
                        await api(
                          `hiring/${id}/members/${member.id}`,
                          "PATCH",
                          { action: "REVOKE" },
                        );
                        await mutate();
                      }}
                    >
                      Revoke access
                    </Action>
                    {data.myRole === "OWNER" && (
                      <Action
                        onAction={async () => {
                          if (
                            !window.confirm(
                              `Transfer ownership to ${member.user.name}? You will become an administrator.`,
                            )
                          )
                            return;
                          await api(
                            `hiring/${id}/members/${member.id}`,
                            "PATCH",
                            { action: "TRANSFER_OWNER" },
                          );
                          await mutate();
                        }}
                      >
                        Transfer ownership
                      </Action>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!data.members.length && (
              <p className="text-sm text-muted-foreground">No teammates yet.</p>
            )}
          </Panel>
          <Panel title="Pending invitations">
            {data.invitations
              .filter((invite: any) => !invite.acceptedAt && !invite.revokedAt)
              .map((invite: any) => (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span suppressHydrationWarning>{invite.email}</span>
                  <Action
                    onAction={async () => {
                      await api(
                        `hiring/${id}/invitations/${invite.id}`,
                        "DELETE",
                      );
                      await mutate();
                    }}
                  >
                    Revoke invitation
                  </Action>
                </div>
              ))}
          </Panel>
        </>
      )}
    </div>
  );
}
export function JobEditor({ id }: { id?: string }) {
  const { data: profiles, error } = useSWR("hiring", api);
  const {
    data: current,
    error: jobError,
    mutate,
  } = useSWR(id ? `jobs/${id}/manage` : null, api);
  if (!profiles || (id && !current))
    return <Loading error={error || jobError} />;
  if (!profiles.profiles.length)
    return (
      <Panel>
        Create a hiring profile before posting a job.{" "}
        <Link href="/talent/hiring" className="text-primary underline">
          Set up hiring
        </Link>
      </Panel>
    );
  if (current?.role === "REVIEWER")
    return (
      <Panel>
        <p className="text-sm">
          You can review applications and add internal notes for this job.
        </p>
        <Button asChild>
          <Link href={`/talent/applications?jobId=${id}`}>
            Review applications
          </Link>
        </Button>
      </Panel>
    );
  return (
    <JobFields
      key={current?.job.updatedAt || "new"}
      job={current?.job}
      profiles={profiles.profiles}
      role={current?.role}
      assignments={current?.assignments || []}
      onSaved={() => mutate()}
    />
  );
}
function JobFields({
  job,
  profiles,
  role,
  assignments,
  onSaved,
}: {
  job?: any;
  profiles: any[];
  role?: string;
  assignments: any[];
  onSaved: () => Promise<unknown>;
}) {
  const [questions, setQuestions] = useState<any[]>(
    (job?.applicationConfig.questions || []).map((q: any) => ({
      ...q,
      optionsText: q.options.join(", "),
    })),
  );
  const [hiringId, setHiringId] = useState(
    job?.hiringProfileId ||
      profiles.find((p) => p.myRole !== "REVIEWER")?.id ||
      "",
  );
  const { data: team } = useSWR(
    job ? `hiring/${job.hiringProfileId}` : null,
    api,
  );
  const [assignedIds, setAssignedIds] = useState<string[]>(
    assignments.map((a) => a.memberId),
  );
  const salary = (value: number | null) =>
    value == null ? "" : String(value / 100);
  const defaults = {
    title: job?.title || "",
    summary: job?.summary || "",
    responsibilities: job?.responsibilities || "",
    requirements: job?.requirements || "",
    healthAreas: job?.healthAreas.join(", ") || "",
    requiredSkills: job?.requiredSkills.join(", ") || "",
    desirableSkills: job?.desirableSkills.join(", ") || "",
    specialty: job?.specialty || "",
    minimumYears: job?.minimumYears == null ? "" : String(job.minimumYears),
    employmentType: job?.employmentType || "FULL_TIME",
    workMode: job?.workMode || "ONSITE",
    location: job?.location || "",
    country: job?.country || "KE",
    remoteCountries: job?.remoteCountries.join(", ") || "",
    salaryMin: salary(job?.salaryMinMinor),
    salaryMax: salary(job?.salaryMaxMinor),
    salaryCurrency: job?.salaryCurrency || "KES",
    salaryPeriod: job?.salaryPeriod || "MONTH",
    closesAt: job?.closesAt
      ? new Date(new Date(job.closesAt).getTime() + 3 * 3600000)
          .toISOString()
          .slice(0, 16)
      : "",
    status: job?.status || "DRAFT",
    cv: job?.applicationConfig.cv || "REQUIRED",
    coverLetter: job?.applicationConfig.coverLetter || "OPTIONAL",
    documents: job?.applicationConfig.documents || "OPTIONAL",
  };
  const fields: FieldSpec[] = [
    { name: "title", label: "Job title", required: true },
    { name: "specialty", label: "Profession or specialty" },
    {
      name: "summary",
      label: "About the role",
      type: "textarea",
      required: true,
    },
    {
      name: "responsibilities",
      label: "Responsibilities",
      type: "textarea",
      required: true,
    },
    {
      name: "requirements",
      label: "Qualifications and requirements",
      type: "textarea",
      required: true,
    },
    {
      name: "healthAreas",
      label: "Health areas",
      hint: "Separate with commas.",
    },
    {
      name: "requiredSkills",
      label: "Required skills",
      hint: "Separate with commas.",
    },
    {
      name: "desirableSkills",
      label: "Desirable skills",
      hint: "Separate with commas.",
    },
    {
      name: "minimumYears",
      label: "Minimum years of experience",
      type: "number",
    },
    {
      name: "employmentType",
      label: "Employment type",
      type: "select",
      options: options(employmentTypes),
    },
    {
      name: "workMode",
      label: "Work arrangement",
      type: "select",
      options: options(workModes),
    },
    { name: "location", label: "Workplace location" },
    { name: "country", label: "Country code", required: true },
    {
      name: "remoteCountries",
      label: "Eligible remote countries",
      hint: "Country codes, comma-separated. Leave empty for worldwide remote eligibility.",
    },
    { name: "salaryMin", label: "Minimum salary (optional)", type: "number" },
    { name: "salaryMax", label: "Maximum salary (optional)", type: "number" },
    { name: "salaryCurrency", label: "Salary currency code" },
    {
      name: "salaryPeriod",
      label: "Salary period",
      type: "select",
      options: options(["HOUR", "DAY", "WEEK", "MONTH", "YEAR", "PROJECT"]),
    },
    {
      name: "closesAt",
      label: "Application deadline (Nairobi time)",
      type: "datetime-local",
    },
    {
      name: "status",
      label: "Job status",
      type: "select",
      options: options(["DRAFT", "PUBLISHED", "CLOSED"]),
    },
    {
      name: "cv",
      label: "CV requirement",
      type: "select",
      options: options(["REQUIRED", "OPTIONAL", "HIDDEN"]),
    },
    {
      name: "coverLetter",
      label: "Cover letter requirement",
      type: "select",
      options: options(["REQUIRED", "OPTIONAL", "HIDDEN"]),
    },
    {
      name: "documents",
      label: "Supporting document requirement",
      type: "select",
      options: options(["REQUIRED", "OPTIONAL", "HIDDEN"]),
    },
  ];
  return (
    <div className="space-y-5">
      <Panel title={job ? job.title : "Create a job"}>
        <label className="block text-sm font-medium">
          Hiring profile
          <select
            disabled={Boolean(job)}
            value={hiringId}
            onChange={(e) => setHiringId(e.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
          >
            {profiles
              .filter((p) => p.myRole !== "REVIEWER")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {talentLabel(p.verification)}
                </option>
              ))}
          </select>
        </label>
        {job?.recruitmentClosedAt ? (
          <p className="text-sm">
            Recruitment is complete. This job and its submissions are retained
            according to the recruitment retention policy.
          </p>
        ) : (
          <TalentForm
            fields={fields}
            defaults={defaults}
            submitLabel="Save job"
            onSave={async (values) => {
              const {
                salaryMin,
                salaryMax,
                cv,
                coverLetter,
                documents,
                ...rest
              } = values;
              const result = await api(
                job ? `jobs/${job.id}` : "jobs",
                job ? "PUT" : "POST",
                {
                  ...rest,
                  hiringProfileId: hiringId,
                  version: job?.version,
                  country: values.country.toUpperCase(),
                  salaryCurrency:
                    salaryMin || salaryMax
                      ? values.salaryCurrency.toUpperCase()
                      : null,
                  salaryPeriod:
                    salaryMin || salaryMax ? values.salaryPeriod : null,
                  salaryMinMinor: salaryMin
                    ? Math.round(Number(salaryMin) * 100)
                    : null,
                  salaryMaxMinor: salaryMax
                    ? Math.round(Number(salaryMax) * 100)
                    : null,
                  minimumYears:
                    values.minimumYears === ""
                      ? null
                      : Number(values.minimumYears),
                  closesAt: values.closesAt
                    ? new Date(`${values.closesAt}:00+03:00`).toISOString()
                    : null,
                  healthAreas: splitTags(values.healthAreas),
                  requiredSkills: splitTags(values.requiredSkills),
                  desirableSkills: splitTags(values.desirableSkills),
                  remoteCountries: splitTags(values.remoteCountries).map((v) =>
                    v.toUpperCase(),
                  ),
                  applicationConfig: {
                    cv,
                    coverLetter,
                    documents,
                    questions: questions.map(({ optionsText, ...q }) => ({
                      ...q,
                      options: splitTags(optionsText || ""),
                    })),
                  },
                },
              );
              toast.success("Job saved");
              if (!job)
                window.location.assign(`/talent/hiring/jobs/${result.job.id}`);
              else await onSaved();
            }}
          >
            <section className="space-y-3">
              <h3 className="font-semibold">Screening questions</h3>
              <p className="text-xs text-muted-foreground">
                Up to ten questions. Answers are reviewed by your team; PAX does
                not reject candidates automatically.
              </p>
              {questions.map((q, index) => (
                <div
                  className="space-y-3 rounded-lg border border-border p-4"
                  key={q.id}
                >
                  <label className="block text-sm">
                    Question
                    <Input
                      value={q.label}
                      onChange={(e) =>
                        setQuestions(
                          questions.map((item, i) =>
                            i === index
                              ? { ...item, label: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Answer type
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
                      value={q.type}
                      onChange={(e) =>
                        setQuestions(
                          questions.map((item, i) =>
                            i === index
                              ? { ...item, type: e.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      {options([
                        "SHORT_TEXT",
                        "LONG_TEXT",
                        "YES_NO",
                        "SINGLE_CHOICE",
                      ]).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {q.type === "SINGLE_CHOICE" && (
                    <label className="block text-sm">
                      Choices (comma-separated)
                      <Input
                        value={q.optionsText || ""}
                        onChange={(e) =>
                          setQuestions(
                            questions.map((item, i) =>
                              i === index
                                ? { ...item, optionsText: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) =>
                        setQuestions(
                          questions.map((item, i) =>
                            i === index
                              ? { ...item, required: e.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    Required answer
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setQuestions(questions.filter((_, i) => index !== i))
                    }
                  >
                    Remove question
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={questions.length >= 10}
                onClick={() =>
                  setQuestions([
                    ...questions,
                    {
                      id: crypto.randomUUID(),
                      label: "",
                      type: "SHORT_TEXT",
                      required: false,
                      options: [],
                      optionsText: "",
                    },
                  ])
                }
              >
                Add question
              </Button>
            </section>
          </TalentForm>
        )}
        {job && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/talent/applications?jobId=${job.id}`}>
                Review applications
              </Link>
            </Button>
            {!job.recruitmentClosedAt && (
              <Action
                onAction={async () => {
                  if (
                    !window.confirm(
                      "Finish recruitment? Every applicant must have a final outcome. This starts the 12-month retention period and cannot be reopened.",
                    )
                  )
                    return;
                  await api(`jobs/${job.id}/finish`, "POST", {});
                  await onSaved();
                }}
              >
                Finish recruitment
              </Action>
            )}
          </div>
        )}
      </Panel>
      {job && ["OWNER", "ADMIN"].includes(role || "") && (
        <Panel title="Assign this job to teammates">
          <p className="text-sm text-muted-foreground">
            Owners and administrators can access all company jobs. Recruiters
            and reviewers need an assignment.
          </p>
          {team?.members
            .filter((m: any) => !m.revokedAt)
            .map((member: any) => (
              <label key={member.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignedIds.includes(member.id)}
                  onChange={(e) =>
                    setAssignedIds(
                      e.target.checked
                        ? [...assignedIds, member.id]
                        : assignedIds.filter((id) => id !== member.id),
                    )
                  }
                />
                {member.user.name} · {talentLabel(member.role)}
              </label>
            ))}
          <Action
            onAction={async () => {
              await api(`jobs/${job.id}/assignments`, "PUT", {
                memberIds: assignedIds,
              });
              toast.success("Assignments updated");
            }}
          >
            Save assignments
          </Action>
        </Panel>
      )}
    </div>
  );
}
