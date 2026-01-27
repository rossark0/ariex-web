'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  CloudArrowUp,
  SpinnerGap,
  FilePdf as FilePdfIcon,
  SquaresFour,
  Plus,
  Trash,
  PenNib,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================================================
// TYPES
// ============================================================================

interface SignatureField {
  id: string;
  role: string; // e.g., "Client", "Tax Strategist", "Witness"
  label: string;
}

interface Page {
  id: string;
  content: string;
  signatureFields: SignatureField[];
}

interface AgreementSheetProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: AgreementSendData) => Promise<void>;
}

export interface AgreementSendData {
  title: string;
  description: string;
  price: number;
  markdownContent: string;
  pages: Page[];
  todos: Array<{ title: string; description?: string }>;
}

type SheetState = 'upload' | 'edit' | 'sending';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyPage = (): Page => ({
  id: generateId(),
  content: '',
  signatureFields: [],
});

const createSignatureField = (role: string): SignatureField => ({
  id: generateId(),
  role,
  label: `${role} Signature`,
});

// ============================================================================
// INITIAL TEMPLATE (HTML for Tiptap)
// ============================================================================

const getInitialTemplate = (clientName: string, businessName?: string) => `
<h2>Client Overview</h2>
<p><strong>Client:</strong> ${clientName}</p>
${businessName ? `<p><strong>Business:</strong> ${businessName}</p>` : ''}
<hr />
<h2>Executive Summary</h2>
<p><em>AI will help you generate a comprehensive tax strategy based on the client's documents and profile.</em></p>
<hr />
<h2>Key Findings</h2>
<h3>Income Analysis</h3>
<p></p>
<h3>Deduction Opportunities</h3>
<p></p>
<h3>Tax Liability Assessment</h3>
<p></p>
<hr />
<h2>Recommended Strategies</h2>
<h3>Strategy 1: [Name]</h3>
<p><strong>Potential Savings:</strong> $X,XXX</p>
<p><strong>Implementation:</strong></p>
<h3>Strategy 2: [Name]</h3>
<p><strong>Potential Savings:</strong> $X,XXX</p>
<p><strong>Implementation:</strong></p>
<hr />
<h2>Action Items</h2>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>
<hr />
<h2>Timeline</h2>
<p></p>
<hr />
<h2>Notes</h2>
<p></p>
`;

// ============================================================================
// AI SUGGESTION PROMPTS (matching strategy-sheet)
// ============================================================================

const aiSuggestions = [
  { label: 'List action items', hasGradientIcon: true },
  { label: 'Write follow-up email', hasGradientIcon: true },
  { label: 'List Q&A', hasGradientIcon: true },
];

// Predefined signature roles
const SIGNATURE_ROLES = [
  'Client',
  'Tax Strategist',
  'Witness',
  'Co-Signer',
  'Authorized Representative',
];

// ============================================================================
// SIGNATURE FIELD COMPONENT
// ============================================================================

interface SignatureFieldItemProps {
  field: SignatureField;
  onRemove: () => void;
}

