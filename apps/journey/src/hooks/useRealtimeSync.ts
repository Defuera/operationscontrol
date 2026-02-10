'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribe to Supabase Realtime changes on one or more tables.
 * When a change is detected, calls the refetch callback (debounced).
 */
export function useRealtimeSync(
  tables: string[],
  refetch: () => void,
  { debounceMs = 300, enabled = true }: { debounceMs?: number; enabled?: boolean } = {},
) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const debouncedRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refetchRef.current(), debounceMs);
    };

    const channelName = `realtime-sync:${tables.join(',')}`;
    let channel = supabase.channel(channelName);

    for (const table of tables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        debouncedRefetch,
      );
    }

    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), debounceMs, enabled]);
}
