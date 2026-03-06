import { Skeleton } from '@/components/ui';

export default function HomeLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="relative pt-20 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-16 w-[600px] max-w-full mx-auto" />
          <Skeleton className="h-6 w-96 max-w-full mx-auto" />
          <div className="flex gap-4 justify-center pt-4">
            <Skeleton className="h-12 w-40 rounded-xl" />
            <Skeleton className="h-12 w-40 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Character cards skeleton */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
