'use client';

import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface SideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================================================
// SIDE SHEET COMPONENT
// ============================================================================

export function SideSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'md',
}: SideSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

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
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[480px]',
    xl: 'w-[600px]',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Side Sheet Container */}
      <div
        className={cn(
          'relative ml-auto flex h-full flex-col bg-deep-navy shadow-2xl transition-transform duration-200 ease-linear',
          widthClasses[width],
          isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center border-b border-white/8 px-2 py-2">
            <button
              onClick={handleClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-steel-gray duration-150 ease-linear transition-colors hover:bg-white/8 hover:text-soft-white"
            >
              <X weight="bold" className="h-4 w-4" />
            </button>
            <div className="h-5 mr-2 w-px bg-white/10" />
            <div className='flex gap-2 items-center'>
              {title && <h2 className="font-semibold bg-white/8 px-2 py-1 rounded-sm text-sm text-steel-gray">{title}</h2>}
              {subtitle && <p className="text-sm font-semibold text-steel-gray">{subtitle}</p>}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
