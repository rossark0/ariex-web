'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';

export default function AdminDashboardPage() {
  useRoleRedirect('ADMIN');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Admin Dashboard</h1>
        <p className="mt-2 text-zinc-600">System administration and configuration</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-500">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">127</div>
          <div className="mt-1 text-xs text-emerald-600">+12 this month</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-500">Active Strategists</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">8</div>
          <div className="mt-1 text-xs text-zinc-600">All active</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-500">Active Clients</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">98</div>
          <div className="mt-1 text-xs text-emerald-600">+8 this week</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-500">System Health</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">100%</div>
          <div className="mt-1 text-xs text-zinc-600">All systems operational</div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">Admin Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="User Management"
            description="Create, edit, and manage user accounts"
            icon="👥"
          />
          <ActionCard
            title="Role Assignment"
            description="Assign and modify user roles"
            icon="🎭"
          />
          <ActionCard
            title="System Settings"
            description="Configure system-wide settings"
            icon="⚙️"
          />
          <ActionCard
            title="Payment Configuration"
            description="Manage Stripe and Coinbase settings"
            icon="💳"
          />
          <ActionCard
            title="Email Templates"
            description="Customize email templates"
            icon="✉️"
          />
          <ActionCard
            title="Integrations"
            description="Manage DocuSign and other integrations"
            icon="🔌"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">Recent System Activity</h2>
        <div className="space-y-3">
          <ActivityItem
            action="New user registered"
            user="john@example.com"
            time="5 minutes ago"
          />
          <ActivityItem
            action="Role changed to Strategist"
            user="sarah@example.com"
            time="1 hour ago"
          />
          <ActivityItem
            action="Payment settings updated"
            user="System Administrator"
            time="3 hours ago"
          />
          <ActivityItem
            action="New integration enabled"
            user="System Administrator"
            time="1 day ago"
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <button className="rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50">
      <div className="mb-2 text-2xl">{icon}</div>
      <div className="font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-sm text-zinc-600">{description}</div>
    </button>
  );
}

function ActivityItem({ action, user, time }: { action: string; user: string; time: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0">
      <div>
        <div className="text-sm font-medium text-zinc-900">{action}</div>
        <div className="text-xs text-zinc-500">{user}</div>
      </div>
      <div className="text-xs text-zinc-400">{time}</div>
    </div>
  );
}
