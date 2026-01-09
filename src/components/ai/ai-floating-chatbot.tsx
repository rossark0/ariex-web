'use client';

import { cn } from '@/lib/utils';
import { MinusIcon, X, CaretUp, Paperclip, ArrowUp, Robot, User } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { EmptyMessagesIllustration } from '@/components/ui/empty-messages-illustration';
import { useUiStore, type AiMessage } from '@/contexts/ui/UiStore';

interface AiFloatingChatbotProps {
  selectedCount?: number;
  onClearSelection?: () => void;
  contextType?: string;
}

export function AiFloatingChatbot({ selectedCount = 0, onClearSelection, contextType = 'item' }: AiFloatingChatbotProps) {
  const { 
    aiMessages, 
    isAiChatOpen, 
    setAiChatOpen, 
    addAiMessage, 
    askAriexWithContext,
    clearAiMessages 
  } = useUiStore();
  const [input, setInput] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [showSelectionBar, setShowSelectionBar] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!input.trim()) return;
    
    addAiMessage({ role: 'user', content: input.trim() });
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      addAiMessage({ 
        role: 'assistant', 
        content: "I understand your question. As your AI tax assistant, I'm here to help you understand your tax documents, payments, and agreements. Is there anything specific you'd like me to explain or help you with?" 
      });
    }, 1000);
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

            {/* Add to folder button */}
            <button 
              onClick={handleAskAriex}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1.5 pr-3 pl-3 text-sm font-medium text-teal-600 shadow-lg transition-colors hover:bg-teal-50"
            >
              <span>Ask Ariex</span>
            </button>
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
                <span className="text-sm font-medium text-zinc-500">
                  Ask questions or generate strategy notes
                </span>
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

            <div className="flex min-h-96 max-h-96 flex-col gap-6 overflow-y-auto px-6 pb-[200px]">
              {aiMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <div className="text-center -translate-y-4">
                    <p className="text-sm font-medium text-zinc-700">No messages yet</p>
                    <p className="mt-1 text-xs text-zinc-500">Ask Ariex anything to get started</p>
                  </div>
                </div>
              ) : (
                <>
                  {aiMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex flex-col',
                        message.role === 'user' ? 'items-end' : 'items-start'
                      )}
                    >
                      {message.role === 'user' ? (
                        <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-2.5">
                          <p className="text-base text-zinc-900">{message.content}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-3">
                          <p className="text-base text-zinc-900 whitespace-pre-wrap">{message.content}</p>
                          <button className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                            Say more
                          </button>
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
          <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 hover:bg-white focus-within:ring-2 focus-within:ring-zinc-300">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask anything..."
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
              className="flex-1 min-h-[56px] resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-black placeholder:text-zinc-500 focus:outline-none"
            />

            {/* Attachment Button */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-100"
              aria-label="Attach file"
            >
              <Paperclip size={20} weight="bold" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              disabled={!input.trim()}
              onClick={handleSendMessage}
              className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <ArrowUp size={20} weight="bold" />
            </button>
          </div>
        </div>
      ) : (
        <div className="z-40 -translate-y-4 scale-[97%] transition-all duration-300">
          <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 hover:bg-white focus-within:ring-2 focus-within:ring-zinc-300">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Press '/' to use AriexAI..."
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
              className="flex-1 min-h-[56px] resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-black placeholder:text-zinc-500 focus:outline-none"
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
                className="mr-3 flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 transition-all hover:shadow-xl "
              >
                <div className="flex h-5 w-8 items-center justify-center rounded-md bg-emerald-100">
                  <kbd className="text-xs font-extrabold text-emerald-600">TAB</kbd>
                </div>
                <span className="text-sm font-medium text-zinc-700">Ask AriexAI</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
