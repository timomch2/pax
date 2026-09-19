import assert from "node:assert/strict";
import test from "node:test";
import {
  safeReturnUrl,
  productOrigins,
  sharedSessionCookie,
  isSameProductOrigin,
} from "@/lib/product-hosts";
import {
  applicationConfigSchema,
  applicationValidation,
  applicationSchema,
  matchJob,
} from "@/lib/talent-validation";
import { validateTalentDocumentBytes } from "@/lib/talent-documents";

test("cross-product return URLs reject foreign hosts, credentials and authentication loops", () => {
  const original = process.env.PAX_PRODUCT_ROUTING_ENABLED,
    originalDomain = process.env.PAX_ROOT_DOMAIN;
  process.env.PAX_PRODUCT_ROUTING_ENABLED = "true";
  process.env.PAX_ROOT_DOMAIN = "domanname.com";
  try {
    const base = productOrigins().accounts;
    assert.equal(
      safeReturnUrl(`${base}/login`, "http://localhost:3000", "/hub", true),
      `${base}/login`,
    );
    assert.equal(
      safeReturnUrl(
        "https://evil.test/login",
        "http://localhost:3000",
        "/hub",
        true,
      ),
      `${base}/hub`,
    );
    assert.equal(
      safeReturnUrl("https://talent.domanname.com/talent", base),
      "https://talent.domanname.com/talent",
    );
    for (const target of [
      "https://evil.test",
      "//evil.test",
      "https://domanname.com.evil.test",
      "https://user@talent.domanname.com",
      "/login",
      "/api/auth/signin",
    ])
      assert.equal(safeReturnUrl(target, base), `${base}/hub`);
    assert.equal(
      isSameProductOrigin(
        new Request("http://localhost:3001/api/talent/me", {
          headers: {
            host: "talent.domanname.com",
            origin: "https://talent.domanname.com",
          },
        }),
      ),
      true,
    );
    assert.equal(
      isSameProductOrigin(
        new Request("http://localhost:3001/api/talent/me", {
          headers: {
            host: "talent.domanname.com",
            origin: "https://accounts.domanname.com",
          },
        }),
      ),
      false,
    );
    assert.equal(
      isSameProductOrigin(
        new Request("http://localhost:3001/api/talent/me", {
          headers: { host: "evil.test", origin: "https://evil.test" },
        }),
      ),
      false,
    );
    const cookie = sharedSessionCookie().sessionToken!;
    assert.equal(cookie.options.domain, "domanname.com");
    assert.equal(cookie.options.httpOnly, true);
    assert.equal(cookie.options.secure, true);
  } finally {
    if (original === undefined) delete process.env.PAX_PRODUCT_ROUTING_ENABLED;
    else process.env.PAX_PRODUCT_ROUTING_ENABLED = original;
    if (originalDomain === undefined) delete process.env.PAX_ROOT_DOMAIN;
    else process.env.PAX_ROOT_DOMAIN = originalDomain;
  }
});
test("screening requirements and consent are validated without automatic rejection", () => {
  const config = applicationConfigSchema.parse({
    cv: "REQUIRED",
    coverLetter: "OPTIONAL",
    documents: "OPTIONAL",
    questions: [
      {
        id: "q1",
        label: "Available?",
        type: "YES_NO",
        required: true,
        options: [],
      },
    ],
  });
  const data = applicationSchema.parse({
    coverLetter: "",
    resumeAssetId: "asset-12345",
    coverLetterAssetId: null,
    documentAssetIds: [],
    answers: { q1: "No" },
    sharedGpsIds: [],
    jobVersion: 1,
    consent: true,
  });
  assert.equal(applicationValidation(config, data), null);
  assert.match(
    applicationValidation(config, { ...data, consent: false }) || "",
    /sharing/,
  );
  assert.match(
    applicationValidation(config, { ...data, resumeAssetId: null }) || "",
    /CV/,
  );
  assert.match(
    applicationValidation(config, { ...data, answers: { q1: "Perhaps" } }) ||
      "",
    /Yes or No/,
  );
  assert.equal(
    applicationConfigSchema.safeParse({
      ...config,
      questions: [config.questions[0], config.questions[0]],
    }).success,
    false,
  );
});
test("matching explains job criteria independently of GPS credibility", () => {
  const job = {
    requiredSkills: ["Research", "Statistics"],
    specialty: "Public health",
    country: "KE",
    remoteCountries: [],
    workMode: "REMOTE",
    employmentType: "FULL_TIME",
    minimumYears: 3,
  };
  const result = matchJob(job, {
    skills: ["research"],
    specialty: "Public health",
    country: "GB",
    preferredCountries: [],
    preferredTypes: ["FULL_TIME"],
    preferredModes: ["REMOTE"],
    yearsExperience: 1,
  });
  assert.ok(result.matched.includes("Skill: Research"));
  assert.ok(result.missing.includes("Skill: Statistics"));
  assert.ok(result.missing.includes("Experience"));
  assert.ok(result.matched.includes("Location preferences"));
  assert.equal("credibilityScore" in result, false);
});
test("document bytes cannot masquerade as PDF, images or Word documents", () => {
  assert.equal(
    validateTalentDocumentBytes(
      Buffer.from("%PDF-1.7\nSynthetic PDF"),
      "application/pdf",
    ),
    true,
  );
  assert.equal(
    validateTalentDocumentBytes(
      Buffer.from("<script>bad</script>"),
      "application/pdf",
    ),
    false,
  );
  assert.equal(
    validateTalentDocumentBytes(
      Buffer.from("PK-not-a-word-document"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    false,
  );
  assert.equal(
    validateTalentDocumentBytes(Buffer.from("plain text"), "image/png"),
    false,
  );
});
