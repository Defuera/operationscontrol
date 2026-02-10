'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useMentionsWithPositions } from '@/hooks/useMentions';
import { MentionLink } from '@/components/mentions/mention-link';

interface MarkdownProps {
  children: string;
  className?: string;
  enableMentions?: boolean;
}

export function Markdown({ children, className, enableMentions = true }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm prose-gray max-w-none',
        'prose-headings:font-semibold prose-headings:text-gray-900',
        'prose-p:text-gray-600 prose-p:my-2',
        'prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0',
        'prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded-md',
        className
      )}
    >
      {enableMentions ? (
        <MarkdownWithMentions content={children} />
      ) : (
        <ReactMarkdown>{children}</ReactMarkdown>
      )}
    </div>
  );
}

function MarkdownWithMentions({ content }: { content: string }) {
  const { segments, loading } = useMentionsWithPositions(content);

  // If no mentions or still loading initial, render normally
  if (segments.length === 1 && segments[0].type === 'text') {
    return <ReactMarkdown>{content}</ReactMarkdown>;
  }

  // Pre-process the content to replace mentions with placeholders
  // Then use a custom component to render mentions
  return (
    <ReactMarkdown
      components={{
        // Custom text renderer that handles mentions within text nodes
        text: ({ children }) => {
          if (typeof children !== 'string') {
            return <>{children}</>;
          }
          return <TextWithMentions text={children} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TextWithMentions({ text }: { text: string }) {
  const { segments } = useMentionsWithPositions(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }
        return <MentionLink key={index} mention={segment.mention} />;
      })}
    </>
  );
}
