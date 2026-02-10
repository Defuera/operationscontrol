# AI Chat - Smart Compression

## Status: Planned

Future enhancement to reduce token costs and maintain consistent performance as conversations grow.

---

## Problem

Current implementation sends **full conversation history** with every request:

```
system prompt + page context + goals context + ALL messages + current message
```

Issues:
- **Cost**: Token usage grows linearly with conversation length
- **Limits**: Will hit context window limits on long conversations
- **Latency**: Longer contexts = slower responses
- **Diminishing returns**: Old messages often less relevant than recent ones

---

## Solution: Tiered History

Instead of sending all messages, use a compressed summary for older messages and keep recent messages verbatim.

### Context Structure (After Implementation)

```
┌─────────────────────────────────────────────────┐
│  System Prompt                                  │
├─────────────────────────────────────────────────┤
│  Conversation Summary (compressed older msgs)   │  ← NEW
├─────────────────────────────────────────────────┤
│  Page Context + Goals Context                   │
├─────────────────────────────────────────────────┤
│  Recent N messages (verbatim)                   │
├─────────────────────────────────────────────────┤
│  Current user message                           │
└─────────────────────────────────────────────────┘
```

---

## Schema Changes

Add to `aiThreads` table:

```typescript
// In schema.ts
summary: text('summary'),                              // Compressed conversation history
summaryUpToMessageId: uuid('summary_up_to_message_id'), // Last message included in summary
summaryTokenCount: integer('summary_token_count'),      // Estimated tokens in summary
```

Migration:

```sql
ALTER TABLE ai_threads ADD COLUMN summary TEXT;
ALTER TABLE ai_threads ADD COLUMN summary_up_to_message_id UUID REFERENCES ai_messages(id);
ALTER TABLE ai_threads ADD COLUMN summary_token_count INTEGER;
```

---

## Configuration

```typescript
// lib/ai/compression.ts
export const COMPRESSION_CONFIG = {
  // Number of recent messages to always keep verbatim
  RECENT_MESSAGE_COUNT: 8,

  // Trigger compression when total messages exceed this
  COMPRESS_THRESHOLD: 20,

  // Model to use for compression (use cheaper model)
  COMPRESSION_MODEL: 'gpt-5-mini',

  // Target summary length (tokens)
  TARGET_SUMMARY_TOKENS: 500,
};
```

---

## Implementation

### Compression Service

```typescript
// lib/ai/compression.ts

import { openai } from './openai';
import { getThread, getThreadMessages, updateThread } from '@/actions/ai-chat';
import type { AIMessage, AIThread } from '@/types';

const COMPRESSION_PROMPT = `Summarize this conversation history concisely for context continuity.

PRESERVE:
- Key decisions made
- Task/project outcomes and status changes
- User preferences and constraints expressed
- Important context that affects future responses
- Action confirmations and their results

OMIT:
- Greetings and small talk
- Tool call mechanics and technical details
- Redundant or superseded information
- Verbose explanations that can be condensed

Format: Write in third person, past tense. Focus on what was discussed and decided.

Conversation:
`;

export async function getCompressedHistory(
  threadId: string
): Promise<{ summary: string | null; recentMessages: AIMessage[] }> {
  const thread = await getThread(threadId);
  const allMessages = await getThreadMessages(threadId);

  // Under threshold - return all messages, no compression needed
  if (allMessages.length <= COMPRESSION_CONFIG.COMPRESS_THRESHOLD) {
    return {
      summary: thread.summary,
      recentMessages: allMessages
    };
  }

  // Check if we need to update the summary
  const summaryMessageIndex = thread.summaryUpToMessageId
    ? allMessages.findIndex(m => m.id === thread.summaryUpToMessageId)
    : -1;

  const messagesSinceSummary = allMessages.length - summaryMessageIndex - 1;
  const needsCompression = !thread.summary ||
    messagesSinceSummary > COMPRESSION_CONFIG.COMPRESS_THRESHOLD;

  if (needsCompression) {
    await compressOlderMessages(thread, allMessages);
    // Refresh thread to get updated summary
    const updatedThread = await getThread(threadId);
    thread.summary = updatedThread.summary;
  }

  // Return summary + recent messages only
  const recentMessages = allMessages.slice(-COMPRESSION_CONFIG.RECENT_MESSAGE_COUNT);
  return {
    summary: thread.summary,
    recentMessages
  };
}

async function compressOlderMessages(
  thread: AIThread,
  messages: AIMessage[]
): Promise<void> {
  const cutoffIndex = messages.length - COMPRESSION_CONFIG.RECENT_MESSAGE_COUNT;
  const toCompress = messages.slice(0, cutoffIndex);

  if (toCompress.length === 0) return;

  // Include existing summary in new compression if present
  const existingContext = thread.summary
    ? `Previous summary:\n${thread.summary}\n\nNew messages to incorporate:\n`
    : '';

  const messagesText = toCompress
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model: COMPRESSION_CONFIG.COMPRESSION_MODEL,
    messages: [{
      role: 'user',
      content: COMPRESSION_PROMPT + existingContext + messagesText
    }],
    max_tokens: COMPRESSION_CONFIG.TARGET_SUMMARY_TOKENS,
  });

  const summary = response.choices[0].message.content;
  const lastCompressedMessage = toCompress.at(-1);

  await updateThread(thread.id, {
    summary,
    summaryUpToMessageId: lastCompressedMessage?.id,
    summaryTokenCount: response.usage?.completion_tokens,
  });
}

function formatMessagesForSummary(messages: AIMessage[]): string {
  return messages
    .map(m => {
      // Strip tool call details, keep just the content
      const content = m.content || '[Tool interaction]';
      return `${m.role.toUpperCase()}: ${content}`;
    })
    .join('\n\n');
}
```

