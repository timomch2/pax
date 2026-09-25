import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ArrowRight, LayoutDashboard, BriefcaseBusiness, FileText, Lightbulb, Scale, Store } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { homePathForRole, roleLabel } from '@/lib/access';
import { productUrl } from '@/lib/product-hosts';
import { loadHomeFeed } from '@/lib/home-feed';
import { authorizeUser } from '@/lib/authorization';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';

export const dynamic = 'force-dynamic';
const icons = { debates: Scale, abstracts: FileText, innovations: Lightbulb, market: Store, jobs: BriefcaseBusiness };

export default async function HomeFeedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const sections = await loadHomeFeed(session.user.id);
  const dashboardAccess = await authorizeUser(session.user.id, 'dashboard.read');
  const name = session.user.name?.trim().split(/\s+/)[0] || 'member';
  const workspace = session.user.role === 'PRACTITIONER' ? '/practice/finance' : homePathForRole(session.user.role);
  const workspaceLabel = session.user.role === 'PRACTITIONER' ? 'Practice finance' : session.user.role === 'ADMIN' ? 'Admin console' : `${roleLabel(session.user.role)} workspace`;
  return <Container size="full" className="px-0 sm:px-0 lg:px-0">
    <div className="home-welcome mb-5 rounded-2xl p-6 text-white">
      <PageHeader title={`Welcome back, ${name}`} description="Here is what is new across The Praxis Exchange." className="border-0 pb-0 [&_h1]:text-xl [&_p]:text-white/75" />
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <a href={productUrl(workspace.startsWith('/talent') ? 'talent' : 'main', workspace)} className="home-workspace-link rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{workspaceLabel}</a>
        {dashboardAccess.ok && <a href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20"><LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />My dashboard</a>}
        <a href={productUrl('talent', '/talent')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20">Talent Marketplace</a>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {sections.map(section => {
        const Icon = icons[section.id as keyof typeof icons];
        return <section key={section.id} aria-labelledby={`feed-${section.id}`} className="home-feed-section rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/[0.05]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={`feed-${section.id}`} className="flex items-center gap-2 text-base font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden="true" /></span>{section.title}</h2>
            <a href={section.href} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">{section.linkLabel}<ArrowRight className="h-3 w-3" aria-hidden="true" /></a>
          </div>
          <div className="space-y-3">
            {section.items.map(item => <a key={item.id} href={item.href} className="block rounded-xl border border-black/[0.06] p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <h3 className="home-feed-title font-medium leading-snug">{item.title}</h3>
              {item.detail && <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>}
              {item.description && <p className="mt-1.5 home-feed-description text-sm">{item.description.length > 160 ? `${item.description.slice(0, 160).trimEnd()}…` : item.description}</p>}
            </a>)}
            {!section.items.length && <p className="text-sm text-muted-foreground" role={section.message ? 'status' : undefined}>{section.message || (section.id === 'innovations' ? 'No innovations available for your account. Open Innovation Hub to check access or manage your work.' : 'Nothing new here yet. Explore the service for more.')}</p>}
          </div>
        </section>;
      })}
    </div>
  </Container>;
}
