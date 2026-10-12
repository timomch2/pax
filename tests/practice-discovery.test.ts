import test from "node:test";
import assert from "node:assert/strict";
import {
  appointmentInquirySchema,
  directoryQuerySchema,
  distanceKm,
} from "@/lib/practice-discovery";
import {
  normalizeSpecialty,
  specialtyProposalSchema,
} from "@/lib/practice-specialties";
import { practiceProfileSchema } from "@/lib/service-profile-validation";
import { isSameProductOrigin } from "@/lib/product-hosts";

test("phone appointment requests need no account or email and cannot set approval or ownership", () => {
  const input = { name: "Synthetic client", phone: "+254700000000" };
  assert.equal(appointmentInquirySchema.parse(input).email, null);
  for (const extra of [
    { workspaceId: "other" },
    { status: "APPROVED" },
    { eventId: "event" },
    { userId: "other" },
  ])
    assert.equal(
      appointmentInquirySchema.safeParse({ ...input, ...extra }).success,
      false,
    );
  assert.equal(
    appointmentInquirySchema.safeParse({ ...input, phone: "" }).success,
    false,
  );
  assert.equal(
    appointmentInquirySchema.safeParse({ ...input, reason: "x".repeat(501) })
      .success,
    false,
  );
});
test("location search rejects invalid or unpaired coordinates", () => {
  assert.equal(
    directoryQuerySchema.safeParse({ latitude: "0", longitude: "0" }).success,
    true,
  );
  assert.equal(
    directoryQuerySchema.safeParse({ latitude: "91", longitude: "0" }).success,
    false,
  );
  assert.equal(
    directoryQuerySchema.safeParse({ latitude: "0" }).success,
    false,
  );
  assert.equal(
    directoryQuerySchema.safeParse({ q: "x".repeat(121) }).success,
    false,
  );
  assert.equal(
    distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }),
    0,
  );
  assert.ok(
    Math.abs(
      distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) -
        111.2,
    ) < 0.1,
  );
});
test("specialty suggestions normalize whitespace without accepting review grants", () => {
  assert.equal(normalizeSpecialty("  General   Surgery "), "general surgery");
  assert.equal(
    specialtyProposalSchema.safeParse({
      name: "New subspecialty",
      parentId: "group",
      status: "APPROVED",
    }).success,
    false,
  );
});
test("clinical profile cannot self-assign licence verification or another profile owner", () => {
  const profile = {
    specialty: "General practice",
    hospital: "",
    bio: "",
    affiliations: "",
    consultationRate: 0,
    directoryEnabled: true,
  };
  assert.equal(practiceProfileSchema.safeParse(profile).success, true);
  for (const extra of [
    { licenseVerified: true },
    { verificationLevel: "EXPERT_VERIFIED" },
    { userId: "other" },
  ])
    assert.equal(
      practiceProfileSchema.safeParse({ ...profile, ...extra }).success,
      false,
    );
  assert.equal(
    practiceProfileSchema.safeParse({ ...profile, latitude: 100, longitude: 0 })
      .success,
    false,
  );
});
test("local preview origin aliases require the exact loopback host and never relax production", () => {
  const previous = {
    node: process.env.NODE_ENV,
    routing: process.env.PAX_PRODUCT_ROUTING_ENABLED,
  };
  const request = (origin: string, host = "127.0.0.1:3001") =>
    new Request("http://localhost:3001/api/service-profile/practice", {
      headers: { origin, host },
    });
  try {
    Object.assign(process.env, {
      NODE_ENV: "development",
      PAX_PRODUCT_ROUTING_ENABLED: "false",
    });
    assert.equal(isSameProductOrigin(request("http://127.0.0.1:3001")), true);
    assert.equal(isSameProductOrigin(request("http://127.0.0.1:3002")), false);
    assert.equal(
      isSameProductOrigin(request("https://foreign.example")),
      false,
    );
    assert.equal(
      isSameProductOrigin(request("http://foreign.example", "foreign.example")),
      false,
    );
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal(isSameProductOrigin(request("http://127.0.0.1:3001")), false);
  } finally {
    if (previous.node === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous.node });
    if (previous.routing === undefined)
      delete process.env.PAX_PRODUCT_ROUTING_ENABLED;
    else process.env.PAX_PRODUCT_ROUTING_ENABLED = previous.routing;
  }
});
