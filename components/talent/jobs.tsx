"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { talentLabel } from "@/lib/pax-labels";
import { employmentTypes, workModes } from "@/lib/talent-validation";
import {
  api,
  Panel,
  Loading,
  TalentForm,
  Action,
  UploadPicker,
  formatTalentDate,
  options,
  reportError,
} from "./common";

export function JobSearch() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const [filters, setFilters] = useState({
    q: "",
    country: "",
    workMode: "",
    employmentType: "",
    specialty: "",
    skill: "",
    sort: "NEWEST",
    page: "1",
    ...Object.fromEntries(params.entries()),
  });
  const query = new URLSearchParams(filters).toString();
  const { data, error } = useSWR(`jobs?${query}`, api);
  return (
    <div className="space-y-5">
      <Panel title="Find your next health-sector role">
        <TalentForm
          layout="toolbar"
          defaults={filters}
          submitLabel="Search jobs"
          fields={[
            {
              name: "q",
              label: "Role, organization or keyword",
              className: "xl:col-span-4",
            },
            {
              name: "country",
              label: "Country code (optional)",
              className: "xl:col-span-2",
            },
            {
              name: "workMode",
              className: "xl:col-span-3",
              label: "Work arrangement",
              type: "select",
              options: [
                { value: "", label: "Any arrangement" },
                ...options(workModes),
              ],
            },
            {
              name: "employmentType",
              className: "xl:col-span-3",
              label: "Employment type",
              type: "select",
              options: [
                { value: "", label: "Any employment type" },
                ...options(employmentTypes),
              ],
            },
            {
              name: "specialty",
              label: "Profession or specialty",
              className: "xl:col-span-4",
            },
            {
              name: "skill",
              label: "Required skill",
              className: "xl:col-span-3",
            },
            {
              name: "sort",
              className: "xl:col-span-3",
              label: "Sort",
              type: "select",
              options: [
                { value: "NEWEST", label: "Newest first" },
                { value: "MATCH", label: "Match my profile" },
              ],
            },
          ]}
          onSave={async (values) =>
            setFilters({
              ...filters,
              ...values,
              country: values.country.toUpperCase(),
              page: "1",
            })
          }
        />
        {session && (
          <Action
            onAction={async () => {
              await api("saved-searches", "POST", {
                name: filters.q || "My health-sector job search",
                filters: { ...filters, page: 1 },
                alertsEnabled: true,
              });
              toast.success("Search saved with daily job alerts");
            }}
          >
            Save search and enable daily alerts
          </Action>
        )}
      </Panel>
      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.total} open roles
          </p>
          {!data.jobs.length && (
            <Panel>No jobs match these filters. Try a broader search.</Panel>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            {data.jobs.map((job: any) => (
              <Panel key={job.id}>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {talentLabel(job.employmentType)}
                  </Badge>
                  <Badge variant="outline">{talentLabel(job.workMode)}</Badge>
                </div>
                <h2 className="text-lg font-semibold">
                  <Link
                    href={`/talent/jobs/${job.id}`}
                    className="hover:text-primary"
                  >
                    {job.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {job.organization} ·{" "}
                  {[job.location, job.country].filter(Boolean).join(", ")}
                </p>
                <p className="line-clamp-3 text-sm">{job.summary}</p>
                {job.match && (
                  <p className="text-xs text-muted-foreground">
                    Matches:{" "}
                    {job.match.matched.join(" · ") ||
                      "No declared preferences yet"}
                    {job.match.missing.length > 0 && (
                      <span className="block mt-1">
                        Not matched: {job.match.missing.join(" · ")}
                      </span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/talent/jobs/${job.id}`}>View and apply</Link>
                  </Button>
                  {session && (
                    <Action
                      onAction={async () => {
                        await api(`saved-jobs/${job.id}`, "POST");
                        toast.success("Job saved");
                      }}
                    >
                      Save job
                    </Action>
                  )}
                </div>
              </Panel>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={Number(filters.page) <= 1}
              onClick={() =>
                setFilters({
                  ...filters,
                  page: String(Number(filters.page) - 1),
                })
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={Number(filters.page) * 20 >= data.total}
              onClick={() =>
                setFilters({
                  ...filters,
                  page: String(Number(filters.page) + 1),
                })
              }
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export function JobDetail({
  job: initialJob,
  loginUrl,
}: {
  job: any;
  loginUrl: string;
}) {
  const { data: session } = useSession();
  const { data } = useSWR(`jobs/${initialJob.id}`, api, {
    fallbackData: { job: initialJob },
  });
  const job = data.job;
  const [applying, setApplying] = useState(false);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <Panel>
          <div className="flex flex-wrap gap-2">
            <Badge>{talentLabel(job.employmentType)}</Badge>
            <Badge variant="outline">{talentLabel(job.workMode)}</Badge>
          </div>
          <h2 className="text-2xl font-semibold">{job.title}</h2>
          <Link
            className="text-primary underline"
            href={`/talent/companies/${job.hiringProfile.slug}`}
          >
            {job.organization}
          </Link>
          <p className="text-sm text-muted-foreground">
            {[job.location, job.country].filter(Boolean).join(", ")}
          </p>
          {job.salaryCurrency &&
            (job.salaryMinMinor != null || job.salaryMaxMinor != null) && (
              <p className="text-sm">
                {[job.salaryMinMinor, job.salaryMaxMinor]
                  .filter((v) => v != null)
                  .map((value) =>
                    new Intl.NumberFormat("en-KE", {
                      style: "currency",
                      currency: job.salaryCurrency,
                    }).format(value / 100),
                  )
                  .join(" – ")}{" "}
                per {talentLabel(job.salaryPeriod).toLowerCase()}
              </p>
            )}
          {[
            ["About the role", job.summary],
            ["Responsibilities", job.responsibilities],
            ["Requirements", job.requirements],
          ].map(([label, value]) => (
            <section key={label} className="space-y-2">
              <h3 className="font-semibold">{label}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {value}
              </p>
            </section>
          ))}
          <p className="text-sm">
            Required skills:{" "}
            {job.requiredSkills.join(", ") || "See role requirements"}
          </p>
          <p className="text-sm">
            Desirable skills:{" "}
            {job.desirableSkills.join(", ") || "Not specified"}
          </p>
          {job.remoteCountries.length > 0 && (
            <p className="text-sm">
              Remote eligibility: {job.remoteCountries.join(", ")}
            </p>
          )}
        </Panel>
        {applying && <ApplyForm job={job} />}
      </div>
      <Panel title="Apply for this role">
        {job.closesAt && (
          <p className="text-sm">
            Deadline: {formatTalentDate(job.closesAt)} (Nairobi)
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Apply with your career profile and selected GPS entries. Your clinical
          records remain private.
        </p>
        {session ? (
          <Button className="w-full" onClick={() => setApplying(true)}>
            Apply now
          </Button>
        ) : (
          <Button asChild className="w-full">
            <a href={loginUrl}>Sign in to apply</a>
          </Button>
        )}
        {session && (
          <>
            <Action
              onAction={async () => {
                await api(`saved-jobs/${job.id}`, "POST");
                toast.success("Job saved");
              }}
            >
              Save job
            </Action>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Report this job
              </summary>
              <TalentForm
                defaults={{ reason: "" }}
                fields={[
                  {
                    name: "reason",
                    label: "Reason for reporting",
                    type: "textarea",
                    required: true,
                  },
                ]}
                submitLabel="Send report"
                onSave={async (values) => {
                  await api("reports", "POST", {
                    targetType: "JOB",
                    targetId: job.id,
                    reason: values.reason,
                  });
                  toast.success("Report sent for human review");
                }}
              />
            </details>
          </>
        )}
      </Panel>
    </div>
  );
}
function ApplyForm({ job }: { job: any }) {
  const { data: me, error } = useSWR("me", api);
  const { data: draft } = useSWR(`jobs/${job.id}/draft`, api);
  const { data: gps } = useSWR("/api/gps-entries", api);
  if (!me || !draft) return <Loading error={error} />;
  if (!me.profile)
    return (
      <Panel title="Create your career profile first">
        <p className="text-sm">
          Your profile is private until you choose to share it. No clinical
          licence or paid membership is required.
        </p>
        <Button asChild>
          <Link href="/talent/profile">Create career profile</Link>
        </Button>
      </Panel>
    );
  return (
    <ApplicationFields
      job={job}
      initial={draft.draft?.content}
      me={me}
      gps={gps || []}
    />
  );
}
function ApplicationFields({
  job,
  initial,
  me,
  gps,
}: {
  job: any;
  initial: any;
  me: any;
  gps: any[];
}) {
  const router = useRouter();
  const config = job.applicationConfig;
  const [cv, setCv] = useState<string | null>(
    initial?.resumeAssetId || me.profile.savedResumeAssetId || null,
  );
  const [letter, setLetter] = useState<string | null>(
    initial?.coverLetterAssetId || null,
  );
  const [coverLetter, setCoverLetter] = useState(initial?.coverLetter || "");
  const [documents, setDocuments] = useState<Array<string | null>>(
    initial?.documentAssetIds?.length ? initial.documentAssetIds : [null],
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    initial?.answers || {},
  );
  const [gpsIds, setGpsIds] = useState<string[]>(
    initial?.sharedGpsIds || me.profile.sharedGpsIds || [],
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const payload = () => ({
    resumeAssetId: config.cv === "HIDDEN" ? null : cv,
    coverLetter: config.coverLetter === "HIDDEN" ? "" : coverLetter,
    coverLetterAssetId: config.coverLetter === "HIDDEN" ? null : letter,
    documentAssetIds:
      config.documents === "HIDDEN" ? [] : documents.filter(Boolean),
    answers: Object.fromEntries(
      config.questions.map((q: any) => [q.id, answers[q.id] || ""]),
    ),
    sharedGpsIds: gpsIds,
    jobVersion: job.version,
    consent,
  });
  return (
    <Panel title="Your application">
      {initial && initial.jobVersion !== job.version && (
        <p role="alert" className="text-sm text-destructive">
          This job has changed since your draft. Review all current requirements
          before submitting.
        </p>
      )}
      {config.cv !== "HIDDEN" && (
        <UploadPicker
          label={`CV (${talentLabel(config.cv).toLowerCase()})`}
          purpose="TALENT_RESUME"
          value={cv}
          onChange={setCv}
          accept=".pdf,.docx"
        />
      )}
      {config.coverLetter !== "HIDDEN" && (
        <>
          <label className="block text-sm font-medium">
            Cover letter ({talentLabel(config.coverLetter).toLowerCase()})
            <Textarea
              className="mt-2"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </label>
          <UploadPicker
            label="Or upload a cover letter"
            purpose="TALENT_DOCUMENT"
            value={letter}
            onChange={setLetter}
            accept=".pdf,.docx"
          />
        </>
      )}
      {config.documents !== "HIDDEN" && (
        <section className="space-y-2">
          <h3 className="font-medium">
            Supporting documents ({talentLabel(config.documents).toLowerCase()})
          </h3>
          {documents.map((id, index) => (
            <UploadPicker
              key={index}
              label={`Supporting document ${index + 1}`}
              purpose="TALENT_DOCUMENT"
              value={id}
              onChange={(value) =>
                setDocuments(
                  documents.map((old, i) => (index === i ? value : old)),
                )
              }
              accept=".pdf,.jpg,.jpeg,.png"
            />
          ))}
          {documents.length < 5 && (
            <Button
              variant="outline"
              onClick={() => setDocuments([...documents, null])}
            >
              Add supporting document
            </Button>
          )}
        </section>
      )}
      {config.questions.map((question: any) => (
        <label key={question.id} className="block text-sm font-medium">
          {question.label}
          {question.required ? " (required)" : ""}
          {["YES_NO", "SINGLE_CHOICE"].includes(question.type) ? (
            <select
              value={answers[question.id] || ""}
              onChange={(e) =>
                setAnswers({ ...answers, [question.id]: e.target.value })
              }
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="">Select an answer</option>
              {(question.type === "YES_NO"
                ? ["Yes", "No"]
                : question.options
              ).map((v: string) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          ) : (
            <Textarea
              className="mt-2"
              rows={question.type === "SHORT_TEXT" ? 2 : 4}
              value={answers[question.id] || ""}
              onChange={(e) =>
                setAnswers({ ...answers, [question.id]: e.target.value })
              }
            />
          )}
        </label>
      ))}
      <fieldset className="space-y-2">
        <legend className="mb-2 font-medium">
          GPS entries shared with this application
        </legend>
        {gps.map((entry) => (
          <label key={entry.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={gpsIds.includes(entry.id)}
              onChange={(e) =>
                setGpsIds(
                  e.target.checked
                    ? [...gpsIds, entry.id]
                    : gpsIds.filter((id) => id !== entry.id),
                )
              }
            />
            {entry.title}
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-muted-foreground">
        The hiring team receives a snapshot of your career profile, selected GPS
        entries, email, answers and submitted documents. Later profile changes
        do not alter this submission.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        I consent to sharing this application with this hiring team.
      </label>
      <div className="flex flex-wrap gap-2">
        <Action
          disabled={busy}
          onAction={async () => {
            await api(`jobs/${job.id}/draft`, "PUT", payload());
            toast.success("Draft saved");
          }}
        >
          Save draft
        </Action>
        <Button
          disabled={!consent || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`jobs/${job.id}/draft`, "PUT", payload());
              await api(`jobs/${job.id}/apply`, "POST", payload());
              toast.success("Application submitted");
              router.push("/talent/applications");
            } catch (error) {
              reportError(error);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Submitting…" : "Submit application"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Uploaded documents must finish security scanning before submission. You
        can save your draft and return later.
      </p>
    </Panel>
  );
}
