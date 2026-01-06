/**
 * Full Client Mock Data
 * 
 * Covers both Client POV and Strategist POV with complete data relationships.
 * 
 * ============================================================================
 * CLIENT STATUS FLOW
 * ============================================================================
 * 
 * Status is by two factors:
 * 1. isOnboardingComplete - Has the client finished all onboarding tasks?
 * 2. Strategy Document - Is there a signed strategy document?
 * 
 * STATUS DEFINITIONS:
 * 
 * ┌─────────────────┬─────────────────────────────────────────────────────────┐
 * │ Status          │ Condition                                               │
 * ├─────────────────┼─────────────────────────────────────────────────────────┤
 * │ ONBOARDING      │ isOnboardingComplete = false                            │
 * │ (amber)         │ Client hasn't completed: sign agreement, pay, upload    │
 * ├─────────────────┼─────────────────────────────────────────────────────────┤
 * │ NO PLAN         │ isOnboardingComplete = true                             │
 * │ (gray)          │ No strategy document exists yet                         │
 * ├─────────────────┼─────────────────────────────────────────────────────────┤
 * │ PLAN PENDING    │ isOnboardingComplete = true                             │
 * │ (teal)          │ Strategy document sent for signature (signatureStatus   │
 * │                 │ = 'SENT')                                               │
 * ├─────────────────┼─────────────────────────────────────────────────────────┤
 * │ PLAN ACTIVE     │ isOnboardingComplete = true                             │
 * │ (emerald)       │ Strategy document signed (signatureStatus = 'SIGNED')   │
 * └─────────────────┴─────────────────────────────────────────────────────────┘
 * 
 * ONBOARDING TASKS (3 steps):
 * 1. sign_agreement - Client signs the Ariex Service Agreement
 * 2. pay_initial    - Client pays the onboarding fee
 * 3. upload_documents - Client uploads W-2s, 1099s, etc.
 * 
 * CLIENT POV:
 * - Onboarding: Sign Agreement, Pay link, Upload initial documents
 * - Post-onboarding: Re-upload documents, Talk to strategist, AI chatbot, Pay invoices
 * 
 * STRATEGIST POV:
 * - Create/manage client accounts
 * - Pick documents for signing & set payment links
 * - Review/download/send client documents
 * - Chat with AI chatbot
 * - Send documents for signature
 * - Assign to-do lists to clients
 */

