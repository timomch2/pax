import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

function erasedIdentity(userId: string) {
  const token = createHash('sha256').update(`pax-erasure:${userId}`).digest('hex').slice(0, 20);
  return { name: 'Deleted member', email: `deleted-${token}@privacy.invalid`, token };
}

export async function executeErasureRequest(requestId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.dataSubjectRequest.findUnique({ where: { id: requestId } });
    if (!request || request.type !== 'ERASURE') throw new Error('ERASURE_REQUEST_NOT_FOUND');
    if (!['IN_REVIEW', 'PARTIALLY_COMPLETED'].includes(request.status)) throw new Error('ERASURE_REQUEST_NOT_APPROVED');
    if (request.executedAt) return request;

    const user = await tx.user.findUnique({ where: { id: request.requesterId }, select: { id: true } });
    if (!user) throw new Error('DATA_SUBJECT_NOT_FOUND');
    const identity = erasedIdentity(user.id);
    const now = new Date();

    // Authentication and discretionary access data have no continuing operational purpose.
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.authToken.deleteMany({ where: { userId: user.id } });
    await tx.userPermission.deleteMany({ where: { userId: user.id } });
    await tx.userAccessRole.deleteMany({ where: { userId: user.id } });
    await tx.notificationPreference.deleteMany({ where: { userId: user.id } });

    await tx.practitionerProfile.updateMany({
      where: { userId: user.id },
      data: { medicalRegNumber: `ERASED-${identity.token}`, specialty: 'Withheld', hospital: null, bio: null, affiliations: null },
    });
    await tx.marketplaceVendor.updateMany({
      where: { userId: user.id },
      data: { tradingName: null, taxId: null, contactPerson: 'Deleted member', contactEmail: identity.email, contactPhone: '', headOfficeAddress: 'Withheld', city: null, postalCode: null },
    });
    await tx.marketplaceBuyer.updateMany({
      where: { userId: user.id },
      data: { physicalAddress: null, city: null, postalCode: null, phone: null, procurementOfficer: 'Deleted member', officerTitle: null, officerEmail: identity.email },
    });
    await tx.uploadAsset.updateMany({ where: { ownerId: user.id, status: { not: 'REJECTED' } }, data: { status: 'REJECTED', retainedUntil: now, scanResult: 'Erasure request: object scheduled for secure deletion' } });
    await tx.notificationDelivery.updateMany({ where: { event: { userId: user.id } }, data: { recipient: identity.email } });

    // Financial, clinical, safety, audit, and signed NDA records remain linked to a pseudonymous
    // subject where statutory or legal-defense retention may apply; the case records that exception.
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: identity.name,
        email: identity.email,
        password: null,
        image: null,
        phone: null,
        organization: null,
        bio: null,
        linkedinUrl: null,
        headline: null,
        location: null,
        physicalAddress: null,
        city: null,
        postalCode: null,
        country: null,
        healthAreas: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [],
        accountStatus: 'DISABLED',
        sessionVersion: { increment: 1 },
        permissionVersion: { increment: 1 },
      },
    });

    const summary = {
      authenticationDeleted: true,
      profileDeidentified: true,
      uploadsScheduledForDeletion: true,
      retainedCategories: ['financial', 'clinical', 'safety', 'audit', 'signed_legal_records'],
    };
    const updated = await tx.dataSubjectRequest.update({
      where: { id: request.id },
      data: {
        status: 'PARTIALLY_COMPLETED',
        executionConfirmedAt: now,
        executedAt: now,
        executionSummary: summary,
        retentionExceptions: { categories: summary.retainedCategories, reason: 'Legal obligation, patient safety, accounting, and legal defense review required before destruction.' },
        resolution: 'Direct identifiers and authentication data were erased. Regulated records were pseudonymized and retained for documented legal review.',
        completedAt: now,
      },
    });
    await tx.dataSubjectRequestEvent.create({
      data: { requestId: request.id, fromStatus: request.status, toStatus: 'PARTIALLY_COMPLETED', actorId, note: 'Erasure execution completed with documented statutory retention exceptions.' },
    });
    return updated;
  }, { isolationLevel: 'Serializable' });
}
