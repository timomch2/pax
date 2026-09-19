export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { productOrigins, productRoutingEnabled, safeReturnUrl } from '@/lib/product-hosts';
import { LoginForm } from '@/components/auth/login-form';
import { AuthLayout } from '@/components/layouts/auth-layout';

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const base = productRoutingEnabled() ? productOrigins().accounts : process.env.NEXTAUTH_URL || `http://${headers().get('host') || 'localhost:3000'}`;
    redirect(safeReturnUrl(searchParams.callbackUrl, base));
  }
  return (
    <AuthLayout title="Welcome Back" description="Sign in to your PAX account">
      <LoginForm />
    </AuthLayout>
  );
}
