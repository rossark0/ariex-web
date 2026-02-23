'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  SpinnerGap,
  FilePdf as FilePdfIcon,
  Plus,
  Trash,
  CaretLeft,
  CaretRight,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/chat';
import type { ApiClient } from '@/lib/api/strategist.api';
import type { ClientInfo } from '@/contexts/strategist-contexts/client-management/ClientDetailStore';
import type { StrategySendData } from '@/components/strategy/strategy-sheet';

// ============================================================================
// TYPES
// ============================================================================

interface Page {
  id: string;
  content: string;
}

interface StrategyReviewSheetBaseProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  /** Used for internal chat with compliance/strategist */
  otherUserId?: string | null;
}

interface ComplianceReviewProps extends StrategyReviewSheetBaseProps {
  role: 'compliance';
  pdfUrl: string;
  onApprove?: () => Promise<boolean>;
  onReject?: (reason: string) => Promise<boolean>;
  isApproving?: boolean;
  isRejecting?: boolean;
  client?: never;
  agreementId?: never;
  onSend?: never;
}

interface StrategistReviewProps extends StrategyReviewSheetBaseProps {
  role: 'strategist';
  complianceUsers?: (ApiClient & { complianceUserId?: string })[];
  client: ClientInfo;
  agreementId: string;
  onSend: (data: StrategySendData) => Promise<void>;
  pdfUrl?: never;
  onApprove?: never;
  onReject?: never;
  isApproving?: never;
  isRejecting?: never;
}

export type StrategyReviewSheetProps = ComplianceReviewProps | StrategistReviewProps;

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 9);
const createEmptyPage = (): Page => ({ id: generateId(), content: '' });

const getInitialTemplate = (clientName: string, businessName: string | null) => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `
<hr />
<p><strong>Date:</strong> ${today}</p>
<p><strong>Prepared for:</strong> ${clientName}${businessName ? ` (${businessName})` : ''}</p>
<hr />
<h2>EXECUTIVE SUMMARY</h2>
<p>Based on our comprehensive analysis of your financial situation, we have identified several key opportunities for tax optimization.</p>
<hr />
<h2>RECOMMENDED STRATEGIES</h2>
<p>Start typing your revised strategy content...</p>
`;
};

// ============================================================================
// PAGE NAVIGATION (reused from strategy-sheet)
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
// TIPTAP EDITOR (reused from strategy-sheet)
// ============================================================================

