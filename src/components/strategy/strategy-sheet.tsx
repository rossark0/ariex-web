'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  SpinnerGap,
  FilePdf as FilePdfIcon,
  SquaresFour,
  Plus,
  Trash,
  CaretLeft,
  CaretRight,
  Paperclip,
  ArrowUp,
  Sparkle,
  CheckCircle,
  XCircle,
  ChatCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MiniFileStack } from '@/components/ui/mini-document-illustration';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface Page {
  id: string;
  content: string;
}

export interface ReviewComment {
  id: string;
  body: string;
  createdAt: string;
  userName?: string;
}

interface StrategySheetEditProps {
  mode?: 'edit';
  client: FullClientMock;
  agreementId: string;
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: StrategySendData) => Promise<void>;
}

interface StrategySheetReviewProps {
  mode: 'review';
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  documentTitle?: string;
  comments?: ReviewComment[];
  isLoadingComments?: boolean;
  onAddComment?: (body: string) => Promise<boolean>;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  userRole?: 'COMPLIANCE' | 'STRATEGIST';
}

type StrategySheetProps = StrategySheetEditProps | StrategySheetReviewProps;

export interface StrategySendData {
  title: string;
  description: string;
  markdownContent: string;
  /** Base64-encoded PDF generated client-side */
  pdfBase64: string;
  /** Total number of pages in the PDF */
  totalPages: number;
}

// AI Chat Message type
interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEditing?: boolean;
  suggestions?: string[];
  context?: {
    type: 'file';
    fileName: string;
    count: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyPage = (): Page => ({
  id: generateId(),
  content: '',
});

// ============================================================================
// INITIAL TEMPLATE (HTML for Tiptap) - Tax Strategy Document
// ============================================================================

const getInitialTemplate = (clientName: string, businessName: string | null, strategistName: string) => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return `
<hr />
<p><strong>Date:</strong> ${today}</p>
<p><strong>Prepared for:</strong> ${clientName}${businessName ? ` (${businessName})` : ''}</p>
<p><strong>Prepared by:</strong> ${strategistName}</p>
<hr />
<h2>EXECUTIVE SUMMARY</h2>
<p>Based on our comprehensive analysis of your financial situation, we have identified several key opportunities for tax optimization. This strategy document outlines our recommendations to help minimize your tax liability while ensuring full compliance with all applicable tax laws.</p>
<hr />
<h2>KEY FINDINGS</h2>
<ul>
  <li><strong>Current Tax Bracket:</strong> [To be determined based on income analysis]</li>
  <li><strong>Potential Annual Savings:</strong> [Estimated after strategy implementation]</li>
  <li><strong>Primary Optimization Areas:</strong> Entity structure, deductions, retirement planning</li>
</ul>
<hr />
<h2>RECOMMENDED STRATEGIES</h2>
<h3>1. Entity Structure Optimization</h3>
<p>Based on your business activities and income level, we recommend evaluating your current entity structure. Potential options include S-Corporation election, which may reduce self-employment taxes significantly.</p>
<h3>2. Retirement Account Maximization</h3>
<p>Maximizing contributions to tax-advantaged retirement accounts can provide immediate tax deductions while building long-term wealth. We recommend exploring SEP-IRA, Solo 401(k), or defined benefit plan options.</p>
<h3>3. Business Expense Optimization</h3>
<p>We have identified several potential deductions that may not be fully utilized, including home office deduction, vehicle expenses, health insurance premiums, and professional development costs.</p>
<hr />
<h2>IMPLEMENTATION TIMELINE</h2>
<ol>
  <li><strong>Immediate (0-30 days):</strong> Review and organize documentation for identified deductions</li>
  <li><strong>Short-term (30-90 days):</strong> Implement entity structure changes if recommended</li>
  <li><strong>Ongoing:</strong> Quarterly tax planning reviews and estimated payment optimization</li>
</ol>
<hr />
<h2>NEXT STEPS</h2>
<p>Please review this strategy document carefully. Upon your approval, we will proceed with implementing the recommended strategies. Sign below to acknowledge receipt and approval of this tax strategy plan.</p>
<hr />
<h2>SIGNATURES</h2>
<p><strong>Client:</strong> _____________________________ Date: __________</p>
<p><strong>Tax Strategist:</strong> ${strategistName}</p>
<hr />
`;
};

