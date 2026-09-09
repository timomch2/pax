import 'dotenv/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fetchRegistryPage } from '../lib/facility-directory';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import { importFacilityPage } from '../lib/facility-import';
import { authorizeUser } from '../lib/authorization';
async function main() {
  let runId = process.argv[2];
  if (runId === '--local-rehearsal') {
    const database = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/pax_practice_test') throw new Error('Rehearsal requires the isolated local database');
    const admin = await prisma.user.create({ data: { name: 'Registry rehearsal admin', email: `registry-${randomUUID()}@example.test`, role: 'ADMIN' } });
    const permission = await prisma.permission.upsert({ where: { key: 'admin.system.manage' }, update: {}, create: { key: 'admin.system.manage', resource: 'admin.system', action: 'manage' } });
    await prisma.userPermission.create({ data: { userId: admin.id, permissionId: permission.id, effect: 'ALLOW', scope: 'ALL' } });
    const run = await prisma.facilityImportRun.create({ data: { requestedById: admin.id } }); runId = run.id;
  }
  if (!runId) throw new Error('Provide an admin-triggered import run ID');
  const run = await prisma.facilityImportRun.findUniqueOrThrow({ where: { id: runId } });
  const auth = await authorizeUser(run.requestedById, 'admin.system.manage');
  if (!auth.ok) throw new Error('The requesting admin no longer has access');
  console.log(`Import run ${runId}; resume with this ID after an interruption.`);
  if (run.status === 'COMPLETED') { console.log('Run already completed.'); return; }
  while (true) {
    const fetchPage = process.argv.includes('--native-https') ? async (page: number, size = 30) => fetchRegistryPage(page, size, (async (_url: unknown, options: RequestInit) => {
      const { stdout } = await promisify(execFile)('curl', ['--fail', '--silent', '--show-error', '--max-time', '20', 'https://nhfr.dha.go.ke/api/', '-H', 'Content-Type: application/json', '-H', 'apollo-require-preflight: true', '-H', 'x-apollo-operation-name: SearchFacilities', '--data', String(options.body)], { maxBuffer: 2000000, timeout: 25000 });
      return new Response(stdout, { status: 200 });
    }) as typeof fetch) : undefined;
    const current = await importFacilityPage(runId, fetchPage);
    console.log(`Page ${current.nextPage}; processed ${current.processed}/${current.totalMatches}; added ${current.added}; review ${current.queued}; skipped ${current.skipped}; ${current.status}`);
    if (current.status === 'COMPLETED') break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Import failed'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
