'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface TelegramStatus {
  linked: boolean;
  telegram?: {
    id: number;
    username: string | null;
  };
}

export function TelegramLink() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/telegram');
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for link completion
  useEffect(() => {
    if (!linkToken || status?.linked) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/telegram/link?token=${linkToken}`);
        const data = await res.json();

        if (data.linked) {
          setStatus({ linked: true, telegram: data.telegram });
          setLinkToken(null);
          setLinking(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (data.expired) {
          setError('Link expired. Please try again.');
          setLinkToken(null);
          setLinking(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [linkToken, status?.linked]);

  const handleStartLink = async () => {
    setLinking(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/telegram/link', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate link');
        setLinking(false);
        return;
      }

      setLinkToken(data.token);
      // Open Telegram immediately
      window.open(data.deepLink, '_blank');
    } catch {
      setError('Failed to generate link');
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setLinking(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/telegram', { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to unlink');
        return;
      }

      setStatus({ linked: false });
    } catch {
      setError('Failed to unlink');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (status?.linked) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span>
            Linked to{' '}
            {status.telegram?.username ? (
              <span className="font-medium">@{status.telegram.username}</span>
            ) : (
              <span className="font-medium">Telegram ID: {status.telegram?.id}</span>
            )}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnlink}
          disabled={linking}
        >
          {linking ? 'Unlinking...' : 'Unlink Telegram'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  if (linkToken) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Waiting for confirmation... Tap Start in Telegram to complete linking.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLinkToken(null);
            setLinking(false);
          }}
        >
          Cancel
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Link your Telegram to use the bot with your account.
      </p>
      <Button onClick={handleStartLink} disabled={linking}>
        <Send className="mr-2 h-4 w-4" />
        {linking ? 'Opening Telegram...' : 'Link Telegram'}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