// ============================================================================
// AI SUGGESTION PROMPTS
// ============================================================================

const aiSuggestions = [
  { label: 'Add more tax savings strategies', hasGradientIcon: true },
  { label: 'Improve executive summary', hasGradientIcon: true },
  { label: 'Generate retirement planning section', hasGradientIcon: true },
  { label: 'Add implementation timeline', hasGradientIcon: true },
];

// ============================================================================
// PAGE NAVIGATION COMPONENT
// ============================================================================

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddPage: () => void;
  onDeletePage: () => void;
}

function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
  onAddPage,
  onDeletePage,
}: PageNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-2 border-t border-zinc-100 bg-white py-3">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <CaretLeft weight="bold" className="h-3 w-3" />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => onPageChange(index)}
            className={cn(
              'h-6 w-6 rounded-lg text-sm font-medium transition-colors',
              currentPage === index
                ? 'bg-emerald-500 text-white'
                : 'text-zinc-500 hover:bg-zinc-100'
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <CaretRight weight="bold" className="h-3 w-3" />
      </button>

      <div className="mx-2 h-4 w-px bg-zinc-200" />

      <button
        onClick={onAddPage}
        className="flex cursor-pointer items-center gap-1 rounded-md bg-zinc-100 px-2 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-200"
      >
        <Plus weight="bold" className="h-3.5 w-3.5" />
        Add Page
      </button>

      {totalPages > 1 && (
        <button
          onClick={onDeletePage}
          className="flex items-center gap-1 rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-600 hover:text-white"
        >
          <Trash weight="bold" className="h-3.5 w-3.5" />
          Delete page
        </button>
      )}
    </div>
  );
}

// ============================================================================
// TIPTAP EDITOR COMPONENT
// ============================================================================

const PAGE_MAX_HEIGHT = 700;

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onOverflow?: (isOverflowing: boolean) => void;
}