### Updated Chat Route

```typescript
// In app/api/ai/chat/route.ts

// Replace the history loading section with:
const { summary, recentMessages } = await getCompressedHistory(thread.id);

const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: systemPrompt },
];

// Add compressed summary if exists
if (summary) {
  messages.push({
    role: 'system',
    content: `## Previous Conversation Context\n${summary}`
  });
}

// Add current context
if (pageContext) {
  messages.push({ role: 'system', content: pageContext });
}
if (goalsContext) {
  messages.push({ role: 'system', content: goalsContext });
}

// Add only recent messages (not full history)
for (const msg of recentMessages) {
  messages.push({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  });
}

// Add current user message
messages.push({ role: 'user', content: message });
```

---

## Compression Timing Options

### Option A: Eager (During Request) - Recommended for MVP

Compress during the chat request when threshold is exceeded.

**Pros**: Simple, no background jobs
**Cons**: Adds latency to that one request

### Option B: Background Job

Run compression asynchronously after response is sent.

```typescript
// After sending response
if (shouldCompress(thread)) {
  // Queue background job
  await queueCompressionJob(thread.id);
}
```

**Pros**: No user-facing latency
**Cons**: Requires job queue infrastructure

### Option C: Scheduled

Run compression for all threads periodically (e.g., nightly).

**Pros**: Predictable, batch processing
**Cons**: May compress threads that won't be used again

---

## Trade-offs

| Aspect | Full History | Smart Compression |
|--------|--------------|-------------------|
| **Token Cost** | Grows linearly | Capped at summary + recent |
| **Accuracy** | Perfect recall | May lose nuance |
| **Latency** | Increases with length | Consistent |
| **Complexity** | Simple | Moderate |
| **Context Limit** | Will hit limits | Avoids limits |

---

## What Gets Lost

Compression intentionally discards:
- Exact wording of old exchanges
- Tool call parameters and responses
- Intermediate reasoning steps
- Redundant clarifications

This is acceptable because:
- Recent messages preserve exact context for current work
- Summary captures decisions and outcomes
- User can start new thread if old context needed

---

## Future Enhancements

### User-Visible Summary
Show users the compressed summary and let them edit/correct it.

```typescript
// API endpoint
GET /api/ai/threads/:id/summary
PUT /api/ai/threads/:id/summary  // User edits
```

### Pinned Messages
Let users mark important messages to never compress.

```typescript
// Add to aiMessages
isPinned: boolean('is_pinned').default(false),
```

Pinned messages always included verbatim regardless of age.

### Smart Retrieval (RAG)
For very long-running threads, use embeddings to retrieve relevant older messages.

```typescript
// When user mentions something from long ago
const relevantOldMessages = await retrieveSimilarMessages(
  thread.id,
  currentMessage,
  limit: 3
);
```

### Compression Analytics
Track compression effectiveness:
- Tokens saved per thread
- User satisfaction with compressed vs full
- Cases where compression lost important context

---

## Testing Strategy

1. **Unit tests**: Compression function produces valid summaries
2. **Integration tests**: Full flow with compression triggers
3. **Manual testing**: Compare AI responses with/without compression
4. **A/B testing**: Measure user satisfaction and task completion

---

## Implementation Checklist

- [ ] Add schema fields to `aiThreads`
- [ ] Create migration
- [ ] Implement `getCompressedHistory()`
- [ ] Implement `compressOlderMessages()`
- [ ] Update chat route to use compression
- [ ] Add compression config to settings
- [ ] Test with long conversations
- [ ] Monitor token usage before/after

---

## Open Questions

1. **Threshold values** - Is 20 messages / 8 recent the right balance?
2. **Tool calls** - Include tool outcomes in summary or strip entirely?
3. **Multi-turn tool use** - How to handle complex tool sequences?
4. **Summary quality** - Need to evaluate compression model output quality
5. **User control** - Should users be able to force "full context" mode?
