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
      description: 'Get a specific task by ID',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The task ID',
          },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getProjects',
      description: 'Get all projects, optionally filtered by status',
      parameters: {
        type: 'object',
        properties: {
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
      description: 'Get a specific project and its tasks by ID',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'The project ID',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGoals',
      description: 'Get all goals, optionally filtered by horizon or status',
      parameters: {
        type: 'object',
        properties: {
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
      description: 'Get a specific goal by ID',
      parameters: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'The goal ID',
          },
        },
        required: ['goalId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJournalEntries',
      description: 'Get journal entries, optionally limited to recent entries',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of entries to return (default 10)',
          },
        },
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
      description: 'Update an existing task. Use this to change status, title, description, priority, etc.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task to update',
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
        required: ['taskId'],
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
      description: 'Delete a task permanently',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task to delete',
          },
        },
        required: ['taskId'],
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
      description: 'Update a project name, description, goals, or status',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'The ID of the project to update',
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
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteProject',
      description: 'Delete a project permanently',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'The ID of the project to delete',
          },
        },
        required: ['projectId'],
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
      description: 'Update a goal',
      parameters: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'The ID of the goal to update',
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
        required: ['goalId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteGoal',
      description: 'Delete a goal permanently',
      parameters: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'The ID of the goal to delete',
          },
        },
        required: ['goalId'],
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
];

export const allTools = [...readTools, ...writeTools];

export const writeToolNames = [
  'createTask', 'updateTask', 'deleteTask',
  'createProject', 'updateProject', 'deleteProject',
  'createGoal', 'updateGoal', 'deleteGoal',
  'createJournalEntry',
];
export const readToolNames = [
  'searchTasks', 'getTask',
  'getProjects', 'getProject',
  'getGoals', 'getGoal',
  'getJournalEntries',
];

export function isWriteTool(name: string): boolean {
  return writeToolNames.includes(name);
}
