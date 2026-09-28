import { z } from "zod";
const short = z.string().trim().max(160);
const text = z.string().trim().max(10000);
const tags = z
  .array(short.min(1))
  .max(50)
  .transform((items) => [...new Set(items)]);
export const assetId = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[a-zA-Z0-9-]+$/);
const country = z.string().regex(/^[A-Z]{2}$/);
export const employmentTypes = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "CONSULTANCY",
  "INTERNSHIP",
  "VOLUNTEER",
] as const;
export const workModes = ["ONSITE", "HYBRID", "REMOTE"] as const;
const period = z
  .object({
    title: short.min(1),
    organization: short.min(1),
    start: short,
    end: short,
    description: text,
  })
  .strict();
export const profileSchema = z
  .object({
    personalVision: z.string().trim().max(2000).optional(), motto: short.optional(),
    participantCategories: z.array(z.enum(['CHW', 'STUDENT'])).max(2).transform(v => [...new Set(v)]).optional(),
    communityHealthUnit: short.optional(), chwCounty: short.optional(), institution: short.optional(), courseOfStudy: short.optional(), studyYear: short.optional(),
    headline: short,
    about: text,
    location: short,
    country,
    specialty: short,
    skills: tags,
    languages: tags,
    interests: tags,
    experiences: z.array(period).max(50),
    education: z.array(period).max(30),
    credentials: z
      .array(
        z
          .object({
            title: short.min(1),
            issuer: short.min(1),
            reference: short,
            expires: short,
          })
          .strict(),
      )
      .max(30),
    preferredTypes: z.array(z.enum(employmentTypes)).max(6),
    preferredModes: z.array(z.enum(workModes)).max(3),
    preferredCountries: z.array(country).max(100),
    yearsExperience: z.number().int().min(0).max(80),
    availability: short,
    visibility: z.enum(["PRIVATE", "RECRUITERS", "PUBLIC"]),
    sharedGpsIds: z.array(assetId).max(100),
    avatarAssetId: assetId.nullable(),
    savedResumeAssetId: assetId.nullable(),
    adultConfirmed: z.literal(true),
  })
  .strict();
export const hiringSchema = z
  .object({
    kind: z.enum(["PERSONAL", "ORGANIZATION"]),
    name: short.min(2),
    description: text,
    location: short,
    country,
    website: z
      .string()
      .url()
      .max(500)
      .refine((v) => /^https?:\/\//.test(v))
      .nullable(),
    logoAssetId: assetId.nullable(),
    verificationStatement: text,
    verificationAssetIds: z.array(assetId).max(5),
  })
  .strict();
export const applicationConfigSchema = z
  .object({
    cv: z.enum(["REQUIRED", "OPTIONAL", "HIDDEN"]),
    coverLetter: z.enum(["REQUIRED", "OPTIONAL", "HIDDEN"]),
    documents: z.enum(["REQUIRED", "OPTIONAL", "HIDDEN"]),
    questions: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
            label: z.string().trim().min(1).max(300),
            type: z.enum([
              "SHORT_TEXT",
              "LONG_TEXT",
              "YES_NO",
              "SINGLE_CHOICE",
            ]),
            required: z.boolean(),
            options: z.array(short.min(1)).max(20),
          })
          .strict(),
      )
      .max(10),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.questions.map((q) => q.id)).size !== v.questions.length)
      ctx.addIssue({
        code: "custom",
        message: "Question identifiers must be unique",
      });
    if (
      v.questions.some(
        (q) => q.type === "SINGLE_CHOICE" && q.options.length < 2,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Choice questions need at least two options",
      });
  });
export const jobSchema = z
  .object({
    hiringProfileId: assetId,
    title: short.min(3),
    summary: text.min(20),
    responsibilities: text.min(20),
    requirements: text.min(20),
    healthAreas: tags,
    requiredSkills: tags,
    desirableSkills: tags,
    specialty: short,
    minimumYears: z.number().int().min(0).max(80).nullable(),
    remoteCountries: z.array(country).max(100),
    employmentType: z.enum(employmentTypes),
    workMode: z.enum(workModes),
    location: short,
    country,
    salaryMinMinor: z.number().int().min(0).max(2147483647).nullable(),
    salaryMaxMinor: z.number().int().min(0).max(2147483647).nullable(),
    salaryCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
    salaryPeriod: z
      .enum(["HOUR", "DAY", "WEEK", "MONTH", "YEAR", "PROJECT"])
      .nullable(),
    closesAt: z.string().datetime().nullable(),
    status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]),
    applicationConfig: applicationConfigSchema,
    version: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.status === "PUBLISHED" &&
      (!v.closesAt || new Date(v.closesAt).getTime() <= Date.now())
    )
      ctx.addIssue({
        code: "custom",
        message: "Published jobs require a future deadline",
      });
    if (v.workMode !== "REMOTE" && !v.location)
      ctx.addIssue({
        code: "custom",
        message: "A workplace location is required",
      });
    if (v.salaryMinMinor != null || v.salaryMaxMinor != null) {
      if (!v.salaryCurrency || !v.salaryPeriod)
        ctx.addIssue({
          code: "custom",
          message: "Salary currency and period are required",
        });
      if (
        v.salaryMinMinor != null &&
        v.salaryMaxMinor != null &&
        v.salaryMaxMinor < v.salaryMinMinor
      )
        ctx.addIssue({ code: "custom", message: "Salary range is invalid" });
    }
  });
