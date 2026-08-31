import { AuthLayout } from '@/components/layouts/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return <AuthLayout title="Reset Password" description="Choose a new password for your account">{searchParams.token ? <ResetPasswordForm token={searchParams.token} /> : <p className="text-sm text-destructive">The reset token is missing.</p>}</AuthLayout>;
}

