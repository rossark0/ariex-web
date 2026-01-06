/**
 * Full Admin Mock Data
 *
 * ADMIN POV - What an admin does:
 * - Manage all users and roles
 * - System configuration and settings
 * - Payment platform configuration (Stripe, Coinbase)
 * - Email template management
 * - Integration management (DocuSign, etc.)
 * - Audit logs and system monitoring
 * - Access to all data across the platform
 */

import type { User } from '@/types/user';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AdminProfile {
  id: string;
  userId: string;
  title: string;
  permissions: string[];
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettings {
  id: string;
  category: 'payment' | 'email' | 'integration' | 'security' | 'general';
  key: string;
  value: string;
  description: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  details: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface FullAdminMock {
  // Core admin data
  user: User;
  profile: AdminProfile;

  // System management
  auditLogs: AuditLogEntry[];
  systemSettings: SystemSettings[];

  // Platform metrics
  platformMetrics: {
    totalUsers: number;
    totalStrategists: number;
    totalClients: number;
    totalComplianceUsers: number;
    totalAdmins: number;
    activeUsersToday: number;
    documentsProcessedToday: number;
    totalRevenue: number;
    revenueThisMonth: number;
  };
}

// ============================================================================
// TIMESTAMP HELPERS
// ============================================================================

const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

// ============================================================================
// MOCK DATA: PRIMARY ADMIN (Maya Rodriguez)
// ============================================================================

const primaryAdmin: FullAdminMock = {
  user: {
    id: 'admin-001',
    email: 'maya.rodriguez@ariex.com',
    name: 'Maya Rodriguez',
    role: 'ADMIN',
    createdAt: oneMonthAgo,
    updatedAt: now,
  },
  profile: {
    id: 'admin-profile-001',
    userId: 'admin-001',
    title: 'System Administrator',
    permissions: [
      'user.create',
      'user.edit',
      'user.delete',
      'user.view_all',
      'system.settings',
      'integrations.manage',
      'payments.configure',
      'audit.view',
      'platform.metrics',
    ],
    lastLoginAt: oneHourAgo,
    createdAt: oneMonthAgo,
    updatedAt: oneDayAgo,
  },

  auditLogs: [
    {
      id: 'audit-001',
      userId: 'strategist-001',
      userName: 'Alex Morgan',
      userRole: 'STRATEGIST',
      action: 'client.create',
      resource: 'client-005',
      details: { clientName: 'Robert Wilson', businessName: 'Wilson Real Estate Group' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: oneDayAgo,
    },
    {
      id: 'audit-002',
      userId: 'strategist-001',
      userName: 'Alex Morgan',
      userRole: 'STRATEGIST',
      action: 'payment_link.send',
      resource: 'paylink-002',
      details: { amount: 499, clientId: 'client-005', description: 'Onboarding Fee' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: oneDayAgo,
    },
    {
      id: 'audit-003',
      userId: 'client-001',
      userName: 'John Smith',
      userRole: 'CLIENT',
      action: 'document.upload',
      resource: 'doc-bank-101',
      details: { fileName: 'Chase_Business_Statement_Nov2024.pdf', category: 'bank_statement' },
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'audit-004',
      userId: 'admin-001',
      userName: 'Maya Rodriguez',
      userRole: 'ADMIN',
      action: 'system.settings.update',
      resource: 'stripe_webhook_secret',
      details: { category: 'payment', key: 'stripe_webhook_secret' },
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: oneWeekAgo,
    },
    {
      id: 'audit-005',
      userId: 'strategist-002',
      userName: 'Jordan Lee',
      userRole: 'STRATEGIST',
      action: 'auth.login',
      resource: 'session-001',
      details: { loginMethod: 'firebase', success: true },
      ipAddress: '198.51.100.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: oneWeekAgo,
    },
  ],

  systemSettings: [
    {
      id: 'setting-001',
      category: 'payment',
      key: 'stripe_publishable_key',
      value: 'pk_test_51234567890',
      description: 'Stripe publishable key for payment processing',
      updatedBy: 'admin-001',
      updatedAt: oneWeekAgo,
    },
    {
      id: 'setting-002',
      category: 'payment',
      key: 'coinbase_api_key',
      value: 'cb_api_key_123',
      description: 'Coinbase Commerce API key',
      updatedBy: 'admin-001',
      updatedAt: oneWeekAgo,
    },
    {
      id: 'setting-003',
      category: 'email',
      key: 'resend_api_key',
      value: 're_123456789',
      description: 'Resend API key for email delivery',
      updatedBy: 'admin-001',
      updatedAt: oneWeekAgo,
    },
    {
      id: 'setting-004',
      category: 'integration',
      key: 'docusign_integration_key',
      value: 'ds_integration_123',
      description: 'DocuSign integration key',
      updatedBy: 'admin-001',
      updatedAt: oneMonthAgo,
    },
    {
      id: 'setting-005',
      category: 'security',
      key: 'jwt_secret',
      value: 'super_secret_key_123',
      description: 'JWT signing secret',
      updatedBy: 'admin-001',
      updatedAt: oneMonthAgo,
    },
    {
      id: 'setting-006',
      category: 'general',
      key: 'platform_name',
      value: 'Ariex Tax Strategy Platform',
      description: 'Platform display name',
      updatedBy: 'admin-001',
      updatedAt: oneMonthAgo,
    },
  ],

  platformMetrics: {
    totalUsers: 7,
    totalStrategists: 2,
    totalClients: 3,
    totalComplianceUsers: 1,
    totalAdmins: 1,
    activeUsersToday: 4,
    documentsProcessedToday: 12,
    totalRevenue: 2697,
    revenueThisMonth: 1749,
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const fullAdminMocks: FullAdminMock[] = [primaryAdmin];

/**
 * Get an admin by ID
 */
export function getAdminById(adminId: string): FullAdminMock | undefined {
  return fullAdminMocks.find(a => a.user.id === adminId);
}

/**
 * Get all admins
 */
export function getAllAdmins(): FullAdminMock[] {
  return fullAdminMocks;
}

/**
 * Get recent audit logs
 */
export function getRecentAuditLogs(adminId: string, limit: number = 20): AuditLogEntry[] {
  const admin = getAdminById(adminId);
  if (!admin) return [];
  
  return admin.auditLogs
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Get system settings by category
 */
export function getSystemSettingsByCategory(adminId: string, category: string): SystemSettings[] {
  const admin = getAdminById(adminId);
  if (!admin) return [];
  
  return admin.systemSettings.filter(s => s.category === category);
}

/**
 * Admin dashboard summary
 */
export function getAdminDashboardSummary(adminId: string) {
  const admin = getAdminById(adminId);
  if (!admin) return null;

  return {
    admin: {
      user: admin.user,
      profile: admin.profile,
    },
    platformMetrics: admin.platformMetrics,
    recentAuditLogs: getRecentAuditLogs(adminId, 10),
    systemHealth: {
      status: 'healthy',
      uptime: '99.9%',
      lastBackup: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      alertsCount: 0,
    },
  };
}

/**
 * Actions available to admin (for UI rendering)
 */
export const adminActions = {
  userManagement: [
    { id: 'create_user', label: 'Create New User', icon: 'UserPlus' },
    { id: 'view_users', label: 'View All Users', icon: 'Users' },
    { id: 'edit_user', label: 'Edit User', icon: 'UserCog' },
    { id: 'manage_roles', label: 'Manage Roles', icon: 'Shield' },
  ],
  systemConfiguration: [
    { id: 'payment_settings', label: 'Payment Settings', icon: 'CreditCard' },
    { id: 'email_settings', label: 'Email Configuration', icon: 'Mail' },
    { id: 'integration_settings', label: 'Integrations', icon: 'Plug' },
    { id: 'security_settings', label: 'Security Settings', icon: 'Lock' },
  ],
  monitoring: [
    { id: 'view_audit_logs', label: 'Audit Logs', icon: 'FileSearch' },
    { id: 'platform_metrics', label: 'Platform Metrics', icon: 'BarChart3' },
    { id: 'system_health', label: 'System Health', icon: 'Activity' },
  ],
} as const;