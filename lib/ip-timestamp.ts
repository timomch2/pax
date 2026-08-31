import { createHash } from 'crypto';

// Generates a verifiable IP fingerprint for an Innovation 2-Pager Brief.
// The hash binds authorship (ownerId), the core content, and the exact moment
// of submission — so any later change to the brief would produce a different hash.
export function generateIpHash(input: {
  ownerId: string;
  title: string;
  problem: string;
  solution: string;
  evidence: string;
  timestamp: string;
}): string {
  const payload = [
    input.ownerId,
    input.title,
    input.problem,
    input.solution,
    input.evidence,
    input.timestamp,
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

// A short, human-friendly certificate reference derived from the full hash.
export function certificateRef(ipHash: string): string {
  return `PAX-IP-${ipHash.slice(0, 12).toUpperCase()}`;
}