function TiptapEditor({ content, onChange, onOverflow }: TiptapEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your strategy content...',
      }),
    ],
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-zinc max-w-none focus:outline-none min-h-[500px] pt-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // Check for content overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (editorContainerRef.current) {
        const height = editorContainerRef.current.scrollHeight;
        const overflow = height > PAGE_MAX_HEIGHT;
        setIsOverflowing(overflow);
        onOverflow?.(overflow);
      }
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (editorContainerRef.current) {
      observer.observe(editorContainerRef.current);
    }
    return () => observer.disconnect();
  }, [content, onOverflow]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div
        ref={editorContainerRef}
        className="relative flex-1 overflow-auto"
        style={{ maxHeight: PAGE_MAX_HEIGHT }}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
      {isOverflowing && (
        <div className="flex items-center justify-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2">
          <span className="text-xs font-medium text-amber-700">
            Content exceeds one page. Consider adding a new page to keep PDF layout clean.
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI ASSISTANT PANEL COMPONENT
// ============================================================================

interface AiAssistantProps {
  clientName: string;
  documentContent: string;
  currentPageIndex: number;
  totalPages: number;
  onUpdateContent: (content: string) => void;
  onAddPage: (content?: string) => void;
  onGoToPage: (pageIndex: number) => void;
  onDeletePage: () => void;
}

function AiAssistant({
  clientName,
  documentContent,
  currentPageIndex,
  totalPages,
  onUpdateContent,
  onAddPage,
  onGoToPage,
  onDeletePage,
}: AiAssistantProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: AiChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);

      try {
        const response = await fetch('/api/ai/document-editor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chat',
            documentContent,
            userMessage: content,
            chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
            clientName,
            currentPageIndex: currentPageIndex + 1,
            totalPages,
            documentType: 'strategy', // Let AI know this is a strategy document
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get AI response');
        }

        const aiMessage: AiChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.message || 'I apologize, I could not process that request.',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);

        // If AI provided updated content, apply it
        if (data.fullContent) {
          onUpdateContent(data.fullContent);
        }

        // If AI wants to create a new page
        if (data.action === 'addPage') {
          onAddPage(data.newPageContent || '');
        }

        // If AI wants to navigate to a specific page
        if (data.action === 'goToPage' && typeof data.pageIndex === 'number') {
          onGoToPage(data.pageIndex - 1);
        }

        // If AI wants to delete the current page
        if (data.action === 'deletePage') {
          onDeletePage();
        }
      } catch (error) {
        console.error('AI chat error:', error);
        const errorContent =
          error instanceof Error
            ? error.message
            : 'Sorry, I encountered an error. Please try again.';
        const errorMessage: AiChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [
      documentContent,
      messages,
      clientName,
      currentPageIndex,
      totalPages,
      onUpdateContent,
      onAddPage,
      onGoToPage,
      onDeletePage,
    ]
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setIsProcessingFile(true);

    const userMessage: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `Please analyze this PDF and incorporate relevant content into the strategy.`,
      timestamp: new Date(),
      context: {
        type: 'file',
        fileName: file.name,
        count: 1,
      },
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await fetch('/api/ai/document-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ocr-pdf',
          pdfBase64: base64,
          clientName,
          documentType: 'strategy',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process PDF');
      }

      if (data.pages && data.pages.length > 0) {
        onUpdateContent(data.pages[0].content);

        for (let i = 1; i < data.pages.length; i++) {
          onAddPage(data.pages[i].content);
        }

        const aiMessage: AiChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `I've analyzed the PDF "${file.name}" and incorporated the content. ${data.title ? `Document title: "${data.title}".` : ''} You can now edit the content in the editor.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('No content extracted from PDF');
      }
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage: AiChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          error instanceof Error
            ? error.message
            : 'Failed to process the uploaded file. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingFile(false);
      setIsTyping(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative flex h-full flex-col rounded-xl bg-white">
      {/* Floating page indicator - top right */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-500">
        <Sparkle weight="fill" className="h-4 w-4 text-emerald-500" /> Editing{' '}
        <span>
          page {currentPageIndex + 1} of {totalPages}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pt-10">
        {messages.length === 0 ? null : (
          <div className="space-y-6">
            {messages.map(message => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  <div className="flex flex-col items-end gap-2">
                    {message.context && (
                      <div className="flex items-center gap-2">
                        <MiniFileStack count={message.context.count} />
                        <span className="text-sm text-zinc-500">{message.context.fileName}</span>
                      </div>
                    )}
                    <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-2.5">
                      <p className="text-sm font-medium text-zinc-900">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-base leading-relaxed text-zinc-900">{message.content}</p>
                    <button
                      onClick={() => onUpdateContent(message.content)}
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

      {/* Suggestions - only show when no messages yet */}
      {messages.length === 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion.label)}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-linear-to-br from-cyan-400 to-emerald-500 text-[10px] font-bold text-white">
                  /
                </span>
                {suggestion.label}
              </button>
            ))}
            <button
              onClick={() => handleSuggestionClick('Show all recipes')}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
            >
              <SquaresFour weight="bold" className="h-5 w-5 text-zinc-700" />
              All recipes
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3">
        <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-zinc-300 hover:bg-white">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI..."
            rows={1}
            className="min-h-14 flex-1 resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-zinc-700 placeholder:text-zinc-500 focus:outline-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile || isTyping}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-100 disabled:opacity-50"
            aria-label="Attach file"
          >
            {isProcessingFile ? (
              <SpinnerGap size={20} weight="bold" className="animate-spin" />
            ) : (
              <Paperclip size={20} weight="bold" />
            )}
          </button>

          <button
            type="button"
            disabled={!input.trim() || isTyping}
            onClick={() => handleSend(input)}
            className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            aria-label="Send message"
          >
            <ArrowUp size={20} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMMENTS THREAD COMPONENT (Review Mode)
// ============================================================================

function formatCommentTime(dateInput: string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CommentsThreadProps {
  comments: ReviewComment[];
  isLoading: boolean;
  onAddComment?: (body: string) => Promise<boolean>;
  readOnly?: boolean;
}

function CommentsThread({ comments, isLoading, onAddComment, readOnly }: CommentsThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !onAddComment) return;
    setIsSending(true);
    const success = await onAddComment(newComment.trim());
    if (success) setNewComment('');
    setIsSending(false);
  };

  return (
    <div className="relative flex h-full flex-col rounded-xl bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <ChatCircle weight="fill" className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-semibold text-zinc-700">Comments</span>
        {comments.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
            {comments.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
            <SpinnerGap className="h-4 w-4 animate-spin" />
            Loading comments…
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ChatCircle className="mb-3 h-10 w-10 text-zinc-200" />
            <p className="text-sm font-medium text-zinc-400">No comments yet</p>
            {!readOnly && (
              <p className="mt-1 text-xs text-zinc-300">
                Add a comment to share feedback on this strategy
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedComments.map(c => (
              <div
                key={c.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700">
                    {c.userName || 'Compliance'}
                  </span>
                  <span className="text-xs text-zinc-400">{formatCommentTime(c.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">{c.body}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {!readOnly && onAddComment && (
        <div className="border-t border-zinc-100 p-3">
          <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-zinc-300 hover:bg-white">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Add a comment…"
              rows={1}
              disabled={isSending}
              className="min-h-14 flex-1 resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-zinc-700 placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={!newComment.trim() || isSending}
              onClick={handleSubmit}
              className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              aria-label="Send comment"
            >
              {isSending ? (
                <SpinnerGap size={20} weight="bold" className="animate-spin" />
              ) : (
                <ArrowUp size={20} weight="bold" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN STRATEGY SHEET COMPONENT
// ============================================================================

export function StrategySheet(props: StrategySheetProps) {
  const isReviewMode = props.mode === 'review';

  if (isReviewMode) {
    return <StrategySheetReview {...props} />;
  }

  return <StrategySheetEdit {...(props as StrategySheetEditProps)} />;
}

// ============================================================================
// REVIEW MODE COMPONENT
// ============================================================================

function StrategySheetReview({
  isOpen,
  onClose,
  pdfUrl,
  documentTitle,
  comments = [],
  isLoadingComments = false,
  onAddComment,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  userRole = 'COMPLIANCE',
}: StrategySheetReviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

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

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isCompliance = userRole === 'COMPLIANCE';
  const showActions = isCompliance && onApprove && onReject;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col">
      <div
        onClick={handleClose}
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        )}
      />

      <div className="h-4 shrink-0" />

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

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {showActions && (
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <Button
                  onClick={onApprove}
                  disabled={isApproving || isRejecting}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  size="sm"
                >
                  {isApproving ? (
                    <>
                      <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                      Approving…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1.5 h-4 w-4" weight="fill" />
                      Approve Strategy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onReject}
                  disabled={isApproving || isRejecting}
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {isRejecting ? (
                    <>
                      <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1.5 h-4 w-4" weight="fill" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-auto pt-16 pr-8 pb-8 pl-16">
              {documentTitle && (
                <h1 className="mb-4 text-2xl font-semibold text-zinc-900">{documentTitle}</h1>
              )}
              <div className="flex h-full min-h-[calc(100vh-200px)] flex-col rounded-lg border border-zinc-200 bg-zinc-50">
                <iframe
                  src={pdfUrl}
                  title="Strategy Document"
                  className="h-full w-full flex-1 rounded-lg"
                  style={{ minHeight: 'calc(100vh - 280px)' }}
                />
              </div>
            </div>
          </div>

          <div className="w-[400px] shrink-0 border-l border-zinc-200 bg-white p-4">
            <CommentsThread
              comments={comments}
              isLoading={isLoadingComments}
              onAddComment={onAddComment}
              readOnly={userRole === 'STRATEGIST'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT MODE COMPONENT
// ============================================================================

function StrategySheetEdit({
  client,
  agreementId,
  isOpen,
  onClose,
  onSend,
}: StrategySheetEditProps) {
  const strategistName = 'Ariex Tax Strategist';
  const clientName = client.user.name || 'Client';
  const businessName = client.profile.businessName;

  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('Tax Strategy Document');

  // Multi-page state
  const [pages, setPages] = useState<Page[]>([createEmptyPage()]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Get current page
  const currentPage = pages[currentPageIndex];

  // Animation handling
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Load template when opened
  useEffect(() => {
    if (isOpen) {
      const firstPage: Page = {
        id: generateId(),
        content: getInitialTemplate(clientName, businessName, strategistName),
      };
      setPages([firstPage]);
      setCurrentPageIndex(0);
      setTitle(`Tax Strategy - ${clientName}`);
      setError(null);
    }
  }, [isOpen, clientName, businessName, strategistName]);

  // Prevent body scroll
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

  const handleClose = useCallback(() => {
    if (isSending) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  }, [isSending, onClose]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSending) handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSending, handleClose]);

  // Page management functions
  const updateCurrentPageContent = (content: string) => {
    setPages(prev =>
      prev.map((page, index) => (index === currentPageIndex ? { ...page, content } : page))
    );
  };

  const addPage = () => {
    const newPage = createEmptyPage();
    setPages(prev => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const addPageWithContent = (content?: string) => {
    const newPage: Page = {
      id: generateId(),
      content: content || '',
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, index) => index !== currentPageIndex));
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const page = pages[i];

        const tempContainer = document.createElement('div');
        tempContainer.style.width = '800px';
        tempContainer.style.padding = '40px';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';

        if (i === 0) {
          const titleEl = document.createElement('h1');
          titleEl.textContent = title;
          titleEl.style.fontSize = '32px';
          titleEl.style.fontWeight = '600';
          titleEl.style.marginBottom = '24px';
          titleEl.style.color = '#18181b';
          tempContainer.appendChild(titleEl);
        }

        const pageIndicator = document.createElement('p');
        pageIndicator.textContent = `Page ${i + 1} of ${pages.length}`;
        pageIndicator.style.fontSize = '14px';
        pageIndicator.style.color = '#71717a';
        pageIndicator.style.marginBottom = '20px';
        tempContainer.appendChild(pageIndicator);

        const contentEl = document.createElement('div');
        contentEl.innerHTML = page.content;
        contentEl.style.fontSize = '18px';
        contentEl.style.lineHeight = '1.7';
        contentEl.style.color = '#27272a';

        const style = document.createElement('style');
        style.textContent = `
          hr { border: none; border-top: 1px solid #e4e4e7; margin: 20px 0; height: 0; }
          h2 { font-size: 24px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; }
          h3 { font-size: 20px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; }
          p { margin-bottom: 12px; }
          ul, ol { margin-bottom: 12px; padding-left: 24px; }
          li { margin-bottom: 6px; }
          strong { font-weight: 600; }
        `;
        tempContainer.appendChild(style);
        tempContainer.appendChild(contentEl);

        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const maxHeight = pageHeight - margin * 2;

        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (imgHeight > maxHeight) {
          const scale = maxHeight / imgHeight;
          finalWidth = imgWidth * scale;
          finalHeight = maxHeight;
        }

        const xOffset = margin + (contentWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, margin, finalWidth, finalHeight);
      }

      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate PDF client-side for sending
  const generatePdfBase64 = async (): Promise<{ base64: string; totalPages: number }> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const page = pages[i];

      const tempContainer = document.createElement('div');
      tempContainer.style.width = '800px';
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';

      if (i === 0) {
        const titleEl = document.createElement('h1');
        titleEl.textContent = title;
        titleEl.style.fontSize = '32px';
        titleEl.style.fontWeight = '600';
        titleEl.style.marginBottom = '24px';
        titleEl.style.color = '#18181b';
        tempContainer.appendChild(titleEl);
      }

      const pageIndicator = document.createElement('p');
      pageIndicator.textContent = `Page ${i + 1} of ${pages.length}`;
      pageIndicator.style.fontSize = '14px';
      pageIndicator.style.color = '#71717a';
      pageIndicator.style.marginBottom = '20px';
      tempContainer.appendChild(pageIndicator);

      const contentEl = document.createElement('div');
      contentEl.innerHTML = page.content;
      contentEl.style.fontSize = '18px';
      contentEl.style.lineHeight = '1.7';
      contentEl.style.color = '#27272a';

      const style = document.createElement('style');
      style.textContent = `
        hr { border: none; border-top: 1px solid #e4e4e7; margin: 20px 0; height: 0; }
        h2 { font-size: 24px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; }
        h3 { font-size: 20px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; }
        p { margin-bottom: 12px; }
        ul, ol { margin-bottom: 12px; padding-left: 24px; }
        li { margin-bottom: 6px; }
        strong { font-weight: 600; }
      `;
      tempContainer.appendChild(style);
      tempContainer.appendChild(contentEl);

      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxHeight = pageHeight - margin * 2;

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (imgHeight > maxHeight) {
        const scale = maxHeight / imgHeight;
        finalWidth = imgWidth * scale;
        finalHeight = maxHeight;
      }

      const xOffset = margin + (contentWidth - finalWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin, finalWidth, finalHeight);
    }

    const pdfOutput = pdf.output('datauristring');
    const base64 = pdfOutput.split(',')[1];
    return { base64, totalPages: pages.length };
  };

  const handleSend = async () => {
    const allContent = pages.map(p => p.content).join('');
    if (!allContent.trim()) {
      setError('Please add content to the strategy');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const { base64, totalPages } = await generatePdfBase64();

      await onSend({
        title,
        description: allContent.substring(0, 200) + '...',
        markdownContent: allContent,
        pdfBase64: base64,
        totalPages,
      });
      handleClose();
    } catch (err) {
      console.error('Failed to send strategy:', err);
      setError('Failed to send strategy. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col">
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
        {/* Close button - top left */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center gap-2 rounded-md hover:bg-zinc-100">
            <XIcon onClick={handleClose} className="h-4 w-4 cursor-pointer text-zinc-500" />
          </div>
          <kbd className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Document Editor */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* Action buttons - top right of left column */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExporting || !pages.some(p => p.content.trim())}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <SpinnerGap className="h-4 w-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <FilePdfIcon weight="fill" className="h-4 w-4" />
                    <span>Export as PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !pages.some(p => p.content.trim())}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <SpinnerGap className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send to compliance</span>
                )}
              </button>
            </div>

            {/* Page Content Area */}
            <div className="flex-1 overflow-auto pt-24 pr-48 pb-8 pl-64">
              <div className="flex min-h-[calc(100vh-200px)] flex-col">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-zinc-400 focus:outline-none"
                  placeholder="Enter document title..."
                />

                <p className="mt-1 text-xs font-semibold text-zinc-400 uppercase">
                  Page {currentPageIndex + 1} of {pages.length}
                </p>

                <div className="flex-1">
                  <TiptapEditor
                    key={currentPage.id}
                    content={currentPage.content}
                    onChange={updateCurrentPageContent}
                  />
                </div>
              </div>
            </div>

            {/* Page Navigation */}
            <PageNavigation
              currentPage={currentPageIndex}
              totalPages={pages.length}
              onPageChange={setCurrentPageIndex}
              onAddPage={addPage}
              onDeletePage={deletePage}
            />
          </div>

          {/* Right Column - AI Assistant */}
          <div className="w-[400px] shrink-0 border-l border-zinc-200 bg-white p-4">
            <AiAssistant
              clientName={clientName}
              documentContent={currentPage.content}
              currentPageIndex={currentPageIndex}
              totalPages={pages.length}
              onUpdateContent={updateCurrentPageContent}
              onAddPage={addPageWithContent}
              onGoToPage={setCurrentPageIndex}
              onDeletePage={deletePage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
