"use client";
import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { GpsProfile } from "@/components/dashboard/gps-profile";
import { Badge } from "@/components/ui/badge";
import {
  api,
  Panel,
  Loading,
  TalentForm,
  RecordEditor,
  UploadPicker,
  splitTags,
  options,
} from "./common";
import { employmentTypes, workModes } from "@/lib/talent-validation";

export function ProfileEditor() {
  const { data, error, mutate } = useSWR("me", api);
  if (!data) return <Loading error={error} />;
  return (
    <ProfileFields
      key={data.profile?.updatedAt || "new"}
      profile={data.profile}
      user={data.user}
      onSaved={() => mutate()}
    />
  );
}
function ProfileFields({
  profile,
  user,
  onSaved,
}: {
  profile: any;
  user: any;
  onSaved: () => Promise<unknown>;
}) {
  const { data: gps } = useSWR("/api/gps-entries", api);
  const [experiences, setExperiences] = useState(profile?.experiences || []);
  const [education, setEducation] = useState(profile?.education || []);
  const [credentials, setCredentials] = useState(profile?.credentials || []);
  const [avatar, setAvatar] = useState<string | null>(
    profile?.avatarAssetId || null,
  );
  const [resume, setResume] = useState<string | null>(
    profile?.savedResumeAssetId || null,
  );
  const [gpsIds, setGpsIds] = useState<string[]>(profile?.sharedGpsIds || []);
  const [preferredTypes, setPreferredTypes] = useState<string[]>(
    profile?.preferredTypes || [],
  );
  const [preferredModes, setPreferredModes] = useState<string[]>(
    profile?.preferredModes || [],
  );
  const defaults = {
    headline: profile?.headline || "",
    about: profile?.about || "",
    location: profile?.location || "",
    country: profile?.country || "KE",
    specialty: profile?.specialty || "",
    skills: profile?.skills.join(", ") || "",
    languages: profile?.languages.join(", ") || "",
    interests: profile?.interests.join(", ") || "",
    preferredCountries: profile?.preferredCountries.join(", ") || "KE",
    yearsExperience: String(profile?.yearsExperience || 0),
    availability: profile?.availability || "",
    visibility: profile?.visibility || "PRIVATE",
    adultConfirmed: Boolean(profile),
  };
  const periodFields = [
    { key: "title", label: "Title or qualification" },
    { key: "organization", label: "Organization or institution" },
    { key: "start", label: "Start (month/year)" },
    { key: "end", label: "End (or Present)" },
    { key: "description", label: "Description" },
  ];
  const completeness = [
    defaults.headline,
    defaults.about,
    defaults.skills,
    experiences.length,
    education.length,
    credentials.length,
  ].filter(Boolean).length;
  return (
    <div className="space-y-6">
      <Panel title="Your career profile">
        <p className="text-sm text-muted-foreground">
          {completeness} of 6 career sections started. Profile completeness is
          separate from GPS credibility. Career history and qualifications are
          self-declared unless supported by reviewed evidence.
        </p>
        {profile && (
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              className="text-primary underline"
              href={`/talent/people/${user.id}?preview=public`}
            >
              Preview shared profile
            </Link>
            <Link className="text-primary underline" href="/talent">
              Find jobs
            </Link>
          </div>
        )}
        <TalentForm
          defaults={defaults}
          submitLabel="Save career profile"
          fields={[
            {
              name: "headline",
              label: "Professional headline",
              required: true,
            },
            { name: "specialty", label: "Profession or specialty" },
            { name: "about", label: "About you", type: "textarea" },
            { name: "location", label: "City or region" },
            {
              name: "country",
              label: "Country code",
              required: true,
              hint: "Two-letter country code, for example KE, GB or US.",
            },
            {
              name: "skills",
              label: "Skills",
              hint: "Separate skills with commas.",
            },
            {
              name: "languages",
              label: "Languages",
              hint: "Separate languages with commas.",
            },
            {
              name: "interests",
              label: "Professional interests",
              hint: "Separate interests with commas.",
            },
            {
              name: "yearsExperience",
              label: "Years of experience",
              type: "number",
            },
            {
              name: "preferredCountries",
              label: "Preferred work countries",
              hint: "Comma-separated country codes.",
            },
            {
              name: "availability",
              label: "Availability",
              hint: "For example: open to roles, available in one month.",
            },
            {
              name: "visibility",
              label: "Who can discover this profile?",
              type: "select",
              options: options(["PRIVATE", "RECRUITERS", "PUBLIC"]),
            },
            {
              name: "adultConfirmed",
              label: "I am 18 or older and my profile information is accurate.",
              type: "checkbox",
              required: true,
            },
          ]}
          onSave={async (values) => {
            await api("me", "PUT", {
              ...values,
              country: values.country.toUpperCase(),
              skills: splitTags(values.skills),
              languages: splitTags(values.languages),
              interests: splitTags(values.interests),
              preferredCountries: splitTags(values.preferredCountries).map(
                (v) => v.toUpperCase(),
              ),
              yearsExperience: Number(values.yearsExperience),
              experiences,
              education,
              credentials,
              avatarAssetId: avatar,
              savedResumeAssetId: resume,
              sharedGpsIds: gpsIds,
              preferredTypes,
              preferredModes,
            });
            toast.success("Career profile saved");
            await onSaved();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadPicker
              label="Profile photo"
              purpose="PROFILE_IMAGE"
              accept=".jpg,.jpeg,.png"
              value={avatar}
              onChange={setAvatar}
            />
            <UploadPicker
              label="Saved CV (private)"
              purpose="TALENT_RESUME"
              accept=".pdf,.docx"
              value={resume}
              onChange={setResume}
            />
          </div>
          <Choices
            label="Preferred employment types"
            values={employmentTypes}
            selected={preferredTypes}
            onChange={setPreferredTypes}
          />
          <Choices
            label="Preferred work arrangements"
            values={workModes}
            selected={preferredModes}
            onChange={setPreferredModes}
          />
          <RecordEditor
            label="Experience"
            records={experiences}
            onChange={setExperiences}
            fields={periodFields}
          />
          <RecordEditor
            label="Education"
            records={education}
            onChange={setEducation}
            fields={periodFields}
          />
          <RecordEditor
            label="Credentials"
            records={credentials}
            onChange={setCredentials}
            fields={[
              { key: "title", label: "Credential" },
              { key: "issuer", label: "Issuer" },
              { key: "reference", label: "Reference (optional)" },
              { key: "expires", label: "Expiry (optional)" },
            ]}
          />
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">
              GPS entries included in your shared profile
            </legend>
            <p className="text-xs text-muted-foreground">
              Share only entries suitable for professional audiences. Evidence
              files and clinical records are not included.
            </p>
            {gps?.map((entry: any) => (
              <label key={entry.id} className="flex items-center gap-2 text-sm">
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
        </TalentForm>
      </Panel>
      <GpsProfile />
    </div>
  );
}
function Choices({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-4">
        {options(values).map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, option.value]
                    : selected.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function CareerView({ profile }: { profile: any }) {
  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex items-start gap-4">
          {profile.avatarAssetId && profile.userId && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
              <Image
                src={`/api/talent/people/${profile.userId}/photo`}
                fill
                alt={`${profile.name}'s profile photo`}
                sizes="80px"
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p>{profile.headline}</p>
            <p className="text-sm text-muted-foreground">
              {[profile.location, profile.country].filter(Boolean).join(", ")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              GPS credibility: {profile.credibilityScore}
              {profile.paxId ? ` · ${profile.paxId}` : ""}
            </p>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm">{profile.about}</p>
        <div className="flex flex-wrap gap-2">
          {profile.skills?.map((skill: string) => (
            <Badge variant="secondary" key={skill}>
              {skill}
            </Badge>
          ))}
        </div>
        <p className="text-sm">{profile.availability}</p>
      </Panel>
      {["experiences", "education", "credentials"].map((key, index) => (
        <Panel
          key={key}
          title={["Experience", "Education", "Credentials"][index]}
        >
          <p className="text-xs text-muted-foreground">
            Self-declared professional information
          </p>
          {profile[key]?.length ? (
            profile[key].map((entry: any, i: number) => (
              <div key={i} className="space-y-1 border-t border-border pt-3">
                <h3 className="font-medium">{entry.title}</h3>
                <p className="text-sm">{entry.organization || entry.issuer}</p>
                <p className="text-xs text-muted-foreground">
                  {[entry.start, entry.end].filter(Boolean).join(" – ") ||
                    entry.expires}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {entry.description || entry.reference}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No entries shared.</p>
          )}
        </Panel>
      ))}
      <Panel title="GPS: evidence-backed impact">
        {profile.gps?.length ? (
          profile.gps.map((entry: any) => (
            <div
              key={entry.id}
              className="space-y-2 border-t border-border pt-4"
            >
              <h3 className="font-semibold">{entry.title}</h3>
              <p className="text-sm">
                <strong>Gap:</strong> {entry.gap}
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> {entry.solution}
              </p>
              <p className="text-sm">
                <strong>Outcome:</strong> {entry.outcome}
              </p>
              <Badge variant="outline">
                {entry._count.endorsements} endorsements
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No GPS entries shared.
          </p>
        )}
      </Panel>
    </div>
  );
}