import type { User, ClientProfile } from '@/types/user';
import type { Document, DocumentStatus, SignatureStatus } from '@/types/document';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface OnboardingTask {
  id: string;
  clientId: string;
  type: 'sign_agreement' | 'pay_initial' | 'upload_documents';
  title: string;
  description: string;
  status: OnboardingTaskStatus;
  requiredDocumentType?: string;
  paymentLinkUrl?: string;
  agreementDocumentId?: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentType = 'onboarding' | 'invoice' | 'subscription';

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  paymentMethod: 'stripe' | 'coinbase';
  paymentLinkUrl: string | null;
  description: string;
  invoiceNumber: string | null;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatMessageSender = 'client' | 'strategist' | 'ai';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ChatMessageSender;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface ChatConversation {
  id: string;
  clientId: string;
  strategistId: string;
  type: 'client_strategist' | 'ai_chat';
  lastMessageAt: Date;
  messages: ChatMessage[];
  createdAt: Date;
}

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ClientTodo {
  id: string;
  clientId: string;
  assignedBy: string; // strategistId
  title: string;
  description: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FullClientMock {
  // Core client data
  user: User;
  profile: ClientProfile;
  strategistId: string;

  // Onboarding flow
  onboardingTasks: OnboardingTask[];
  isOnboardingComplete: boolean;

  // Documents (client uploaded + strategist sent for signature)
  documents: Document[];

  // Payments & Billing
  payments: Payment[];

  // Chat conversations
  conversations: ChatConversation[];

  // To-do list (assigned by strategist)
  todos: ClientTodo[];
}

// ============================================================================
// TIMESTAMP HELPERS
// ============================================================================

const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

// ============================================================================
// MOCK DATA: CLIENT IN ONBOARDING (Robert Wilson)
// ============================================================================

const onboardingClient: FullClientMock = {
  user: {
    id: 'client-005',
    email: 'robert.wilson@email.com',
    name: 'Robert Wilson',
    role: 'CLIENT',
    createdAt: oneDayAgo,
    updatedAt: now,
  },
  profile: {
    id: 'profile-005',
    userId: 'client-005',
    phoneNumber: '(555) 567-8901',
    address: '654 Pine Boulevard',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    taxId: null,
    businessName: 'Wilson Real Estate Group',
    onboardingComplete: false,
    filingStatus: null,
    dependents: null,
    estimatedIncome: null,
    businessType: 'Partnership',
    createdAt: oneDayAgo,
    updatedAt: now,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: false,

  onboardingTasks: [
    {
      id: 'onb-task-001',
      clientId: 'client-005',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement to get started.',
      status: 'completed',
      agreementDocumentId: 'doc-agreement-001',
      completedAt: oneDayAgo,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
    {
      id: 'onb-task-002',
      clientId: 'client-005',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee to activate your account.',
      status: 'completed',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-005',
      completedAt: oneDayAgo,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
    {
      id: 'onb-task-003',
      clientId: 'client-005',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload your W-2s, 1099s, and any relevant tax documents from the previous year.',
      status: 'pending',
      requiredDocumentType: 'w2,1099',
      completedAt: null,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
  ],

  documents: [
    {
      id: 'doc-agreement-001',
      userId: 'client-005',
      filename: 'ariex-service-agreement-2024.pdf',
      originalName: 'Ariex Service Agreement 2024.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-agreement-001.pdf',
      fileSize: 245000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-001',
      signedAt: oneDayAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-agreement-001-signed.pdf',
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
  ],

  payments: [
    {
      id: 'pay-001',
      clientId: 'client-005',
      amount: 499.0,
      currency: 'USD',
      status: 'completed',
      type: 'onboarding',
      paymentMethod: 'stripe',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-005',
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0005',
      paidAt: null,
      dueDate: inOneWeek,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
  ],

  conversations: [],

  todos: [],
};

// ============================================================================
// MOCK DATA: NEW CLIENT #2 (David Brown)
// ============================================================================

const newClient2: FullClientMock = {
  user: {
    id: 'client-007',
    email: 'david.brown@email.com',
    name: 'David Brown',
    role: 'CLIENT',
    createdAt: now,
    updatedAt: now,
  },
  profile: {
    id: 'profile-007',
    userId: 'client-007',
    phoneNumber: '(555) 789-0123',
    address: '246 Harbor View',
    city: 'Boston',
    state: 'MA',
    zipCode: '02101',
    taxId: null,
    businessName: 'Brown Financial Advisors',
    onboardingComplete: false,
    filingStatus: null,
    dependents: null,
    estimatedIncome: 265000,
    businessType: 'S-Corp',
    createdAt: now,
    updatedAt: now,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: false,

  onboardingTasks: [
    {
      id: 'onb-task-701',
      clientId: 'client-007',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement to get started.',
      status: 'pending',
      agreementDocumentId: 'doc-agreement-701',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'onb-task-702',
      clientId: 'client-007',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee to activate your account.',
      status: 'pending',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-007',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'onb-task-703',
      clientId: 'client-007',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload your W-2s, 1099s, and any relevant tax documents.',
      status: 'pending',
      requiredDocumentType: 'w2,1099',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ],

  documents: [],
  payments: [],
  conversations: [],
  todos: [],
};

// ============================================================================
// MOCK DATA: NEW CLIENT #3 (Jennifer Taylor)
// ============================================================================

const newClient3: FullClientMock = {
  user: {
    id: 'client-008',
    email: 'jennifer.taylor@email.com',
    name: 'Jennifer Taylor',
    role: 'CLIENT',
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
  },
  profile: {
    id: 'profile-008',
    userId: 'client-008',
    phoneNumber: '(555) 890-1234',
    address: '135 Mountain Road',
    city: 'Phoenix',
    state: 'AZ',
    zipCode: '85001',
    taxId: null,
    businessName: 'Taylor Photography',
    onboardingComplete: false,
    filingStatus: null,
    dependents: null,
    estimatedIncome: 78000,
    businessType: 'Sole Proprietorship',
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: false,

  onboardingTasks: [
    {
      id: 'onb-task-801',
      clientId: 'client-008',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement to get started.',
      status: 'pending',
      agreementDocumentId: 'doc-agreement-801',
      completedAt: null,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    {
      id: 'onb-task-802',
      clientId: 'client-008',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee to activate your account.',
      status: 'pending',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-008',
      completedAt: null,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    {
      id: 'onb-task-803',
      clientId: 'client-008',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload your W-2s, 1099s, and any relevant tax documents.',
      status: 'pending',
      requiredDocumentType: 'w2,1099',
      completedAt: null,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
  ],

  documents: [],
  payments: [],
  conversations: [],
  todos: [],
};

// ============================================================================
// MOCK DATA: NEW CLIENT #4 (Marcus Johnson)
// ============================================================================

const newClient4: FullClientMock = {
  user: {
    id: 'client-009',
    email: 'marcus.johnson@email.com',
    name: 'Marcus Johnson',
    role: 'CLIENT',
    createdAt: now,
    updatedAt: now,
  },
  profile: {
    id: 'profile-009',
    userId: 'client-009',
    phoneNumber: '(555) 234-5678',
    address: '567 Oak Boulevard',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30301',
    taxId: null,
    businessName: 'Johnson Consulting Group',
    onboardingComplete: false,
    filingStatus: null,
    dependents: null,
    estimatedIncome: 195000,
    businessType: 'LLC',
    createdAt: now,
    updatedAt: now,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: false,

  onboardingTasks: [
    {
      id: 'onb-task-901',
      clientId: 'client-009',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement to get started.',
      status: 'pending',
      agreementDocumentId: 'doc-agreement-901',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'onb-task-902',
      clientId: 'client-009',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee to activate your account.',
      status: 'pending',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-009',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'onb-task-903',
      clientId: 'client-009',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload your W-2s, 1099s, and any relevant tax documents.',
      status: 'pending',
      requiredDocumentType: 'w2,1099',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ],

  documents: [],
  payments: [],
  conversations: [],
  todos: [],
};

// ============================================================================
// MOCK DATA: ACTIVE CLIENT (John Smith)
// ============================================================================

const activeClient: FullClientMock = {
  user: {
    id: 'client-001',
    email: 'john.smith@email.com',
    name: 'John Smith',
    role: 'CLIENT',
    createdAt: oneMonthAgo,
    updatedAt: now,
  },
  profile: {
    id: 'profile-001',
    userId: 'client-001',
    phoneNumber: '(555) 123-4567',
    address: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    taxId: '***-**-1234',
    businessName: 'Smith Consulting LLC',
    onboardingComplete: true,
    filingStatus: 'married_joint',
    dependents: 2,
    estimatedIncome: 185000,
    businessType: 'LLC',
    createdAt: oneMonthAgo,
    updatedAt: now,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: true,

  onboardingTasks: [
    {
      id: 'onb-task-101',
      clientId: 'client-001',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement to get started.',
      status: 'completed',
      agreementDocumentId: 'doc-agreement-101',
      completedAt: oneMonthAgo,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
    {
      id: 'onb-task-102',
      clientId: 'client-001',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee to activate your account.',
      status: 'completed',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-001',
      completedAt: oneMonthAgo,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
    {
      id: 'onb-task-103',
      clientId: 'client-001',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload your W-2s, 1099s, and any relevant tax documents from the previous year.',
      status: 'completed',
      requiredDocumentType: 'w2,1099',
      completedAt: oneMonthAgo,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
  ],

  documents: [
    // Signed agreement
    {
      id: 'doc-agreement-101',
      userId: 'client-001',
      filename: 'ariex-service-agreement-signed.pdf',
      originalName: 'Ariex Service Agreement 2024 - Signed.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-agreement-101.pdf',
      fileSize: 312000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-101',
      signedAt: oneMonthAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-agreement-101-signed.pdf',
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
    // Client uploaded W-2
    {
      id: 'doc-w2-101',
      userId: 'client-001',
      filename: 'w2-2023-smith.pdf',
      originalName: 'W-2 2023 - John Smith.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-w2-101.pdf',
      fileSize: 89000,
      mimeType: 'application/pdf',
      category: 'w2',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: 'W-2 form showing annual wages of $142,500 from Tech Corp Inc. Federal tax withheld: $28,500.',
      aiInsights: {
        employer: 'Tech Corp Inc',
        wages: 142500,
        federalWithheld: 28500,
        stateWithheld: 8550,
      },
      extractedData: {
        box1: 142500,
        box2: 28500,
        box17: 8550,
        employerEin: '12-3456789',
      },
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: oneMonthAgo,
      updatedAt: twoWeeksAgo,
    },
    // Client uploaded 1099
    {
      id: 'doc-1099-101',
      userId: 'client-001',
      filename: '1099-nec-consulting.pdf',
      originalName: '1099-NEC Consulting Income.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-1099-101.pdf',
      fileSize: 45000,
      mimeType: 'application/pdf',
      category: '1099',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: '1099-NEC showing $42,500 in non-employee compensation from ABC Consulting.',
      aiInsights: {
        payer: 'ABC Consulting',
        amount: 42500,
        formType: '1099-NEC',
      },
      extractedData: {
        box1: 42500,
        payerTin: '98-7654321',
      },
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: oneMonthAgo,
      updatedAt: twoWeeksAgo,
    },
    // Recently uploaded bank statement
    {
      id: 'doc-bank-101',
      userId: 'client-001',
      filename: 'chase-statement-nov-2024.pdf',
      originalName: 'Chase Business Statement Nov 2024.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-bank-101.pdf',
      fileSize: 156000,
      mimeType: 'application/pdf',
      category: 'bank_statement',
      taxYear: 2024,
      status: 'PROCESSING',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    // Strategy document pending signature
    {
      id: 'doc-strategy-101',
      userId: 'client-001',
      filename: 'tax-strategy-2024-smith.pdf',
      originalName: 'Tax Strategy Plan 2024 - John Smith.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-strategy-101.pdf',
      fileSize: 520000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: 'Comprehensive tax strategy recommending S-Corp election, retirement contributions, and quarterly estimated payments.',
      aiInsights: {
        recommendedStructure: 'S-Corp',
        estimatedSavings: 18500,
        strategies: ['S-Corp Election', '401k Maximization', 'HSA Contributions'],
      },
      extractedData: null,
      signatureStatus: 'SENT',
      envelopeId: 'env-102',
      signedAt: null,
      signedDocUrl: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ],

  payments: [
    // Completed onboarding payment
    {
      id: 'pay-101',
      clientId: 'client-001',
      amount: 499.0,
      currency: 'USD',
      status: 'completed',
      type: 'onboarding',
      paymentMethod: 'stripe',
      paymentLinkUrl: null,
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0001',
      paidAt: oneMonthAgo,
      dueDate: null,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    },
    // Pending invoice
    {
      id: 'pay-102',
      clientId: 'client-001',
      amount: 1250.0,
      currency: 'USD',
      status: 'pending',
      type: 'invoice',
      paymentMethod: 'stripe',
      paymentLinkUrl: 'https://pay.ariex.com/invoice/pay-102',
      description: 'Q4 2024 Tax Planning Services',
      invoiceNumber: 'INV-2024-0042',
      paidAt: null,
      dueDate: inTwoWeeks,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    // Completed invoice
    {
      id: 'pay-103',
      clientId: 'client-001',
      amount: 850.0,
      currency: 'USD',
      status: 'completed',
      type: 'invoice',
      paymentMethod: 'coinbase',
      paymentLinkUrl: null,
      description: 'Q3 2024 Tax Advisory',
      invoiceNumber: 'INV-2024-0028',
      paidAt: twoWeeksAgo,
      dueDate: null,
      createdAt: oneMonthAgo,
      updatedAt: twoWeeksAgo,
    },
  ],

  conversations: [
    // Strategist-client chat
    {
      id: 'conv-101',
      clientId: 'client-001',
      strategistId: 'strategist-001',
      type: 'client_strategist',
      lastMessageAt: oneHourAgo,
      createdAt: oneWeekAgo,
      messages: [
        {
          id: 'msg-1001',
          conversationId: 'conv-101',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Hi John! I\'ve completed your tax strategy document. Please review it when you have a chance.',
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'msg-1002',
          conversationId: 'conv-101',
          senderId: 'client-001',
          senderType: 'client',
          content: 'Thanks! I\'ll take a look today. Quick question - what\'s the deadline for the S-Corp election?',
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'msg-1003',
          conversationId: 'conv-101',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Great question! For 2024, you\'ll need to file Form 2553 by March 15, 2025. I\'ve added this to your to-do list.',
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'msg-1004',
          conversationId: 'conv-101',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Also, I noticed you uploaded your November bank statement. I\'ll review it and update your projections.',
          read: true,
          createdAt: oneDayAgo,
        },
        {
          id: 'msg-1005',
          conversationId: 'conv-101',
          senderId: 'client-001',
          senderType: 'client',
          content: 'Perfect, thanks for staying on top of this!',
          read: true,
          createdAt: oneHourAgo,
        },
      ],
    },
    // AI chatbot conversation
    {
      id: 'conv-102',
      clientId: 'client-001',
      strategistId: 'strategist-001',
      type: 'ai_chat',
      lastMessageAt: twoDaysAgo,
      createdAt: twoWeeksAgo,
      messages: [
        {
          id: 'msg-2001',
          conversationId: 'conv-102',
          senderId: 'client-001',
          senderType: 'client',
          content: 'What are the benefits of an S-Corp election?',
          read: true,
          createdAt: twoWeeksAgo,
        },
        {
          id: 'msg-2002',
          conversationId: 'conv-102',
          senderId: 'ai',
          senderType: 'ai',
          content: 'An S-Corp election can provide significant tax savings for business owners. Key benefits include:\n\n1. **Self-employment tax savings**: Only your "reasonable salary" is subject to payroll taxes. Distributions above that are not.\n\n2. **Pass-through taxation**: Business income passes through to your personal return, avoiding double taxation.\n\n3. **Credibility**: Operating as an S-Corp can enhance your business credibility.\n\nBased on your estimated income of $185,000, you could potentially save $8,000-$12,000 annually in self-employment taxes. Would you like me to explain how this works with your specific situation?',
          read: true,
          createdAt: twoWeeksAgo,
        },
        {
          id: 'msg-2003',
          conversationId: 'conv-102',
          senderId: 'client-001',
          senderType: 'client',
          content: 'Yes, please explain more!',
          read: true,
          createdAt: twoDaysAgo,
        },
        {
          id: 'msg-2004',
          conversationId: 'conv-102',
          senderId: 'ai',
          senderType: 'ai',
          content: 'With your LLC currently, all $185,000 is subject to self-employment tax (15.3% on the first $168,600 in 2024).\n\nWith an S-Corp election:\n- You pay yourself a reasonable salary (e.g., $90,000)\n- Payroll taxes apply only to that $90,000\n- The remaining $95,000 comes as a distribution (no payroll tax)\n\n**Estimated savings**: $95,000 × 15.3% = ~$14,535 in avoided SE tax, minus the extra payroll/admin costs (~$2,000-3,000), leaving you with net savings of $11,000-12,500.\n\nYour strategist can help you determine the optimal salary amount and handle the election paperwork.',
          read: true,
          createdAt: twoDaysAgo,
        },
      ],
    },
  ],

  todos: [
    {
      id: 'todo-101',
      clientId: 'client-001',
      assignedBy: 'strategist-001',
      title: 'Sign Tax Strategy Document',
      description: 'Review and sign the 2024 Tax Strategy Plan sent to your email.',
      priority: 'high',
      status: 'pending',
      dueDate: inOneWeek,
      completedAt: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'todo-102',
      clientId: 'client-001',
      assignedBy: 'strategist-001',
      title: 'Pay Q4 Invoice',
      description: 'Complete payment for Q4 2024 Tax Planning Services ($1,250).',
      priority: 'medium',
      status: 'pending',
      dueDate: inTwoWeeks,
      completedAt: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'todo-103',
      clientId: 'client-001',
      assignedBy: 'strategist-001',
      title: 'Gather S-Corp Election Documents',
      description: 'Collect EIN confirmation letter and articles of organization for S-Corp election filing.',
      priority: 'high',
      status: 'in_progress',
      dueDate: inTwoWeeks,
      completedAt: null,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: 'todo-104',
      clientId: 'client-001',
      assignedBy: 'strategist-001',
      title: 'Upload December Bank Statement',
      description: 'Upload your December 2024 business bank statement when available.',
      priority: 'low',
      status: 'pending',
      dueDate: null,
      completedAt: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: 'todo-105',
      clientId: 'client-001',
      assignedBy: 'strategist-001',
      title: 'Set up Quarterly Payment Reminder',
      description: 'Ensure estimated tax payment for Q4 is made by January 15, 2025.',
      priority: 'urgent',
      status: 'pending',
      dueDate: new Date('2025-01-15'),
      completedAt: null,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
  ],
};

// ============================================================================
// MOCK DATA: PARTIALLY ONBOARDED CLIENT (Sarah Johnson)
// ============================================================================

const partiallyOnboardedClient: FullClientMock = {
  user: {
    id: 'client-002',
    email: 'sarah.johnson@email.com',
    name: 'Sarah Johnson',
    role: 'CLIENT',
    createdAt: oneWeekAgo,
    updatedAt: now,
  },
  profile: {
    id: 'profile-002',
    userId: 'client-002',
    phoneNumber: '(555) 234-5678',
    address: '456 Oak Avenue',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    taxId: null,
    businessName: 'Johnson Design Studio',
    onboardingComplete: false,
    filingStatus: 'single',
    dependents: 0,
    estimatedIncome: 142000,
    businessType: 'Sole Proprietorship',
    createdAt: oneWeekAgo,
    updatedAt: now,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: false,

  onboardingTasks: [
    {
      id: 'onb-task-201',
      clientId: 'client-002',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement to get started.',
      status: 'completed',
      agreementDocumentId: 'doc-agreement-201',
      completedAt: oneWeekAgo,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'onb-task-202',
      clientId: 'client-002',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee to activate your account.',
      status: 'completed',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-002',
      completedAt: oneWeekAgo,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'onb-task-203',
      clientId: 'client-002',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload your W-2s, 1099s, and any relevant tax documents from the previous year.',
      status: 'in_progress',
      requiredDocumentType: 'w2,1099',
      completedAt: null,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
    },
  ],

  documents: [
    // Signed agreement
    {
      id: 'doc-agreement-201',
      userId: 'client-002',
      filename: 'ariex-service-agreement-johnson-signed.pdf',
      originalName: 'Ariex Service Agreement 2024 - Signed.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-agreement-201.pdf',
      fileSize: 318000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-201',
      signedAt: oneWeekAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-agreement-201-signed.pdf',
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    // Partially uploaded 1099 (still processing)
    {
      id: 'doc-1099-201',
      userId: 'client-002',
      filename: '1099-freelance-johnson.pdf',
      originalName: '1099-NEC Freelance Design.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-1099-201.pdf',
      fileSize: 52000,
      mimeType: 'application/pdf',
      category: '1099',
      taxYear: 2023,
      status: 'PROCESSING',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ],

  payments: [
    {
      id: 'pay-201',
      clientId: 'client-002',
      amount: 499.0,
      currency: 'USD',
      status: 'completed',
      type: 'onboarding',
      paymentMethod: 'stripe',
      paymentLinkUrl: null,
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0015',
      paidAt: oneWeekAgo,
      dueDate: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ],

  conversations: [
    {
      id: 'conv-201',
      clientId: 'client-002',
      strategistId: 'strategist-001',
      type: 'client_strategist',
      lastMessageAt: twoDaysAgo,
      createdAt: oneWeekAgo,
      messages: [
        {
          id: 'msg-3001',
          conversationId: 'conv-201',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'Welcome to Ariex, Sarah! I\'m your dedicated tax strategist. Let me know if you have any questions during onboarding.',
          read: true,
          createdAt: oneWeekAgo,
        },
        {
          id: 'msg-3002',
          conversationId: 'conv-201',
          senderId: 'strategist-001',
          senderType: 'strategist',
          content: 'I see you\'ve signed the agreement and completed your payment. Great progress! Just need your tax documents to finalize onboarding.',
          read: true,
          createdAt: twoDaysAgo,
        },
      ],
    },
  ],

  todos: [
    {
      id: 'todo-201',
      clientId: 'client-002',
      assignedBy: 'strategist-001',
      title: 'Upload Remaining Tax Documents',
      description: 'Please upload your W-2 and any additional 1099 forms from 2023.',
      priority: 'high',
      status: 'in_progress',
      dueDate: inOneWeek,
      completedAt: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ],
};

// ============================================================================
// MOCK DATA: CLIENT WITH PLAN ACTIVE (Michael Chen)
// ============================================================================

const planActiveClient: FullClientMock = {
  user: {
    id: 'client-003',
    email: 'michael.chen@email.com',
    name: 'Michael Chen',
    role: 'CLIENT',
    createdAt: twoWeeksAgo,
    updatedAt: oneDayAgo,
  },
  profile: {
    id: 'profile-003',
    userId: 'client-003',
    phoneNumber: '(555) 345-6789',
    address: '789 Tech Park Drive',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    taxId: '***-**-9012',
    businessName: 'Chen Software Solutions',
    onboardingComplete: true,
    filingStatus: 'married_joint',
    dependents: 1,
    estimatedIncome: 320000,
    businessType: 'S-Corp',
    createdAt: twoWeeksAgo,
    updatedAt: oneDayAgo,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: true,

  onboardingTasks: [
    {
      id: 'onb-task-301',
      clientId: 'client-003',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement.',
      status: 'completed',
      agreementDocumentId: 'doc-agreement-301',
      completedAt: twoWeeksAgo,
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
    {
      id: 'onb-task-302',
      clientId: 'client-003',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee.',
      status: 'completed',
      completedAt: twoWeeksAgo,
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
    {
      id: 'onb-task-303',
      clientId: 'client-003',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload tax documents.',
      status: 'completed',
      completedAt: twoWeeksAgo,
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
  ],

  documents: [
    {
      id: 'doc-agreement-301',
      userId: 'client-003',
      filename: 'ariex-service-agreement-chen-signed.pdf',
      originalName: 'Ariex Service Agreement 2024 - Signed.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-agreement-301.pdf',
      fileSize: 315000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-301',
      signedAt: twoWeeksAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-agreement-301-signed.pdf',
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
    {
      id: 'doc-strategy-301',
      userId: 'client-003',
      filename: 'tax-strategy-2024-chen.pdf',
      originalName: 'Tax Strategy Plan 2024 - Michael Chen.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-strategy-301.pdf',
      fileSize: 580000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: 'Comprehensive S-Corp optimization strategy with retirement maximization.',
      aiInsights: {
        recommendedStructure: 'S-Corp',
        estimatedSavings: 42000,
        strategies: ['S-Corp Salary Optimization', 'Solo 401k', 'HSA', 'QBI Deduction'],
      },
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-302',
      signedAt: oneWeekAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-strategy-301-signed.pdf',
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    // Additional documents - W-2s, 1099s, bank statements
    {
      id: 'doc-w2-301',
      userId: 'client-003',
      filename: 'w2-2023-chen-software.pdf',
      originalName: 'W-2 2023 - Chen Software Solutions.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-w2-301.pdf',
      fileSize: 125000,
      mimeType: 'application/pdf',
      category: 'w2',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: 'W-2 showing salary of $120,000 from Chen Software Solutions.',
      aiInsights: { wages: 120000, federalWithholding: 24000, stateWithholding: 9600 },
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null, //t
      signedDocUrl: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: 'doc-1099-301',
      userId: 'client-003',
      filename: '1099-nec-2023-consulting.pdf',
      originalName: '1099-NEC 2023 - Consulting Income.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-1099-301.pdf',
      fileSize: 98000,
      mimeType: 'application/pdf',
      category: '1099',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: '1099-NEC showing $85,000 in consulting income.',
      aiInsights: { nonEmployeeCompensation: 85000 },
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: 'doc-1099-div-301',
      userId: 'client-003',
      filename: '1099-div-2023-investments.pdf',
      originalName: '1099-DIV 2023 - Investment Dividends.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-1099-div-301.pdf',
      fileSize: 87000,
      mimeType: 'application/pdf',
      category: '1099',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: 'Dividend income of $12,500 from investment portfolio.',
      aiInsights: { ordinaryDividends: 12500, qualifiedDividends: 10000 },
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'doc-bank-301',
      userId: 'client-003',
      filename: 'bank-statement-dec-2023.pdf',
      originalName: 'Bank Statement - December 2023.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-bank-301.pdf',
      fileSize: 245000,
      mimeType: 'application/pdf',
      category: 'bank_statement',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: 'Business bank statement showing monthly revenue of $45,000.',
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'doc-bank-302',
      userId: 'client-003',
      filename: 'bank-statement-nov-2023.pdf',
      originalName: 'Bank Statement - November 2023.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-bank-302.pdf',
      fileSize: 238000,
      mimeType: 'application/pdf',
      category: 'bank_statement',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: 'Business bank statement showing monthly revenue of $52,000.',
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'doc-receipt-301',
      userId: 'client-003',
      filename: 'equipment-receipt-2023.pdf',
      originalName: 'Office Equipment Receipt 2023.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-receipt-301.pdf',
      fileSize: 156000,
      mimeType: 'application/pdf',
      category: 'receipt',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: 'Receipt for office equipment purchase - $8,500 (deductible).',
      aiInsights: { amount: 8500, category: 'office_equipment', deductible: true },
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'doc-1040-301',
      userId: 'client-003',
      filename: 'tax-return-2022.pdf',
      originalName: 'Tax Return 2022 - Michael Chen.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-1040-301.pdf',
      fileSize: 890000,
      mimeType: 'application/pdf',
      category: '1040',
      taxYear: 2022,
      status: 'COMPLETED',
      aiSummary: 'Previous year tax return showing AGI of $295,000.',
      aiInsights: { agi: 295000, totalTax: 68000, refund: 2500 },
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
  ],

  payments: [
    {
      id: 'pay-301',
      clientId: 'client-003',
      amount: 799.0,
      currency: 'USD',
      status: 'completed',
      type: 'onboarding',
      paymentMethod: 'stripe',
      paymentLinkUrl: null,
      description: 'Premium Onboarding - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0020',
      paidAt: twoWeeksAgo,
      dueDate: null,
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
  ],

  conversations: [],
  todos: [],
};

// ============================================================================
// MOCK DATA: CLIENT WITH NO PLAN (Emily Davis)
// ============================================================================

const noPlanClient: FullClientMock = {
  user: {
    id: 'client-004',
    email: 'emily.davis@email.com',
    name: 'Emily Davis',
    role: 'CLIENT',
    createdAt: oneWeekAgo,
    updatedAt: twoDaysAgo,
  },
  profile: {
    id: 'profile-004',
    userId: 'client-004',
    phoneNumber: '(555) 456-7890',
    address: '321 Elm Street',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    taxId: '***-**-3456',
    businessName: 'Davis Marketing Agency',
    onboardingComplete: true,
    filingStatus: 'head_of_household',
    dependents: 1,
    estimatedIncome: 98000,
    businessType: 'LLC',
    createdAt: oneWeekAgo,
    updatedAt: twoDaysAgo,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: true,

  onboardingTasks: [
    {
      id: 'onb-task-401',
      clientId: 'client-004',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement.',
      status: 'completed',
      agreementDocumentId: 'doc-agreement-401',
      completedAt: oneWeekAgo,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'onb-task-402',
      clientId: 'client-004',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee.',
      status: 'completed',
      completedAt: oneWeekAgo,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'onb-task-403',
      clientId: 'client-004',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload tax documents.',
      status: 'completed',
      completedAt: oneWeekAgo,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ],

  documents: [
    {
      id: 'doc-agreement-401',
      userId: 'client-004',
      filename: 'ariex-service-agreement-davis-signed.pdf',
      originalName: 'Ariex Service Agreement 2024 - Signed.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-agreement-401.pdf',
      fileSize: 312000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-401',
      signedAt: oneWeekAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-agreement-401-signed.pdf',
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
    {
      id: 'doc-1099-401',
      userId: 'client-004',
      filename: '1099-marketing-davis.pdf',
      originalName: '1099-NEC Marketing Income.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-1099-401.pdf',
      fileSize: 48000,
      mimeType: 'application/pdf',
      category: '1099',
      taxYear: 2023,
      status: 'COMPLETED',
      aiSummary: '1099-NEC showing $78,000 in freelance marketing income.',
      aiInsights: { payer: 'Various Clients', amount: 78000 },
      extractedData: null,
      signatureStatus: 'NOT_SENT',
      envelopeId: null,
      signedAt: null,
      signedDocUrl: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ],

  payments: [
    {
      id: 'pay-401',
      clientId: 'client-004',
      amount: 499.0,
      currency: 'USD',
      status: 'completed',
      type: 'onboarding',
      paymentMethod: 'stripe',
      paymentLinkUrl: null,
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0025',
      paidAt: oneWeekAgo,
      dueDate: null,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ],

  conversations: [],
  todos: [],
};

// ============================================================================
// MOCK DATA: ANOTHER ONBOARDING CLIENT (Lisa Martinez)
// ============================================================================

const anotherOnboardingClient: FullClientMock = {
  user: {
    id: 'client-006',
    email: 'lisa.martinez@email.com',
    name: 'Lisa Martinez',
    role: 'CLIENT',
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
  profile: {
    id: 'profile-006',
    userId: 'client-006',
    phoneNumber: '(555) 678-9012',
    address: '987 Sunset Drive',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    taxId: null,
    businessName: 'Martinez Wellness Center',
    onboardingComplete: false,
    filingStatus: null,
    dependents: null,
    estimatedIncome: 175000,
    businessType: 'LLC',
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
  strategistId: 'strategist-001',
  isOnboardingComplete: false,

  onboardingTasks: [
    {
      id: 'onb-task-601',
      clientId: 'client-006',
      type: 'sign_agreement',
      title: 'Sign Service Agreement',
      description: 'Review and sign the Ariex Tax Services Agreement.',
      status: 'completed',
      agreementDocumentId: 'doc-agreement-601',
      completedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: 'onb-task-602',
      clientId: 'client-006',
      type: 'pay_initial',
      title: 'Complete Initial Payment',
      description: 'Pay the onboarding fee.',
      status: 'pending',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-006',
      completedAt: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      id: 'onb-task-603',
      clientId: 'client-006',
      type: 'upload_documents',
      title: 'Upload Initial Documents',
      description: 'Upload tax documents.',
      status: 'pending',
      completedAt: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ],

  documents: [
    {
      id: 'doc-agreement-601',
      userId: 'client-006',
      filename: 'ariex-service-agreement-martinez-signed.pdf',
      originalName: 'Ariex Service Agreement 2024 - Signed.pdf',
      fileUrl: 'https://storage.ariex.com/documents/doc-agreement-601.pdf',
      fileSize: 310000,
      mimeType: 'application/pdf',
      category: 'contract',
      taxYear: 2024,
      status: 'COMPLETED',
      aiSummary: null,
      aiInsights: null,
      extractedData: null,
      signatureStatus: 'SIGNED',
      envelopeId: 'env-601',
      signedAt: twoDaysAgo,
      signedDocUrl: 'https://storage.ariex.com/documents/doc-agreement-601-signed.pdf',
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ],

  payments: [
    {
      id: 'pay-601',
      clientId: 'client-006',
      amount: 499.0,
      currency: 'USD',
      status: 'pending',
      type: 'onboarding',
      paymentMethod: 'stripe',
      paymentLinkUrl: 'https://pay.ariex.com/onboarding/client-006',
      description: 'Onboarding Fee - Tax Strategy Setup',
      invoiceNumber: 'INV-2024-0030',
      paidAt: null,
      dueDate: inOneWeek,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ],

  conversations: [],
  todos: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All mock clients organized by status
 * 
 * Status Reference:
 * - ONBOARDING (amber)  = isOnboardingComplete: false
 * - NO PLAN (gray)      = onboarded, no strategy doc
 * - PLAN PENDING (teal) = strategy doc sent, awaiting signature
 * - PLAN ACTIVE (green) = strategy doc signed
 */
export const fullClientMocks: FullClientMock[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS: ONBOARDING (amber) - New clients, nothing completed
  // ─────────────────────────────────────────────────────────────────────────
  onboardingClient,        // Robert Wilson - $0 income (new, nothing done)
  newClient2,              // David Brown - $265k (new, nothing done)
  newClient3,              // Jennifer Taylor - $78k (new, nothing done)
  newClient4,              // Marcus Johnson - $195k (new, nothing done)
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS: ONBOARDING (amber) - Partially completed onboarding
  // ─────────────────────────────────────────────────────────────────────────
  partiallyOnboardedClient, // Sarah Johnson - $142k (signed & paid, uploading docs)
  anotherOnboardingClient,  // Lisa Martinez - $175k (signed, needs to pay)
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS: NO PLAN (gray) - Onboarded, no strategy yet
  // ─────────────────────────────────────────────────────────────────────────
  noPlanClient,            // Emily Davis - $98k (onboarded, no strategy yet)
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS: PLAN PENDING (teal) - Strategy sent for signature
  // ─────────────────────────────────────────────────────────────────────────
  activeClient,            // John Smith - $185k (strategy sent for signature)
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS: PLAN ACTIVE (green) - Strategy signed
  // ─────────────────────────────────────────────────────────────────────────
  planActiveClient,        // Michael Chen - $320k (strategy signed)
];

/**
 * Get a full client mock by ID
 */
export function getFullClientById(clientId: string): FullClientMock | undefined {
  return fullClientMocks.find(c => c.user.id === clientId);
}

/**
 * Get all clients for a strategist
 */
export function getFullClientsByStrategist(strategistId: string): FullClientMock[] {
  return fullClientMocks.filter(c => c.strategistId === strategistId);
}

/**
 * Get clients currently in onboarding
 */
export function getOnboardingClients(strategistId: string): FullClientMock[] {
  return fullClientMocks.filter(c => c.strategistId === strategistId && !c.isOnboardingComplete);
}

/**
 * Get fully onboarded clients
 */
export function getActiveFullClients(strategistId: string): FullClientMock[] {
  return fullClientMocks.filter(c => c.strategistId === strategistId && c.isOnboardingComplete);
}

/**
 * Get pending onboarding tasks for a client
 */
export function getPendingOnboardingTasks(clientId: string): OnboardingTask[] {
  const client = getFullClientById(clientId);
  if (!client) return [];
  return client.onboardingTasks.filter(t => t.status !== 'completed');
}

/**
 * Get pending payments for a client
 */
export function getPendingPayments(clientId: string): Payment[] {
  const client = getFullClientById(clientId);
  if (!client) return [];
  return client.payments.filter(p => p.status === 'pending');
}

/**
 * Get documents pending signature for a client
 */
export function getDocumentsPendingSignature(clientId: string): Document[] {
  const client = getFullClientById(clientId);
  if (!client) return [];
  return client.documents.filter(d => d.signatureStatus === 'SENT');
}

/**
 * Get active todos for a client
 */
export function getActiveTodos(clientId: string): ClientTodo[] {
  const client = getFullClientById(clientId);
  if (!client) return [];
  return client.todos.filter(t => t.status === 'pending' || t.status === 'in_progress');
}

/**
 * Get unread messages count for a client
 */
export function getUnreadMessagesCount(clientId: string): number {
  const client = getFullClientById(clientId);
  if (!client) return 0;
  return client.conversations.reduce((count, conv) => {
    return count + conv.messages.filter(m => !m.read && m.senderType !== 'client').length;
  }, 0);
}

/**
 * Client dashboard summary (Client POV)
 */
export function getClientDashboardSummary(clientId: string) {
  const client = getFullClientById(clientId);
  if (!client) return null;

  return {
    isOnboardingComplete: client.isOnboardingComplete,
    pendingOnboardingTasks: getPendingOnboardingTasks(clientId),
    pendingPayments: getPendingPayments(clientId),
    documentsPendingSignature: getDocumentsPendingSignature(clientId),
    activeTodos: getActiveTodos(clientId),
    unreadMessages: getUnreadMessagesCount(clientId),
    totalDocuments: client.documents.length,
    completedPaymentsTotal: client.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
  };
}

/**
 * Strategist view of client summary (Strategist POV)
 */
export function getStrategistClientSummary(clientId: string) {
  const client = getFullClientById(clientId);
  if (!client) return null;

  const recentDocuments = client.documents
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const pendingSignatures = client.documents.filter(d => d.signatureStatus === 'SENT');
  const outstandingInvoices = client.payments.filter(p => p.status === 'pending');

  return {
    client: {
      user: client.user,
      profile: client.profile,
    },
    isOnboardingComplete: client.isOnboardingComplete,
    onboardingProgress: {
      total: client.onboardingTasks.length,
      completed: client.onboardingTasks.filter(t => t.status === 'completed').length,
    },
    recentDocuments,
    pendingSignatures,
    outstandingInvoices,
    activeTodos: getActiveTodos(clientId),
    lastContactedAt: client.conversations[0]?.lastMessageAt || null,
    totalRevenue: client.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
  };
}