function SignatureFieldItem({ field, onRemove }: SignatureFieldItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-zinc-200">
        <PenNib className="h-5 w-5 text-zinc-400" weight="duotone" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-700">{field.label}</p>
        <p className="text-xs text-zinc-400">Click to sign</p>
      </div>
      <button
        onClick={onRemove}
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
      >
        <Trash className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================================
// SIGNATURE AREA COMPONENT (Footer of each page)
// ============================================================================

interface SignatureAreaProps {
  signatureFields: SignatureField[];
  onAddField: (role: string) => void;
  onRemoveField: (fieldId: string) => void;
}

function SignatureArea({ signatureFields, onAddField, onRemoveField }: SignatureAreaProps) {
  const [isAddingField, setIsAddingField] = useState(false);

  return (
    <div className="border-t-2 border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Signature Area
        </p>
        <div className="relative">
          <button
            onClick={() => setIsAddingField(!isAddingField)}
            className="flex items-center gap-1.5 rounded-md bg-white border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Signature
          </button>
          
          {/* Dropdown for role selection */}
          {isAddingField && (
            <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              {SIGNATURE_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onAddField(role);
                    setIsAddingField(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {signatureFields.length === 0 ? (
        <p className="text-center text-xs text-zinc-400 py-4">
          No signatures on this page. Click &quot;Add Signature&quot; to add signature fields.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {signatureFields.map((field) => (
            <SignatureFieldItem
              key={field.id}
              field={field}
              onRemove={() => onRemoveField(field.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="flex items-center justify-center gap-2 py-3 border-t border-zinc-100 bg-white">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <CaretLeft className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => onPageChange(index)}
            className={cn(
              'h-8 w-8 rounded-md text-sm font-medium transition-colors',
              currentPage === index
                ? 'bg-zinc-900 text-white'
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <CaretRight className="h-5 w-5" />
      </button>

      <div className="mx-2 h-4 w-px bg-zinc-200" />

      <button
        onClick={onAddPage}
        className="flex items-center gap-1 font-semibold rounded-md bg-zinc-100 px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Page
      </button>

      {totalPages > 1 && (
        <button
          onClick={onDeletePage}
          className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
        >
          <Trash className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}

// ============================================================================
// UPLOAD CARD COMPONENT
// ============================================================================

interface UploadCardProps {
  onFileSelect: (file: File) => void;
  onSkipUpload: () => void;
  isProcessing: boolean;
}

function UploadCard({ onFileSelect, onSkipUpload, isProcessing }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all',
          isDragging
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
        )}
      >
        {isProcessing ? (
          <>
            <SpinnerGap className="h-12 w-12 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm font-medium text-zinc-700">Processing PDF...</p>
            <p className="mt-1 text-xs text-zinc-500">Extracting text content</p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CloudArrowUp className="h-8 w-8 text-emerald-600" weight="duotone" />
            </div>
            <p className="mt-4 text-base font-semibold text-zinc-800">Upload your agreement PDF</p>
            <p className="mt-1 text-sm text-zinc-500">Drag and drop or click to browse</p>
            <p className="mt-3 text-xs text-zinc-400">PDF files only, max 10MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px w-16 bg-zinc-200" />
        <span className="text-xs font-medium text-zinc-400">OR</span>
        <div className="h-px w-16 bg-zinc-200" />
      </div>

      <button
        onClick={onSkipUpload}
        className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        Start from template
      </button>
    </div>
  );
}

// ============================================================================
// MARKDOWN EDITOR COMPONENT - TIPTAP RICH TEXT EDITOR
// ============================================================================

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your agreement content...',
      }),
    ],
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-zinc max-w-none focus:outline-none min-h-[500px] pt-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when prop changes (e.g., from PDF extraction)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

// ============================================================================
// AI ASSISTANT PANEL COMPONENT (matching strategy-sheet exactly)
// ============================================================================

interface AiAssistantProps {
  clientName: string;
  onInsertContent: (content: string) => void;
}

function AiAssistant({ clientName, onInsertContent }: AiAssistantProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Handle send
    }
  };

  const handleSuggestionClick = (label: string) => {
    // Handle suggestion click
  };

  return (
    <div className="flex h-full flex-col rounded-xl bg-white">
      {/* Messages area - empty for now */}
      <div className="flex-1 overflow-y-auto p-4"></div>

      {/* Suggestions - matching strategy-sheet styling */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion.label)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
            >
              {/* Gradient icon */}
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-emerald-500 text-[10px] font-bold text-white">
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to help with strategy..."
          rows={1}
          className="min-h-[56px] w-full resize-none rounded-[28px] border border-zinc-200 bg-white px-6 py-4 text-sm font-medium leading-relaxed tracking-tight text-zinc-500 shadow-2xl transition-all duration-300 placeholder:text-zinc-500 hover:bg-white focus:ring-2 focus:ring-zinc-300 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN AGREEMENT SHEET COMPONENT
// ============================================================================

export function AgreementSheet({
  clientId,
  clientName,
  clientEmail,
  isOpen,
  onClose,
  onSend,
}: AgreementSheetProps) {
  const [state, setState] = useState<SheetState>('upload');
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('Service Agreement');
  const [price, setPrice] = useState(499);
  
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

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setState('upload');
      setPages([createEmptyPage()]);
      setCurrentPageIndex(0);
      setTitle('Service Agreement');
      setPrice(499);
      setError(null);
    }
  }, [isOpen]);

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

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Read file and convert to base64 for server action
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Call server action to extract text
      const { extractTextFromPdf } = await import('@/lib/pdf/extract-text');
      const result = await extractTextFromPdf(base64);

      if (result.success && result.markdown) {
        // Convert markdown to HTML for Tiptap
        const html = result.markdown
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/^- (.*$)/gim, '<li>$1</li>')
          .replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')
          .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
          .replace(/\n---\n/g, '<hr />')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br />')
          .replace(/^(.*)$/gm, (match) => {
            if (match.startsWith('<')) return match;
            return `<p>${match}</p>`;
          });
        
        // Create first page with extracted content
        const firstPage: Page = {
          id: generateId(),
          content: html,
          signatureFields: [],
        };
        setPages([firstPage]);
        setCurrentPageIndex(0);
        
        // Extract title from first heading if available
        const titleMatch = result.markdown.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          setTitle(titleMatch[1]);
        }
        setState('edit');
      } else {
        setError(
          result.error || 'Failed to extract text from PDF. You can start from the template instead.'
        );
      }
    } catch (err) {
      console.error('Failed to process PDF:', err);
      setError('Failed to process PDF file. You can start from the template instead.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipUpload = () => {
    const firstPage: Page = {
      id: generateId(),
      content: getInitialTemplate(clientName),
      signatureFields: [createSignatureField('Client'), createSignatureField('Tax Strategist')],
    };
    setPages([firstPage]);
    setCurrentPageIndex(0);
    setTitle(`Service Agreement for ${clientName}`);
    setState('edit');
  };

  // Page management functions
  const updateCurrentPageContent = (content: string) => {
    setPages((prev) =>
      prev.map((page, index) =>
        index === currentPageIndex ? { ...page, content } : page
      )
    );
  };

  const addPage = () => {
    const newPage = createEmptyPage();
    setPages((prev) => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, index) => index !== currentPageIndex));
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
  };

  const addSignatureField = (role: string) => {
    const newField = createSignatureField(role);
    setPages((prev) =>
      prev.map((page, index) =>
        index === currentPageIndex
          ? { ...page, signatureFields: [...page.signatureFields, newField] }
          : page
      )
    );
  };

  const removeSignatureField = (fieldId: string) => {
    setPages((prev) =>
      prev.map((page, index) =>
        index === currentPageIndex
          ? { ...page, signatureFields: page.signatureFields.filter((f) => f.id !== fieldId) }
          : page
      )
    );
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
      const contentWidth = pageWidth - (margin * 2);

      // Export each page
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const page = pages[i];
        
        // Create a temporary container for this page
        const tempContainer = document.createElement('div');
        tempContainer.style.width = '800px';
        tempContainer.style.padding = '40px';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        
        // Add title on first page
        if (i === 0) {
          const titleEl = document.createElement('h1');
          titleEl.textContent = title;
          titleEl.style.fontSize = '24px';
          titleEl.style.fontWeight = '600';
          titleEl.style.marginBottom = '20px';
          titleEl.style.color = '#18181b';
          tempContainer.appendChild(titleEl);
        }

        // Add page indicator
        const pageIndicator = document.createElement('p');
        pageIndicator.textContent = `Page ${i + 1} of ${pages.length}`;
        pageIndicator.style.fontSize = '12px';
        pageIndicator.style.color = '#71717a';
        pageIndicator.style.marginBottom = '16px';
        tempContainer.appendChild(pageIndicator);

        // Add content
        const contentEl = document.createElement('div');
        contentEl.innerHTML = page.content;
        contentEl.style.fontSize = '14px';
        contentEl.style.lineHeight = '1.6';
        contentEl.style.color = '#27272a';
        
        // Style HR elements to prevent overlap with text
        const style = document.createElement('style');
        style.textContent = `
          hr {
            border: none;
            border-top: 1px solid #e4e4e7;
            margin: 16px 0;
            height: 0;
          }
          h2, h3 {
            margin-top: 16px;
            margin-bottom: 8px;
          }
          p {
            margin-bottom: 8px;
          }
          ul, ol {
            margin-bottom: 8px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 4px;
          }
        `;
        tempContainer.appendChild(style);
        tempContainer.appendChild(contentEl);

        // Add signature fields if any
        if (page.signatureFields.length > 0) {
          const sigSection = document.createElement('div');
          sigSection.style.marginTop = '40px';
          sigSection.style.paddingTop = '20px';
          sigSection.style.borderTop = '2px dashed #d4d4d8';
          
          const sigTitle = document.createElement('p');
          sigTitle.textContent = 'SIGNATURES';
          sigTitle.style.fontSize = '10px';
          sigTitle.style.fontWeight = '600';
          sigTitle.style.letterSpacing = '0.1em';
          sigTitle.style.color = '#a1a1aa';
          sigTitle.style.marginBottom = '16px';
          sigSection.appendChild(sigTitle);

          const sigGrid = document.createElement('div');
          sigGrid.style.display = 'grid';
          sigGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
          sigGrid.style.gap = '20px';

          page.signatureFields.forEach((field) => {
            const sigBox = document.createElement('div');
            sigBox.style.border = '1px dashed #d4d4d8';
            sigBox.style.borderRadius = '8px';
            sigBox.style.padding = '16px';
            sigBox.style.backgroundColor = '#fafafa';
            
            const sigLabel = document.createElement('p');
            sigLabel.textContent = field.label;
            sigLabel.style.fontSize = '14px';
            sigLabel.style.fontWeight = '500';
            sigLabel.style.color = '#3f3f46';
            sigLabel.style.marginBottom = '24px';
            sigBox.appendChild(sigLabel);
            
            const sigLine = document.createElement('div');
            sigLine.style.borderBottom = '1px solid #27272a';
            sigLine.style.marginBottom = '4px';
            sigBox.appendChild(sigLine);
            
            sigGrid.appendChild(sigBox);
          });

          sigSection.appendChild(sigGrid);
          tempContainer.appendChild(sigSection);
        }

        document.body.appendChild(tempContainer);

        // Convert to canvas
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        document.body.removeChild(tempContainer);

        // Add to PDF
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // If content is taller than page, scale it down
        const maxHeight = pageHeight - (margin * 2);
        const finalHeight = Math.min(imgHeight, maxHeight);
        const finalWidth = imgHeight > maxHeight ? (imgWidth * maxHeight) / imgHeight : imgWidth;

        pdf.addImage(imgData, 'PNG', margin, margin, finalWidth, finalHeight);
      }

      // Download the PDF
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSend = async () => {
    // Combine all page content for validation
    const allContent = pages.map((p) => p.content).join('');
    if (!allContent.trim()) {
      setError('Please add content to the agreement');
      return;
    }

    // Check if there's at least one signature field
    const totalSignatures = pages.reduce((sum, p) => sum + p.signatureFields.length, 0);
    if (totalSignatures === 0) {
      setError('Please add at least one signature field');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSend({
        title,
        description: allContent.substring(0, 200) + '...',
        price,
        markdownContent: allContent,
        pages,
        todos: [],
      });
      handleClose();
    } catch (err) {
      console.error('Failed to send agreement:', err);
      setError('Failed to send agreement. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleInsertContent = (content: string) => {
    updateCurrentPageContent(currentPage.content + '\n\n' + content);
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

        {/* Content */}
        {state === 'upload' ? (
          <UploadCard
            onFileSelect={handleFileSelect}
            onSkipUpload={handleSkipUpload}
            isProcessing={isProcessing}
          />
        ) : (
          <>
            {/* Action buttons - top right (matching strategy-sheet) */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExporting || !pages.some((p) => p.content.trim())}
                className="flex cursor-pointer items-center z-50 gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50"
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
                disabled={isSending || !pages.some((p) => p.content.trim())}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <SpinnerGap className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>

            {/* Two-Column Layout (matching strategy-sheet exactly) */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column - Document Editor */}
              <div className="relative flex flex-1 flex-col overflow-hidden">
                {/* Page Content Area */}
                <div className="flex-1 overflow-auto pt-24 pb-[200px] pr-48 pl-64">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-2xl font-semibold bg-transparent border-none outline-none focus:outline-none placeholder:text-zinc-400"
                    placeholder="Enter document title..."
                  />
                  
                  {/* Page indicator */}
                  <p className="mt-1 text-xs text-zinc-400">
                    Page {currentPageIndex + 1} of {pages.length}
                  </p>
                  
                  {/* Editor for current page */}
                  <MarkdownEditor
                    key={currentPage.id}
                    content={currentPage.content}
                    onChange={updateCurrentPageContent}
                  />
                  
                  {/* Signature Area (immutable footer) */}
                  <SignatureArea
                    signatureFields={currentPage.signatureFields}
                    onAddField={addSignatureField}
                    onRemoveField={removeSignatureField}
                  />
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
                <AiAssistant clientName={clientName} onInsertContent={handleInsertContent} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
