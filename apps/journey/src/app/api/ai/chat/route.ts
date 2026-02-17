import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { allTools, isWriteTool } from '@/lib/ai/tools';
import { executeReadTool, describeWriteAction } from '@/lib/ai/tool-executor';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import {
  getOrCreateThread,
  getThreadMessages,
  createMessage,
  createAction,
  editMessageAndBranch,
} from '@/actions/ai-chat';
import { getProjectWithTasksByShortCode } from '@/actions/projects';
import { getGoals } from '@/actions/goals';
import { getTasks } from '@/actions/tasks';
import { getFilesByEntity } from '@/actions/files';
import { getEntityIdByShortCode } from '@/actions/mentions';
import { getMemoriesForContext } from '@/actions/memories';
import { createClient } from '@/lib/supabase/server';
import type { AIEntityType, AIActionType, MentionEntityType } from '@/types';

function getOpenAI() {
  return new OpenAI();
}

async function getGoalsContext(): Promise<string | null> {
  const goals = await getGoals();
  const activeGoals = goals.filter(g => g.status === 'active');

  if (activeGoals.length === 0) return null;

  const goalsList = activeGoals.map(g => `- ${g.title} (${g.horizon})`).join('\n');
  return `User's active goals:\n${goalsList}`;
}

async function getMemoriesContext(userId: string, path?: string): Promise<string | null> {
  const memories = await getMemoriesForContext(userId, path);

  if (memories.length === 0) return null;

  const globalMemories = memories.filter(m => !m.anchorPath);
  const pathMemories = memories.filter(m => m.anchorPath);

  let context = 'Remembered context:\n';

  if (pathMemories.length > 0) {
    context += `\nFor this context (${path}):\n`;
    context += pathMemories.map(m => {
      const tags = m.tags ? ` [${m.tags}]` : '';
      return `- ${m.content}${tags} (memory#${m.shortCode})`;
    }).join('\n');
  }

  if (globalMemories.length > 0) {
    context += `\n\nGlobal memories:\n`;
    context += globalMemories.map(m => {
      const tags = m.tags ? ` [${m.tags}]` : '';
      return `- ${m.content}${tags} (memory#${m.shortCode})`;
    }).join('\n');
  }

  return context;
}

async function getContextFromPath(path: string): Promise<string | null> {
  // Parse path like /projects/1 (short code) or /projects/uuid (legacy)
  const projectMatch = path.match(/^\/projects\/(\d+|[a-f0-9-]+)$/i);
  if (projectMatch) {
    const idOrCode = projectMatch[1];
    // Check if it's a short code (number) or UUID
    const shortCode = /^\d+$/.test(idOrCode) ? parseInt(idOrCode, 10) : null;

    if (shortCode) {
      const data = await getProjectWithTasksByShortCode(shortCode);
      if (data) {
        const taskList = data.tasks.length > 0
          ? `\nTasks:\n${data.tasks.map(t => `- "${t.title}" (${t.shortCode ? `task#${t.shortCode}` : t.id}, status: ${t.status})`).join('\n')}`
          : '\nNo tasks yet.';

        // Get files attached to this project
        const files = await getFilesByEntity('project', data.project.id);
        const fileList = files.length > 0
          ? `\nFiles attached to project:\n${files.map(f => `- "${f.fileName}" (${f.mimeType})`).join('\n')}`
          : '\nNo files attached.';

        const projectRef = data.project.shortCode ? `project#${data.project.shortCode}` : data.project.id;
        return `User is viewing project "${data.project.name}" (${projectRef}, type: ${data.project.type}, status: ${data.project.status})${data.project.description ? `\nDescription: ${data.project.description}` : ''}${taskList}${fileList}`;
      }
    }
  }

  const goalMatch = path.match(/^\/goals\/(\d+|[a-f0-9-]+)$/i);
  if (goalMatch) {
    const idOrCode = goalMatch[1];
    const goals = await getGoals();
    // Find by short code or ID
    const goal = /^\d+$/.test(idOrCode)
      ? goals.find(g => g.shortCode === parseInt(idOrCode, 10))
      : goals.find(g => g.id === idOrCode);
    if (goal) {
      const goalRef = goal.shortCode ? `goal#${goal.shortCode}` : goal.id;
      return `User is viewing goal "${goal.title}" (${goalRef}, horizon: ${goal.horizon}, status: ${goal.status})${goal.description ? `\nDescription: ${goal.description}` : ''}`;
    }
  }

  // For list pages, just describe what they're viewing
  if (path === '/') return 'User is viewing the kanban board';
  if (path === '/projects') return 'User is viewing the projects list';
  if (path === '/goals') return 'User is viewing the goals list';
  if (path === '/journal') return 'User is viewing the journal';

  return null;
}

