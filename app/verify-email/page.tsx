import { AuthLayout } from '@/components/layouts/auth-layout';
import { VerifyEmailResult } from '@/components/auth/verify-email-result';

export default function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <AuthLayout title="Verify Email" description="Confirm the email address for your PAX account">
      {searchParams.token
        ? <VerifyEmailResult token={searchParams.token} />
        : <p className="text-sm text-destructive">The verification token is missing.</p>}
    </AuthLayout>
  );
}

