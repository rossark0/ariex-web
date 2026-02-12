'use client';

import { MarkdownContent } from '@/components/ui/markdown-content';
import {
  MiniDocumentStack,
  MiniFileStack,
  MiniPaymentStack,
} from '@/components/ui/mini-document-illustration';
import { useAiPageContextStore } from '@/contexts/ai/AiPageContextStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import {
  ArrowUp,
  DownloadSimple,
  MinusIcon,
  Paperclip,
  Stop,
  Trash,
  X
} from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AiFloatingChatbotProps {
  selectedCount?: number;
  onClearSelection?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  isDownloading?: boolean;
  isDeleting?: boolean;
  contextType?: string;
}

export function AiFloatingChatbot({
  selectedCount = 0,
  onClearSelection,
  onDownload,
  onDelete,
  isDownloading = false,
  isDeleting = false,
  contextType = 'item',
}: AiFloatingChatbotProps) {
  const {
    aiMessages,
    isAiChatOpen,
    isAiLoading,
    setAiChatOpen,
    addAiMessage,
    sendAiMessage,
    askAriexWithContext,
    clearAiMessages,
    stopAiGeneration,
  } = useUiStore();
  const { pageContext } = useAiPageContextStore();
  const [input, setInput] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [showSelectionBar, setShowSelectionBar] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine if the current user is a client
  const isClient = pageContext?.userRole === 'CLIENT';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  // Handle selection bar visibility with animation
  useEffect(() => {
    if (selectedCount > 0 && !showSelectionBar) {
      // Show with intro animation
      setShowSelectionBar(true);
      setIsAnimatingOut(true); // Start from hidden state
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingOut(false);
        });
      });
    } else if (selectedCount === 0 && showSelectionBar) {
      // Animate out
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShowSelectionBar(false);
        setIsAnimatingOut(false);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [selectedCount, showSelectionBar]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 240;
    const baseHeight = 56;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    setIsMultiLine(nextHeight > baseHeight);
  };

  useEffect(() => {
    if (!isAiChatOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setAiChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAiChatOpen, setAiChatOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (event.key === '/' && !isInputFocused) {
        event.preventDefault();
        setAiChatOpen(true);
        // Use a slight delay to ensure the textarea is rendered
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      }

      if (event.key === 'Escape' && isAiChatOpen) {
        event.preventDefault();
        setAiChatOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAiChatOpen, setAiChatOpen]);

  useEffect(() => {
    if (isAiChatOpen) {
      requestAnimationFrame(() => autoResize());
    }
  }, [isAiChatOpen, input]);

  const handleSendMessage = () => {
    if (!input.trim() || isAiLoading) return;
    const message = input.trim();
    setInput('');
    sendAiMessage(message);
  };

  const handleAskAriex = () => {
    askAriexWithContext(contextType, selectedCount);
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative sticky -bottom-1 z-50 mx-auto flex w-full max-w-2xl flex-col bg-transparent',
        showSelectionBar ? 'bg-transparent' : 'bg-white'
      )}
    >
      {/* Selection bar - appears above when documents are selected */}
      {showSelectionBar && (
        <div className="mb-6 flex justify-center transition-all duration-200 ease-out">
          <div className="flex items-center gap-2 rounded-full px-1 py-1">
            {/* Selected count with clear button */}
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pr-1 pl-3 shadow-lg">
              <span className="text-sm font-medium text-zinc-700">{selectedCount} selected</span>
              <button
                onClick={onClearSelection}
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
              >
                <X weight="bold" className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Ask Ariex button */}
            <button
              onClick={handleAskAriex}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1.5 pr-3 pl-3 text-sm font-medium text-teal-600 shadow-lg transition-colors hover:bg-teal-50"
            >
              <span>Analyze with AI</span>
            </button>

            {/* Download button - shows when onDownload handler is provided */}
            {onDownload && (
              <button
                onClick={onDownload}
                disabled={isDownloading}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1.5 pr-3 pl-2 text-sm font-medium text-zinc-700 shadow-lg transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadSimple weight="bold" className="h-4 w-4" />
                )}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            )}

            {/* Delete button - shows when onDelete handler is provided */}
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-white py-1.5 pr-3 pl-2 text-sm font-medium text-red-600 shadow-lg transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash weight="bold" className="h-4 w-4" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded chat surface */}
      {isAiChatOpen && (
        <div
          className="absolute bottom-0 mb-2 w-full transition-all duration-300"
          aria-label="AI Chat Panel"
        >
          <div className="z-50 flex flex-col gap-3 rounded-[36px] border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
              <div className="flex flex-col pl-2">
                <span className="text-sm font-medium text-zinc-900">
                  {isClient ? 'Tax Assistant' : 'Tax Strategy Assistant'}
                </span>
                {pageContext ? (
                  <span className="mt-0.5 text-xs text-emerald-600">
                    ● {pageContext.pageTitle}
                  </span>
                ) : (
                  <span className="mt-0.5 text-xs text-zinc-400">
                    {isClient
                      ? 'Ask questions, track progress & understand your taxes'
                      : 'Analyze docs, suggest deductions & build strategies'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {aiMessages.length > 0 && (
                  <button
                    onClick={clearAiMessages}
                    className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setAiChatOpen(false)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex max-h-96 min-h-96 flex-col gap-6 overflow-y-auto px-6 pb-[200px]">
              {aiMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-700">
                      {isClient ? 'Your Tax Assistant' : 'Your Tax Strategy Assistant'}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                      {isClient
                        ? 'I can help you understand your tax situation, track your progress, and answer questions about documents, deadlines, and next steps.'
                        : 'I can analyze client documents, suggest deductions & credits, identify missing filings, and help you build tax strategies.'}
                    </p>
                  </div>
                  {/* Context-aware quick actions */}
                  {pageContext?.client && !isClient && (
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <button
                        onClick={() => {
                          const name = pageContext.client?.name || 'this client';
                          sendAiMessage(`Based on ${name}'s profile, uploaded documents, and filing status, suggest personalized tax-saving strategies with estimated savings.`);
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        Suggest strategies
                      </button>
                      <button
                        onClick={() => {
                          const name = pageContext.client?.name || 'this client';
                          sendAiMessage(`Summarize ${name}'s current status in the Ariex lifecycle (agreement, payment, documents, strategy) and tell me the next steps I should take.`);
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        Status & next steps
                      </button>
                      {(pageContext.documents?.length ?? 0) > 0 && (
                        <button
                          onClick={() => {
                            sendAiMessage('Review the uploaded documents: list what we have, identify any missing standard documents (W-2, 1099s, prior returns), and flag anything that needs attention before I create a strategy.');
                          }}
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                        >
                          Audit documents
                        </button>
                      )}
                      {pageContext.client?.estimatedIncome && (
                        <button
                          onClick={() => {
                            const name = pageContext.client?.name || 'this client';
                            sendAiMessage(`Given ${name}'s estimated income, filing status, and business type, what are the top deductions and credits they should maximize this tax year?`);
                          }}
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                        >
                          Deductions & credits
                        </button>
                      )}
                    </div>
                  )}
                  {/* Client-specific quick actions */}
                  {isClient && (
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <button
                        onClick={() => {
                          sendAiMessage("What is my current status? Walk me through where I am in the process and what I need to do next.");
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        My progress
                      </button>
                      <button
                        onClick={() => {
                          sendAiMessage('What documents do I still need to upload, and why are they important for my tax strategy?');
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        What to upload
                      </button>
                      <button
                        onClick={() => {
                          sendAiMessage('Are there any important tax deadlines coming up that I should be aware of?');
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        Upcoming deadlines
                      </button>
                      {(pageContext?.documents?.length ?? 0) > 0 && (
                        <button
                          onClick={() => {
                            sendAiMessage('Can you explain what each of my uploaded documents is and how they help with my taxes?');
                          }}
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                        >
                          Explain my docs
                        </button>
                      )}
                    </div>
                  )}
                  {!pageContext?.client && !isClient && pageContext && (
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <button
                        onClick={() => {
                          sendAiMessage('Give me an overview of what I see on this page and suggest the most important actions I should take next.');
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        Page overview
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {aiMessages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex w-full flex-col',
                        message.role === 'user' ? 'items-end' : 'items-start'
                      )}
                    >
                      {message.role === 'user' ? (
                        <div className="flex flex-col items-end gap-2">
                          {message.context && (
                            <div className="flex items-center gap-1">
                              {message.context.type === 'payment' ? (
                                <MiniPaymentStack count={message.context.count} />
                              ) : message.context.type === 'document' ? (
                                <MiniFileStack count={message.context.count} />
                              ) : (
                                <MiniDocumentStack count={message.context.count} />
                              )}
                            </div>
                          )}
                          <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-2.5">
                            <p className="text-base break-words text-zinc-900">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-3">
                          {message.content ? (
                            <MarkdownContent content={message.content} />
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Analyzing…</span>
                            </div>
                          )}
                          {/* Show streaming cursor for the last assistant message while loading */}
                          {isAiLoading && message.id === aiMessages[aiMessages.length - 1]?.id && message.content ? (
                            <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-500" />
                          ) : null}
                          {!isAiLoading && message.content && (
                            <button
                              onClick={() => {
                                sendAiMessage(
                                  isClient
                                    ? 'Can you explain that in more detail? What does this mean for me and what should I do?'
                                    : 'Expand on that — include specific IRS rules, estimated dollar savings, and any deadlines I should be aware of.'
                                );
                              }}
                              className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                            >
                              {isClient ? 'Tell me more' : 'Go deeper'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input anchored at bottom, grows upward */}
      {isAiChatOpen ? (
        <div className="z-40 -translate-y-4 scale-[97%] transition-all duration-300">
          <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-100 hover:bg-white focus:border-emerald-100!">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={isClient
                ? "Ask about your documents, deadlines, next steps…"
                : "Ask about deductions, strategies, missing docs…"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onInput={autoResize}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
                if (e.key === 'Enter' && e.shiftKey) {
                  requestAnimationFrame(() => autoResize());
                }
              }}
              className="min-h-[56px] flex-1 resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-normal text-black placeholder:text-zinc-500 focus:outline-none"
            />

            {/* Attachment Button */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-100"
              aria-label="Attach file"
            >
              <Paperclip size={20} weight="bold" />
            </button>

            {/* Send / Stop Button */}
            {isAiLoading ? (
              <button
                type="button"
                onClick={stopAiGeneration}
                className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600"
                aria-label="Stop generation"
              >
                <Stop size={20} weight="fill" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!input.trim()}
                onClick={handleSendMessage}
                className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                aria-label="Send message"
              >
                <ArrowUp size={20} weight="bold" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="z-40 -translate-y-4 scale-[97%] transition-all duration-300">
          <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-zinc-300 hover:bg-white">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={isClient
                ? "Press '/' to ask your Tax Assistant…"
                : "Press '/' to ask Tax Strategy Assistant…"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onClick={() => setAiChatOpen(true)}
              onFocus={() => setAiChatOpen(true)}
              onInput={autoResize}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.shiftKey) {
                  requestAnimationFrame(() => autoResize());
                }
              }}
              className="min-h-[56px] flex-1 resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-normal text-black placeholder:text-zinc-500 focus:outline-none"
            />

            {/* Floating Button - Right Side */}
            {showFloatingButton && (
              <button
                onClick={() => {
                  setAiChatOpen(true);
                  setTimeout(() => {
                    textareaRef.current?.focus();
                  }, 0);
                }}
                className="mr-3 flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 transition-all hover:shadow-xl"
              >
                <div className="flex h-5 w-8 items-center justify-center rounded-md bg-emerald-100">
                  <kbd className="text-xs font-extrabold text-emerald-600">TAB</kbd>
                </div>
                <span className="text-sm font-medium text-zinc-700">Tax Assistant</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
