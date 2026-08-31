import { AuthLayout } from '@/components/layouts/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return <AuthLayout title="Forgot Password" description="Request a secure password-reset link"><ForgotPasswordForm /></AuthLayout>;
}

