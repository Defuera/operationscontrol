import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// Read-only tools (execute immediately)
export const readTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchTasks',
      description: 'Search for tasks by title, status, or domain. Returns matching tasks.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against task titles',
          },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done'],
            description: 'Filter by task status',
          },
          domain: {
            type: 'string',
            enum: ['work', 'side', 'chores', 'life'],
            description: 'Filter by life domain',
          },
          projectId: {
            type: 'string',
            description: 'Filter by project ID',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTask',
      description: 'Get a specific task by its short code (e.g., task#8 → use shortCode: 8)',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The task short code number (e.g., 8 for task#8)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchProjects',
      description: 'Search for projects by name, type, or status',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against project names',
          },
          type: {
            type: 'string',
            enum: ['side_project', 'learning', 'life'],
            description: 'Filter by project type',
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'archived'],
            description: 'Filter by project status',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getProject',
      description: 'Get a specific project and its tasks by short code (e.g., project#2 → use shortCode: 2)',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The project short code number (e.g., 2 for project#2)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchGoals',
      description: 'Search for goals by title or filter by horizon/status',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against goal titles',
          },
          horizon: {
            type: 'string',
            description: 'Filter by time horizon (yearly, quarterly, monthly, weekly, daily)',
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'archived'],
            description: 'Filter by goal status',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGoal',
      description: 'Get a specific goal by short code (e.g., goal#3 → use shortCode: 3)',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The goal short code number (e.g., 3 for goal#3)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchJournalEntries',
      description: 'Search for journal entries by content',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against journal content',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of entries to return (default 10)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJournalEntry',
      description: 'Get a specific journal entry by short code (e.g., journal#5 → use shortCode: 5)',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The journal entry short code number (e.g., 5 for journal#5)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getFilesByEntity',
      description: 'Get all files attached to a specific entity (task, project, goal, or journal entry)',
      parameters: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            enum: ['task', 'project', 'goal', 'journal'],
            description: 'The type of entity',
          },
          entityId: {
            type: 'string',
            description: 'The ID of the entity',
          },
        },
        required: ['entityType', 'entityId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getFile',
      description: 'Get a specific file metadata by ID (does not include content)',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'The file ID',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'readFileContents',
      description: 'Read the actual contents of a file. For images, returns base64-encoded data that can be viewed. For text files and PDFs, returns the text content. Use this to actually see/read files attached to entities.',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'The file ID to read contents from',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchMemories',
      description: 'Search for memories. Memories are persistent notes that the AI can use to remember important context across conversations.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against memory content',
          },
          anchorPath: {
            type: 'string',
            description: 'Filter by anchor path (e.g., /projects/5). Omit to get all memories.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMemory',
      description: 'Get a specific memory by short code (e.g., memory#1 → use shortCode: 1)',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The memory short code number (e.g., 1 for memory#1)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
];

// Write tools (require confirmation)
export const writeTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'updateTask',
      description: 'Update an existing task by short code. Use this to change status, title, description, priority, etc.',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The task short code number (e.g., 8 for task#8)',
          },
          title: {
            type: 'string',
            description: 'New title for the task',
          },
          description: {
            type: 'string',
            description: 'New description for the task',
          },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done'],
            description: 'New status for the task',
          },
          domain: {
            type: 'string',
            enum: ['work', 'side', 'chores', 'life'],
            description: 'New domain for the task',
          },
          priority: {
            type: 'number',
            description: 'Priority level (higher = more important)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createTask',
      description: 'Create a new task',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the task',
          },
          description: {
            type: 'string',
            description: 'Description of the task',
          },
          domain: {
            type: 'string',
            enum: ['work', 'side', 'chores', 'life'],
            description: 'Life domain for the task',
          },
          projectId: {
            type: 'string',
            description: 'ID of the project to add the task to',
          },
          priority: {
            type: 'number',
            description: 'Priority level (higher = more important)',
          },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done'],
            description: 'Initial status (defaults to backlog)',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteTask',
      description: 'Delete a task permanently by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The task short code number (e.g., 8 for task#8)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createProject',
      description: 'Create a new project',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the project',
          },
          description: {
            type: 'string',
            description: 'Description of the project',
          },
          type: {
            type: 'string',
            enum: ['side_project', 'learning', 'life'],
            description: 'Type of project',
          },
          goals: {
            type: 'string',
            description: 'Goals for the project',
          },
        },
        required: ['name', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProject',
      description: 'Update a project by short code. Can change name, description, goals, or status',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The project short code number (e.g., 2 for project#2)',
          },
          name: {
            type: 'string',
            description: 'New name for the project',
          },
          description: {
            type: 'string',
            description: 'New description for the project',
          },
          goals: {
            type: 'string',
            description: 'New goals for the project',
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'archived'],
            description: 'New status for the project',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteProject',
      description: 'Delete a project permanently by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The project short code number (e.g., 2 for project#2)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createGoal',
      description: 'Create a new goal',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the goal',
          },
          description: {
            type: 'string',
            description: 'Description of the goal',
          },
          horizon: {
            type: 'string',
            enum: ['yearly', 'quarterly', 'monthly', 'weekly', 'daily'],
            description: 'Time horizon for the goal',
          },
        },
        required: ['title', 'horizon'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateGoal',
      description: 'Update a goal by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The goal short code number (e.g., 3 for goal#3)',
          },
          title: {
            type: 'string',
            description: 'New title for the goal',
          },
          description: {
            type: 'string',
            description: 'New description for the goal',
          },
          horizon: {
            type: 'string',
            enum: ['yearly', 'quarterly', 'monthly', 'weekly', 'daily'],
            description: 'New time horizon',
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'archived'],
            description: 'New status for the goal',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteGoal',
      description: 'Delete a goal permanently by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The goal short code number (e.g., 3 for goal#3)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createJournalEntry',
      description: 'Create a new journal entry',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Content of the journal entry',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateJournalEntry',
      description: 'Update a journal entry by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The journal entry short code number (e.g., 5 for journal#5)',
          },
          content: {
            type: 'string',
            description: 'New content for the journal entry',
          },
        },
        required: ['shortCode', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteJournalEntry',
      description: 'Delete a journal entry permanently by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The journal entry short code number (e.g., 5 for journal#5)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uploadFile',
      description: 'Upload a new file attachment to an entity (task, project, goal, or journal). Use this to save generated content, reports, or other files.',
      parameters: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            enum: ['task', 'project', 'goal', 'journal'],
            description: 'The type of entity to attach the file to',
          },
          entityId: {
            type: 'string',
            description: 'The ID of the entity to attach the file to',
          },
          fileName: {
            type: 'string',
            description: 'The name for the file (including extension)',
          },
          content: {
            type: 'string',
            description: 'The file content. For text files, provide the text directly. For binary files, provide base64-encoded content.',
          },
          mimeType: {
            type: 'string',
            description: 'The MIME type of the file (e.g., "text/plain", "application/json", "image/png")',
          },
          isBase64: {
            type: 'boolean',
            description: 'Set to true if the content is base64-encoded (for binary files)',
          },
        },
        required: ['entityType', 'entityId', 'fileName', 'content', 'mimeType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateFile',
      description: 'Update a file attachment. Can rename the file or move it to a different entity.',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'The ID of the file to update',
          },
          fileName: {
            type: 'string',
            description: 'New name for the file',
          },
          entityType: {
            type: 'string',
            enum: ['task', 'project', 'goal', 'journal'],
            description: 'Move to a different entity type',
          },
          entityId: {
            type: 'string',
            description: 'Move to a different entity ID',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteFile',
      description: 'Delete a file attachment permanently',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'The ID of the file to delete',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createMemory',
      description: 'Create a new memory to persist important context across conversations. Use this to remember decisions, preferences, facts about the user, or project-specific information.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The content to remember (be concise but complete)',
          },
          anchorPath: {
            type: 'string',
            description: 'Path to anchor this memory to (e.g., /projects/5). Omit for global memory.',
          },
          tags: {
            type: 'string',
            description: 'Optional comma-separated tags for categorization (e.g., "decision,architecture")',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateMemory',
      description: 'Update an existing memory by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The memory short code number (e.g., 1 for memory#1)',
          },
          content: {
            type: 'string',
            description: 'New content for the memory',
          },
          tags: {
            type: 'string',
            description: 'New tags for the memory (comma-separated)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteMemory',
      description: 'Delete a memory permanently by short code',
      parameters: {
        type: 'object',
        properties: {
          shortCode: {
            type: 'number',
            description: 'The memory short code number (e.g., 1 for memory#1)',
          },
        },
        required: ['shortCode'],
      },
    },
  },
];

export const allTools = [...readTools, ...writeTools];

export const writeToolNames = [
  'createTask', 'updateTask', 'deleteTask',
  'createProject', 'updateProject', 'deleteProject',
  'createGoal', 'updateGoal', 'deleteGoal',
  'createJournalEntry', 'updateJournalEntry', 'deleteJournalEntry',
  'uploadFile', 'updateFile', 'deleteFile',
  'createMemory', 'updateMemory', 'deleteMemory',
];
export const readToolNames = [
  'searchTasks', 'getTask',
  'searchProjects', 'getProject',
  'searchGoals', 'getGoal',
  'searchJournalEntries', 'getJournalEntry',
  'getFilesByEntity', 'getFile', 'readFileContents',
  'searchMemories', 'getMemory',
];

export function isWriteTool(name: string): boolean {
  return writeToolNames.includes(name);
}
