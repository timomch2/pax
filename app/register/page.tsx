import { RegisterForm } from '@/components/auth/register-form';
import { AuthLayout } from '@/components/layouts/auth-layout';

export default function RegisterPage() {
  return (
    <AuthLayout title="Create Account" description="Join the PAX healthcare ecosystem">
      <RegisterForm />
    </AuthLayout>
  );
}
