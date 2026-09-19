import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/account', '/login', '/register', '/talent/profile', '/talent/hiring', '/talent/applications', '/talent/messages', '/talent/saved', '/talent/admin', '/talent/team-invitation', '/talent/register'],
    },
  };
}
