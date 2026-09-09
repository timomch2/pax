import { createHash } from 'crypto';
import { z } from 'zod';

export const facilityInputSchema = z.object({
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  officialName: z.string().trim().min(2).max(240),
  county: z.string().trim().max(160).nullable().default(null),
  subCounty: z.string().trim().max(160).nullable().default(null),
  town: z.string().trim().max(160).nullable().default(null),
  facilityType: z.string().trim().min(1).max(160),
  ownership: z.string().trim().max(160).nullable().default(null),
  kephLevel: z.string().trim().max(80).nullable().default(null),
  regulatoryBody: z.string().trim().max(160).nullable().default(null),
  fidCode: z.string().trim().max(100).nullable().default(null),
  frCode: z.string().trim().max(100).nullable().default(null),
  registrationNumber: z.string().trim().max(100).nullable().default(null),
}).strict().refine((value) => Boolean(value.county && (value.town || value.subCounty)), 'County/state and town/sub-county are required');

export function knownRegistryValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return !normalized || ['NULL', 'N/A', '-'].includes(normalized.toUpperCase()) ? null : normalized;
}

export function normalizeFacilityName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Used for warnings, not automatic merging: branches and similarly named facilities remain distinct. */
export function similarFacilityNames(left: string, right: string): boolean {
  const a = normalizeFacilityName(left), b = normalizeFacilityName(right);
  if (a === b) return true;
  if (Math.min(a.length, b.length) > 6 && (a.includes(b) || b.includes(a))) return true;
  const tokens = (s: string) => new Set(s.split(' ').filter((x) => !['hospital', 'clinic', 'medical', 'centre', 'center', 'health', 'limited', 'ltd'].includes(x)));
  const at = tokens(a), bt = tokens(b);
  if (!at.size || !bt.size) return false;
  const intersection = [...at].filter((x) => bt.has(x)).length;
  if (intersection / new Set([...at, ...bt]).size >= 0.65) return true;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length] / Math.max(a.length, b.length) <= 0.15;
}

const sourceRecord = z.object({
  officialName: z.string().max(240).nullable().optional(),
  registrationNumber: z.string().nullable().optional(), fidCode: z.string().nullable().optional(), frCode: z.string().nullable().optional(),
  facilityOwnership: z.string().nullable().optional(), kephLevel: z.string().nullable().optional(), facilityType: z.string().nullable().optional(),
  address: z.object({ county: z.string().nullable().optional(), subCounty: z.string().nullable().optional(), town: z.string().nullable().optional() }).nullable().optional(),
  regulatoryOperationalStatus: z.object({ operationalStatus: z.string().nullable().optional() }).nullable().optional(),
});

export function parseRegistryFacility(input: unknown) {
  const raw = sourceRecord.parse(input);
  const officialName = knownRegistryValue(raw.officialName);
  if (!officialName) return null;
  const fidCode = knownRegistryValue(raw.fidCode), frCode = knownRegistryValue(raw.frCode), registrationNumber = knownRegistryValue(raw.registrationNumber);
  const identifier = fidCode ? `fid:${fidCode}` : frCode ? `fr:${frCode}` : registrationNumber ? `registration:${registrationNumber}` : null;
  if (!identifier) return null; // No invented stable ID: count and report source rows without an identifier.
  return {
    countryCode: 'KE', source: 'KE_NHFR', sourceKey: `KE_NHFR:${identifier}`,
    officialName, normalizedName: normalizeFacilityName(officialName),
    fidCode, frCode, registrationNumber,
    county: knownRegistryValue(raw.address?.county), subCounty: knownRegistryValue(raw.address?.subCounty), town: knownRegistryValue(raw.address?.town),
    facilityType: knownRegistryValue(raw.facilityType), ownership: knownRegistryValue(raw.facilityOwnership),
    kephLevel: knownRegistryValue(raw.kephLevel), operationalStatus: knownRegistryValue(raw.regulatoryOperationalStatus?.operationalStatus),
  };
}

export function facilityFingerprint(value: unknown): string {
  const canonical = (item: unknown): unknown => Array.isArray(item) ? item.map(canonical) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : item;
  // PostgreSQL JSONB reorders object keys; key order must never create a false registry change.
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export const REGISTRY_QUERY = `query SearchFacilities($filters: FacilityFilterInput!) {
  searchFacilities(filters: $filters) { page pageSize totalMatches data {
    registrationNumber fidCode frCode officialName facilityOwnership
    regulatoryOperationalStatus { operationalStatus }
    address { county subCounty town } kephLevel facilityType
  } }
}`;

const registryPage = z.object({ page: z.number().int().nonnegative(), pageSize: z.number().int().positive().max(30), totalMatches: z.number().int().nonnegative(), data: z.array(z.unknown()).max(30) });

export async function fetchRegistryPage(page: number, pageSize = 30, fetcher: typeof fetch = fetch) {
  const result = await fetcher('https://nhfr.dha.go.ke/api/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': 'true', 'x-apollo-operation-name': 'SearchFacilities' },
    body: JSON.stringify({ operationName: 'SearchFacilities', query: REGISTRY_QUERY, variables: { filters: { page: String(page), pageSize: String(pageSize) } } }),
    signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  if (!result.ok) throw new Error(`Registry HTTP ${result.status}`);
  const body = await result.json();
  if (body.errors) throw new Error('Registry query failed');
  const parsed = registryPage.parse(body.data?.searchFacilities);
  if (parsed.page !== page || parsed.pageSize !== pageSize) throw new Error('Registry returned unexpected pagination');
  if (parsed.data.length === 0 && page * pageSize < parsed.totalMatches) throw new Error('Registry returned an incomplete page');
  return parsed;
}
