import { z } from "zod";
import {
  INVESTOR_GEOGRAPHIES,
  INNOVATION_SECTORS,
  MANDATE_STAGES,
} from "@/lib/pax-labels";
const choices = (values: readonly string[]) =>
  z
    .array(z.string().refine((v) => values.includes(v), "Invalid choice"))
    .max(values.length)
    .transform((v) => [...new Set(v)]);
export const investorMandateSchema = z
  .object({
    geographies: choices(INVESTOR_GEOGRAPHIES),
    sectors: choices(INNOVATION_SECTORS),
    stages: choices(MANDATE_STAGES.map((s) => s.key)),
    ticketMinUsd: z.number().int().min(0).max(2147483647),
    ticketMaxUsd: z.number().int().min(0).max(2147483647),
    notes: z.string().max(2000),
    notifyOnMatch: z.boolean(),
    active: z.boolean(),
  })
  .strict()
  .refine(
    (v) => !v.ticketMaxUsd || v.ticketMaxUsd >= v.ticketMinUsd,
    "Maximum ticket size must be at least the minimum",
  );
