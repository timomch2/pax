export const dynamic = 'force-dynamic';

import { VaultDocumentsManager } from '@/components/innovator/vault-documents-manager';

export default function VaultDocumentsPage() {
  return <div className="space-y-5"><div><h1 className="font-display text-2xl font-semibold">Vault Documents</h1><p className="text-sm text-muted-foreground">Attach security-scanned Tier 2 assets. Only you and investors with a recorded NDA plus active approval can download them.</p></div><VaultDocumentsManager /></div>;
}
