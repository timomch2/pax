import { prisma } from '@/lib/db';
import { authorizeUser } from '@/lib/authorization';
import { productUrl, talentEnabled } from '@/lib/product-hosts';
import { publicJobWhere } from '@/lib/talent-access';

export type FeedItem = { id: string; title: string; detail: string; description: string; href: string };
export type FeedSection = { id: string; title: string; href: string; linkLabel: string; items: FeedItem[]; message?: string };

/** Only explicitly selected discovery fields enter Home; never vault, clinical or safety records. */
export async function loadHomeFeed(userId: string, dependencies = { db: prisma, authorize: authorizeUser }): Promise<FeedSection[]> {
  const { db, authorize } = dependencies;
  const account = productUrl('accounts', '/account');
  const sections: Array<FeedSection & { load: () => Promise<FeedItem[]> }> = [
    { id: 'debates', title: 'New debates', href: '/knowledge', linkLabel: 'All debates', items: [], load: async () => {
      if (!(await authorize(userId, 'community.read')).ok) return [];
      const rows = await db.debate.findMany({ where: { status: { in: ['OPEN', 'CLOSING_SOON'] } }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, motion: true, healthDomain: true, geographyFocus: true } });
      return rows.map(row => ({ id: row.id, title: row.title, detail: [row.healthDomain, row.geographyFocus].filter(Boolean).join(' · '), description: row.motion, href: `/knowledge/${row.id}` }));
    } },
    { id: 'abstracts', title: 'New abstracts', href: '/knowledge', linkLabel: 'All abstracts', items: [], load: async () => {
      if (!(await authorize(userId, 'community.read')).ok) return [];
      const rows = await db.debate.findMany({ where: { status: 'PUBLISHED', consensusPublishedAt: { not: null } }, orderBy: { consensusPublishedAt: 'desc' }, take: 5,
        select: { id: true, title: true, healthDomain: true, consensusAbstract: true } });
      return rows.map(row => ({ id: row.id, title: row.title, detail: row.healthDomain || '', description: row.consensusAbstract || '', href: `/knowledge/${row.id}` }));
    } },
    { id: 'innovations', title: 'New innovations', href: `${account}?service=innovation#my-services`, linkLabel: 'Innovation Hub', items: [], load: async () => {
      // Home must not widen the existing ownership boundary for innovation records.
      if (!(await authorize(userId, 'innovation.read')).ok) return [];
      const rows = await db.innovation.findMany({ where: { ownerId: userId, status: { not: 'DRAFT' } }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, sector: true, tagline: true } });
      return rows.map(row => ({ id: row.id, title: row.title, detail: row.sector, description: row.tagline || '', href: `/innovator?view=${row.id}` }));
    } },
    { id: 'market', title: 'New in the marketplace', href: '/marketplace', linkLabel: 'Marketplace', items: [], load: async () => {
      const rows = await db.marketplaceListing.findMany({ where: { isPublished: true, vendor: { status: 'APPROVED', OR: [{ licenseExpiryDate: null }, { licenseExpiryDate: { gte: new Date() } }] } }, orderBy: { createdAt: 'desc' }, take: 4,
        select: { id: true, title: true, description: true, priceDisplay: true } });
      return rows.map(row => ({ id: row.id, title: row.title, detail: row.priceDisplay || 'Contact vendor directly', description: row.description, href: `/marketplace/${row.id}` }));
    } },
    { id: 'jobs', title: 'Jobs and opportunities', href: productUrl('talent', '/talent'), linkLabel: 'All opportunities', items: [], load: async () => {
      if (!talentEnabled()) return [];
      const rows = await db.job.findMany({ where: publicJobWhere(), orderBy: { publishedAt: 'desc' }, take: 5,
        select: { id: true, title: true, organization: true, location: true, summary: true } });
      return rows.map(row => ({ id: row.id, title: row.title, detail: [row.organization, row.location].filter(Boolean).join(' · '), description: row.summary, href: productUrl('talent', `/talent/jobs/${row.id}`) }));
    } },
  ];
  return Promise.all(sections.map(async ({ load, ...section }) => {
    try { return { ...section, items: await load() }; }
    catch { return { ...section, message: 'This section could not be loaded. Open the service to try again.' }; }
  }));
}
