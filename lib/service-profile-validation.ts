import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
export const communityProfileSchema = z.object({
  headline: text(200), organization: text(200), location: text(200),
  healthAreas: text(1000), bio: text(5000),
  linkedinUrl: z.union([z.literal(''), z.string().url().max(500).refine(value => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS URL')]),
}).strict();
export const practiceProfileSchema = z.object({
  specialty: text(200).min(1), hospital: text(200), bio: text(5000), affiliations: text(2000),
  consultationRate: z.coerce.number().int().min(0).max(20000000),
  specialtyId: text(100).nullable().optional(), specialtyGroupId: text(100).nullable().optional(), specialtyOther: text(200).nullable().optional(),
  directoryEnabled: z.boolean().optional(),
  practiceAddress: text(300).optional(), practiceTown: text(120).optional(), practiceCounty: text(120).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional(),
}).strict();
export const vendorContactSchema = z.object({
  contactPerson: text(200).min(1), contactEmail: z.string().trim().email().max(254), contactPhone: text(60).min(1),
}).strict();
export const buyerContactSchema = z.object({
  procurementOfficer: text(200).min(1), officerTitle: text(200), officerEmail: z.string().trim().email().max(254), phone: text(60),
}).strict();
export type EditableServiceProfile = 'practice' | 'community' | 'vendor' | 'buyer';
export function isEditableServiceProfile(service: string): service is EditableServiceProfile {
  return ['practice', 'community', 'vendor', 'buyer'].includes(service);
}
