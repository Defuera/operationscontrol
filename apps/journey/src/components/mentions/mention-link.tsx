'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ResolvedMention } from '@/lib/mentions/types';
import { getMentionColorClasses, getNotFoundClasses } from '@/lib/mentions/resolver';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MentionLinkProps {
  mention: ResolvedMention;
  className?: string;
}

export function MentionLink({ mention, className }: MentionLinkProps) {
  const colors = mention.found
    ? getMentionColorClasses(mention.entityType)
    : getNotFoundClasses();

  const badge = (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        colors.badge,
        colors.text,
        mention.found && 'cursor-pointer hover:opacity-80',
        className
      )}
    >
      {mention.entityType}#{mention.shortCode}
    </span>
  );

  if (!mention.found) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <span>{badge}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Entity not found</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Link href={mention.url!} className="no-underline">
            {badge}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{mention.title}</p>
            {mention.status && (
              <p className="text-xs text-muted-foreground capitalize">
                {mention.status.replace('_', ' ')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MentionBadgeProps {
  entityType: 'task' | 'project' | 'goal' | 'journal';
  shortCode: number;
  className?: string;
}

export function MentionBadge({ entityType, shortCode, className }: MentionBadgeProps) {
  const colors = getMentionColorClasses(entityType);

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        colors.badge,
        colors.text,
        className
      )}
    >
      {entityType}#{shortCode}
    </span>
  );
}
