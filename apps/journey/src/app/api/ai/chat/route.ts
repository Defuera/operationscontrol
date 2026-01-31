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
import type { AnchorEntityType, AIEntityType, AIActionType } from '@/types';

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a helpful productivity assistant for "The Journey" app. You help users manage their tasks, projects, and goals across three life domains: Work, Side Projects, and Chores/Life.

Your capabilities:
- Search and view tasks, projects, and goals
- Create, update, and delete tasks
- Update project details

When users ask about their tasks or want to make changes:
1. First search or get the relevant data to understand the current state
2. Then propose specific changes if needed

Be concise and action-oriented. When proposing changes, be specific about what will change.

Current context will be provided about the page the user is viewing.`;

interface ChatRequest {
  threadId?: string;
  message: string;
  context?: {
    type: AnchorEntityType;
    entityId: string;
  };
}

interface ProposedAction {
  id: string;
  description: string;
  toolName: string;
  args: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const { threadId, message, context } = await request.json() as ChatRequest;

    // Get or create thread
    const thread = threadId
      ? { id: threadId }
      : await getOrCreateThread(context?.type, context?.entityId);

    // Load thread history
    const history = await getThreadMessages(thread.id);

    // Save user message
    await createMessage(thread.id, 'user', message);

    // Build messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add context if available
    if (context) {
      messages.push({
        role: 'system',
        content: `User is viewing: ${context.type} with ID ${context.entityId}`,
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
      model: 'gpt-4o-mini',
      messages,
      tools: allTools,
      tool_choice: 'auto',
    });

    const proposedActions: ProposedAction[] = [];
    let assistantMessage = response.choices[0].message;
    const toolResults: { id: string; result: string }[] = [];

    // Process tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCalls = assistantMessage.tool_calls;

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue;
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (isWriteTool(toolName)) {
          // Queue write action for confirmation
          const entityType = getEntityType(toolName);
          const actionType = getActionType(toolName);
          const entityId = args.taskId || args.projectId || args.goalId;

          const action = await createAction(
            '', // Will be set after we save the message
            actionType,
            entityType,
            args,
            entityId
          );

          proposedActions.push({
            id: action.id,
            description: describeWriteAction(toolName, args),
            toolName,
            args,
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
      messages.push({
        role: 'tool',
        tool_call_id: toolResults[toolResults.length - 1].id,
        content: toolResults[toolResults.length - 1].result,
      } as ChatCompletionMessageParam);

      // Get next response
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: allTools,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0].message;
    }

    const responseContent = assistantMessage.content || '';

    // Save assistant message
    const savedMessage = await createMessage(
      thread.id,
      'assistant',
      responseContent,
      proposedActions.length > 0 ? proposedActions : undefined
    );

    // Update action messageIds
    for (const action of proposedActions) {
      // Note: In a real app, we'd update the action's messageId here
      // For now, actions are linked through the response
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
  return 'task';
}

function getActionType(toolName: string): AIActionType {
  if (toolName.startsWith('create')) return 'create';
  if (toolName.startsWith('update')) return 'update';
  if (toolName.startsWith('delete')) return 'delete';
  return 'update';
}
