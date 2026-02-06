import { NextResponse } from 'next/server';
import { setWebhook, deleteWebhook, getWebhookInfo } from '@/lib/telegram';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const info = await getWebhookInfo();
    return NextResponse.json(info);
  } catch (error) {
    console.error('getWebhookInfo error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { webhookUrl, action } = await request.json();

    if (action === 'delete') {
      const success = await deleteWebhook();
      return NextResponse.json({ success, message: 'Webhook deleted' });
    }

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'webhookUrl is required' },
        { status: 400 }
      );
    }

    const success = await setWebhook(webhookUrl);
    return NextResponse.json({
      success,
      message: success ? 'Webhook set successfully' : 'Failed to set webhook',
      webhookUrl,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    );
  }
}
