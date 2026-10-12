import { prisma } from '@/lib/db';
import { hasRole, addressRequiredForTier } from '@/lib/access';
import { authorizeUser } from '@/lib/authorization';
import { practiceProfileSchema, communityProfileSchema, vendorContactSchema, buyerContactSchema, type EditableServiceProfile } from '@/lib/service-profile-validation';

export type ServiceProfileDb = Pick<typeof prisma, 'user' | 'practitionerProfile' | 'marketplaceVendor' | 'marketplaceBuyer' | 'practiceSpecialty'>;

export class ServiceProfileError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Select only the caller's service record; shared account credentials never enter profile responses. */
export async function readServiceProfile(userId: string, service: EditableServiceProfile, db: ServiceProfileDb = prisma) {
  if (service === 'practice') return db.practitionerProfile.findUnique({ where: { userId }, select: { specialty: true, hospital: true, bio: true, affiliations: true, consultationRate: true, medicalRegNumber: true, clinicId: true, specialtyId: true, specialtyGroupId: true, specialtyOther: true, directoryEnabled: true, practiceAddress: true, practiceTown: true, practiceCounty: true, latitude: true, longitude: true } });
  if (service === 'community') return db.user.findUnique({ where: { id: userId }, select: { headline: true, organization: true, location: true, healthAreas: true, bio: true, linkedinUrl: true } });
  if (service === 'vendor') return db.marketplaceVendor.findUnique({ where: { userId }, select: { corporateName: true, tradingName: true, country: true, registrationNumber: true, primaryPillar: true, status: true, contactPerson: true, contactEmail: true, contactPhone: true } });
  return db.marketplaceBuyer.findUnique({ where: { userId }, select: { institutionName: true, entityType: true, jurisdiction: true, status: true, procurementOfficer: true, officerTitle: true, officerEmail: true, phone: true } });
}

/** Each service has its own allowlist and writes only its existing service record. */
export async function saveServiceProfile(userId: string, service: EditableServiceProfile, input: unknown, db: ServiceProfileDb = prisma) {
  if (service === 'practice') {
    const data = practiceProfileSchema.parse(input);
    if ((data.latitude == null) !== (data.longitude == null)) throw new ServiceProfileError(400, 'Provide both latitude and longitude');
    const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true, additionalRoles: true } });
    if (!actor || !hasRole(actor.role, actor.additionalRoles, 'PRACTITIONER')) throw new ServiceProfileError(403, 'A practitioner account is required');
    if (data.specialtyId || data.specialtyGroupId) {
      const group = await db.practiceSpecialty.findFirst({ where: { id: data.specialtyGroupId || '', parentId: null, status: 'APPROVED' } });
      if (!group) throw new ServiceProfileError(400, 'Choose an approved specialty group');
      const child = data.specialtyId ? await db.practiceSpecialty.findFirst({ where: { id: data.specialtyId, parentId: group.id, status: 'APPROVED' } }) : null;
      if (data.specialtyId && !child) throw new ServiceProfileError(400, 'Choose a subspecialty in the selected group');
      data.specialty = child?.name || data.specialtyOther || group.name;
    }
    const result = await db.practitionerProfile.updateMany({ where: { userId }, data });
    if (!result.count) throw new ServiceProfileError(404, 'No practitioner profile is registered for your account');
  } else if (service === 'community') {
    await db.user.update({ where: { id: userId }, data: communityProfileSchema.parse(input) });
  } else if (service === 'vendor') {
    const data = vendorContactSchema.parse(input);
    const access = await authorizeUser(userId, 'marketplace.vendor.manage', { ownerId: userId });
    if (!access.ok) throw new ServiceProfileError(access.status, access.error);
    const result = await db.marketplaceVendor.updateMany({ where: { userId }, data });
    if (!result.count) throw new ServiceProfileError(404, 'Complete vendor registration first');
  } else {
    const data = buyerContactSchema.parse(input);
    const actor = await db.user.findUnique({ where: { id: userId }, select: { tier: true } });
    if (addressRequiredForTier(actor?.tier) && !data.phone) throw new ServiceProfileError(400, 'Institution phone is required for your membership tier');
    const result = await db.marketplaceBuyer.updateMany({ where: { userId }, data });
    if (!result.count) throw new ServiceProfileError(404, 'Complete buyer registration first');
  }
  return readServiceProfile(userId, service, db);
}
