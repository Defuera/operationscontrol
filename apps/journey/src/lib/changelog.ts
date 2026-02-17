export const CHANGELOG_VERSION = '2026-02-17';

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '2026-02-17',
    title: 'Mobile Responsive UI',
    items: [
      'Bottom tab bar navigation on mobile devices',
      'Swipeable kanban carousel and bottom sheets for task/project details',
    ],
  },
  {
    version: '2026-02-15',
    title: 'AI Can Now View Your Files',
    items: [
      'AI assistant can now see images and read documents attached to your projects and tasks',
      'Ask the AI to review photos, analyze screenshots, or summarize documents',
    ],
  },
  {
    version: '2026-02-11',
    title: 'Entity Mentions',
    items: [
      'Reference tasks, projects, goals, and journal entries with task#1, project#2, etc.',
      'Autocomplete suggestions appear as you type mentions in descriptions and chat',
    ],
  },
  {
    version: '2026-02-10',
    title: 'Live Sync',
    items: [
      'Data now updates automatically when changed by AI agents or other tabs',
      'No more manual refreshing needed to see external changes',
    ],
  },
  {
    version: '2026-02-10',
    title: 'Task Detail Page',
    items: [
      'Tap a task to open its full detail page with all properties and files',
      'Lighter quick-edit dialog on desktop',
    ],
  },
  {
    version: '2026-02-09',
    title: 'File Attachments',
    items: [
      'Attach files to tasks, projects, goals, and journal entries',
      'Files stored securely with private signed URLs',
      'Download and delete attachments from entity dialogs',
    ],
  },
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
