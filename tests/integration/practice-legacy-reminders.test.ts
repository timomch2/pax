import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prisma } from '@/lib/db';
import { practiceDeliveryAllowed } from '@/lib/practice-delivery';
const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test'); assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';

test('Python legacy reminder queries and queued deliveries exclude workspace owners even after lapse or flag pause', async () => {
  try {
    // Extract the job's actual SQL without importing its optional deployment-only PostgreSQL driver.
    const queries = JSON.parse(execFileSync('python3', ['-c', `import ast,json
module=ast.parse(open('shared/pax_overdue_reminders.py').read())
exclusion=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='WORKSPACE_EXCLUSION' for t in n.targets))
main=next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name=='main')
calls=[n for n in ast.walk(main) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and isinstance(n.func.value,ast.Name) and n.func.value.id=='cursor' and n.func.attr=='execute']
print(json.dumps([eval(compile(ast.Expression(n.args[0]),'<job-sql>','eval'),{'workspace_filter':exclusion}) for n in calls]))`], { encoding: 'utf8' })) as string[];
    const suffix = randomUUID();
    const users = await Promise.all(['Basic', 'Workspace'].map((name) => prisma.user.create({ data: { name, email: `${name}-${suffix}@example.test`, role: 'PRACTITIONER', tier: name === 'Basic' ? 'TIER1_BASIC' : 'TIER2_PROFESSIONAL' } })));
    await prisma.practiceWorkspace.create({ data: { ownerId: users[1].id } });
    const invoices = await Promise.all(users.map((u) => prisma.invoice.create({ data: { practitionerId: u.id, invoiceNumber: `${u.id}-REMINDER`, patientName: 'Synthetic patient', serviceDate: new Date(), serviceDesc: 'Consultation', totalAmount: 1000, status: 'UNPAID', payers: { create: { payerName: 'Synthetic payer', amount: 1000, amountPaid: 0, dueDate: new Date(Date.now() - 86400000), status: 'PENDING' } } }, include: { payers: true } })));
    const update = queries.find((q) => q.startsWith('UPDATE'))!.replace(' RETURNING', ' AND i."practitionerId" IN ($1,$2) RETURNING');
    const updated = await prisma.$queryRawUnsafe<{ id: string }[]>(update, users[0].id, users[1].id);
    assert.deepEqual(updated.map((p) => p.id), [invoices[0].payers[0].id]);
    const select = queries.find((q) => q.startsWith('SELECT p.'))! + ' AND i."practitionerId" IN ($1,$2)';
    const candidates = await prisma.$queryRawUnsafe<{ id: string }[]>(select, users[0].id, users[1].id);
    assert.deepEqual(candidates.map((p) => p.id), [users[0].id]); // PostgreSQL returns the final id column (recipient user) for object rows.
    const key = `hub-overdue:${invoices[0].payers[0].id}:2026-09-09`;
    assert.equal(await practiceDeliveryAllowed(key, users[0].email), true);
    await prisma.practiceWorkspace.create({ data: { ownerId: users[0].id } });
    assert.equal(await practiceDeliveryAllowed(key, users[0].email), false);
    process.env.PRACTICE_WORKSPACE_ENABLED = 'false';
    assert.equal(await practiceDeliveryAllowed(key, users[0].email), false, 'Legacy balances must not restart reminders during a rollback');
  } finally { process.env.PRACTICE_WORKSPACE_ENABLED = 'true'; await prisma.$disconnect(); }
});