const ALLOWED_MODELS = ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5-mini', 'gpt-5-nano'];
const DEFAULT_MODEL = 'gpt-5.2';

interface ChatRequest {
  threadId?: string;
  message: string;
  path?: string;
  model?: string;
  systemPrompt?: string;
  editMessageId?: string;
}

interface ProposedAction {
  id: string;
  description: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface PendingActionData {
  actionType: AIActionType;
  entityType: AIEntityType;
  args: Record<string, unknown>;
  entityId?: string;
  description: string;
  toolName: string;
}

export async function POST(request: Request) {
  try {
    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, message, path, model: requestedModel, systemPrompt, editMessageId } = await request.json() as ChatRequest;
    const model = requestedModel && ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;
    const prompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Handle message editing: soft-delete original and subsequent messages
    let resolvedThreadId = threadId;
    if (editMessageId) {
      const result = await editMessageAndBranch(editMessageId);
      resolvedThreadId = result.threadId;
    }

    // Get or create thread
    const thread = resolvedThreadId
      ? { id: resolvedThreadId }
      : await getOrCreateThread(path);

    // Load thread history
    const history = await getThreadMessages(thread.id);

    // Save user message
    await createMessage(thread.id, 'user', message);

    // Build messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: prompt },
    ];

    // Add page-specific context
    if (path) {
      const context = await getContextFromPath(path);
      if (context) {
        messages.push({
          role: 'system',
          content: context,
        });
      }
    }

    // Add goals as background context
    const goalsContext = await getGoalsContext();
    if (goalsContext) {
      messages.push({
        role: 'system',
        content: goalsContext,
      });
    }

    // Add memories context (path-specific + global)
    const memoriesContext = await getMemoriesContext(user.id, path);
    if (memoriesContext) {
      messages.push({
        role: 'system',
        content: memoriesContext,
      });
    }

    // Add history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call OpenAI with tools
    let response = await getOpenAI().chat.completions.create({
      model,
      messages,
      tools: allTools,
      tool_choice: 'auto',
    });

    const pendingActionData: PendingActionData[] = [];
    let assistantMessage = response.choices[0].message;
    const toolResults: { id: string; result: string }[] = [];
    // Track images that need to be added to conversation for vision
    const pendingImages: { fileName: string; mimeType: string; base64: string }[] = [];

    // Track total token usage across all API calls
    let totalPromptTokens = response.usage?.prompt_tokens || 0;
    let totalCompletionTokens = response.usage?.completion_tokens || 0;

