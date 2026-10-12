import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import manifest from '../prisma/domain-schemas.json';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const migration = readFileSync('prisma/migrations/20260930090000_domain_schemas/migration.sql', 'utf8');
const discoveryMigration = readFileSync('prisma/migrations/20261007090000_practitioner_discovery/migration.sql', 'utf8');

test('every model and enum has one domain owner and a data-preserving migration', () => {
  const blocks = [...schema.matchAll(/(model|enum) (\w+) \{([\s\S]*?)\n\}/g)];
  assert.equal(blocks.length, Object.keys(manifest.models).length + Object.keys(manifest.enums).length);
  for (const [, kind, name, body] of blocks) {
    const owners: Record<string, string> = kind === 'model' ? manifest.models : manifest.enums;
    assert.ok(owners[name], `Unassigned ${name}`);
    assert.ok(body.includes(`@@schema("${owners[name]}")`), name);
    const moved = migration.includes(`ALTER ${kind === 'model' ? 'TABLE' : 'TYPE'} "public"."${name}" SET SCHEMA "${owners[name]}";`);
    const added = kind === 'model' && discoveryMigration.includes(`CREATE TABLE "${owners[name]}"."${name}"`);
    assert.ok(moved || added, name);
  }
  assert.doesNotMatch(migration, /\b(DROP|DELETE|TRUNCATE|CREATE TABLE)\b/i);
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.equal(manifest.models.User, 'core');
  assert.equal(manifest.models.GpsEntry, 'evidence');
  assert.equal(manifest.models.AdverseDrugReport, 'safety');
});

test('Python connection strips the Prisma schema option and retains libpq security options', () => {
  execFileSync('python3', ['-c', `import ast,os
from urllib.parse import parse_qsl,urlencode,urlsplit,urlunsplit
from unittest.mock import Mock
tree=ast.parse(open('shared/pax_job.py').read())
function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='database_connection')
psycopg2=Mock()
scope=globals()
exec(compile(ast.Module(body=[function],type_ignores=[]),'<connection>','exec'),scope)
os.environ['DATABASE_URL']='postgresql://localhost/pax_schema_fresh?schema=public&sslmode=require&application_name=pax-test'
scope['database_connection']()
url=psycopg2.connect.call_args.args[0]
assert dict(parse_qsl(urlsplit(url).query))=={'sslmode':'require','application_name':'pax-test'}
assert psycopg2.connect.call_args.kwargs['connect_timeout']==10
del os.environ['DATABASE_URL']
try:
 scope['database_connection']()
 raise AssertionError('Missing URL must fail')
except RuntimeError: pass
`]);
});
