import type { SideEffectSeverity } from '@prisma/client';

export const SAFETY_SEVERITY_POINTS: Record<SideEffectSeverity, number> = {
  MILD: 1,
  MODERATE: 2,
  SEVERE: 4,
  LIFE_THREATENING: 6,
};

export type SafetySignalLevel = 'CRITICAL' | 'ELEVATED' | 'WATCH' | 'LOW';

export function safetySignalLevel(score: number): SafetySignalLevel {
  if (score >= 12) return 'CRITICAL';
  if (score >= 6) return 'ELEVATED';
  if (score >= 3) return 'WATCH';
  return 'LOW';
}

