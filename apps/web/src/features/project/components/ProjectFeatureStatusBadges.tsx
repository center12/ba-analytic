import { type Feature } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProjectFeatureStatusBadgesProps {
  feature: Feature;
  className?: string;
}

const FEATURE_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  SSR: { label: 'SSR', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  FEATURE: { label: 'Feature', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export function ProjectFeatureStatusBadges({
  feature,
  className,
}: ProjectFeatureStatusBadgesProps) {
  const typeBadge = FEATURE_TYPE_BADGE[feature.featureType ?? 'FEATURE'];

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs font-mono rounded border bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
        {feature.code}
      </span>
      <span className={cn('text-xs px-2 py-0.5 rounded-full border', typeBadge.className)}>
        {typeBadge.label}
      </span>
      {feature.contentStatus === 'PUBLISHED' ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
          Published v{feature.publishedVersion}
        </span>
      ) : feature.content ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
          Draft
        </span>
      ) : null}
      {feature.syncStatus === 'OUT_OF_SYNC' && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
          Out of Sync
        </span>
      )}
      {feature.syncStatus === 'DIVERGED' && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
          Diverged
        </span>
      )}
    </div>
  );
}
