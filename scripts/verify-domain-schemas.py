"""Read-only local migration evidence: row fingerprints and PostgreSQL object identities.

Usage: python3 scripts/verify-domain-schemas.py DATABASE public|domains OUTPUT.json
Compare snapshots of the SAME database before/after migration (OIDs differ on restore).
Snapshots contain hashes/counts, never row contents. Requires local psql authentication.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
database, stage, destination = sys.argv[1:]
if database not in {"pax_dev", "pax_schema_rehearsal", "pax_schema_fresh", "pax_practice_test", "pax_talent_test"}:
    raise SystemExit("Only explicitly isolated localhost PAX databases are supported")
if stage not in {"public", "domains"}:
    raise SystemExit("Stage must be public or domains")
manifest = json.loads((ROOT / "prisma/domain-schemas.json").read_text())


def query(sql):
    return subprocess.check_output(["psql", "-X", "-h", "localhost", "-d", database, "-v", "ON_ERROR_STOP=1", "-Atc", sql], text=True).strip()


snapshot = {"models": {}, "enums": {}}
for name, owner in manifest["models"].items():
    schema = owner if stage == "domains" else "public"
    table = f'"{schema}"."{name}"'
    # Row order and physical layout can change; compare sorted per-row digests.
    rows = query(f"SELECT count(*) || ':' || COALESCE(md5(string_agg(hash, '' ORDER BY hash)), '') FROM (SELECT md5(row_to_json(t)::text) hash FROM {table} t) s")
    oid = query(f"SELECT '{table}'::regclass::oid")
    indexes = query(f"SELECT indexrelid, indisunique, indisvalid, indkey FROM pg_index WHERE indrelid={oid} ORDER BY indexrelid")
    constraints = query(f"SELECT oid, contype, conrelid, confrelid, convalidated, conkey, confkey FROM pg_constraint WHERE conrelid={oid} ORDER BY oid")
    acl = query(f"SELECT relowner, relacl FROM pg_class WHERE oid={oid}")
    snapshot["models"][name] = {"rows": rows, "oid": oid, "indexes": indexes, "constraints": constraints, "acl": acl}
for name, owner in manifest["enums"].items():
    schema = owner if stage == "domains" else "public"
    snapshot["enums"][name] = query(f"SELECT t.oid, e.oid, e.enumlabel, e.enumsortorder FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='{schema}' AND t.typname='{name}' ORDER BY e.enumsortorder")
    assert snapshot["enums"][name], f"Missing enum {schema}.{name}"
encoded = json.dumps(snapshot, sort_keys=True, indent=2) + "\n"
pathlib.Path(destination).write_text(encoded)
print(f"Verified {len(snapshot['models'])} tables and {len(snapshot['enums'])} enums; snapshot SHA256 {hashlib.sha256(encoded.encode()).hexdigest()}")
