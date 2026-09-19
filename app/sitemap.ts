import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { talentEnabled, productUrl, productRoutingEnabled, productOrigins } from '@/lib/product-hosts';
import { prisma } from '@/lib/db';
import { publicJobWhere } from '@/lib/talent-access';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const baseUrl = host.startsWith('http') ? host : `https://${host}`;
  if (talentEnabled()) {
    if (productRoutingEnabled() && ![new URL(productOrigins().talent).host, new URL(productOrigins().main).host].includes(headersList.get('host') || '')) return [];
    const jobs = await prisma.job.findMany({ where: publicJobWhere(), select: { id: true, updatedAt: true }, take: 40000 });
    const profiles = await prisma.talentProfile.findMany({ where: { visibility: 'PUBLIC', user: { accountStatus: 'ACTIVE' } }, select: { userId: true, updatedAt: true }, take: 5000 });
    const origin = productRoutingEnabled() ? productOrigins().talent : baseUrl;
    return [{ url: `${origin}/talent` }, ...jobs.map(job => ({ url: `${origin}/talent/jobs/${job.id}`, lastModified: job.updatedAt })), ...profiles.map(profile => ({ url: `${origin}/talent/people/${profile.userId}`, lastModified: profile.updatedAt }))];
  }

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/login`, lastModified: new Date() },
    { url: `${baseUrl}/register`, lastModified: new Date() },
  ];
}
