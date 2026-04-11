import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, BarChart3, CreditCard, Shield, FileText,
  Ban, Search, CheckCircle, TrendingUp, Clock, AlertTriangle,
  Zap, Plus, X, Edit2, Check, ChevronDown, Crown, Lock,
  ShieldCheck, ShieldOff, ArrowRight, Lightbulb, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import GeckoIcon from '../components/icons/GeckoIcon';
import GakoPanel from '../components/admin/GakoPanel';

// ─── Owner protection ─────────────────────────────────────────────────────────
// This email can never be demoted, suspended, or have plan changed via the UI.

const OWNER_EMAIL = 'galzohar4466@gmail.com';

function isOwner(user)    { return user?.email === OWNER_EMAIL; }
function isAdminRow(user) { return user?.role === 'admin'; }

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_profiles');
      if (error) throw error;
      return data ?? [];
    },
    retry: false,
    staleTime: 30_000,
  });
}

// ─── Role / status badges ─────────────────────────────────────────────────────

function RoleBadge({ user }) {
  if (isOwner(user)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 uppercase tracking-wide">
        <Crown className="w-2.5 h-2.5" /> Owner
      </span>
    );
  }
  if (isAdminRow(user)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 uppercase tracking-wide">
        <Shield className="w-2.5 h-2.5" /> Admin
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-500/10 dark:text-gray-400 text-gray-500 uppercase tracking-wide">
      User
    </span>
  );
}

