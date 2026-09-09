import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { facilityInputSchema, normalizeFacilityName, similarFacilityNames } from '@/lib/facility-directory';
import { assertPractice } from '@/lib/practice-policy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { authorizePracticeUser, authorizeUser } from '@/lib/authorization';

type Db = Prisma.TransactionClient;

export async function facilityMatches(db: Db, input: { countryCode: string; officialName: string; county: string | null; town: string | null; subCounty: string | null; fidCode: string | null; frCode: string | null; registrationNumber: string | null }, excludeId?: string) {
  const identifiers = ['fidCode', 'frCode', 'registrationNumber'] as const;
  const exact = identifiers.filter((key) => input[key]).map((key) => ({ [key]: input[key] }));
  const locations = [input.county && { county: { equals: input.county, mode: 'insensitive' as const } }, input.town && { town: { equals: input.town, mode: 'insensitive' as const } }, input.subCounty && { subCounty: { equals: input.subCounty, mode: 'insensitive' as const } }].filter(Boolean) as Prisma.HealthFacilityWhereInput[];
  const rows = await db.healthFacility.findMany({ where: {
    countryCode: input.countryCode, ...(excludeId ? { id: { not: excludeId } } : {}),
    OR: [...exact, { normalizedName: normalizeFacilityName(input.officialName) }, ...locations],
  } });
  const duplicate = rows.find((row) => identifiers.some((key) => input[key] && row[key] === input[key]));
  const similar = rows.filter((row) => similarFacilityNames(row.officialName, input.officialName));
  return { duplicate, similar };
}

export async function addFacility(actorId: string, workspaceId: string, input: unknown) {
  const body = z.object({ facility: facilityInputSchema, disputeReason: z.string().trim().min(10).max(2000).optional() }).strict().parse(input);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    await authorizePracticeUser(actorId, workspaceId, 'facility.manage', tx);
    // Global name lock also serializes concurrent manual additions and registry imports.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'facility:' + body.facility.countryCode}))`;
    const matches = await facilityMatches(tx, body.facility);
    assertPractice(!matches.duplicate, 409, 'This registry identifier already belongs to a facility. Select the existing facility.');
    if (matches.similar.length) {
      if (!body.disputeReason) return { requiresReview: true, matches: matches.similar.map(facilityDto) };
      const correction = await tx.facilityCorrection.create({ data: { proposedById: actorId, proposed: body.facility, reason: body.disputeReason } });
      return { requiresReview: true, correctionId: correction.id, matches: matches.similar.map(facilityDto) };
    }
    const facility = await tx.healthFacility.create({ data: { ...body.facility, normalizedName: normalizeFacilityName(body.facility.officialName), createdById: actorId } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'FACILITY_CREATED', entityId: facility.id } });
    return { facility: facilityDto(facility) };
  });
}

export function facilityDto(row: { id: string; officialName: string; countryCode: string; county: string | null; subCounty: string | null; town: string | null; facilityType: string | null; ownership: string | null; kephLevel: string | null; regulatoryBody: string | null; fidCode: string | null; frCode: string | null; registrationNumber: string | null; operationalStatus: string | null; source: string | null }) {
  const { id, officialName, countryCode, county, subCounty, town, facilityType, ownership, kephLevel, regulatoryBody, fidCode, frCode, registrationNumber, operationalStatus, source } = row;
  return { id, officialName, countryCode, county, subCounty, town, facilityType, ownership, kephLevel, regulatoryBody, fidCode, frCode, registrationNumber, operationalStatus, source };
}

