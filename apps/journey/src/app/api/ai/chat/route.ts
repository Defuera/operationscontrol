import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { allTools, isWriteTool } from '@/lib/ai/tools';
import { executeReadTool, describeWriteAction } from '@/lib/ai/tool-executor';
import {
  getOrCreateThread,
  getThreadMessages,
  createMessage,
  createAction,
} from '@/actions/ai-chat';
import type { AIEntityType, AIActionType } from '@/types';

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a helpful productivity assistant for "The Journey" app. You help users manage their tasks, projects, and goals across three life domains: Work, Side Projects, and Chores/Life.

Your capabilities:
- Search and view tasks, projects, and goals
- Create, update, and delete tasks
- Create, update, and delete projects and goals
- Create journal entries

IMPORTANT RULES:
1. When user asks to modify/update/rename/change something, ALWAYS search first to find the entity ID, then use the update tool
2. NEVER create a new entity when user asks to modify an existing one
3. Be concise and action-oriented
4. When proposing changes, be specific about what will change

Current context will be provided about the page the user is viewing.`;

const ALLOWED_MODELS = ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5-mini', 'gpt-5-nano'];
const DEFAULT_MODEL = 'gpt-5.2';

interface ChatRequest {
  threadId?: string;
  message: string;
  path?: string;
  model?: string;
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
    const { threadId, message, path, model: requestedModel } = await request.json() as ChatRequest;
    const model = requestedModel && ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;

    // Get or create thread
    const thread = threadId
      ? { id: threadId }
      : await getOrCreateThread(path);

    // Load thread history
    const history = await getThreadMessages(thread.id);

    // Save user message
    await createMessage(thread.id, 'user', message);

    // Build messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add context if available
    if (path) {
      messages.push({
        role: 'system',
        content: `User is viewing: ${path}`,
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
    let response = await openai.chat.completions.create({
      model,
      messages,
      tools: allTools,
      tool_choice: 'auto',
    });

    const pendingActionData: PendingActionData[] = [];
    let assistantMessage = response.choices[0].message;
    const toolResults: { id: string; result: string }[] = [];

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
          const entityId = args.taskId || args.projectId || args.goalId;

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
          // Execute read tool immediately
          const result = await executeReadTool(toolName, args);
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
      toolResults.length = 0; // Clear for next iteration

      // Get next response
      response = await openai.chat.completions.create({
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
  return 'task';
}

function getActionType(toolName: string): AIActionType {
  if (toolName.startsWith('create')) return 'create';
  if (toolName.startsWith('update')) return 'update';
  if (toolName.startsWith('delete')) return 'delete';
  return 'update';
}
