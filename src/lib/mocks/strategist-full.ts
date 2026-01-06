/**
 * Full Strategist Mock Data
 *
 * STRATEGIST POV - What a strategist does:
 * - Create and manage client accounts
 * - Pick documents for signing and set payment links
 * - Check and download client documents
 * - Talk with AI Chatbot (for strategy planning)
 * - Send documents to be signed
 * - Sign Documents (on behalf of Ariex)
 * - Set to-do lists for clients (one-sided communication)
 */

import type { User } from '@/types/user';
import type { Document, SignatureStatus } from '@/types/document';
import {
  FullClientMock,
  ChatConversation,
  ChatMessage,
  ClientTodo,
  Payment,
  OnboardingTask,
  fullClientMocks,
} from './client-full';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StrategistProfile {
  id: string;
  userId: string;
  title: string;
  specializations: string[];
  certifications: string[];
  yearsOfExperience: number;
  maxClients: number;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ActionType =
  | 'client_created'
  | 'document_sent_for_signature'
  | 'document_signed'
  | 'payment_link_sent'
  | 'payment_received'
  | 'todo_assigned'
  | 'todo_completed'
  | 'message_sent'
  | 'strategy_generated'
  | 'document_uploaded';

export interface ActivityLogEntry {
  id: string;
  strategistId: string;
  clientId: string;
  clientName: string;
  actionType: ActionType;
  description: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export type SignatureRequestStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';

export interface SignatureRequest {
  id: string;
  strategistId: string;
  clientId: string;
  clientName: string;
  documentId: string;
  documentName: string;
  status: SignatureRequestStatus;
  envelopeId: string | null;
  signerEmail: string;
  sentAt: Date | null;
  viewedAt: Date | null;
  signedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentLink {
  id: string;
  strategistId: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: string;
  description: string;
  invoiceNumber: string;
  paymentUrl: string;
  status: 'draft' | 'sent' | 'paid' | 'expired' | 'cancelled';
  paymentMethod: 'stripe' | 'coinbase' | 'both';
  dueDate: Date | null;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategistAiConversation {
  id: string;
  strategistId: string;
  clientId: string | null; // null = general AI chat, string = client-specific context
  clientName: string | null;
  topic: string;
  messages: ChatMessage[];
  lastMessageAt: Date;
  createdAt: Date;
}

export interface ClientSummary {
  clientId: string;
  clientName: string;
  clientEmail: string;
  businessName: string | null;
  isOnboardingComplete: boolean;
  onboardingProgress: { completed: number; total: number };
  pendingSignatures: number;
  pendingPayments: number;
  activeTodos: number;
  lastActivity: Date;
  estimatedIncome: number | null;
  totalRevenue: number;
}

export interface FullStrategistMock {
  // Core strategist data
  user: User;
  profile: StrategistProfile;

  // Assigned clients (references to FullClientMock)
  clientIds: string[];

  // Activity feed
  activityLog: ActivityLogEntry[];

  // Signature management
  signatureRequests: SignatureRequest[];

  // Payment link management
  paymentLinks: PaymentLink[];

  // AI chatbot conversations (strategist's own)
  aiConversations: StrategistAiConversation[];

  // Dashboard metrics
  metrics: {
    totalClients: number;
    activeClients: number;
    pendingOnboarding: number;
    documentsAwaitingSignature: number;
    pendingPayments: number;
    totalRevenueThisMonth: number;
    totalRevenueAllTime: number;
  };
}

// ============================================================================
// TIMESTAMP HELPERS
// ============================================================================

const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

// ============================================================================
// MOCK DATA: PRIMARY STRATEGIST (Alex Morgan)
// ============================================================================

const primaryStrategist: FullStrategistMock = {
  user: {
    id: 'strategist-001',
    email: 'alex.morgan@ariex.com',
    name: 'Alex Morgan',
    role: 'STRATEGIST',
    createdAt: twoMonthsAgo,
    updatedAt: now,
  },
  profile: {
    id: 'strat-profile-001',
    userId: 'strategist-001',
    title: 'Senior Tax Strategist',
    specializations: ['Small Business', 'S-Corp Election', 'Real Estate', 'Self-Employment'],
    certifications: ['CPA', 'EA (Enrolled Agent)', 'CFP'],
    yearsOfExperience: 8,
    maxClients: 50,
    bio: 'Specializing in tax optimization strategies for small business owners and self-employed professionals. Passionate about helping clients maximize their tax savings through smart entity structuring and proactive planning.',
    avatarUrl: null,
    createdAt: twoMonthsAgo,
    updatedAt: oneMonthAgo,
  },

  clientIds: ['client-001', 'client-002', 'client-005'],

  activityLog: [
    {
      id: 'activity-001',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'message_sent',
      description: 'Sent message regarding bank statement review',
      metadata: { conversationId: 'conv-101' },
      createdAt: oneHourAgo,
    },
    {
      id: 'activity-002',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'todo_assigned',
      description: 'Assigned task: Set up Quarterly Payment Reminder',
      metadata: { todoId: 'todo-105', priority: 'urgent' },
      createdAt: oneDayAgo,
    },
    {
      id: 'activity-003',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'document_sent_for_signature',
      description: 'Sent Tax Strategy Plan 2024 for signature',
      metadata: { documentId: 'doc-strategy-101', envelopeId: 'env-102' },
      createdAt: oneWeekAgo,
    },
    {
      id: 'activity-004',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'payment_link_sent',
      description: 'Sent invoice for Q4 2024 Tax Planning Services ($1,250)',
      metadata: { paymentId: 'pay-102', amount: 1250 },
      createdAt: oneWeekAgo,
    },
    {
      id: 'activity-005',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'document_uploaded',
      description: 'Client uploaded Chase Business Statement Nov 2024',
      metadata: { documentId: 'doc-bank-101', category: 'bank_statement' },
      createdAt: twoDaysAgo,
    },
    {
      id: 'activity-006',
      strategistId: 'strategist-001',
      clientId: 'client-002',
      clientName: 'Sarah Johnson',
      actionType: 'message_sent',
      description: 'Sent welcome message and onboarding reminder',
      metadata: { conversationId: 'conv-201' },
      createdAt: twoDaysAgo,
    },
    {
      id: 'activity-007',
      strategistId: 'strategist-001',
      clientId: 'client-002',
      clientName: 'Sarah Johnson',
      actionType: 'todo_assigned',
      description: 'Assigned task: Upload Remaining Tax Documents',
      metadata: { todoId: 'todo-201', priority: 'high' },
      createdAt: twoDaysAgo,
    },
    {
      id: 'activity-008',
      strategistId: 'strategist-001',
      clientId: 'client-005',
      clientName: 'Robert Wilson',
      actionType: 'client_created',
      description: 'Created new client account for Robert Wilson',
      metadata: { businessName: 'Wilson Real Estate Group' },
      createdAt: oneDayAgo,
    },
    {
      id: 'activity-009',
      strategistId: 'strategist-001',
      clientId: 'client-005',
      clientName: 'Robert Wilson',
      actionType: 'document_sent_for_signature',
      description: 'Sent Ariex Service Agreement for signature',
      metadata: { documentId: 'doc-agreement-001', envelopeId: 'env-001' },
      createdAt: oneDayAgo,
    },
    {
      id: 'activity-010',
      strategistId: 'strategist-001',
      clientId: 'client-005',
      clientName: 'Robert Wilson',
      actionType: 'payment_link_sent',
      description: 'Sent onboarding payment link ($499)',
      metadata: { paymentId: 'pay-001', amount: 499 },
      createdAt: oneDayAgo,
    },
    {
      id: 'activity-011',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'strategy_generated',
      description: 'Generated AI-powered tax strategy document',
      metadata: { estimatedSavings: 18500, strategies: 3 },
      createdAt: oneWeekAgo,
    },
    {
      id: 'activity-012',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      actionType: 'payment_received',
      description: 'Payment received for Q3 2024 Tax Advisory ($850)',
      metadata: { paymentId: 'pay-103', amount: 850 },
      createdAt: twoWeeksAgo,
    },
  ],

  signatureRequests: [
    // Pending signature from John Smith
    {
      id: 'sig-req-001',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      documentId: 'doc-strategy-101',
      documentName: 'Tax Strategy Plan 2024 - John Smith',
      status: 'sent',
      envelopeId: 'env-102',
      signerEmail: 'john.smith@email.com',
      sentAt: oneWeekAgo,
      viewedAt: threeDaysAgo,
      signedAt: null,
      expiresAt: inTwoWeeks,
      createdAt: oneWeekAgo,
      updatedAt: threeDaysAgo,
    },
    // Pending signature from Robert Wilson (new client onboarding)
    {
      id: 'sig-req-002',
      strategistId: 'strategist-001',
      clientId: 'client-005',
      clientName: 'Robert Wilson',
      documentId: 'doc-agreement-001',
      documentName: 'Ariex Service Agreement 2024',
      status: 'sent',
      envelopeId: 'env-001',
      signerEmail: 'robert.wilson@email.com',
      sentAt: oneDayAgo,
      viewedAt: null,
      signedAt: null,
      expiresAt: inTwoWeeks,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
    // Completed signature from Sarah Johnson
    {
      id: 'sig-req-003',
      strategistId: 'strategist-001',
      clientId: 'client-002',
      clientName: 'Sarah Johnson',
      documentId: 'doc-agreement-201',
      documentName: 'Ariex Service Agreement 2024',
      status: 'signed',
      envelopeId: 'env-201',
      signerEmail: 'sarah.johnson@email.com',
      sentAt: oneWeekAgo,
      viewedAt: oneWeekAgo,
      signedAt: oneWeekAgo,
      expiresAt: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    // Completed signature from John Smith (previous agreement)
    {
      id: 'sig-req-004',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      documentId: 'doc-agreement-101',
      documentName: 'Ariex Service Agreement 2024',
      status: 'signed',
      envelopeId: 'env-101',
      signerEmail: 'john.smith@email.com',
      sentAt: oneMonthAgo,
      viewedAt: oneMonthAgo,
      signedAt: oneMonthAgo,
      expiresAt: null,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
  ],

  paymentLinks: [
    // Pending payment from John Smith
    {
      id: 'paylink-001',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      amount: 1250.0,
      currency: 'USD',
      description: 'Q4 2024 Tax Planning Services',
      invoiceNumber: 'INV-2024-0042',
      paymentUrl: 'https://pay.ariex.com/invoice/pay-102',
      status: 'sent',
      paymentMethod: 'both',
      dueDate: inTwoWeeks,
      sentAt: oneWeekAgo,
      paidAt: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    // Pending onboarding payment from Robert Wilson
    {
      id: 'paylink-002',
      strategistId: 'strategist-001',
      clientId: 'client-005',
      clientName: 'Robert Wilson',
      amount: 499.0,
      currency: 'USD',
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0005',
      paymentUrl: 'https://pay.ariex.com/onboarding/client-005',
      status: 'sent',
      paymentMethod: 'stripe',
      dueDate: inOneWeek,
      sentAt: oneDayAgo,
      paidAt: null,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
    // Completed payment from John Smith
    {
      id: 'paylink-003',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      amount: 850.0,
      currency: 'USD',
      description: 'Q3 2024 Tax Advisory',
      invoiceNumber: 'INV-2024-0028',
      paymentUrl: 'https://pay.ariex.com/invoice/pay-103',
      status: 'paid',
      paymentMethod: 'coinbase',
      dueDate: null,
      sentAt: oneMonthAgo,
      paidAt: twoWeeksAgo,
      createdAt: oneMonthAgo,
      updatedAt: twoWeeksAgo,
    },
    // Completed onboarding from John Smith
    {
      id: 'paylink-004',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      amount: 499.0,
      currency: 'USD',
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0001',
      paymentUrl: 'https://pay.ariex.com/onboarding/client-001',
      status: 'paid',
      paymentMethod: 'stripe',
      dueDate: null,
      sentAt: oneMonthAgo,
      paidAt: oneMonthAgo,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
    // Completed onboarding from Sarah Johnson
    {
      id: 'paylink-005',
      strategistId: 'strategist-001',
      clientId: 'client-002',
      clientName: 'Sarah Johnson',
      amount: 499.0,
      currency: 'USD',
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0015',
      paymentUrl: 'https://pay.ariex.com/onboarding/client-002',
      status: 'paid',
      paymentMethod: 'stripe',
      dueDate: null,
      sentAt: oneWeekAgo,
      paidAt: oneWeekAgo,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ],

  aiConversations: [
    // General AI chat for strategist
    {
      id: 'ai-conv-001',
      strategistId: 'strategist-001',
      clientId: null,
      clientName: null,
      topic: 'Tax Law Updates 2024',
      lastMessageAt: thirtyMinutesAgo,
      createdAt: oneDayAgo,
      messages: [
        {
          id: 'ai-msg-001',
          conversationId: 'ai-conv-001',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'What are the key tax law changes for 2024 that I should discuss with my clients?',
          read: true,
          createdAt: oneDayAgo,
        },
        {
          id: 'ai-msg-002',
          conversationId: 'ai-conv-001',
          senderId: 'ai',
          senderType: 'ai',
          content: `Here are the key 2024 tax changes to discuss with clients:

**Income Tax Brackets**
- All brackets adjusted for inflation (~5.4% increase)
- Top rate remains 37% for income over $609,350 (MFJ)

**Standard Deduction**
- Single: $14,600 (up $750)
- MFJ: $29,200 (up $1,500)

**Retirement Contributions**
- 401(k): $23,000 limit (up $500)
- IRA: $7,000 (up $500)
- Catch-up (50+): Additional $7,500 for 401(k)

**Self-Employment**
- SE tax wage base: $168,600
- QBI deduction still available (20% of qualified income)

**Business Provisions**
- Bonus depreciation: 60% (down from 80%)
- Section 179: $1,220,000 limit

Would you like me to elaborate on any of these for specific client situations?`,
          read: true,
          createdAt: oneDayAgo,
        },
        {
          id: 'ai-msg-003',
          conversationId: 'ai-conv-001',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Yes, tell me more about the bonus depreciation phase-out and how it affects my real estate investor clients.',
          read: true,
          createdAt: thirtyMinutesAgo,
        },
        {
          id: 'ai-msg-004',
          conversationId: 'ai-conv-001',
          senderId: 'ai',
          senderType: 'ai',
          content: `**Bonus Depreciation Phase-Out Impact on Real Estate Investors**

The TCJA bonus depreciation is phasing out:
- 2023: 80%
- **2024: 60%**
- 2025: 40%
- 2026: 20%
- 2027: 0%

**Key Implications for Your Clients:**

1. **Cost Segregation Studies** - Now more critical than ever
   - Front-load personal property identification
   - Maximize what qualifies for remaining bonus %
   
2. **Timing Acquisitions**
   - Properties placed in service in 2024 get 60%
   - Consider accelerating purchases before year-end
   
3. **Alternative Strategies**
   - Section 179 ($1.22M limit) still available
   - Can combine with reduced bonus depreciation
   - Consider qualified improvement property (QIP)

4. **Planning for 2025+**
   - Build cash reserves for reduced deductions
   - Model multi-year tax projections

For clients like Robert Wilson (real estate group), I'd recommend discussing cost segregation on any 2024 acquisitions immediately.`,
          read: true,
          createdAt: thirtyMinutesAgo,
        },
      ],
    },
    // Client-specific AI chat (John Smith context)
    {
      id: 'ai-conv-002',
      strategistId: 'strategist-001',
      clientId: 'client-001',
      clientName: 'John Smith',
      topic: 'S-Corp Election Strategy',
      lastMessageAt: threeDaysAgo,
      createdAt: oneWeekAgo,
      messages: [
        {
          id: 'ai-msg-101',
          conversationId: 'ai-conv-002',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'For John Smith with $185k income from his LLC consulting business, what\'s the optimal S-Corp salary split?',
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'ai-msg-102',
          conversationId: 'ai-conv-002',
          senderId: 'ai',
          senderType: 'ai',
          content: `**S-Corp Salary Analysis for John Smith**

Based on the profile:
- Total income: $185,000
- Business: Smith Consulting LLC
- Structure: Considering S-Corp election

**Recommended Salary Range: $85,000 - $95,000**

Analysis:

| Salary | Distribution | SE Tax Saved | Risk Level |
|--------|-------------|--------------|------------|
| $75,000 | $110,000 | ~$16,830 | Higher audit risk |
| $85,000 | $100,000 | ~$15,300 | Moderate |
| **$90,000** | **$95,000** | **$14,535** | **Optimal** |
| $95,000 | $90,000 | $13,770 | Conservative |

**Recommendation: $90,000 salary**
- Passes "reasonable compensation" test
- Provides $14,535 in SE tax savings
- Aligns with consulting industry benchmarks
- Leaves $95,000 as distributions (no payroll tax)

**Additional Considerations:**
- Factor in retirement contributions (401k at $23,000)
- Health insurance premiums (can be above-the-line deduction)
- State unemployment insurance implications

Shall I generate the formal strategy document with these numbers?`,
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'ai-msg-103',
          conversationId: 'ai-conv-002',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Yes, generate the strategy document. Also include HSA and 401k maximization.',
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'ai-msg-104',
          conversationId: 'ai-conv-002',
          senderId: 'ai',
          senderType: 'ai',
          content: `✅ **Strategy Document Generated**

I've created a comprehensive tax strategy for John Smith including:

**1. S-Corp Election**
- Recommended salary: $90,000
- Distribution: $95,000
- Estimated savings: $14,535/year

**2. Retirement Optimization**
- Solo 401(k) employer contribution: $22,500 (25% of salary)
- Employee deferral: $23,000
- Total retirement: $45,500
- Tax savings: ~$12,285 (27% bracket)

**3. HSA Maximization**
- Family contribution: $8,300
- Tax savings: ~$2,241

**4. Quarterly Estimated Payments**
- Q1-Q4 schedule included
- Safe harbor calculations

**Total Estimated Annual Savings: $18,500+**

The document has been prepared and is ready for:
1. Your review and edits
2. Client signature 
3. PDF export for records

Would you like me to send this to John for signature?`,
          read: true,
          createdAt: threeDaysAgo,
        },
      ],
    },
    // Client-specific AI chat (Sarah Johnson context)
    {
      id: 'ai-conv-003',
      strategistId: 'strategist-001',
      clientId: 'client-002',
      clientName: 'Sarah Johnson',
      topic: 'Freelancer Tax Deductions',
      lastMessageAt: twoDaysAgo,
      createdAt: twoDaysAgo,
      messages: [
        {
          id: 'ai-msg-201',
          conversationId: 'ai-conv-003',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Sarah is a freelance designer with $142k income. What deductions should I be looking for in her documents?',
          read: true,
          createdAt: twoDaysAgo,
        },
        {
          id: 'ai-msg-202',
          conversationId: 'ai-conv-003',
          senderId: 'ai',
          senderType: 'ai',
          content: `**Common Deductions for Freelance Designers ($142k income)**

**Equipment & Software**
- Computer/laptop (Section 179)
- Adobe Creative Cloud ($660/year)
- Design software licenses
- Drawing tablets, monitors
- Camera equipment (if applicable)

**Home Office**
- Simplified: $5/sq ft, max $1,500
- Actual: % of rent/mortgage, utilities, internet

**Professional Development**
- Online courses (Skillshare, etc.)
- Industry conferences
- Books and publications

**Business Operations**
- Website hosting
- Portfolio platforms
- Stock photos/assets
- Client management software

**Marketing**
- Business cards
- Portfolio printing
- Advertising costs

**Other**
- Health insurance (100% above-the-line)
- Retirement contributions
- Professional memberships (AIGA, etc.)

**Based on Sarah's income level, also consider:**
- QBI deduction (up to $28,400 potential savings)
- S-Corp election if consistent income

Once she uploads her documents, I can identify specific deductions from her expenses.`,
          read: true,
          createdAt: twoDaysAgo,
        },
      ],
    },
  ],

  metrics: {
    totalClients: 3,
    activeClients: 1,
    pendingOnboarding: 2,
    documentsAwaitingSignature: 2,
    pendingPayments: 2,
    totalRevenueThisMonth: 0,
    totalRevenueAllTime: 2697, // 499 + 499 + 850 + 849 (partial)
  },
};

// ============================================================================
// MOCK DATA: SECONDARY STRATEGIST (Jordan Lee)
// ============================================================================

const secondaryStrategist: FullStrategistMock = {
  user: {
    id: 'strategist-002',
    email: 'jordan.lee@ariex.com',
    name: 'Jordan Lee',
    role: 'STRATEGIST',
    createdAt: oneMonthAgo,
    updatedAt: now,
  },
  profile: {
    id: 'strat-profile-002',
    userId: 'strategist-002',
    title: 'Tax Strategist',
    specializations: ['Cryptocurrency', 'Stock Options', 'Tech Industry'],
    certifications: ['CPA', 'CFP'],
    yearsOfExperience: 5,
    maxClients: 35,
    bio: 'Focused on tax planning for tech professionals, with expertise in RSUs, ISOs, and cryptocurrency taxation.',
    avatarUrl: null,
    createdAt: oneMonthAgo,
    updatedAt: oneMonthAgo,
  },

  clientIds: [],

  activityLog: [],

  signatureRequests: [],

  paymentLinks: [],

  aiConversations: [],

  metrics: {
    totalClients: 0,
    activeClients: 0,
    pendingOnboarding: 0,
    documentsAwaitingSignature: 0,
    pendingPayments: 0,
    totalRevenueThisMonth: 0,
    totalRevenueAllTime: 0,
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const fullStrategistMocks: FullStrategistMock[] = [
  primaryStrategist,
  secondaryStrategist,
];

/**
 * Get a strategist by ID
 */
export function getStrategistById(strategistId: string): FullStrategistMock | undefined {
  return fullStrategistMocks.find(s => s.user.id === strategistId);
}

/**
 * Get all strategists
 */
export function getAllStrategists(): FullStrategistMock[] {
  return fullStrategistMocks;
}

/**
 * Get client summaries for a strategist's dashboard
 */
export function getClientSummariesForStrategist(strategistId: string): ClientSummary[] {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];

  return strategist.clientIds.map(clientId => {
    const client = fullClientMocks.find(c => c.user.id === clientId);
    if (!client) {
      return {
        clientId,
        clientName: 'Unknown',
        clientEmail: '',
        businessName: null,
        isOnboardingComplete: false,
        onboardingProgress: { completed: 0, total: 0 },
        pendingSignatures: 0,
        pendingPayments: 0,
        activeTodos: 0,
        lastActivity: new Date(),
        estimatedIncome: null,
        totalRevenue: 0,
      };
    }

    const completedTasks = client.onboardingTasks.filter(t => t.status === 'completed').length;
    const pendingSignatures = client.documents.filter(d => d.signatureStatus === 'SENT').length;
    const pendingPayments = client.payments.filter(p => p.status === 'pending').length;
    const activeTodos = client.todos.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const totalRevenue = client.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      clientId: client.user.id,
      clientName: client.user.name || 'Unknown',
      clientEmail: client.user.email,
      businessName: client.profile.businessName,
      isOnboardingComplete: client.isOnboardingComplete,
      onboardingProgress: {
        completed: completedTasks,
        total: client.onboardingTasks.length,
      },
      pendingSignatures,
      pendingPayments,
      activeTodos,
      lastActivity: client.user.updatedAt,
      estimatedIncome: client.profile.estimatedIncome,
      totalRevenue,
    };
  });
}

/**
 * Get pending signature requests for a strategist
 */
export function getPendingSignatureRequests(strategistId: string): SignatureRequest[] {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];
  return strategist.signatureRequests.filter(
    sr => sr.status === 'sent' || sr.status === 'viewed'
  );
}

/**
 * Get pending payment links for a strategist
 */
export function getPendingPaymentLinks(strategistId: string): PaymentLink[] {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];
  return strategist.paymentLinks.filter(pl => pl.status === 'sent');
}

/**
 * Get recent activity for a strategist
 */
export function getRecentActivity(strategistId: string, limit: number = 10): ActivityLogEntry[] {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];
  return strategist.activityLog
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Get all AI conversations for a strategist
 */
export function getStrategistAiConversations(strategistId: string): StrategistAiConversation[] {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];
  return strategist.aiConversations;
}

/**
 * Get AI conversation for a specific client context
 */
export function getClientContextAiConversation(
  strategistId: string,
  clientId: string
): StrategistAiConversation | undefined {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return undefined;
  return strategist.aiConversations.find(c => c.clientId === clientId);
}

/**
 * Get documents for all clients of a strategist
 */
export function getAllClientDocuments(strategistId: string): Array<Document & { clientName: string; clientId: string }> {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];

  const documents: Array<Document & { clientName: string; clientId: string }> = [];

  strategist.clientIds.forEach(clientId => {
    const client = fullClientMocks.find(c => c.user.id === clientId);
    if (client) {
      client.documents.forEach(doc => {
        documents.push({
          ...doc,
          clientId: client.user.id,
          clientName: client.user.name || 'Unknown',
        });
      });
    }
  });

  return documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all todos assigned by a strategist
 */
export function getAllAssignedTodos(strategistId: string): Array<ClientTodo & { clientName: string }> {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return [];

  const todos: Array<ClientTodo & { clientName: string }> = [];

  strategist.clientIds.forEach(clientId => {
    const client = fullClientMocks.find(c => c.user.id === clientId);
    if (client) {
      client.todos.forEach(todo => {
        if (todo.assignedBy === strategistId) {
          todos.push({
            ...todo,
            clientName: client.user.name || 'Unknown',
          });
        }
      });
    }
  });

  return todos.sort((a, b) => {
    // Sort by status (in_progress first, then pending, then completed)
    const statusOrder = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    // Then by due date (earliest first, null at end)
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

/**
 * Strategist dashboard summary
 */
export function getStrategistDashboardSummary(strategistId: string) {
  const strategist = getStrategistById(strategistId);
  if (!strategist) return null;

  const clientSummaries = getClientSummariesForStrategist(strategistId);
  const pendingSignatures = getPendingSignatureRequests(strategistId);
  const pendingPayments = getPendingPaymentLinks(strategistId);
  const recentActivity = getRecentActivity(strategistId, 5);

  return {
    strategist: {
      user: strategist.user,
      profile: strategist.profile,
    },
    metrics: strategist.metrics,
    clientSummaries,
    pendingSignatures,
    pendingPayments,
    recentActivity,
    aiConversationCount: strategist.aiConversations.length,
  };
}

/**
 * Actions available to strategist (for UI rendering)
 */
export const strategistActions = {
  clientManagement: [
    { id: 'create_client', label: 'Create New Client', icon: 'UserPlus' },
    { id: 'view_clients', label: 'View All Clients', icon: 'Users' },
    { id: 'client_onboarding', label: 'Manage Onboarding', icon: 'ClipboardList' },
  ],
  documentManagement: [
    { id: 'view_documents', label: 'View Client Documents', icon: 'FileText' },
    { id: 'download_documents', label: 'Download Documents', icon: 'Download' },
    { id: 'send_for_signature', label: 'Send for Signature', icon: 'PenLine' },
  ],
  paymentManagement: [
    { id: 'create_payment_link', label: 'Create Payment Link', icon: 'CreditCard' },
    { id: 'view_payments', label: 'View Payments', icon: 'DollarSign' },
    { id: 'send_invoice', label: 'Send Invoice', icon: 'Send' },
  ],
  communication: [
    { id: 'chat_with_ai', label: 'AI Strategy Assistant', icon: 'Bot' },
    { id: 'message_client', label: 'Message Client', icon: 'MessageSquare' },
    { id: 'assign_todo', label: 'Assign To-Do', icon: 'CheckSquare' },
  ],
  strategy: [
    { id: 'generate_strategy', label: 'Generate Tax Strategy', icon: 'Sparkles' },
    { id: 'export_pdf', label: 'Export Strategy PDF', icon: 'FileOutput' },
  ],
} as const;


