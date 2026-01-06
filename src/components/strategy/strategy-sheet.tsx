'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Check,
  DownloadSimple,
  Eye,
  FloppyDisk,
  MagicWand,
  SquaresFour,
  TextHOne,
  TextHTwo,
  TextHThree,
  TextB,
  TextItalic,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  Link,
  Minus,
  ArrowsOutSimple,
  X,
  FilePdfIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { SaveIcon, XIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface StrategySheetProps {
  client: FullClientMock;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  markdown: string;
  shortcut?: string;
}

// ============================================================================
// MARKDOWN TOOLBAR CONFIG
// ============================================================================

const toolbarActions: ToolbarAction[] = [
  { icon: TextHOne, label: 'Heading 1', markdown: '# ', shortcut: 'Ctrl+1' },
  { icon: TextHTwo, label: 'Heading 2', markdown: '## ', shortcut: 'Ctrl+2' },
  { icon: TextHThree, label: 'Heading 3', markdown: '### ', shortcut: 'Ctrl+3' },
  { icon: TextB, label: 'Bold', markdown: '**text**', shortcut: 'Ctrl+B' },
  { icon: TextItalic, label: 'Italic', markdown: '*text*', shortcut: 'Ctrl+I' },
  { icon: ListBullets, label: 'Bullet List', markdown: '- ', shortcut: 'Ctrl+U' },
  { icon: ListNumbers, label: 'Numbered List', markdown: '1. ', shortcut: 'Ctrl+O' },
  { icon: Quotes, label: 'Quote', markdown: '> ' },
  { icon: Code, label: 'Code', markdown: '`code`' },
  { icon: Link, label: 'Link', markdown: '[text](url)' },
  { icon: Minus, label: 'Divider', markdown: '\n---\n' },
];

// ============================================================================
// INITIAL STRATEGY TEMPLATE
// ============================================================================

const getInitialStrategy = (clientName: string, businessName: string | null) => `

## Client Overview

**Client:** ${clientName}
${businessName ? `**Business:** ${businessName}` : ''}

---

## Executive Summary

*AI will help you generate a comprehensive tax strategy based on the client's documents and profile.*

---

## Key Findings

### Income Analysis
- 

### Deduction Opportunities
- 

### Tax Liability Assessment
- 

---

## Recommended Strategies

### Strategy 1: [Name]
**Potential Savings:** $X,XXX
**Implementation:** 

### Strategy 2: [Name]
**Potential Savings:** $X,XXX
**Implementation:** 

---

## Action Items

- [ ] 
- [ ] 
- [ ] 

---

## Timeline

| Phase | Action | Deadline |
|-------|--------|----------|
| 1 | | |
| 2 | | |

---

## Notes

`;

// ============================================================================
// AI SUGGESTION PROMPTS
// ============================================================================

const aiSuggestions = [
  { label: 'List action items', hasGradientIcon: true },
  { label: 'Write follow-up email', hasGradientIcon: true },
  { label: 'List Q&A', hasGradientIcon: true },
];

// ============================================================================
// SIMULATED AI RESPONSES
// ============================================================================

const getAiResponse = (prompt: string, clientName: string): string => {
  const responses: Record<string, string> = {
    'Analyze client documents and suggest deductions': `Based on ${clientName}'s uploaded documents, I've identified several potential deductions:

**Business Expenses:**
- Home office deduction (if applicable)
- Vehicle mileage for business use
- Professional development and training

**Investment-Related:**
- Capital loss harvesting opportunities
- Qualified business income (QBI) deduction

Would you like me to elaborate on any of these or add them to the strategy document?`,

    'Generate executive summary based on profile': `Here's a draft executive summary for ${clientName}:

**Executive Summary**

After reviewing the client's financial profile and documentation, we recommend a multi-faceted tax optimization strategy focusing on:

1. **Entity Structure Optimization** - Consider restructuring for better tax efficiency
2. **Retirement Contribution Maximization** - Maximize 401(k) and IRA contributions
3. **Quarterly Estimated Tax Planning** - Avoid penalties with proper planning

Estimated annual tax savings: **$8,500 - $12,000**

Shall I insert this into your document?`,

    default: `I understand you're working on ${clientName}'s tax strategy. I can help you with:

• Analyzing uploaded documents for deduction opportunities
• Generating specific sections of the strategy document
• Reviewing and optimizing your current recommendations
• Creating timeline and action items

What would you like me to focus on?`,
  };

  return responses[prompt] || responses['default'];
};

// ============================================================================
// MARKDOWN EDITOR COMPONENT
// ============================================================================

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

function MarkdownEditor({ content, onChange, onSave, isSaving, lastSaved }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const insertMarkdown = (markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newContent: string;
    let newCursorPos: number;

    if (markdown.includes('text')) {
      const replacement = markdown.replace('text', selectedText || 'text');
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorPos = start + replacement.length;
    } else {
      newContent = content.substring(0, start) + markdown + content.substring(end);
      newCursorPos = start + markdown.length;
    }

    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <div className={cn('flex h-full flex-col bg-white', isFullscreen && 'fixed inset-4 z-50')}>
      {/* Editor/Preview Area */}
      <div className="relative flex-1 overflow-hidden">
        {isPreview ? (
          <div className="prose prose-sm prose-zinc max-w-none overflow-auto">
            <div
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                  .replace(/^# (.*$)/gim, '<h1 style="font-size: 28px; font-weight: 600;">$1</h1>')
                  .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                  .replace(/\*(.*)\*/gim, '<em>$1</em>')
                  .replace(/^- (.*$)/gim, '<li>$1</li>')
                  .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
                  .replace(/`(.*)`/gim, '<code>$1</code>')
                  .replace(/\n---\n/g, '<hr />')
                  .replace(/\n/g, '<br />'),
              }}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing your strategy..."
            className="h-full min-h-[500px] w-full resize-none p-6 font-mono text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AI ASSISTANT PANEL COMPONENT
// ============================================================================

interface AiAssistantProps {
  clientName: string;
  onInsertContent: (content: string) => void;
}

function AiAssistant({ clientName, onInsertContent }: AiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);

      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: getAiResponse(content, clientName),
          createdAt: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1500);
    },
    [clientName]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleSuggestionClick = (label: string) => {
    handleSend(label);
  };

  return (
    <div className="flex h-full flex-col rounded-xl bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? null : (
          <div className="space-y-6">
            {messages.map(message => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  /* User message - simple pill on the right */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-full bg-zinc-100 px-4 py-2">
                      <p className="text-sm font-medium text-zinc-900">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  /* AI message - plain text, no bubble */
                  <div className="space-y-3">
                    <p className="text-base leading-relaxed text-zinc-900">{message.content}</p>
                    <button
                      onClick={() => onInsertContent(message.content)}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
                    >
                      Say more
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-1 py-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestions - matching image styling */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion.label)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
            >
              {/* Gradient icon */}
              <span className="flex h-5 w-5 items-center justify-center rounded bg-linear-to-br from-cyan-400 to-emerald-500 text-[10px] font-bold text-white">
                /
              </span>
              {suggestion.label}
            </button>
          ))}
          {/* All recipes button */}
          <button
            onClick={() => handleSuggestionClick('Show all recipes')}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
          >
            <SquaresFour weight="bold" className="h-5 w-5 text-zinc-700" />
            All recipes
          </button>
        </div>
      </div>

      {/* Input - matching ai-floating-chatbot style */}
      <div className="p-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to help with strategy..."
          rows={1}
          className="min-h-[56px] w-full resize-none rounded-4xl border border-zinc-200 bg-white px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-zinc-500 shadow-2xl transition-all duration-300 placeholder:text-zinc-500 hover:bg-white focus:ring-2 focus:ring-zinc-300 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN STRATEGY SHEET COMPONENT
// ============================================================================

export function StrategySheet({ client, isOpen, onClose }: StrategySheetProps) {
  const [strategyContent, setStrategyContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the initial state is rendered first
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Initialize strategy content
  useEffect(() => {
    if (isOpen && client) {
      setStrategyContent(
        getInitialStrategy(client.user.name || 'Client', client.profile.businessName)
      );
    }
  }, [isOpen, client]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleInsertContent = (content: string) => {
    setStrategyContent(prev => prev + '\n\n' + content);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Top space */}
      <div className="h-4 shrink-0" />

      {/* Bottom Sheet Container */}
      <div
        className={cn(
          'relative flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out',
          isVisible && !isClosing ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center gap-2 rounded-md hover:bg-zinc-100">
            <XIcon onClick={handleClose} className="h-4 w-4 cursor-pointer text-zinc-500" />
          </div>
          <kbd className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Two-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Markdown Editor */}
          <div className="relative flex-1 overflow-auto pt-24 pr-48 pl-64">
            <h2 className="text-2xl font-semibold">
              Tax Strategy Document for {client.user.name || 'Client'}
            </h2>
            <MarkdownEditor
              content={strategyContent}
              onChange={setStrategyContent}
              onSave={handleSave}
              isSaving={isSaving}
              lastSaved={lastSaved}
            />

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={handleSave}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-500  transition-colors hover:bg-zinc-100`}
              >
                <FilePdfIcon weight="fill" className="h-4 w-4" />
                <span>Export as PDF</span>
              </button>
              <button
                onClick={handleSave}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-600`}
              >
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Right Column - AI Assistant */}
          <div className="w-[400px] shrink-0 border-l border-zinc-200 bg-white p-4">
            <AiAssistant
              clientName={client.user.name || 'Client'}
              onInsertContent={handleInsertContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
