export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-200/70 animate-pulse rounded-xl ${className}`} />
  );
}

export function SkeletonBentoGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
      {/* Hero Slot (Col 7) */}
      <div className="lg:col-span-7 bg-slate-900/90 rounded-[28px] p-8 border border-slate-800 shadow-xl min-h-[280px] flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBox className="w-36 h-5 bg-slate-800" />
            <SkeletonBox className="w-24 h-6 rounded-full bg-slate-800" />
          </div>
          <SkeletonBox className="w-72 h-10 bg-slate-800" />
          <SkeletonBox className="w-48 h-5 bg-slate-800" />
        </div>
        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
          <SkeletonBox className="w-44 h-8 bg-slate-800" />
          <SkeletonBox className="w-32 h-8 bg-slate-800" />
        </div>
      </div>

      {/* Sub Slot (Col 5) */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <SkeletonBox className="w-28 h-4 mb-3" />
          <SkeletonBox className="w-36 h-8 mb-3" />
          <SkeletonBox className="w-24 h-6 rounded-full" />
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <SkeletonBox className="w-28 h-4 mb-3" />
          <SkeletonBox className="w-36 h-8 mb-3" />
          <SkeletonBox className="w-24 h-6 rounded-full" />
        </div>
        <div className="sm:col-span-2 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBox className="w-32 h-4" />
            <SkeletonBox className="w-24 h-6" />
          </div>
          <SkeletonBox className="w-28 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <SkeletonBox className="w-32 h-4" />
        <SkeletonBox className="w-5 h-5 rounded-full" />
      </div>
      <SkeletonBox className="w-48 h-8" />
      <SkeletonBox className="w-24 h-6 rounded-full" />
    </div>
  );
}
