import { AuthLayout } from '@/components/layouts/auth-layout';
import { PracticeInvitationForm } from '@/components/hub/practice-invitation-form';
export const dynamic = 'force-dynamic';
export default function InvitationPage() {
  return <AuthLayout title="Join a practice workspace" description="Use your own account to accept an invitation."><PracticeInvitationForm /></AuthLayout>;
}
