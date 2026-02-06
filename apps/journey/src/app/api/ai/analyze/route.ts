import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import type { Task } from '@/types';

export async function POST(request: Request) {
  try {
    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, tasks } = await request.json() as {
      content: string;
      tasks?: Task[];
    };

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const ai = getAIProvider();
    const analysis = await ai.analyzeJournal(content, tasks || []);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
