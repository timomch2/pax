import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { prisma } from '@/lib/db';
import manifest from '../../prisma/domain-schemas.json';

const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
assert.ok(['/pax_schema_rehearsal', '/pax_schema_fresh'].includes(database.pathname));

test('all tables are queryable in their domains; migration history remains public', async () => {
  for (const [name, owner] of Object.entries(manifest.models)) {
    const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT count(*) FROM "${owner}"."${name}"`);
    assert.ok(result[0].count >= 0n);
  }
  const history = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL`;
  const migrations = readdirSync('prisma/migrations', { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal(Number(history[0].count), migrations.length);
  const publicTables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  assert.deepEqual(publicTables.map((table) => table.tablename), ['_prisma_migrations']);
  // Exercise generated client cross-schema relationships, not only raw table access.
  await prisma.user.findMany({ take: 2, include: { gpsEntries: true, innovations: true } });
});

test('every scheduled Python SQL statement resolves against the new schemas', async () => {
  // Parse actual job SQL, without requiring the deployment-only psycopg2/S3 packages.
  const queries = JSON.parse(execFileSync('python3', ['-c', `import ast,json,pathlib
queries=[]
for p in pathlib.Path('shared').glob('pax_*.py'):
 tree=ast.parse(p.read_text())
 values={}
 for n in tree.body:
  if isinstance(n,ast.Assign):
   try:
    for t in n.targets:
     if isinstance(t,ast.Name): values[t.id]=ast.literal_eval(n.value)
   except (ValueError,TypeError): pass
 values['workspace_filter']=values.get('WORKSPACE_EXCLUSION','')
 for n in ast.walk(tree):
  if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='execute':
   queries.append(eval(compile(ast.Expression(n.args[0]),'<sql>','eval'), {'__builtins__':{}},values))
print(json.dumps(queries))`], { encoding: 'utf8' })) as string[];
  assert.ok(queries.length >= 20);
  await prisma.$transaction(async (tx) => {
    for (const [index, query] of queries.entries()) {
      let parameter = 0;
      const sql = query.replace(/%s/g, () => `$${++parameter}`);
      await tx.$executeRawUnsafe(`PREPARE "pax_schema_check_${index}" AS ${sql}`);
      await tx.$executeRawUnsafe(`DEALLOCATE "pax_schema_check_${index}"`);
    }
    const workspace = await tx.$queryRaw<{ present: boolean }[]>`SELECT to_regclass('practice."PracticeWorkspace"') IS NOT NULL AS present`;
    assert.equal(workspace[0].present, true);
  }, { timeout: 30000 });
});

test.after(async () => { await prisma.$disconnect(); });
