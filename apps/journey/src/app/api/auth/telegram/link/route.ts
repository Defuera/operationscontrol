import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { telegramLinkTokens, userProfiles } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'OperationsControlBot';

// Generate a new link token
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete any existing unused tokens for this user
    await db.delete(telegramLinkTokens)
      .where(and(
        eq(telegramLinkTokens.userId, user.id),
        isNull(telegramLinkTokens.usedAt)
      ));

    // Create new token
    await db.insert(telegramLinkTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const deepLink = `https://t.me/${BOT_USERNAME}?start=link_${token}`;

    return NextResponse.json({
      token,
      deepLink,
      expiresAt,
    });
  } catch (error) {
    console.error('Generate link token error:', error);
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
  }
}

// Check if link is complete (polling endpoint)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Check if token was used
    const linkToken = await db.select().from(telegramLinkTokens)
      .where(and(
        eq(telegramLinkTokens.token, token),
        eq(telegramLinkTokens.userId, user.id)
      ));

    if (linkToken.length === 0) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (linkToken[0].usedAt) {
      // Token was used - check user profile for telegram link
      const profile = await db.select().from(userProfiles)
        .where(eq(userProfiles.userId, user.id));

      if (profile.length > 0 && profile[0].telegramId) {
        return NextResponse.json({
          linked: true,
          telegram: {
            id: profile[0].telegramId,
            username: profile[0].telegramUsername,
          },
        });
      }
    }

    // Check if expired
    if (new Date(linkToken[0].expiresAt) < new Date()) {
      return NextResponse.json({ expired: true, linked: false });
    }

    return NextResponse.json({ linked: false, pending: true });
  } catch (error) {
    console.error('Check link status error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
