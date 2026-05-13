'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';

export default function ComplianceDashboardPage() {
  useRoleRedirect('COMPLIANCE');

  return (
    <section className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-soft-white">Compliance Dashboard</h1>
          <p className="mt-1 text-steel-gray">Monitor strategists and clients across the platform</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Strategists" value="8" change="+2 this month" positive />
        <StatCard label="Total Clients" value="98" change="+12 this week" positive />
        <StatCard label="Pending Reviews" value="3" change="Down from 7" positive />
        <StatCard label="Flagged Items" value="1" change="Requires attention" />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Strategists Overview */}
        <div className="rounded-lg border border-white/10 bg-deep-navy p-6">
          <h2 className="mb-4 text-xl font-semibold text-soft-white">Strategists</h2>
          <p className="mb-4 text-sm text-steel-gray">Monitor all strategist activity and performance</p>
          
          <div className="space-y-3">
            <StrategistRow name="Alex Morgan" clients={23} status="Active" />
            <StrategistRow name="Sarah Thompson" clients={18} status="Active" />
            <StrategistRow name="Michael Chen" clients={15} status="Active" />
            <StrategistRow name="Emily Rodriguez" clients={21} status="Active" />
          </div>

          <button className="mt-4 w-full rounded-lg border border-white/15 py-2 text-sm font-medium text-soft-white transition-colors hover:bg-white/3">
            View All Strategists
          </button>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-white/10 bg-deep-navy p-6">
          <h2 className="mb-4 text-xl font-semibold text-soft-white">Recent Activity</h2>
          <p className="mb-4 text-sm text-steel-gray">Latest actions requiring oversight</p>
          
          <div className="space-y-3">
            <ActivityRow
              action="Strategy submitted for review"
              strategist="Alex Morgan"
              time="5 min ago"
            />
            <ActivityRow
              action="New client onboarded"
              strategist="Sarah Thompson"
              time="1 hour ago"
            />
            <ActivityRow
              action="Document flagged"
              strategist="Michael Chen"
              time="2 hours ago"
              flagged
            />
            <ActivityRow
              action="Payment received"
              strategist="Emily Rodriguez"
              time="3 hours ago"
            />
          </div>

          <button className="mt-4 w-full rounded-lg border border-white/15 py-2 text-sm font-medium text-soft-white transition-colors hover:bg-white/3">
            View All Activity
          </button>
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="rounded-lg border border-white/10 bg-deep-navy p-6">
        <h2 className="mb-4 text-xl font-semibold text-soft-white">Pending Reviews</h2>
        <div className="space-y-3">
          <ReviewRow
            client="Emily Davis"
            strategist="Alex Morgan"
            type="Tax Strategy"
            submitted="2 hours ago"
          />
          <ReviewRow
            client="Michael Johnson"
            strategist="Sarah Thompson"
            type="Document Package"
            submitted="1 day ago"
          />
          <ReviewRow
            client="Lisa Chen"
            strategist="Michael Chen"
            type="Amendment Request"
            submitted="2 days ago"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  change,
  positive = false,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-deep-navy p-6 shadow-sm">
      <div className="text-sm font-medium text-steel-gray">{label}</div>
      <div className="mt-2 text-3xl font-bold text-soft-white">{value}</div>
      <div className={`mt-1 text-xs ${positive ? 'text-emerald-400' : 'text-amber-400'}`}>
        {change}
      </div>
    </div>
  );
}

function StrategistRow({
  name,
  clients,
  status,
}: {
  name: string;
  clients: number;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/8 p-3">
      <div>
        <div className="font-medium text-soft-white">{name}</div>
        <div className="text-sm text-steel-gray">{clients} clients</div>
      </div>
      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
        {status}
      </span>
    </div>
  );
}

function ActivityRow({
  action,
  strategist,
  time,
  flagged = false,
}: {
  action: string;
  strategist: string;
  time: string;
  flagged?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 pb-3 last:border-0">
      <div>
        <div className={`text-sm font-medium ${flagged ? 'text-amber-300' : 'text-soft-white'}`}>
          {flagged && '⚠️ '}
          {action}
        </div>
        <div className="text-xs text-steel-gray">{strategist}</div>
      </div>
      <div className="text-xs text-steel-gray/60">{time}</div>
    </div>
  );
}

function ReviewRow({
  client,
  strategist,
  type,
  submitted,
}: {
  client: string;
  strategist: string;
  type: string;
  submitted: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
      <div>
        <div className="font-medium text-soft-white">{client}</div>
        <div className="text-sm text-steel-gray">
          {type} · by {strategist}
        </div>
        <div className="text-xs text-steel-gray/60">Submitted {submitted}</div>
      </div>
      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        Review
      </button>
    </div>
  );
}
