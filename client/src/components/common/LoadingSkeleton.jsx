import { clsx } from 'clsx';

export const Skeleton = ({ className }) => (
  <div className={clsx('skeleton', className)} />
);

export const CardSkeleton = () => (
  <div className="card">
    <Skeleton className="h-4 w-3/4 mb-4" />
    <Skeleton className="h-8 w-1/2 mb-3" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="card">
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

export const FormSkeleton = ({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <Skeleton className="h-4 w-1/4 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <Skeleton className="h-10 w-24" />
  </div>
);