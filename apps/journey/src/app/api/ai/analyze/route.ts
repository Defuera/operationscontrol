import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai';
import type { Task } from '@/types';

export async function POST(request: Request) {
  try {
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
