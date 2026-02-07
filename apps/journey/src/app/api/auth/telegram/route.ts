import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...rest } = data;

  // Check auth_date is recent (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 300) {
    console.log('Auth date too old:', now - data.auth_date, 'seconds');
    return false;
  }

  // Build check string (sorted alphabetically)
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join('\n');

  // Verify hash: HMAC-SHA-256 with SHA256(bot_token) as key
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === hash;
}

export async function POST(request: Request) {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const data: TelegramAuthData = await request.json();

    // Verify the Telegram auth data
    if (!verifyTelegramAuth(data, botToken)) {
      return NextResponse.json({ error: 'Invalid Telegram auth data' }, { status: 400 });
    }

    // Check if this telegram_id is already linked to another user
    const existing = await db.select().from(userProfiles)
      .where(eq(userProfiles.telegramId, data.id));

    if (existing.length > 0 && existing[0].userId !== user.id) {
      return NextResponse.json(
        { error: 'This Telegram account is already linked to another user' },
        { status: 409 }
      );
    }

    // Upsert user profile with telegram data
    await db.insert(userProfiles)
      .values({
        userId: user.id,
        telegramId: data.id,
        telegramUsername: data.username || null,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          telegramId: data.id,
          telegramUsername: data.username || null,
          updatedAt: new Date().toISOString(),
        },
      });

    return NextResponse.json({
      success: true,
      telegram: {
        id: data.id,
        username: data.username,
        firstName: data.first_name,
      },
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Failed to link Telegram' }, { status: 500 });
  }
}

// GET endpoint to check current link status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, user.id));

    if (profile.length === 0 || !profile[0].telegramId) {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      telegram: {
        id: profile[0].telegramId,
        username: profile[0].telegramUsername,
      },
    });
  } catch (error) {
    console.error('Get telegram status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

// DELETE endpoint to unlink
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.update(userProfiles)
      .set({
        telegramId: null,
        telegramUsername: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlink telegram error:', error);
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 });
  }
}
