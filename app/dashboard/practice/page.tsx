import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { PracticeWorkspaceView } from '@/components/hub/practice-workspace';
export const dynamic = 'force-dynamic';

export default function PracticeWorkspacePage() {
  return <Container><PageHeader title="Practice Workspace" description="Your facilities, appointments, team, and clinical income." /><PracticeWorkspaceView /></Container>;
}
