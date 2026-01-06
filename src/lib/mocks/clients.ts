import { User, ClientProfile } from '@/types/user';

export interface MockClient {
  user: User;
  profile: ClientProfile;
  strategistId: string;
}

const now = new Date();
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

export const mockClients: MockClient[] = [
  {
    user: {
      id: 'client-001',
      email: 'john.smith@email.com',
      name: 'John Smith',
      role: 'CLIENT',
      createdAt: threeMonthsAgo,
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
      createdAt: threeMonthsAgo,
      updatedAt: now,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-002',
      email: 'sarah.johnson@email.com',
      name: 'Sarah Johnson',
      role: 'CLIENT',
      createdAt: twoMonthsAgo,
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
      taxId: '***-**-5678',
      businessName: 'Johnson Design Studio',
      onboardingComplete: true,
      filingStatus: 'single',
      dependents: 0,
      estimatedIncome: 142000,
      businessType: 'Sole Proprietorship',
      createdAt: twoMonthsAgo,
      updatedAt: now,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-003',
      email: 'michael.chen@email.com',
      name: 'Michael Chen',
      role: 'CLIENT',
      createdAt: oneMonthAgo,
      updatedAt: now,
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
      createdAt: oneMonthAgo,
      updatedAt: now,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-004',
      email: 'emily.davis@email.com',
      name: 'Emily Davis',
      role: 'CLIENT',
      createdAt: twoMonthsAgo,
      updatedAt: oneMonthAgo,
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
      createdAt: twoMonthsAgo,
      updatedAt: oneMonthAgo,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-005',
      email: 'robert.wilson@email.com',
      name: 'Robert Wilson',
      role: 'CLIENT',
      createdAt: now,
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
      createdAt: now,
      updatedAt: now,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-006',
      email: 'lisa.martinez@email.com',
      name: 'Lisa Martinez',
      role: 'CLIENT',
      createdAt: oneMonthAgo,
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
      taxId: '***-**-7890',
      businessName: 'Martinez Wellness Center',
      onboardingComplete: true,
      filingStatus: 'married_separate',
      dependents: 0,
      estimatedIncome: 175000,
      businessType: 'LLC',
      createdAt: oneMonthAgo,
      updatedAt: now,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-007',
      email: 'david.brown@email.com',
      name: 'David Brown',
      role: 'CLIENT',
      createdAt: threeMonthsAgo,
      updatedAt: twoMonthsAgo,
    },
    profile: {
      id: 'profile-007',
      userId: 'client-007',
      phoneNumber: '(555) 789-0123',
      address: '246 Harbor View',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      taxId: '***-**-2345',
      businessName: 'Brown Financial Advisors',
      onboardingComplete: true,
      filingStatus: 'single',
      dependents: 0,
      estimatedIncome: 265000,
      businessType: 'S-Corp',
      createdAt: threeMonthsAgo,
      updatedAt: twoMonthsAgo,
    },
    strategistId: 'strategist-001',
  },
  {
    user: {
      id: 'client-008',
      email: 'jennifer.taylor@email.com',
      name: 'Jennifer Taylor',
      role: 'CLIENT',
      createdAt: oneMonthAgo,
      updatedAt: now,
    },
    profile: {
      id: 'profile-008',
      userId: 'client-008',
      phoneNumber: '(555) 890-1234',
      address: '135 Mountain Road',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      taxId: '***-**-6789',
      businessName: 'Taylor Photography',
      onboardingComplete: true,
      filingStatus: 'single',
      dependents: 0,
      estimatedIncome: 78000,
      businessType: 'Sole Proprietorship',
      createdAt: oneMonthAgo,
      updatedAt: now,
    },
    strategistId: 'strategist-001',
  },
];

/**
 * Get all clients for a specific strategist
 */
export function getClientsByStrategist(strategistId: string): MockClient[] {
  return mockClients.filter(c => c.strategistId === strategistId);
}

/**
 * Get a specific client by ID
 */
export function getClientById(clientId: string): MockClient | undefined {
  return mockClients.find(c => c.user.id === clientId);
}

/**
 * Get clients with completed onboarding
 */
export function getActiveClients(strategistId: string): MockClient[] {
  return mockClients.filter(c => c.strategistId === strategistId && c.profile.onboardingComplete);
}

/**
 * Get clients pending onboarding
 */
export function getPendingClients(strategistId: string): MockClient[] {
  return mockClients.filter(c => c.strategistId === strategistId && !c.profile.onboardingComplete);
}

/**
 * Summary stats for a strategist's clients
 */
export function getClientStats(strategistId: string) {
  const clients = getClientsByStrategist(strategistId);
  const activeClients = clients.filter(c => c.profile.onboardingComplete);
  const totalEstimatedIncome = activeClients.reduce(
    (sum, c) => sum + (c.profile.estimatedIncome || 0),
    0
  );

  return {
    totalClients: clients.length,
    activeClients: activeClients.length,
    pendingOnboarding: clients.length - activeClients.length,
    totalEstimatedIncome,
    averageIncome:
      activeClients.length > 0 ? Math.round(totalEstimatedIncome / activeClients.length) : 0,
  };
}
