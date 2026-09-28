import test from "node:test";
import assert from "node:assert/strict";
import {
  signupSchema,
  accountDetailsSchema,
  registrationHints,
  registrationServiceKeys,
} from "@/lib/registration";
import {
  SERVICE_SETUP_PERMISSIONS,
  SETUP_ROLE,
} from "@/lib/service-setup-policy";
import { profileSchema } from "@/lib/talent-validation";
import { profileInput } from "./helpers/talent";
const details = {
  name: "Test Member",
  phone: "+254700000000",
  country: "Kenya",
  serviceKeys: ["talent"],
  consentGiven: true,
};
const signup = {
  ...details,
  email: " Member@example.test ",
  password: "Synthetic-Only-2026",
};
test("neutral registration requires shared details, strong passwords, consent and one or more distinct services", () => {
  assert.equal(signupSchema.parse(signup).email, "member@example.test");
  assert.equal(signupSchema.parse(signup).physicalAddress, "");
  assert.equal(
    signupSchema.safeParse({ ...signup, serviceKeys: registrationServiceKeys })
      .success,
    true,
  );
  for (const invalid of [
    { serviceKeys: [] },
    { serviceKeys: ["talent", "talent"] },
    { serviceKeys: ["gps"] },
    { country: "" },
    { phone: "" },
    { password: "short" },
    { consentGiven: false },
    { role: "ADMIN" },
    { additionalRoles: ["PRACTITIONER"] },
    { tier: "TIER2_PROFESSIONAL" },
  ])
    assert.equal(
      signupSchema.safeParse({ ...signup, ...invalid }).success,
      false,
    );
});
test("Google completion uses identical shared details but accepts no replacement identity, password or grant", () => {
  assert.equal(accountDetailsSchema.safeParse(details).success, true);
  for (const extra of [
    { email: "other@example.test" },
    { password: "Synthetic-Only-2026" },
    { role: "ADMIN" },
    { userId: "someone-else" },
  ])
    assert.equal(
      accountDetailsSchema.safeParse({ ...details, ...extra }).success,
      false,
    );
});
test("legacy role links are only service hints, never privileged roles", () => {
  assert.deepEqual(registrationHints("practitioner", null), ["practice"]);
  assert.deepEqual(registrationHints("policymaker", null), ["community"]);
  assert.deepEqual(registrationHints("admin", null), []);
  assert.deepEqual(registrationHints("investor", "talent"), ["talent"]);
});
test("self-service permission policy excludes administrative and safety surveillance access", () => {
  assert.deepEqual(Object.values(SETUP_ROLE).sort(), [
    "INNOVATOR",
    "INVESTOR",
    "PRACTITIONER",
  ]);
  assert.deepEqual(SERVICE_SETUP_PERMISSIONS.safety, ["safety.report.create"]);
  for (const permissions of Object.values(SERVICE_SETUP_PERMISSIONS))
    assert.ok(
      permissions.every(
        (key) =>
          !key.startsWith("admin.") &&
          !["safety.report.read", "safety.signal.read"].includes(key),
      ),
    );
});
test("Talent categories coexist on a private career profile and reject invented role categories", () => {
  const parsed = profileSchema.parse(
    profileInput({
      participantCategories: ["CHW", "STUDENT"],
      personalVision: "Healthy communities",
      motto: "Evidence first",
      communityHealthUnit: "Test unit",
      chwCounty: "Test county",
      institution: "Test college",
      courseOfStudy: "Public health",
      studyYear: "2",
    }),
  );
  assert.deepEqual(parsed.participantCategories, ["CHW", "STUDENT"]);
  assert.equal(parsed.visibility, "PRIVATE");
  assert.equal(
    profileSchema.safeParse(
      profileInput({ participantCategories: ["PRACTITIONER"] }),
    ).success,
    false,
  );
});