    // Process tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCalls = assistantMessage.tool_calls;

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue;
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (isWriteTool(toolName)) {
          // Queue write action data for later creation (after message is saved)
          const entityType = getEntityType(toolName);
          const actionType = getActionType(toolName);

          // Resolve short code to entity ID for update/delete actions
          let entityId: string | undefined;
          if (args.shortCode && actionType !== 'create') {
            const resolved = await getEntityIdByShortCode(
              entityType as MentionEntityType,
              args.shortCode as number
            );
            entityId = resolved || undefined;
          } else {
            // Fallback for file deletion which still uses fileId
            entityId = args.fileId as string | undefined;
          }

          pendingActionData.push({
            actionType,
            entityType,
            args,
            entityId,
            description: describeWriteAction(toolName, args),
            toolName,
          });

          toolResults.push({
            id: toolCall.id,
            result: JSON.stringify({
              status: 'pending_confirmation',
              description: describeWriteAction(toolName, args),
            }),
          });
        } else {
          // Execute read tool immediately with userId for data isolation
          const result = await executeReadTool(toolName, args, user.id);

          // Special handling for image files - queue them for vision
          if (toolName === 'readFileContents' && result.success && result.data) {
            const fileData = result.data as { fileName: string; mimeType: string; isBase64: boolean; content: string };
            if (fileData.isBase64 && fileData.mimeType.startsWith('image/')) {
              // Queue image for vision, return metadata only in tool result
              pendingImages.push({
                fileName: fileData.fileName,
                mimeType: fileData.mimeType,
                base64: fileData.content,
              });
              toolResults.push({
                id: toolCall.id,
                result: JSON.stringify({
                  success: true,
                  data: {
                    fileName: fileData.fileName,
                    mimeType: fileData.mimeType,
                    note: 'Image loaded and will be shown to you for analysis.',
                  },
                }),
              });
              continue;
            }
          }

          toolResults.push({
            id: toolCall.id,
            result: JSON.stringify(result),
          });
        }
      }

      // Continue conversation with tool results
      messages.push(assistantMessage as ChatCompletionMessageParam);
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: result.id,
          content: result.result,
        } as ChatCompletionMessageParam);
      }

      // Add any pending images as a user message with vision content
      if (pendingImages.length > 0) {
        const imageContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
          { type: 'text', text: `Here are the requested images (${pendingImages.length} file${pendingImages.length > 1 ? 's' : ''}):` },
        ];
        for (const img of pendingImages) {
          imageContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`,
            },
          });
          imageContent.push({
            type: 'text',
            text: `[${img.fileName}]`,
          });
        }
        messages.push({
          role: 'user',
          content: imageContent,
        } as ChatCompletionMessageParam);
        pendingImages.length = 0; // Clear for next iteration
      }

      toolResults.length = 0; // Clear for next iteration

      // Get next response
      response = await getOpenAI().chat.completions.create({
        model,
        messages,
        tools: allTools,
        tool_choice: 'auto',
      });

      // Accumulate token usage
      totalPromptTokens += response.usage?.prompt_tokens || 0;
      totalCompletionTokens += response.usage?.completion_tokens || 0;

      assistantMessage = response.choices[0].message;
    }

    const responseContent = assistantMessage.content || '';

    // Save assistant message first
    const savedMessage = await createMessage(
      thread.id,
      'assistant',
      responseContent,
      {
        toolCalls: pendingActionData.length > 0 ? pendingActionData : undefined,
        model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      }
    );

    // Now create actions with the saved message ID
    const proposedActions: ProposedAction[] = [];
    for (const actionData of pendingActionData) {
      const action = await createAction(
        savedMessage.id,
        actionData.actionType,
        actionData.entityType,
        actionData.args,
        actionData.entityId
      );

      proposedActions.push({
        id: action.id,
        description: actionData.description,
        toolName: actionData.toolName,
        args: actionData.args,
      });
    }

    return NextResponse.json({
      threadId: thread.id,
      messageId: savedMessage.id,
      response: responseContent,
      proposedActions,
      model,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function getEntityType(toolName: string): AIEntityType {
  if (toolName.includes('Task')) return 'task';
  if (toolName.includes('Project')) return 'project';
  if (toolName.includes('Goal')) return 'goal';
  if (toolName.includes('Journal')) return 'journal';
  if (toolName.includes('File')) return 'file';
  if (toolName.includes('Memory')) return 'memory';
  return 'task';
}

function getActionType(toolName: string): AIActionType {
  if (toolName.startsWith('create') || toolName.startsWith('upload')) return 'create';
  if (toolName.startsWith('update')) return 'update';
  if (toolName.startsWith('delete')) return 'delete';
  return 'update';
}
