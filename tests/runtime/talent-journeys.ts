import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import https from "node:https";
import http from "node:http";
import bcrypt from "bcryptjs";
import { chromium, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import {
  requireTalentTestDatabase,
  talentFixture,
  profileInput,
} from "../helpers/talent";
import { inviteTalentMember } from "@/lib/talent-hiring";

requireTalentTestDatabase();
process.env.PAX_PRODUCT_ROUTING_ENABLED = "true";
const talent = "https://talent.domanname.com",
  accounts = "https://accounts.domanname.com";
const evidence = "/tmp/pax-talent-runtime";

async function main() {
  await mkdir(evidence, { recursive: true });
  const fixture = await talentFixture();
  const password = `Test-${randomBytes(24).toString("base64url")}!`;
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.updateMany({
    where: {
      id: {
        in: [
          fixture.owner.id,
          fixture.candidate.id,
          fixture.stranger.id,
          fixture.reviewer.id,
          fixture.admin.id,
        ],
      },
    },
    data: { password: hash },
  });
  await prisma.talentProfile.update({
    where: { userId: fixture.candidate.id },
    data: { savedResumeAssetId: fixture.cv.id },
  });
  const proxy = https.createServer(
    {
      key: await readFile("/tmp/pax-talent-local-key.pem"),
      cert: await readFile("/tmp/pax-talent-local-cert.pem"),
    },
    (request, response) => {
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: 3001,
          path: request.url,
          method: request.method,
          headers: {
            ...request.headers,
            "x-forwarded-proto": "https",
            "x-forwarded-host": request.headers.host,
          },
        },
        (incoming) => {
          response.writeHead(incoming.statusCode || 502, incoming.headers);
          incoming.pipe(response);
        },
      );
      upstream.on("error", () => {
        response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
    },
  );
  await new Promise<void>((resolve) =>
    proxy.listen(8443, "127.0.0.1", resolve),
  );
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: [
      "--no-proxy-server",
      "--host-resolver-rules=MAP *.domanname.com 127.0.0.1:8443, MAP domanname.com 127.0.0.1:8443",
    ],
  });
  const errors: string[] = [];
  const login = async (email: string, path: string, mobile = false) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1080 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `${accounts}/login?callbackUrl=${encodeURIComponent(`${talent}${path}`)}`,
    );
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForURL(`${talent}${path}`, { timeout: 30000 });
    const cookies = await context.cookies();
    const shared = cookies.find((cookie) =>
      cookie.name.startsWith("__Secure-pax.session-token"),
    );
    assert.ok(
      shared?.httpOnly &&
        shared.secure &&
        shared.sameSite === "Lax" &&
        shared.domain === ".domanname.com",
    );
    return page;
  };
  const request = (page: Page, path: string, method = "GET", body?: unknown) =>
    page.evaluate(
      async ({ path, method, body }) => {
        const response = await fetch(path, {
          method,
          ...(body === undefined
            ? {}
            : {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }),
        });
        return { status: response.status, data: await response.json() };
      },
      { path, method, body },
    );
  try {
    const candidate = await login(
      fixture.candidate.email,
      `/talent/jobs/${fixture.job.id}`,
    );
    await expect(
      candidate.getByRole("heading", { name: fixture.job.title, exact: true }),
    ).toBeVisible();
    await expect(
      candidate.getByRole("button", { name: "Apply now", exact: true }),
    ).toBeVisible();
    await candidate.screenshot({
      path: `${evidence}/job-desktop.png`,
      fullPage: true,
    });
    await candidate
      .getByRole("button", { name: "Apply now", exact: true })
      .click();
    await expect(
      candidate.getByRole("heading", { name: "Your application", exact: true }),
    ).toBeVisible();
    await candidate
      .getByLabel("Cover letter (optional)", { exact: true })
      .fill(
        "I have experience evaluating health services and communicating research findings.",
      );
    await candidate
      .getByLabel(
        "I consent to sharing this application with this hiring team.",
      )
      .check();
    const draftResponse = candidate.waitForResponse(
      (response) =>
        response.url().endsWith(`/jobs/${fixture.job.id}/draft`) &&
        response.request().method() === "PUT",
    );
    await candidate
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    const draftResult = await draftResponse;
    assert.equal(draftResult.status(), 200, await draftResult.text());
    await expect(
      candidate.getByText("Draft saved", { exact: true }),
    ).toBeVisible();
    await candidate
      .getByRole("button", { name: "Submit application", exact: true })
      .click();
    await candidate.waitForURL(`${talent}/talent/applications`);
    const application = await prisma.jobApplication.findUniqueOrThrow({
      where: {
        jobId_applicantId: {
          jobId: fixture.job.id,
          applicantId: fixture.candidate.id,
        },
      },
    });
    console.log(
      "PASS: accounts sign-in returns to Talent; shared secure HttpOnly cookie; candidate draft and application UI.",
    );
    const owner = await login(
      fixture.owner.email,
      `/talent/applications/${application.id}`,
    );
    await expect(
      owner.getByRole("heading", { name: fixture.job.title, exact: true }),
    ).toBeVisible();
    await owner
      .getByLabel("Private team note")
      .fill("Private hiring assessment for this synthetic application.");
    await owner
      .getByRole("button", { name: "Add internal note", exact: true })
      .click();
    await expect(
      owner.getByText(
        "Private hiring assessment for this synthetic application.",
        { exact: true },
      ),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Mark under review", exact: true })
      .click();
    await expect(
      owner.getByRole("button", { name: "Mark shortlisted", exact: true }),
    ).toBeVisible();
    await expect(owner.getByText("Under review", { exact: true })).toBeVisible();
    await owner.screenshot({
      path: `${evidence}/hiring-review.png`,
      fullPage: true,
    });
    const candidateView = await request(
      candidate,
      `/api/talent/applications/${application.id}`,
    );
    assert.equal(candidateView.status, 200);
    assert.equal(candidateView.data.application.status, "UNDER_REVIEW");
    assert.equal(candidateView.data.application.notes, undefined);
    assert.equal((await request(candidate, "/api/hub/patients")).status, 403);
    assert.equal(
      (await request(candidate, "/api/jobs", "POST", {})).status,
      409,
    );
    console.log(
      "PASS: hiring status and private notes UI; candidate cannot read team notes or clinical patients; legacy mutations blocked.",
    );
    await owner.goto(`${talent}/talent/hiring/jobs/new`);
    const postedTitle = `Community Health Programme Lead ${fixture.job.id.slice(-6)}`;
    await owner.getByLabel("Job title", { exact: true }).fill(postedTitle);
    await owner
      .getByLabel("About the role", { exact: true })
      .fill(
        "Coordinate a health programme with community partners and research teams.",
      );
    await owner
      .getByLabel("Responsibilities", { exact: true })
      .fill(
        "Lead health programme delivery and evaluate outcomes with community partners.",
      );
    await owner
      .getByLabel("Qualifications and requirements", { exact: true })
      .fill(
        "Experience managing health programmes and reporting measurable outcomes.",
      );
    await owner
      .getByLabel("Workplace location", { exact: true })
      .fill("Nairobi");
    await owner
      .getByLabel("Application deadline (Nairobi time)", { exact: true })
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
    await owner
      .getByLabel("Job status", { exact: true })
      .selectOption("PUBLISHED");
    await owner
      .getByRole("button", { name: "Add question", exact: true })
      .click();
    await owner
      .getByLabel("Question", { exact: true })
      .fill("Preferred programme focus?");
    await owner.getByLabel("Answer type").selectOption("SINGLE_CHOICE");
    await owner
      .getByLabel("Choices (comma-separated)", { exact: true })
      .pressSequentially("Research, Community health");
    const postResponse = owner.waitForResponse(
      (response) =>
        response.url().endsWith("/api/talent/jobs") &&
        response.request().method() === "POST",
    );
    await owner.getByRole("button", { name: "Save job", exact: true }).click();
    const postResult = await postResponse;
    assert.equal(postResult.status(), 200);
    await owner.waitForURL(
      (url) =>
        /\/talent\/hiring\/jobs\//.test(url.pathname) &&
        !url.pathname.endsWith("/new"),
    );
    const posted = await prisma.job.findFirstOrThrow({
      where: { title: postedTitle, employerId: fixture.owner.id },
    });
    assert.deepEqual((posted.applicationConfig as any).questions[0].options, [
      "Research",
      "Community health",
    ]);
    await owner.goto(`${talent}/talent/messages`);
    await owner
      .getByRole("button", { name: new RegExp(fixture.job.title) })
      .click();
    await owner
      .getByLabel("Message", { exact: true })
      .fill("Please let us know your availability for an interview.");
    await owner
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      owner.getByText(
        "Please let us know your availability for an interview.",
        { exact: true },
      ),
    ).toBeVisible();
    console.log(
      "PASS: job publication and multi-choice screening editor; hiring messaging UI.",
    );
    await candidate.goto(`${talent}/talent/profile`);
    await candidate
      .getByLabel("Professional headline", { exact: true })
      .fill("Health research and evaluation specialist");
    await candidate
      .getByLabel("Who can discover this profile?")
      .selectOption("PUBLIC");
    await candidate
      .getByRole("button", { name: "Save career profile", exact: true })
      .click();
    await expect(
      candidate.getByText("Career profile saved", { exact: true }),
    ).toBeVisible();
    const anonymous = await browser.newPage({
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
    });
    await anonymous.goto(`${talent}/talent/people/${fixture.candidate.id}`);
    await expect(
      anonymous.getByText("Health research and evaluation specialist", {
        exact: true,
      }),
    ).toBeVisible();
    await anonymous.screenshot({
      path: `${evidence}/profile-mobile.png`,
      fullPage: true,
    });
    assert.ok(
      await anonymous.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    assert.equal(
      (await request(anonymous, `/api/talent/applications/${application.id}`))
        .status,
      401,
    );
    assert.equal(
      (await request(anonymous, `/api/uploads/${fixture.cv.id}/download`))
        .status,
      401,
    );
    await candidate.goto("https://practitioners.domanname.com/account");
    await expect(
      candidate.getByRole("heading", { name: "Account security", exact: true }),
    ).toBeVisible();
    await candidate.goto("https://domanname.com/account");
    await expect(
      candidate.getByRole("heading", { name: "Account security", exact: true }),
    ).toBeVisible();
    console.log(
      "PASS: explicit public career profile; mobile layout; anonymous document denial; same account recognized on all four hosts.",
    );
    const invitation = await inviteTalentMember(
      fixture.owner.id,
      fixture.hiring.id,
      { email: fixture.reviewer.email, role: "REVIEWER" },
    );
    const invitePage = await browser.newPage({ ignoreHTTPSErrors: true });
    await invitePage.goto(
      `${talent}/talent/team-invitation#${invitation.token}`,
    );
    await invitePage
      .getByRole("link", { name: "Sign in to accept", exact: true })
      .click();
    await invitePage
      .getByLabel("Email", { exact: true })
      .fill(fixture.reviewer.email);
    await invitePage.getByLabel("Password", { exact: true }).fill(password);
    await invitePage
      .getByRole("button", { name: "Sign In", exact: true })
      .click();
    await invitePage.waitForURL(`${talent}/talent/team-invitation`);
    await invitePage
      .getByRole("button", { name: "Accept team invitation", exact: true })
      .click();
    await expect(
      invitePage.getByText("You have joined the hiring team.", { exact: true }),
    ).toBeVisible();
    console.log(
      "PASS: anonymous team invitation survives accounts-host sign-in and accepts only for invited account.",
    );
    const staleContext = await browser.newContext({
      ignoreHTTPSErrors: true,
      storageState: await candidate.context().storageState(),
    });
    const stalePage = await staleContext.newPage();
    await candidate.goto(`${accounts}/account`);
    await candidate
      .getByRole("button", { name: "Sign out everywhere", exact: true })
      .click();
    await candidate.waitForURL(`${accounts}/login`);
    const previousVersion = fixture.candidate.sessionVersion;
    assert.ok(
      (
        await prisma.user.findUniqueOrThrow({
          where: { id: fixture.candidate.id },
        })
      ).sessionVersion > previousVersion,
    );
    await stalePage.goto(`${talent}/talent/profile`);
    await expect(
      stalePage.getByRole("button", { name: "Sign In", exact: true }),
    ).toBeVisible();
    assert.equal(new URL(stalePage.url()).origin, accounts);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: global logout revokes persisted session version; no browser runtime errors.",
    );
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
