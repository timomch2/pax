import { AppShell } from '@/components/layouts/app-shell';
import { PaxLogo } from '@/components/brand/pax-logo';
import { Grid2X2, ShieldCheck, UserCircle } from 'lucide-react';
import { productUrl } from '@/lib/product-hosts';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AppShell
    closeSidebarOnNavigate
    sidebar={<>
      <a href={productUrl('main', '/')}><PaxLogo size="sm" /></a>
      <p className="my-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
      <nav aria-label="Account navigation" className="space-y-1">
        <a href="/account" aria-current="page" className="flex items-center gap-3 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary"><UserCircle className="h-4 w-4" aria-hidden="true" />My account</a>
        <a href="#my-services" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"><Grid2X2 className="h-4 w-4" aria-hidden="true" />My services</a>
        <a href="#account-security" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Account security</a>
      </nav>
      <div className="mt-auto space-y-3 pt-8">
        <a className="block text-sm text-muted-foreground hover:text-primary" href={productUrl('talent', '/talent')}>Open Talent</a>
        <a className="block text-sm text-muted-foreground hover:text-primary" href={productUrl('practice', '/practice')}>Open Practice</a>
        <a className="block text-sm text-muted-foreground hover:text-primary" href={productUrl('main', '/')}>Main PAX platform</a>
      </div>
    </>}
    header={<span className="text-sm font-semibold">PAX Account</span>}
  >{children}</AppShell>;
}
