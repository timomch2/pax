import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

// Real local HTTP/auth journey. No external mail delivery, browser control or shared data.
const db = new URL(process.env.DATABASE_URL!);
assert.ok(["localhost", "127.0.0.1"].includes(db.hostname));
assert.equal(db.pathname, "/pax_dev");
const base = "http://localhost:3000";
const cookies = new Map<string, string>();
async function send(
  path: string,
  data?: unknown,
  method = data ? "POST" : "GET",
) {
  const response = await fetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      Origin: base,
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  for (const c of response.headers.getSetCookie()) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return response;
}
async function main() {
  const email = `onboarding-http-${randomUUID()}@example.test`;
  const password = "Synthetic-Only-2026";
  const data = {
    name: "Synthetic HTTP Member",
    email,
    password,
    phone: "+254700000000",
    country: "Kenya",
    serviceKeys: [
      "practice",
      "talent",
      "market",
      "community",
      "innovation",
      "investment",
      "safety",
    ],
    consentGiven: true,
  };
  assert.equal((await send("/api/account/services")).status, 401);
  assert.equal((await send("/api/signup", data)).status, 202);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const event = await prisma.notificationEvent.findFirstOrThrow({
    where: { userId: user.id, templateSlug: "account.email-verification" },
  });
  const token = new URL(
    (event.variables as { verificationUrl: string }).verificationUrl,
  ).searchParams.get("token");
  assert.equal((await send("/api/auth/verify-email", { token })).status, 200);
  const csrf = await send("/api/auth/csrf").then((r) => r.json());
  const signin = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      Origin: base,
    },
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email,
      password,
      callbackUrl: "/account",
      json: "true",
    }),
  });
  for (const c of signin.headers.getSetCookie()) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const session = await send("/api/auth/session").then((r) => r.json());
  assert.equal(session.user.id, user.id);
  assert.equal(session.user.role, "MEMBER");
  const hub = await send("/hub");
  assert.equal(hub.status, 307);
  assert.ok(hub.headers.get("location")?.endsWith("/account"));
  const account = await send("/account");
  assert.equal(account.status, 200);
  assert.ok(
    (await account.text()).includes(
      "Which service would you like to visit first?",
    ),
  );
  assert.equal(
    (
      await send("/api/account/services/innovation/setup", {
        action: "complete",
        role: "ADMIN",
      })
    ).status,
    400,
  );
  for (const key of data.serviceKeys.filter((k) => k !== "safety")) {
    const page = await send(`/account/services/${key}`);
    assert.equal(page.status, 200, `${key} intake`);
    assert.ok((await page.text()).includes("Set up "));
  }
  assert.equal(
    (await send("/api/account/services", { serviceKey: "safety" })).status,
    200,
  );
  assert.equal((await send("/safety")).status, 200);
  for (const path of [
    "/api/safety/drug-report",
    "/api/safety/product-feedback",
    "/api/safety/signals",
  ])
    assert.equal((await send(path)).status, 403, path);
  assert.equal(
    (await send("/api/account/services/community/setup", { action: "begin" }))
      .status,
    200,
  );
  assert.equal(
    (
      await send("/api/account/services/community/setup", {
        action: "complete",
        data: {
          headline: "Synthetic contributor",
          organization: "",
          location: "",
          healthAreas: "",
          bio: "",
          linkedinUrl: "",
        },
      })
    ).status,
    200,
  );
  await send("/api/auth/session");
  assert.equal((await send("/community")).status, 200);
  assert.equal(
    (
      await send("/api/account/services/practice/setup", {
        action: "complete",
        data: {
          medicalRegNumber: "SYNTHETIC",
          specialty: "Test clinician",
          hospital: "",
          bio: "",
          affiliations: "",
          consultationRate: 0,
        },
      })
    ).status,
    200,
  );
  await send("/api/auth/session");
  assert.equal((await send("/practice")).status, 200);
  assert.equal(
    await prisma.practiceWorkspace.count({ where: { ownerId: user.id } }),
    0,
  );
  assert.equal(
    (
      await send("/api/account/services/market/setup", {
        action: "begin",
        choice: "buyer",
      })
    ).status,
    200,
  );
  const buyer = await send("/api/marketplace/buyers", {
    institutionName: "Synthetic Test Institution",
    entityType: "HOSPITAL_CLINIC",
    jurisdiction: "Kenya",
    procurementOfficer: "Synthetic officer",
    officerTitle: "",
    officerEmail: email,
    country: "Kenya",
    acceptedDirectProcurement: true,
  });
  assert.equal(buyer.status, 201, await buyer.clone().text());
  assert.equal((await buyer.json()).status, "PENDING");
  assert.ok(
    (
      await prisma.userService.findUniqueOrThrow({
        where: { userId_serviceKey: { userId: user.id, serviceKey: "market" } },
      })
    ).setupCompletedAt,
  );
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).tier,
    "TIER1_BASIC",
  );
  console.log(
    "HTTP signup, verification, credentials, Accounts, intake pages, Practice gate, buyer approval and restricted safety: passed",
  );
  console.log(`Synthetic browser fixture: ${email}`);
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
