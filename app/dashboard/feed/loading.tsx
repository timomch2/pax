import { Skeleton } from '@/components/ui/skeleton';

export default function HomeFeedLoading() {
  return <div role="status" aria-label="Loading Home" className="space-y-5">
    <Skeleton className="h-40 rounded-2xl" />
    <div className="grid gap-5 xl:grid-cols-2">{[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-72 rounded-2xl" />)}</div>
  </div>;
}
