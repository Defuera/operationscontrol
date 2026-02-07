'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramStatus {
  linked: boolean;
  telegram?: {
    id: number;
    username: string | null;
  };
}

declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'OperationsControlBot';

export function TelegramLink() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Define the callback function for Telegram widget
    window.onTelegramAuth = async (user: TelegramUser) => {
      setLinking(true);
      setError(null);

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to link Telegram');
          return;
        }

        setStatus({ linked: true, telegram: data.telegram });
      } catch {
        setError('Failed to link Telegram');
      } finally {
        setLinking(false);
      }
    };

    return () => {
      window.onTelegramAuth = undefined as unknown as (user: TelegramUser) => void;
    };
  }, []);

  // Load Telegram widget script
  useEffect(() => {
    if (!widgetRef.current || status?.linked || loading) return;

    // Clear any existing widget
    widgetRef.current.innerHTML = '';

    // Create script element for Telegram widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    widgetRef.current.appendChild(script);
  }, [status?.linked, loading]);

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

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Link your Telegram to use the bot with your account.
      </p>

      {/* Telegram Login Widget container */}
      <div ref={widgetRef} />

      {linking && (
        <p className="text-sm text-muted-foreground">Linking...</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