function StatusBadge({ suspended }) {
  return suspended ? (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 uppercase tracking-wide">
      Suspended
    </span>
  ) : (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 uppercase tracking-wide">
      Active
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold dark:text-white text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

// ─── Growth Chart (SVG) ───────────────────────────────────────────────────────

function GrowthChart({ profiles }) {
  const points = useMemo(() => {
    const days = 30;
    const now = Date.now();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayEnd = new Date(now - i * 86400000);
      dayEnd.setHours(23, 59, 59, 999);
      const count = profiles.filter(p => new Date(p.created_at) <= dayEnd).length;
      result.push(count);
    }
    return result;
  }, [profiles]);

  const max = Math.max(...points, 1);
  const W = 500, H = 80, pad = 4;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
  const ys = points.map(v => H - pad - ((v / max) * (H - pad * 2)));
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const area = `${xs[0]},${H} ` + xs.map((x, i) => `${x},${ys[i]}`).join(' ') + ` ${xs[xs.length - 1]},${H}`;

  // Last 7 day labels
  const labels = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.now() - (28 - i * 7) * 86400000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  return (
    <div className="p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest">User Growth</p>
          <p className="text-sm font-semibold dark:text-white text-gray-900 mt-0.5">Last 30 days</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs dark:text-gray-500 text-gray-400">
          <Activity className="w-3.5 h-3.5" />
          {profiles.length} total
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#chartFill)" />
        <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Endpoint dot */}
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3"
          fill="#3b82f6" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between mt-2">
        {labels.map(l => (
          <span key={l} className="text-[10px] dark:text-gray-600 text-gray-400">{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profiles, onNavigate }) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const suspended = profiles.filter(p => p.is_suspended).length;
  const paid      = profiles.filter(p => p.subscription_plan && p.subscription_plan !== 'free').length;
  const free      = profiles.filter(p => !p.subscription_plan || p.subscription_plan === 'free').length;
  const newWeek   = profiles.filter(p => p.created_at >= oneWeekAgo).length;
  const active    = profiles.filter(p => !p.is_suspended).length;

  const stats = [
    { label: 'Total Users',   value: profiles.length, icon: Users,       color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Active',        value: active,           icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Suspended',     value: suspended,        icon: Ban,         color: 'bg-red-500/10 text-red-400' },
    { label: 'Paid',          value: paid,             icon: CreditCard,  color: 'bg-purple-500/10 text-purple-400' },
    { label: 'Free',          value: free,             icon: TrendingUp,  color: 'bg-gray-500/10 dark:text-gray-400 text-gray-500' },
    { label: 'New This Week', value: newWeek,          icon: Clock,       color: 'bg-amber-500/10 text-amber-500' },
  ];

  // System insights — only show lines that are meaningful
  const insights = [
    { text: `${profiles.length} total user${profiles.length !== 1 ? 's' : ''} in the system`, color: 'text-blue-400', dot: 'bg-blue-500' },
    suspended > 0
      ? { text: `${suspended} suspended user${suspended !== 1 ? 's' : ''} need${suspended === 1 ? 's' : ''} review`, color: 'text-red-400', dot: 'bg-red-500' }
      : { text: 'All accounts are active — no suspensions', color: 'text-emerald-400', dot: 'bg-emerald-500' },
    { text: `${free} user${free !== 1 ? 's' : ''} on the free plan`, color: 'dark:text-gray-400 text-gray-500', dot: 'dark:bg-gray-500 bg-gray-400' },
    newWeek > 0
      ? { text: `${newWeek} new user${newWeek !== 1 ? 's' : ''} joined this week`, color: 'text-amber-400', dot: 'bg-amber-500' }
      : { text: 'No new signups this week', color: 'dark:text-gray-500 text-gray-400', dot: 'dark:bg-gray-600 bg-gray-300' },
  ];

  // Recent users — last 5 by created_at
  const recent = [...profiles]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const quickActions = [
    { label: 'View Users',  icon: Users,      tab: 'users',    color: 'text-blue-400' },
    { label: 'Open Plans',  icon: CreditCard, tab: 'plans',    color: 'text-purple-400' },
    { label: 'Open Gako',   icon: Zap,        tab: 'gako',     color: 'text-amber-400' },
    { label: 'View Logs',   icon: FileText,   tab: 'logs',     color: 'dark:text-gray-400 text-gray-500' },
  ];

  return (
    <div className="space-y-5">

      {/* System Insights */}
      <div className="p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <p className="text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest">System Insights</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ins.dot}`} />
              <p className={`text-sm ${ins.color}`}>{ins.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Growth Chart + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <GrowthChart profiles={profiles} />
        </div>

        {/* Quick Actions */}
        <div className="p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 flex flex-col justify-between gap-2">
          <p className="text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest mb-1">Quick Actions</p>
          {quickActions.map(({ label, icon: Icon, tab, color }) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl dark:bg-white/[0.03] bg-gray-50 dark:hover:bg-white/[0.06] hover:bg-gray-100 border dark:border-white/5 border-gray-100 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-sm dark:text-gray-300 text-gray-700 font-medium">{label}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 dark:text-gray-600 text-gray-300 group-hover:dark:text-gray-400 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Users */}
      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b dark:border-white/5 border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest">Recent Users</p>
          <button
            onClick={() => onNavigate('users')}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y dark:divide-white/5 divide-gray-50">
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center dark:text-gray-500 text-gray-400">No users yet</p>
          ) : recent.map(u => {
            const owner = isOwner(u);
            return (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  owner ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {((u.full_name || u.email || '?')[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm dark:text-white text-gray-900 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {owner ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium uppercase">Owner</span>
                  ) : u.role === 'admin' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium uppercase">Admin</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-500 font-medium uppercase">User</span>
                  )}
                  {u.is_suspended ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium uppercase">Suspended</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium uppercase">Active</span>
                  )}
                  <span className="text-[11px] dark:text-gray-600 text-gray-400 whitespace-nowrap hidden sm:block">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── Plan select ──────────────────────────────────────────────────────────────

const PLANS = ['free', 'basic', 'pro', 'enterprise'];
const PLAN_COLORS = {
  free: 'dark:text-gray-400 text-gray-500',
  basic: 'text-blue-500',
  pro: 'text-purple-400',
  enterprise: 'text-amber-500',
};

function PlanSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  if (disabled) {
    return (
      <span className={`text-xs font-medium capitalize ${PLAN_COLORS[value] || 'dark:text-gray-400 text-gray-500'}`}>
        {value}
      </span>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full capitalize font-medium border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white hover:dark:bg-white/10 hover:bg-gray-50 transition-colors ${PLAN_COLORS[value] || 'dark:text-gray-400 text-gray-500'}`}
      >
        {value} <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-8 left-0 z-50 dark:bg-[#1a1a2e] bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[120px]">
            {PLANS.map(p => (
              <button
                key={p}
                onClick={() => { onChange(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs capitalize font-medium transition-colors hover:dark:bg-white/5 hover:bg-gray-50 ${
                  value === p ? 'dark:text-white text-gray-900' : 'dark:text-gray-400 text-gray-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ profiles, isLoading }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  // Track which row+action is in-flight: { id, type: 'role'|'plan'|'suspend' }
  const [pending, setPending] = useState(null);

  const rpcMutate = async (fn, params, onSuccess) => {
    const { error } = await supabase.rpc(fn, params);
    if (error) throw error;
    return onSuccess;
  };

  const changeRole = useMutation({
    mutationFn: ({ id, role }) => {
      setPending({ id, type: 'role' });
      return rpcMutate(
        'admin_update_user_role',
        { target_user_id: id, new_role: role },
        role
      );
    },
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success(role === 'admin' ? 'Promoted to admin' : 'Demoted to user');
    },
    onError: e => toast.error(e.message),
    onSettled: () => setPending(null),
  });

  const changePlan = useMutation({
    mutationFn: ({ id, plan }) => {
      setPending({ id, type: 'plan' });
      return rpcMutate(
        'admin_update_user_plan',
        { target_user_id: id, new_plan: plan },
        plan
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Plan updated');
    },
    onError: e => toast.error(e.message),
    onSettled: () => setPending(null),
  });

  const toggleSuspend = useMutation({
    mutationFn: ({ id, suspend }) => {
      setPending({ id, type: 'suspend' });
      return rpcMutate(
        'admin_set_user_suspended',
        { target_user_id: id, suspended: suspend },
        suspend
      );
    },
    onSuccess: (suspended) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success(suspended ? 'User suspended' : 'User unsuspended');
    },
    onError: e => toast.error(e.message),
    onSettled: () => setPending(null),
  });

  const filtered = profiles
    .filter(p => {
      if (filter === 'all')       return true;
      if (filter === 'suspended') return p.is_suspended;
      if (filter === 'active')    return !p.is_suspended;
      if (filter === 'admin')     return isAdminRow(p) || isOwner(p);
      return true;
    })
    .filter(p =>
      !search ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(search.toLowerCase())
    );

  // Sort: owner first, then admins, then users
  const sorted = [...filtered].sort((a, b) => {
    if (isOwner(a)) return -1;
    if (isOwner(b)) return 1;
    if (isAdminRow(a) && !isAdminRow(b)) return -1;
    if (!isAdminRow(a) && isAdminRow(b)) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 dark:bg-white/5 dark:border-white/10 dark:text-white"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'active', 'suspended', 'admin'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'dark:bg-white/10 bg-gray-200 dark:text-white text-gray-900'
                  : 'dark:text-gray-500 text-gray-500 dark:hover:bg-white/5 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/5 border-gray-100">
                {['User', 'Role', 'Plan', 'Status', 'Joined', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 font-medium dark:text-gray-500 text-gray-400 text-[11px] uppercase tracking-widest ${i === 5 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm dark:text-gray-500 text-gray-400">No users found</td></tr>
              ) : sorted.map(user => {
                const owner      = isOwner(user);
                const adminUser  = isAdminRow(user);
                const isSelf     = user.id === currentUser?.id;
                const rowPending = pending?.id === user.id;
                const rowClass   = owner
                  ? 'border-b dark:border-white/5 border-gray-50 dark:bg-amber-500/[0.03] bg-amber-50/40'
                  : 'border-b dark:border-white/5 border-gray-50 dark:hover:bg-white/[0.015] hover:bg-gray-50/50 transition-colors';

                return (
                  <tr key={user.id} className={rowClass}>
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          owner ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {((user.full_name || user.email || '?')[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium dark:text-white text-gray-900 text-sm leading-tight">
                              {user.full_name || <span className="dark:text-gray-600 text-gray-400 italic text-xs">No name</span>}
                            </p>
                            {owner && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                            {isSelf && !owner && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium uppercase tracking-wide">You</span>
                            )}
                          </div>
                          <p className="text-xs dark:text-gray-500 text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-5 py-3.5">
                      <RoleBadge user={user} />
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <PlanSelect
                          value={user.subscription_plan || 'free'}
                          onChange={plan => changePlan.mutate({ id: user.id, plan })}
                          disabled={owner || (rowPending && pending.type === 'plan')}
                          loading={rowPending && pending.type === 'plan'}
                        />
                        {(owner || adminUser) && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase tracking-wide whitespace-nowrap">
                            <ShieldCheck className="w-2.5 h-2.5" /> Full Access
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge suspended={user.is_suspended} />
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-xs dark:text-gray-500 text-gray-400 whitespace-nowrap">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {owner ? (
                          <span className="flex items-center gap-1 text-[10px] dark:text-gray-600 text-gray-400 px-2 py-1 rounded-lg dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-100">
                            <Lock className="w-3 h-3" /> Protected
                          </span>
                        ) : (
                          <>
                            {/* Promote / Demote — disabled for self */}
                            {adminUser ? (
                              <button
                                onClick={() => changeRole.mutate({ id: user.id, role: 'user' })}
                                disabled={isSelf || (rowPending && pending.type === 'role')}
                                title={isSelf ? 'Cannot demote yourself' : 'Demote to user'}
                                className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {rowPending && pending.type === 'role'
                                  ? <span className="w-3.5 h-3.5 block border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                  : <ShieldOff className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <button
                                onClick={() => changeRole.mutate({ id: user.id, role: 'admin' })}
                                disabled={rowPending && pending.type === 'role'}
                                title="Promote to admin"
                                className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-400 transition-colors disabled:opacity-30"
                              >
                                {rowPending && pending.type === 'role'
                                  ? <span className="w-3.5 h-3.5 block border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                  : <ShieldCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {/* Suspend / Unsuspend — disabled for self */}
                            <button
                              onClick={() => toggleSuspend.mutate({ id: user.id, suspend: !user.is_suspended })}
                              disabled={isSelf || (rowPending && pending.type === 'suspend')}
                              title={isSelf ? 'Cannot suspend yourself' : user.is_suspended ? 'Unsuspend' : 'Suspend'}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                user.is_suspended
                                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                  : 'hover:bg-red-500/10 text-red-400'
                              }`}
                            >
                              {rowPending && pending.type === 'suspend'
                                ? <span className={`w-3.5 h-3.5 block border-2 rounded-full animate-spin ${
                                    user.is_suspended
                                      ? 'border-emerald-500/30 border-t-emerald-500'
                                      : 'border-red-400/30 border-t-red-400'
                                  }`} />
                                : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

const PLAN_ACCENT = {
  free:       'dark:text-gray-500 text-gray-400',
  basic:      'text-blue-500',
  pro:        'text-purple-400',
  enterprise: 'text-amber-500',
};

function PlansTab({ profiles }) {
  const queryClient = useQueryClient();
  const [editIdx, setEditIdx] = useState(null);
  const [buf, setBuf] = useState({});

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const startEdit = i => { setEditIdx(i); setBuf({ ...plans[i] }); };

  const saveEdit = async i => {
    const plan = plans[i];
    const { error } = await supabase
      .from('plans')
      .update({
        name:          buf.name,
        price_monthly: Number(buf.price_monthly),
        description:   buf.description,
        updated_at:    new Date().toISOString(),
      })
      .eq('key', plan.key);
    if (error) { toast.error('Save failed: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    queryClient.invalidateQueries({ queryKey: ['public-plans'] });
    setEditIdx(null);
    toast.success('Plan saved');
  };

  const toggleActive = async plan => {
    const next = !plan.is_active;
    const { error } = await supabase
      .from('plans')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('key', plan.key);
    if (error) { toast.error('Failed: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    queryClient.invalidateQueries({ queryKey: ['public-plans'] });
    toast.success(`${plan.name} ${next ? 'activated' : 'hidden from store'}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 animate-pulse">
            <div className="h-4 w-20 dark:bg-white/10 bg-gray-200 rounded mb-4" />
            <div className="h-7 w-16 dark:bg-white/10 bg-gray-200 rounded mb-3" />
            <div className="h-3 w-full dark:bg-white/5 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {plans.map((plan, i) => {
        const count   = profiles.filter(u => (u.subscription_plan || 'free') === plan.key).length;
        const editing = editIdx === i;
        return (
          <div
            key={plan.key}
            className={`p-5 rounded-2xl border transition-opacity ${
              plan.is_active
                ? 'dark:bg-white/[0.03] bg-white dark:border-white/5 border-gray-100'
                : 'dark:bg-white/[0.015] bg-gray-50 dark:border-white/[0.03] border-gray-100 opacity-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              {editing ? (
                <Input value={buf.name} onChange={e => setBuf(b => ({ ...b, name: e.target.value }))}
                  className="w-32 h-7 text-sm dark:bg-white/5 dark:border-white/10 dark:text-white" />
              ) : (
                <h3 className="text-base font-bold dark:text-white text-gray-900">{plan.name}</h3>
              )}
              <button onClick={() => editing ? saveEdit(i) : startEdit(i)}
                className="p-1 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400 transition-colors">
                {editing ? <Check className="w-4 h-4 text-emerald-500" /> : <Edit2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-baseline gap-1 mb-3">
              {editing ? (
                <Input type="number" value={buf.price_monthly}
                  onChange={e => setBuf(b => ({ ...b, price_monthly: e.target.value }))}
                  className="w-24 h-7 text-sm dark:bg-white/5 dark:border-white/10 dark:text-white" />
              ) : (
                <>
                  <span className="text-2xl font-bold dark:text-white text-gray-900">${plan.price_monthly}</span>
                  <span className="text-xs dark:text-gray-500 text-gray-400">/mo</span>
                </>
              )}
            </div>

            {editing ? (
              <textarea value={buf.description} onChange={e => setBuf(b => ({ ...b, description: e.target.value }))}
                rows={2} className="w-full text-xs rounded-lg dark:bg-white/5 border dark:border-white/10 border-gray-200 dark:text-gray-300 text-gray-700 p-2 resize-none" />
            ) : (
              <p className="text-xs dark:text-gray-500 text-gray-400">{plan.description}</p>
            )}

            <div className="mt-4 pt-3 border-t dark:border-white/5 border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={plan.is_active}
                  onCheckedChange={() => toggleActive(plan)}
                />
                <span className="text-xs dark:text-gray-500 text-gray-400">
                  {plan.is_active ? 'Visible in store' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs dark:text-gray-500 text-gray-400">
                  {count} sub{count !== 1 ? 's' : ''}
                </span>
                <span className={`text-xs font-bold uppercase tracking-widest ${PLAN_ACCENT[plan.key] ?? 'dark:text-gray-500'}`}>
                  {plan.key}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// GakoTab replaced by GakoPanel (see src/components/admin/GakoPanel.jsx)

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  return (
    <div className="p-12 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 flex flex-col items-center justify-center text-center">
      <FileText className="w-10 h-10 dark:text-gray-700 text-gray-300 mb-3" />
      <p className="font-semibold dark:text-white text-gray-900 mb-1">Activity Logs</p>
      <p className="text-sm dark:text-gray-500 text-gray-400 max-w-xs">
        Coming soon — admin action logs, login events, and full audit trail.
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { isAdminProfile } = useAuth();
  const { data: profiles = [], isLoading, isError, error } = useProfiles();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isAdminProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Shield className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold dark:text-white text-gray-900">Access Denied</p>
        <p className="text-sm dark:text-gray-500 text-gray-400 text-center max-w-sm">
          This area is restricted to accounts with administrator privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-6xl">
      <div>
        <h1 className="text-xl font-bold dark:text-white text-gray-900">Admin Panel</h1>
        <p className="text-sm dark:text-gray-500 text-gray-400 mt-0.5">
          Manage users, subscriptions, and system settings.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="dark:bg-white/5 bg-gray-100 rounded-xl p-1 flex-wrap h-auto gap-1">
          {[
            { value: 'overview', icon: BarChart3,  label: 'Overview' },
            { value: 'users',    icon: Users,      label: 'Users' },
            { value: 'plans',    icon: CreditCard, label: 'Plans' },
            { value: 'gako',     icon: Zap,        label: 'Gako' },
            { value: 'logs',     icon: FileText,   label: 'Logs' },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger key={value} value={value}
              className="rounded-lg gap-1.5 text-xs data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Icon className="w-3.5 h-3.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {isError ? (
            <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm space-y-1">
              <p className="font-semibold">Failed to load users</p>
              <p className="text-xs opacity-70">{error?.message ?? 'Unknown error — run supabase/admin_rls_fix.sql in the SQL Editor.'}</p>
            </div>
          ) : (
            <OverviewTab profiles={profiles} onNavigate={setActiveTab} />
          )}
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          {isError ? (
            <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm space-y-1">
              <p className="font-semibold">Failed to load users</p>
              <p className="text-xs opacity-70">{error?.message ?? 'Unknown error — run supabase/admin_rls_fix.sql in the SQL Editor.'}</p>
            </div>
          ) : (
            <UsersTab profiles={profiles} isLoading={isLoading} />
          )}
        </TabsContent>
        <TabsContent value="plans"    className="mt-6"><PlansTab profiles={profiles} /></TabsContent>
        <TabsContent value="gako"     className="mt-6"><GakoPanel /></TabsContent>
        <TabsContent value="logs"     className="mt-6"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
