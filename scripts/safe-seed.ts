import fs from "fs";
import path from "path";
import { execSync } from "child_process";

try {
  const seedFile = path.resolve(process.cwd(), "scripts/seed.ts");
  const content = fs.readFileSync(seedFile, "utf-8");

  const forbiddenPatterns = [
    /prisma\.\w+\.delete\(/,
    /prisma\.\w+\.deleteMany\(/,
  ];

  const violations = forbiddenPatterns.filter((pattern) => pattern.test(content));

  if (violations.length > 0) {
    console.error("Seed aborted: seed.ts contains prisma.delete or prisma.deleteMany calls.");
    console.error("Remove all delete operations before seeding to avoid deleting production data.");
    console.error("Do not modify this file to bypass this check in development environment as production and deployment database can be shared.");
    process.exit(1);
  }

} catch (err: any) {
}

if (process.argv.includes('--talent-only')) {
  import('../lib/talent-seed').then(async ({ seedTalentFoundation }) => {
    await seedTalentFoundation();
    const { prisma } = await import('../lib/db');
    await prisma.$disconnect();
    console.log('Talent foundations seeded without changing existing accounts.');
  }).catch(() => { console.error('Talent foundation seed failed'); process.exitCode = 1; });
} else {
  execSync("tsx --require dotenv/config scripts/seed.ts", { stdio: "inherit" });
}
