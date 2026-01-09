'use client';

import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for AI messages
 * Supports: **bold**, *italic*, bullet points (•), numbered lists, and line breaks
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const renderLine = (line: string, index: number) => {
    // Check for bullet points
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      const bulletContent = line.slice(2);
      return (
        <li key={index} className="ml-4 list-disc">
          {renderInlineMarkdown(bulletContent)}
        </li>
      );
    }

    // Check for numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      return (
        <li key={index} className="ml-4 list-decimal">
          {renderInlineMarkdown(numberedMatch[2])}
        </li>
      );
    }

    // Regular paragraph
    if (line.trim() === '') {
      return <br key={index} />;
    }

    return (
      <p key={index} className="mb-2 last:mb-0">
        {renderInlineMarkdown(line)}
      </p>
    );
  };

  const renderInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for bold (**text**)
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        // Add text before the match
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        // Add bold text
        parts.push(
          <strong key={key++} className="font-semibold">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Check for italic (*text*)
      const italicMatch = remaining.match(/\*([^*]+)\*/);
      if (italicMatch && italicMatch.index !== undefined) {
        // Add text before the match
        if (italicMatch.index > 0) {
          parts.push(remaining.slice(0, italicMatch.index));
        }
        // Add italic text
        parts.push(
          <em key={key++} className="italic">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // No more matches, add remaining text
      parts.push(remaining);
      break;
    }

    return parts;
  };

  const lines = content.split('\n');
  
  // Group consecutive list items
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  lines.forEach((line, index) => {
    const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
    const isNumbered = /^\d+\.\s+/.test(line);

    if (isBullet) {
      if (listType !== 'ul' && currentList.length > 0) {
        elements.push(
          listType === 'ol' 
            ? <ol key={`list-${elements.length}`} className="mb-3 list-decimal space-y-1">{currentList}</ol>
            : <ul key={`list-${elements.length}`} className="mb-3 list-disc space-y-1">{currentList}</ul>
        );
        currentList = [];
      }
      listType = 'ul';
      currentList.push(renderLine(line, index));
    } else if (isNumbered) {
      if (listType !== 'ol' && currentList.length > 0) {
        elements.push(
          listType === 'ul' 
            ? <ul key={`list-${elements.length}`} className="mb-3 list-disc space-y-1">{currentList}</ul>
            : <ol key={`list-${elements.length}`} className="mb-3 list-decimal space-y-1">{currentList}</ol>
        );
        currentList = [];
      }
      listType = 'ol';
      currentList.push(renderLine(line, index));
    } else {
      if (currentList.length > 0) {
        elements.push(
          listType === 'ol' 
            ? <ol key={`list-${elements.length}`} className="mb-3 list-decimal space-y-1">{currentList}</ol>
            : <ul key={`list-${elements.length}`} className="mb-3 list-disc space-y-1">{currentList}</ul>
        );
        currentList = [];
        listType = null;
      }
      elements.push(renderLine(line, index));
    }
  });

  // Don't forget remaining list items
  if (currentList.length > 0) {
    elements.push(
      listType === 'ol' 
        ? <ol key={`list-${elements.length}`} className="mb-3 list-decimal space-y-1">{currentList}</ol>
        : <ul key={`list-${elements.length}`} className="mb-3 list-disc space-y-1">{currentList}</ul>
    );
  }

  return (
    <div className={cn('text-base text-zinc-900', className)}>
      {elements}
    </div>
  );
}
