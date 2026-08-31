import { modulesData } from '@/lib/modules-data';
import { ModuleIntroPage } from '@/components/modules/module-intro-page';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return modulesData.map((m) => ({ slug: m.slug }));
}

export default function ModulePage({ params }: { params: { slug: string } }) {
  const mod = modulesData.find((m) => m.slug === params.slug);
  if (!mod) return notFound();
  return <ModuleIntroPage module={mod} />;
}
