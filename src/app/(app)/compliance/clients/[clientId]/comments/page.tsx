'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, PaperPlaneRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface Props {
  params: { clientId: string };
}

// Mock comments data
const mockComments = [
  {
    id: '1',
    author: 'Jordan Chen (Compliance)',
    role: 'COMPLIANCE',
    message: 'Please review the Q4 estimated tax calculations for this client.',
    timestamp: new Date('2026-01-05T10:30:00'),
  },
  {
    id: '2',
    author: 'Alex Morgan (Strategist)',
    role: 'STRATEGIST',
    message: 'Reviewed. All calculations are correct and align with IRS guidelines.',
    timestamp: new Date('2026-01-05T14:20:00'),
  },
  {
    id: '3',
    author: 'Jordan Chen (Compliance)',
    role: 'COMPLIANCE',
    message: 'Great, approved. Please proceed with sending to client.',
    timestamp: new Date('2026-01-05T15:10:00'),
  },
];

export default function ComplianceClientCommentsPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const [newComment, setNewComment] = useState('');

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    // In real app, send to API
    console.log('Sending comment:', newComment);
    setNewComment('');
  };

  return (
    <section className="flex flex-col gap-6 p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Client
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Internal Comments</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Private communication between Compliance and Strategist
        </p>
      </div>

      {/* Comments Thread */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
            <span className="text-sm font-medium text-zinc-700">
              Only visible to Compliance & Strategist
            </span>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 p-6">
          {mockComments.map(comment => (
            <div key={comment.id} className="py-4 first:pt-0 last:pb-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold text-zinc-900">{comment.author}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    comment.role === 'COMPLIANCE'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {comment.role}
                </span>
                <span className="text-sm text-zinc-500">
                  {comment.timestamp.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-zinc-700">{comment.message}</p>
            </div>
          ))}
        </div>

        {/* Comment Input */}
        <div className="border-t border-zinc-200 p-4">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 resize-none rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={3}
            />
            <Button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="self-end bg-emerald-600 hover:bg-emerald-700"
            >
              <PaperPlaneRight className="h-4 w-4" weight="fill" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
