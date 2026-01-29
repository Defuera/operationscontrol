import type { Task } from '@/types';

export interface AnalysisResponse {
  analysis: {
    summary: string;
    emotionalState: string | null;
    energyLevel: 'low' | 'medium' | 'high' | null;
    keyThemes: string[];
  };
  suggestedTasks: Array<{
    title: string;
    description: string;
    domain: 'work' | 'side' | 'chores';
    priority: number;
  }>;
}

export interface AIProvider {
  analyzeJournal(content: string, existingTasks?: Task[]): Promise<AnalysisResponse>;
}
