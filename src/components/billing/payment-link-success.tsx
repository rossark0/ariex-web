import { Check, Copy } from '@phosphor-icons/react';

interface PaymentLinkSuccessProps {
  link: string;
  onCopy: () => void;
  onClose: () => void;
  copySuccess: boolean;
}

export function PaymentLinkSuccess({ link, onCopy, onClose, copySuccess }: PaymentLinkSuccessProps) {
  return (
    <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium text-emerald-800">
            Payment link created successfully!
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 rounded border border-emerald-300 bg-white px-3 py-2 text-xs text-emerald-900"
            />
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {copySuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" weight="bold" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" weight="bold" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-3 rounded p-1 text-emerald-600 hover:bg-emerald-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