const PAGE_MAX_HEIGHT = 700;

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start typing your strategy content...' }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-zinc max-w-none min-h-[500px] outline-none focus:outline-none prose-headings:font-semibold prose-headings:text-zinc-900 prose-p:text-zinc-700 prose-p:leading-relaxed',
      },
    },
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} className="min-h-[500px]" />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StrategyReviewSheet({
  role,
  isOpen,
  onClose,
  documentTitle,
  otherUserId,
  ...props
}: StrategyReviewSheetProps) {
  // If we are a strategist, extract the additional props
  const complianceUsers =
    role === 'strategist' ? (props as StrategistReviewProps).complianceUsers : undefined;

  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // --- Compliance action state ---
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [internalApproving, setInternalApproving] = useState(false);
  const [internalRejecting, setInternalRejecting] = useState(false);

  // --- Strategist editor state ---
  const [pages, setPages] = useState<Page[]>([createEmptyPage()]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'content' | 'chat'>('content');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(otherUserId ?? null);

  useEffect(() => {
    if (otherUserId) {
      setSelectedUserId(otherUserId);
    }
  }, [otherUserId]);

  const [title, setTitle] = useState(documentTitle || 'Tax Strategy Plan');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = pages[currentPageIndex] || pages[0];

  // Animate in
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Load editor template for strategist
  useEffect(() => {
    if (isOpen && role === 'strategist') {
      const clientName = (props as StrategistReviewProps).client?.user?.name || 'Client';
      const businessName = (props as StrategistReviewProps).client?.profile?.businessName || null;
      const firstPage: Page = {
        id: generateId(),
        content: getInitialTemplate(clientName, businessName),
      };
      setPages([firstPage]);
      setCurrentPageIndex(0);
      setTitle(documentTitle || `Tax Strategy - ${clientName}`);
      setError(null);
    }
  }, [isOpen, role, props, documentTitle]);

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

  // ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSending) handleClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSending, handleClose]);

  // --- Page management (strategist only) ---
  const updateCurrentPageContent = (content: string) => {
    setPages(prev =>
      prev.map((page, index) => (index === currentPageIndex ? { ...page, content } : page))
    );
  };

  const addPage = () => {
    setPages(prev => [...prev, createEmptyPage()]);
    setCurrentPageIndex(pages.length);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, index) => index !== currentPageIndex));
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  // PDF generation + send (strategist)
  const generatePdfBase64 = async (): Promise<{ base64: string; totalPages: number }> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
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

  const handleSendStrategy = async () => {
    if (role !== 'strategist') return;
    const allContent = pages.map(p => p.content).join('');
    if (!allContent.trim()) {
      setError('Please add content to the strategy');
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const { base64, totalPages } = await generatePdfBase64();
      await (props as StrategistReviewProps).onSend({
        title,
        description: allContent.substring(0, 200) + '...',
        markdownContent: allContent,
        pdfBase64: base64,
        totalPages,
      });
      handleClose();
    } catch (err) {
      console.error('Failed to send revised strategy:', err);
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

      <div className="h-4 shrink-0" />

      {/* Sheet container */}
      <div
        className={cn(
          'relative flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out',
          isVisible && !isClosing ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Close button */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center gap-2 rounded-md hover:bg-zinc-100">
            <XIcon onClick={handleClose} className="h-4 w-4 cursor-pointer text-zinc-500" />
          </div>
          <kbd className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Error */}
        {error && (
          <div className="absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT COLUMN */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* Action buttons top-right */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              {role === 'compliance' && (
                <>
                  {props.onApprove && (
                    <Button
                      onClick={() => setShowApproveDialog(true)}
                      disabled={internalApproving || internalRejecting}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      size="sm"
                    >
                      {internalApproving ? (
                        <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1.5 h-4 w-4" weight="fill" />
                      )}
                      {internalApproving ? 'Approving…' : 'Approve'}
                    </Button>
                  )}
                  {props.onReject && (
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={internalApproving || internalRejecting}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      size="sm"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" weight="fill" />
                      Reject
                    </Button>
                  )}
                </>
              )}
              {role === 'strategist' && (
                <button
                  onClick={handleSendStrategy}
                  disabled={isSending || !pages.some(p => p.content.trim())}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <SpinnerGap className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send revised strategy</span>
                  )}
                </button>
              )}
            </div>

            {/* Content area */}
            {role === 'compliance' ? (
              <div className="flex flex-1 flex-col items-center overflow-auto px-8 pt-16 pb-8">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                  {documentTitle || 'Tax Strategy Plan'}
                </h2>
                <div className="w-full max-w-4xl flex-1 overflow-hidden rounded-xl border border-zinc-200">
                  <iframe
                    src={props.pdfUrl}
                    title="Strategy Document"
                    className="h-full w-full"
                    style={{ minHeight: 'calc(100vh - 200px)' }}
                  />
                </div>
              </div>
            ) : (
              <>
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
                <PageNavigation
                  currentPage={currentPageIndex}
                  totalPages={pages.length}
                  onPageChange={setCurrentPageIndex}
                  onAddPage={addPage}
                  onDeletePage={deletePage}
                />
              </>
            )}
          </div>

          {/* RIGHT COLUMN — Chat */}
          <div className="flex w-[380px] shrink-0 flex-col border-l border-zinc-200 bg-white px-4">
            <div className="border-b border-zinc-200 px-6 py-4">
              <h3 className="font-semibold text-zinc-900">
                {role === 'compliance' ? 'Strategist Chat' : 'Compliance Chat'}
              </h3>
              <p className="text-sm text-zinc-500">
                {role === 'compliance'
                  ? 'Discuss this strategy with the strategist.'
                  : 'Discuss this strategy with compliance.'}
              </p>
            </div>

            <div className="flex-1 overflow-hidden px-4">
              {role === 'strategist' && complianceUsers && complianceUsers.length > 1 && (
                <div className="mt-2 mb-4">
                  <label
                    htmlFor="compliance-select"
                    className="mb-1 block text-xs font-medium text-zinc-500"
                  >
                    Select Compliance Team Member
                  </label>
                  <select
                    id="compliance-select"
                    value={selectedUserId || ''}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm ring-emerald-500 outline-none focus:border-emerald-500 focus:ring-1"
                  >
                    {complianceUsers.map((user: ApiClient & { complianceUserId?: string }) => (
                      <option
                        key={user.complianceUserId || user.id}
                        value={user.complianceUserId || user.id}
                      >
                        {user.email} (ID: {(user.complianceUserId || user.id).slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUserId ? (
                <Chat
                  mode="single"
                  otherUserId={selectedUserId}
                  clientName={role === 'compliance' ? 'Strategist' : 'Compliance Team'}
                  placeholder="Message..."
                  showHeader={false}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-zinc-500">
                  <p>Connecting to chat...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve confirmation dialog — renders inside the sheet's z-context */}
      {showApproveDialog && role === 'compliance' && (props as ComplianceReviewProps).onApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-zinc-900">Approve Strategy</h3>
            <p className="mb-6 text-zinc-600">
              Are you sure you want to approve this strategy? It will be marked as complete and sent
              back to the strategist.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                disabled={internalApproving}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={async () => {
                  setInternalApproving(true);
                  try {
                    const success = await (props as ComplianceReviewProps).onApprove!();
                    if (success) handleClose();
                  } finally {
                    setInternalApproving(false);
                    setShowApproveDialog(false);
                  }
                }}
                disabled={internalApproving}
              >
                {internalApproving ? (
                  <>
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Yes, Approve'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation dialog — renders inside the sheet's z-context */}
      {showRejectDialog && role === 'compliance' && props.onReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-zinc-900">Reject Strategy</h3>
            <p className="mb-4 text-sm text-zinc-500">
              Provide a reason for the rejection. The strategist will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason…"
              rows={4}
              className="mb-4 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                disabled={internalRejecting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || internalRejecting}
                onClick={async () => {
                  setInternalRejecting(true);
                  const ok = await props.onReject!(rejectReason.trim());
                  setInternalRejecting(false);
                  setShowRejectDialog(false);
                  setRejectReason('');
                  if (ok) handleClose();
                }}
              >
                {internalRejecting ? (
                  <>
                    <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                    Rejecting…
                  </>
                ) : (
                  'Reject Strategy'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
