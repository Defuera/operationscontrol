import OpenAI from 'openai';
import type { AIProvider, AnalysisResponse } from './types';
import { buildAnalysisPrompt } from './prompts';
import type { Task } from '@/types';

export function createOpenAIProvider(): AIProvider {
  const client = new OpenAI();

  return {
    async analyzeJournal(content: string, existingTasks: Task[] = []): Promise<AnalysisResponse> {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildAnalysisPrompt(existingTasks) },
          { role: 'user', content }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const text = response.choices[0].message.content;
      if (!text) {
        throw new Error('Empty response from OpenAI');
      }

      return JSON.parse(text) as AnalysisResponse;
    }
  };
}
