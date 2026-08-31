export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import SafetyHub from '@/components/safety/safety-hub';

export const metadata: Metadata = {
  title: 'Safety & Feedback Hub | PAX',
  description: 'Report adverse drug reactions and provide product feedback to improve health outcomes worldwide.',
};

export default function SafetyPage() {
  return <SafetyHub />;
}
