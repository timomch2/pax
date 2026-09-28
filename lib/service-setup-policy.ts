import type { PermissionKey } from "@/lib/permissions";
import type { ServiceKey } from "@prisma/client";
/** Explicit service activation is the only self-service permission provisioner. No staff or surveillance permissions. */
export const SERVICE_SETUP_PERMISSIONS: Record<
  ServiceKey,
  readonly PermissionKey[]
> = {
  practice: [
    "verification.request",
    "hub.patient.create",
    "hub.patient.read",
    "hub.patient.update",
    "hub.patient.delete",
    "hub.note.create",
    "hub.note.read",
    "hub.appointment.create",
    "hub.appointment.read",
    "hub.appointment.update",
    "hub.appointment.delete",
    "hub.invoice.create",
    "hub.invoice.read",
    "hub.invoice.update",
    "hub.invoice.delete",
    "hub.insurer.manage",
    "hub.reminder.manage",
  ],
  talent: ["talent.job.read"],
  community: [
    "community.read",
    "community.contribute",
    "debate.read",
    "debate.contribute",
    "payment.purchase",
    "payment.read",
  ],
  market: [
    "marketplace.listing.read",
    "marketplace.listing.manage",
    "marketplace.vendor.manage",
    "marketplace.review.create",
  ],
  innovation: [
    "innovation.create",
    "innovation.read",
    "innovation.update",
    "innovation.delete",
    "vault.access.review",
    "vault.document.create",
    "vault.document.read",
    "vault.document.update",
    "vault.document.delete",
  ],
  investment: [
    "innovation.read",
    "vault.access.request",
    "vault.document.read",
    "investment.mandate.manage",
    "investment.opportunity.read",
    "investment.portfolio.manage",
  ],
  safety: ["safety.report.create"],
};
export const SETUP_ROLE = {
  practice: "PRACTITIONER",
  innovation: "INNOVATOR",
  investment: "INVESTOR",
} as const;
