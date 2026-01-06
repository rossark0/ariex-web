import { User, Role } from '@/types/user';
import { getStrategistById } from '@/lib/mocks/strategist-full';
import { getFullClientById } from '@/lib/mocks/client-full';

export interface MockUserWithPassword {
  user: User;
  password: string;
  displayName: string;
  description: string;
}

/**
 * Mock users for development and testing
 * Email/Password combinations for easy sign-in
 * Only one user per role for production-ready experience
 */
export const mockUsers: MockUserWithPassword[] = [
  // STRATEGIST ROLE
  {
    user: {
      id: 'user-strategist-001',
      email: 'strategist@ariex.ai',
      name: 'Alex Morgan',
      role: 'STRATEGIST',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    password: 'password',
    displayName: 'Alex Morgan (Strategist)',
    description: 'Tax strategist with 15+ years experience',
  },

  // CLIENT ROLE - Only one client for sign-in
  {
    user: {
      id: 'user-client-001',
      email: 'client@ariex.ai',
      name: 'Robert Wilson',
      role: 'CLIENT',
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    },
    password: 'password',
    displayName: 'Robert Wilson (Client)',
    description: 'New client in onboarding phase',
  },

  // COMPLIANCE ROLE
  {
    user: {
      id: 'user-compliance-001',
      email: 'compliance@ariex.ai',
      name: 'Jordan Chen',
      role: 'COMPLIANCE',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    },
    password: 'password',
    displayName: 'Jordan Chen (Compliance)',
    description: 'Compliance officer with oversight access',
  },

  // ADMIN ROLE
  {
    user: {
      id: 'user-admin-001',
      email: 'admin@ariex.ai',
      name: 'System Administrator',
      role: 'ADMIN',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    password: 'password',
    displayName: 'System Administrator',
    description: 'Full system access and configuration',
  },
];

/**
 * Find user by email
 */
export function findUserByEmail(email: string): MockUserWithPassword | undefined {
  return mockUsers.find(u => u.user.email.toLowerCase() === email.toLowerCase());
}

/**
 * Authenticate user with email and password
 */
export function authenticateUser(
  email: string,
  password: string
): { success: boolean; user?: User; error?: string } {
  const mockUser = findUserByEmail(email);

  if (!mockUser) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (mockUser.password !== password) {
    return { success: false, error: 'Invalid email or password' };
  }

  return { success: true, user: mockUser.user };
}

/**
 * Get full profile data for a user based on their role
 */
export function getFullUserProfile(user: User) {
  switch (user.role) {
    case 'STRATEGIST':
      return getStrategistById('strategist-001'); // Maps to Alex Morgan
    case 'CLIENT':
      // Map user IDs to client IDs - using Robert Wilson for the single client login
      if (user.id === 'user-client-001') {
        return getFullClientById('client-005'); // Robert Wilson (onboarding client)
      }
      return null;
    case 'COMPLIANCE':
      // Return compliance profile when we have it
      return { user };
    case 'ADMIN':
      // Return admin profile when we have it
      return { user };
    default:
      return { user };
  }
}

/**
 * Get the default redirect path for a user role
 */
export function getRoleHomePath(role: Role): string {
  const roleHomeMap: Record<Role, string> = {
    ADMIN: '/admin/dashboard',
    COMPLIANCE: '/compliance/strategists',
    STRATEGIST: '/strategist/home',
    CLIENT: '/client/dashboard',
  };

  return roleHomeMap[role] || '/';
}
