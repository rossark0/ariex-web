// Local type definitions (previously from @ariexai/shared)
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CLIENT';
  createdAt: Date;
  updatedAt: Date;
  clerkId: string;
  avatarUrl: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiUser extends User {}

export interface ApiSubscription extends Subscription {}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
