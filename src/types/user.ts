export type Role = 'ADMIN' | 'COMPLIANCE' | 'STRATEGIST' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProfile {
  id: string;
  userId: string;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  taxId: string | null;
  businessName: string | null;
  onboardingComplete: boolean;
  filingStatus: string | null;
  dependents: number | null;
  estimatedIncome: number | null;
  businessType: string | null;
  createdAt: Date;
  updatedAt: Date;
}
