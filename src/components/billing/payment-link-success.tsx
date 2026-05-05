import { Check, Copy } from '@phosphor-icons/react';

interface PaymentLinkSuccessProps {
  link: string;
  onCopy: () => void;
  onClose: () => void;
  copySuccess: boolean;
}

export function PaymentLinkSuccess({ link, onCopy, onClose, copySuccess }: PaymentLinkSuccessProps) {
  return (
    <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium text-emerald-400">
            Payment link created successfully!
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 rounded border border-white/10 bg-graphite px-3 py-2 text-xs text-soft-white"
            />
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 rounded-lg bg-electric-blue px-3 py-2 text-xs font-medium text-soft-white duration-150 ease-linear transition-colors hover:bg-electric-blue/80"
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
          className="ml-3 rounded p-1 text-steel-gray hover:bg-white/8 hover:text-soft-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
