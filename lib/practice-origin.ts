import { assertPractice } from '@/lib/practice-policy';
/** Production uses the platform-injected origin; local previews accept only loopback request origins. */
export function practiceOrigin(request: Request): string {
  if (process.env.NEXTAUTH_URL) return new URL(process.env.NEXTAUTH_URL).origin;
  const url = new URL(request.url);
  assertPractice(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 503, 'Application URL is not configured');
  return url.origin;
}
