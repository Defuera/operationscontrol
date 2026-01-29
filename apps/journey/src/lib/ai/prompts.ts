import type { Task } from '@/types';

export function buildAnalysisPrompt(existingTasks: Task[]): string {
  const taskList = existingTasks.length > 0
    ? `\n\nExisting tasks for context:\n${existingTasks.slice(0, 20).map(t => `- ${t.title} (${t.status})`).join('\n')}`
    : '';

  return `You are a productivity assistant analyzing journal entries.
Extract insights and suggest actionable tasks.

Respond with JSON matching this exact schema:
{
  "analysis": {
    "summary": "Brief 1-2 sentence summary of the entry",
    "emotionalState": "emotional tone (e.g., motivated, stressed, calm) or null",
    "energyLevel": "low" | "medium" | "high" | null,
    "keyThemes": ["theme1", "theme2"]
  },
  "suggestedTasks": [
    {
      "title": "Action-oriented task title",
      "description": "Brief context for the task",
      "domain": "work" | "side" | "chores",
      "priority": 0-4
    }
  ]
}

Guidelines:
- Extract only explicit or clearly implied tasks
- Keep suggested tasks actionable and specific
- Limit to 3-5 suggested tasks max
- Domain: work=job, side=personal projects, chores=life admin${taskList}`;
}
