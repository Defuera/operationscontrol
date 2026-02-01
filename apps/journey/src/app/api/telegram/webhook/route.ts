import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { sendMessage, type TelegramUpdate } from '@/lib/telegram';
import { allTools, isWriteTool } from '@/lib/ai/tools';
import { executeReadTool, describeWriteAction } from '@/lib/ai/tool-executor';
import {
  getOrCreateThread,
  getThreadMessages,
  createMessage,
  createAction,
  confirmAction,
  rejectAction,
} from '@/actions/ai-chat';
import type { AIEntityType, AIActionType } from '@/types';

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a helpful productivity assistant for "The Journey" app via Telegram. You help users manage their tasks, projects, and goals across three life domains: Work, Side Projects, and Chores/Life.

Your capabilities:
- Search and view tasks, projects, and goals
- Create, update, and delete tasks
- Create, update, and delete projects and goals
- Create journal entries

IMPORTANT RULES:
1. When user asks to modify/update/rename/change something, ALWAYS search first to find the entity ID, then use the update tool
2. NEVER create a new entity when user asks to modify an existing one
3. Be very concise - this is a chat interface
4. When listing items, use a simple format
5. When proposing changes, be specific about what will change`;

// Store pending actions per chat (in-memory for now)
const pendingActions = new Map<number, { id: string; description: string }[]>();

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();
    console.log('Telegram update:', JSON.stringify(update, null, 2));

    // Handle callback queries (button presses)
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Handle messages
    if (update.message?.text) {
      await handleMessage(update.message.chat.id, update.message.text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function handleCallback(callback: NonNullable<TelegramUpdate['callback_query']>) {
  const chatId = callback.message?.chat.id;
  if (!chatId || !callback.data) return;

  const [action, actionId] = callback.data.split(':');

  try {
    if (action === 'confirm') {
      await confirmAction(actionId);
      await sendMessage(chatId, '✅ Done!');
    } else if (action === 'reject') {
      await rejectAction(actionId);
      await sendMessage(chatId, '❌ Cancelled.');
    }
  } catch (error) {
    console.error('Callback error:', error);
    await sendMessage(chatId, '⚠️ Action failed.');
  }

  // Clear pending actions for this chat
  pendingActions.delete(chatId);
}

async function handleMessage(chatId: number, text: string) {
  // Quick commands
  if (text.startsWith('/')) {
    const handled = await handleCommand(chatId, text);
    if (handled) return;
  }

  // Regular message - send to AI
  await handleAIChat(chatId, text);
}

async function handleCommand(chatId: number, text: string): Promise<boolean> {
  const [command, ...args] = text.split(' ');

  switch (command) {
    case '/start':
      await sendMessage(chatId,
        '👋 Hi! I\'m your Journey assistant.\n\n' +
        'You can ask me anything about your tasks, projects, and goals.\n\n' +
        'Quick commands:\n' +
        '/today - Today\'s tasks\n' +
        '/status - In-progress tasks\n' +
        '/add <task> - Quick add task'
      );
      return true;

    case '/today':
      await handleAIChat(chatId, 'What tasks are scheduled for today?');
      return true;

    case '/status':
      await handleAIChat(chatId, 'What tasks are currently in progress?');
      return true;

    case '/add':
      if (args.length > 0) {
        await handleAIChat(chatId, `Create a new task: ${args.join(' ')}`);
      } else {
        await sendMessage(chatId, 'Usage: /add <task title>');
      }
      return true;

    default:
      return false; // Unknown command, treat as regular message
  }
}

interface PendingActionData {
  actionType: AIActionType;
  entityType: AIEntityType;
  args: Record<string, unknown>;
  entityId?: string;
  description: string;
}

async function handleAIChat(chatId: number, text: string) {
  try {
    // Use chatId as anchor to maintain conversation
    const thread = await getOrCreateThread('journal', `telegram-${chatId}`);
    const history = await getThreadMessages(thread.id);

    await createMessage(thread.id, 'user', text);

    // Build messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add history (limit to last 10 messages for context)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: text });

    // Call OpenAI
    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: allTools,
      tool_choice: 'auto',
    });

    // Collect pending action data (don't create in DB yet - need messageId first)
    const pendingActionData: PendingActionData[] = [];
    let assistantMessage = response.choices[0].message;
    const toolResults: { id: string; result: string }[] = [];

    // Process tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (isWriteTool(toolName)) {
          const entityType = getEntityType(toolName);
          const actionType = getActionType(toolName);
          const entityId = args.taskId || args.projectId || args.goalId;
          const description = describeWriteAction(toolName, args);

          // Store for later creation after we have the message ID
          pendingActionData.push({ actionType, entityType, args, entityId, description });

          toolResults.push({
            id: toolCall.id,
            result: JSON.stringify({ status: 'pending_confirmation', description }),
          });
        } else {
          const result = await executeReadTool(toolName, args);
          toolResults.push({ id: toolCall.id, result: JSON.stringify(result) });
        }
      }

      messages.push(assistantMessage as ChatCompletionMessageParam);
      for (const result of toolResults) {
        messages.push({ role: 'tool', tool_call_id: result.id, content: result.result });
      }

      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: allTools,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0].message;
      toolResults.length = 0;
    }

    const responseContent = assistantMessage.content || 'I couldn\'t process that.';

    // Save assistant message first to get the ID
    const savedMessage = await createMessage(thread.id, 'assistant', responseContent);

    // Now create the actions with the proper message ID
    const proposedActions: { id: string; description: string }[] = [];
    for (const data of pendingActionData) {
      const action = await createAction(
        savedMessage.id,
        data.actionType,
        data.entityType,
        data.args,
        data.entityId
      );
      proposedActions.push({ id: action.id, description: data.description });
    }

    // Send response
    await sendMessage(chatId, responseContent);

    // If there are proposed actions, send confirmation buttons
    if (proposedActions.length > 0) {
      pendingActions.set(chatId, proposedActions);

      for (const action of proposedActions) {
        await sendMessage(chatId, `📝 ${action.description}`, {
          replyMarkup: {
            inline_keyboard: [[
              { text: '✅ Confirm', callback_data: `confirm:${action.id}` },
              { text: '❌ Cancel', callback_data: `reject:${action.id}` },
            ]],
          },
        });
      }
    }
  } catch (error) {
    console.error('AI chat error:', error);
    await sendMessage(chatId, '⚠️ Sorry, something went wrong.');
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