export async function searchFacilities(q: string, country?: string, cursor?: string) {
  const normalized = normalizeFacilityName(q);
  const rows = await prisma.healthFacility.findMany({ where: {
    ...(country ? { countryCode: country.toUpperCase() } : {}),
    ...(q ? { OR: [
      { normalizedName: { contains: normalized } }, { fidCode: { startsWith: q } }, { frCode: { startsWith: q } }, { registrationNumber: { startsWith: q } },
      { county: { contains: q, mode: 'insensitive' as const } }, { town: { contains: q, mode: 'insensitive' as const } }, { subCounty: { contains: q, mode: 'insensitive' as const } },
    ] } : {}),
  }, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), take: 31 });
  return { facilities: rows.slice(0, 30).map(facilityDto), nextCursor: rows.length > 30 ? rows[29].id : null };
}

export async function suggestFacilityCorrection(actorId: string, workspaceId: string, input: unknown) {
  const body = z.object({ facilityId: z.string().cuid(), proposed: facilityInputSchema, reason: z.string().trim().min(5).max(2000) }).strict().parse(input);
  return practiceTransaction(async (tx) => {
    await authorizePracticeUser(actorId, workspaceId, 'facility.manage', tx);
    const facility = await tx.healthFacility.findUnique({ where: { id: body.facilityId } });
    assertPractice(facility, 404, 'Facility not found');
    return tx.facilityCorrection.create({ data: { facilityId: facility.id, proposedById: actorId, baseVersion: facility.version, proposed: body.proposed, reason: body.reason } });
  });
}

export async function reviewFacilityCorrection(actorId: string, id: string, input: unknown) {
  const permission = await authorizeUser(actorId, 'admin.system.manage');
  assertPractice(permission.ok, 403, 'Only an authorised administrator can review facility corrections');
  const body = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().min(5).max(2000), distinctFacility: z.boolean().default(false) }).strict().parse(input);
  return practiceTransaction(async (tx) => {
    const correction = await tx.facilityCorrection.findUnique({ where: { id } });
    assertPractice(correction?.status === 'PENDING', 409, 'Correction is no longer pending');
    if (body.decision === 'APPROVED') {
      // Registry changes may contain missing location/type data; preserve those unknowns instead of inventing values.
      const registry = correction.importRunId !== null;
      const proposed: Record<string, string | null> = registry ? correction.proposed as Record<string, string | null> : facilityInputSchema.parse(correction.proposed);
      assertPractice(proposed.countryCode && proposed.officialName, 400, 'Incomplete facility proposal');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'facility:' + proposed.countryCode}))`;
      const data = {
        countryCode: proposed.countryCode, officialName: proposed.officialName, normalizedName: normalizeFacilityName(proposed.officialName),
        county: proposed.county, subCounty: proposed.subCounty, town: proposed.town, facilityType: proposed.facilityType,
        ownership: proposed.ownership, kephLevel: proposed.kephLevel, fidCode: proposed.fidCode, frCode: proposed.frCode, registrationNumber: proposed.registrationNumber,
        ...(registry ? { source: 'KE_NHFR', sourceKey: proposed.sourceKey, operationalStatus: proposed.operationalStatus, sourceSnapshot: correction.proposed as Prisma.InputJsonValue } : { regulatoryBody: proposed.regulatoryBody }),
      };
      const matches = await facilityMatches(tx, data, correction.facilityId ?? undefined);
      assertPractice(!matches.duplicate, 409, 'A registry identifier is already in use');
      if (correction.facilityId) {
        const changed = await tx.healthFacility.updateMany({ where: { id: correction.facilityId, version: correction.baseVersion ?? -1 }, data: { ...data, version: { increment: 1 } } });
        assertPractice(changed.count === 1, 409, 'Facility has changed since this suggestion; review a fresh suggestion');
      } else {
        assertPractice(!matches.similar.length || body.distinctFacility, 409, 'Confirm that this is a distinct facility after reviewing matches');
        await tx.healthFacility.create({ data: { ...data, createdById: correction.proposedById } });
      }
    }
    return tx.facilityCorrection.update({ where: { id }, data: { status: body.decision, reviewedById: actorId, reviewedAt: new Date(), reviewReason: body.reason } });
  });
}
