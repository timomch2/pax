// PAX identity helpers. PAX IDs and Clinic IDs are human-readable, unique-ish
// identifiers surfaced across the platform (profiles, billing, ledger, deal room).

function randomBlock(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

const ROLE_PREFIX: Record<string, string> = {
  PRACTITIONER: 'PR',
  PATIENT: 'PT',
  INNOVATOR: 'IN',
  INVESTOR: 'IV',
  EMPLOYER: 'EM',
  POLICYMAKER: 'PM',
  ADMIN: 'AD',
};

export function generatePaxId(role: string): string {
  const prefix = ROLE_PREFIX[role] ?? 'PX';
  return `PAX-${prefix}-${randomBlock(6)}`;
}

export function generateClinicId(): string {
  return `CLN-${randomBlock(6)}`;
}
