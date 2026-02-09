export const CHANGELOG_VERSION = '2025-02-09';

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '2025-02-09',
    title: 'Redesigned Task Views',
    items: [
      'Day view now shows a simple checklist',
      'Week view shows the kanban board',
      'All view renamed to Backlog for unassigned tasks',
      'Project names now visible on task cards',
    ],
  },
  {
    version: '2024-02-08',
    title: 'Voice Messages & Telegram Improvements',
    items: [
      'Voice message support in Telegram bot',
      'Simplified Telegram account linking',
    ],
  },
];