export const applicationSchema = z
  .object({
    coverLetter: text,
    resumeAssetId: assetId.nullable(),
    coverLetterAssetId: assetId.nullable(),
    documentAssetIds: z.array(assetId).max(5),
    answers: z.record(z.string().max(3000)),
    sharedGpsIds: z.array(assetId).max(100),
    jobVersion: z.number().int().positive(),
    consent: z.boolean(),
  })
  .strict();
export const searchSchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    country: z.union([country, z.literal("")]).default(""),
    workMode: z.union([z.enum(workModes), z.literal("")]).default(""),
    employmentType: z
      .union([z.enum(employmentTypes), z.literal("")])
      .default(""),
    specialty: short.default(""),
    skill: short.default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    sort: z.enum(["NEWEST", "MATCH"]).default("NEWEST"),
  })
  .strict();
export type TalentSearch = z.infer<typeof searchSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export function applicationValidation(
  config: z.infer<typeof applicationConfigSchema>,
  data: ApplicationInput,
): string | null {
  if (!data.consent)
    return "Confirm sharing this application with the hiring team";
  if (config.cv === "REQUIRED" && !data.resumeAssetId)
    return "A CV is required";
  if (
    config.coverLetter === "REQUIRED" &&
    !data.coverLetter.trim() &&
    !data.coverLetterAssetId
  )
    return "A cover letter is required";
  if (config.documents === "REQUIRED" && !data.documentAssetIds.length)
    return "Supporting evidence is required";
  if (
    (config.cv === "HIDDEN" && data.resumeAssetId) ||
    (config.coverLetter === "HIDDEN" &&
      (data.coverLetter || data.coverLetterAssetId)) ||
    (config.documents === "HIDDEN" && data.documentAssetIds.length)
  )
    return "Remove documents that this job does not request";
  if (
    Object.keys(data.answers).some(
      (key) => !config.questions.some((q) => q.id === key),
    )
  )
    return "Application questions changed; review the form";
  for (const q of config.questions) {
    const answer = data.answers[q.id]?.trim() || "";
    if (q.required && !answer) return `Answer: ${q.label}`;
    if (answer && q.type === "YES_NO" && !["Yes", "No"].includes(answer))
      return "Choose Yes or No";
    if (answer && q.type === "SINGLE_CHOICE" && !q.options.includes(answer))
      return "Select an available answer";
    if (q.type === "SHORT_TEXT" && answer.length > 300)
      return "Short answers must be 300 characters or fewer";
  }
  return null;
}
export const applicationTransitions: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "OFFERED", "REJECTED"],
  INTERVIEW: ["OFFERED", "REJECTED"],
  OFFERED: ["HIRED", "REJECTED"],
};
export function matchJob(
  job: {
    requiredSkills: string[];
    specialty: string | null;
    country: string | null;
    remoteCountries: string[];
    workMode: string;
    employmentType: string;
    minimumYears: number | null;
  },
  profile: {
    skills: string[];
    specialty: string;
    country: string;
    preferredCountries: string[];
    preferredTypes: string[];
    preferredModes: string[];
    yearsExperience: number;
  },
) {
  const normalize = (v: string) => v.trim().toLowerCase();
  const skills = new Set(profile.skills.map(normalize));
  const matched: string[] = [],
    missing: string[] = [];
  for (const skill of job.requiredSkills)
    (skills.has(normalize(skill)) ? matched : missing).push(`Skill: ${skill}`);
  if (job.specialty)
    (normalize(profile.specialty) === normalize(job.specialty)
      ? matched
      : missing
    ).push(`Specialty: ${job.specialty}`);
  const locations = new Set([profile.country, ...profile.preferredCountries]);
  const countryMatch =
    job.workMode === "REMOTE"
      ? !job.remoteCountries.length ||
        job.remoteCountries.some((c) => locations.has(c))
      : !!job.country && locations.has(job.country);
  (countryMatch ? matched : missing).push("Location preferences");
  if (profile.preferredModes.length)
    (profile.preferredModes.includes(job.workMode) ? matched : missing).push(
      "Work arrangement",
    );
  if (profile.preferredTypes.length)
    (profile.preferredTypes.includes(job.employmentType)
      ? matched
      : missing
    ).push("Employment type");
  if (job.minimumYears != null)
    (profile.yearsExperience >= job.minimumYears ? matched : missing).push(
      "Experience",
    );
  return {
    matched,
    missing,
    score: matched.length / Math.max(1, matched.length + missing.length),
  };
}
