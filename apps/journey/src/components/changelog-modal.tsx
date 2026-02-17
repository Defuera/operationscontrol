'use client';

import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHANGELOG_VERSION, changelog } from '@/lib/changelog';
import { getLastSeenChangelogVersion, updateLastSeenChangelog } from '@/actions/user-profile';

export function ChangelogModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkChangelog() {
      try {
        const lastSeen = await getLastSeenChangelogVersion();
        if (lastSeen !== CHANGELOG_VERSION) {
          setOpen(true);
        }
      } catch {
        // If we can't fetch, don't show the popup
      } finally {
        setLoading(false);
      }
    }
    checkChangelog();
  }, []);

  async function handleDismiss() {
    await updateLastSeenChangelog(CHANGELOG_VERSION);
    setOpen(false);
  }

  if (loading || !open) {
    return null;
  }

  const latestEntry = changelog[0];

  return (
    <div className="fixed top-20 left-4 right-4 md:right-auto z-50 w-auto md:w-80 rounded-lg border bg-background p-4 shadow-lg animate-in slide-in-from-left-2 fade-in duration-300">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">What&apos;s New</h3>
        <button
          onClick={handleDismiss}
          className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{latestEntry.title}</p>
      <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
        {latestEntry.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <Button size="sm" className="mt-3 w-full" onClick={handleDismiss}>
        Got it
      </Button>
    </div>
  );
}
