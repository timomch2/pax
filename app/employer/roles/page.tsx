import { redirect } from 'next/navigation';
import { talentEnabled, productUrl } from '@/lib/product-hosts';
export const dynamic = 'force-dynamic';

import { JobsManager } from '@/components/employer/jobs-manager';

export default function EmployerRolesPage() {
  if (talentEnabled()) redirect(productUrl('talent', '/talent/hiring'));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Post &amp; Manage Roles</h2>
        <p className="text-sm text-muted-foreground">
          Publish vacancies, review applications and manage each hiring stage.
        </p>
      </div>
      <JobsManager />
    </div>
  );
}
