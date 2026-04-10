import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import GeckoIcon from '@/components/icons/GeckoIcon';
import {
  Zap, Plus, X, Edit2, Check, ChevronDown, ChevronUp,
  Brain, History, BookOpen, Trash2, Cpu, Key, Terminal,
  Eye, EyeOff, CheckCircle, Search, Activity, Settings2,
  GitBranch, Rocket, Tag, BarChart3, Play, Star,
  AlertTriangle, Clock, Shield, FileText,
  Send, MessageCircle, RotateCcw, RefreshCw, WifiOff, Wifi,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS       = ['anthropic', 'openai', 'gemini', 'custom'];
const STATUS_OPTS     = ['online', 'offline', 'testing'];
const PUBLISH_OPTS    = ['draft', 'published', 'archived'];
const RULE_TYPES      = ['system', 'tone', 'do', 'dont', 'market', 'risk', 'format'];
const SKILL_CATS      = ['general', 'analysis', 'education', 'alerts', 'market', 'risk', 'custom'];
const METHOD_CATS     = ['general', 'fundamental', 'technical', 'earnings', 'macro', 'risk', 'sentiment'];

const RULE_TYPE_META = {
  system:  { label: 'System',    color: 'text-blue-400    bg-blue-500/10'    },
  tone:    { label: 'Tone',      color: 'text-purple-400  bg-purple-500/10'  },
  do:      { label: 'Do',        color: 'text-emerald-500 bg-emerald-500/10' },
  dont:    { label: "Don't",     color: 'text-red-400     bg-red-500/10'     },
  market:  { label: 'Market',    color: 'text-amber-400   bg-amber-500/10'   },
  risk:    { label: 'Risk',      color: 'text-orange-400  bg-orange-500/10'  },
  format:  { label: 'Format',    color: 'text-cyan-400    bg-cyan-500/10'    },
};

// ─── Category badge helper (single source of truth) ──────────────────────────
const SKILL_CAT_META = {
  general:   { label: 'General',   color: 'text-slate-400   bg-slate-500/10'   },
  analysis:  { label: 'Analysis',  color: 'text-blue-400    bg-blue-500/10'    },
  education: { label: 'Education', color: 'text-indigo-400  bg-indigo-500/10'  },
  alerts:    { label: 'Alerts',    color: 'text-amber-400   bg-amber-500/10'   },
  market:    { label: 'Market',    color: 'text-cyan-400    bg-cyan-500/10'    },
  risk:      { label: 'Risk',      color: 'text-rose-400    bg-rose-500/10'    },
  strategy:  { label: 'Strategy',  color: 'text-purple-400  bg-purple-500/10'  },
  earnings:  { label: 'Earnings',  color: 'text-yellow-400  bg-yellow-500/10'  },
  behavior:  { label: 'Behavior',  color: 'text-emerald-400 bg-emerald-500/10' },
  methods:   { label: 'Methods',   color: 'text-teal-400    bg-teal-500/10'    },
  custom:    { label: 'Custom',    color: 'text-gray-400    bg-gray-500/10'    },
};

const catMeta = (cat) => SKILL_CAT_META[cat] ?? { label: cat ?? 'general', color: 'text-gray-400 bg-gray-500/10' };

const CatBadge = ({ cat }) => {
  const m = catMeta(cat);
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${m.color}`}>
      {m.label}
    </span>
  );
};

const PANEL_TABS = [
  { id: 'overview',  icon: BarChart3,  label: 'Overview'  },
  { id: 'model',     icon: Cpu,        label: 'Model'      },
  { id: 'skills',    icon: Zap,        label: 'Skills'     },
  { id: 'behavior',  icon: Brain,      label: 'Behavior'   },
  { id: 'methods',   icon: BookOpen,   label: 'Methods'    },
  { id: 'testlab',   icon: Play,       label: 'Test Lab'   },
  { id: 'logs',      icon: History,    label: 'Logs'       },
  { id: 'versions',  icon: GitBranch,  label: 'Versions'   },
];

// ─── Auth-aware edge function helper ─────────────────────────────────────────
// Uses raw fetch() instead of supabase.functions.invoke() so that we have
// complete, unambiguous control over the Authorization header.
// supabase.functions.invoke() internally spreads the SDK's own auth headers
// which can silently overwrite a custom Authorization value depending on the
// SDK version — bypassing it entirely removes all uncertainty.

async function invokeWithAuth(fnName, options = {}) {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: options.body,
  });

  if (error) {
    throw new Error(error.message ?? `Edge function ${fnName} failed`);
  }

  return data;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const Spin = ({ className = 'border-blue-500/30 border-t-blue-500' }) => (
  <span className={`w-4 h-4 border-2 rounded-full animate-spin shrink-0 ${className}`} />
);

const Card = ({ children, className = '' }) => (
  <div className={`p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 ${className}`}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest mb-4">
    {children}
  </p>
);

const TableError = ({ msg }) => (
  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs flex items-center gap-2">
    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
    {msg ?? 'Could not load data. Check your database connection or RLS policies.'}
  </div>
);

function Field({ label, children }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1.5">{label}</label>}
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 dark:text-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500/50';

// ─── Data hooks ───────────────────────────────────────────────────────────────

const useGakoSettings = () => useQuery({
  queryKey: ['gako-settings'],
  queryFn: async () => {
    // Singleton table — order by updated_at desc and take the first row so we
    // always get the most-recently-saved record even if duplicates somehow exist.
    const { data, error } = await supabase
      .from('gako_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;   // null if table is empty
  },
  retry: false,
});

const useGakoSkills = () => useQuery({
  queryKey: ['gako-skills'],
  queryFn: async () => {
    const { data, error } = await supabase.from('gako_skills').select('*').order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

const useGakoBehavior = () => useQuery({
  queryKey: ['gako-behavior'],
  queryFn: async () => {
    const { data, error } = await supabase.from('gako_behavior_rules').select('*').order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

const useGakoMethods = () => useQuery({
  queryKey: ['gako-methods'],
  queryFn: async () => {
    const { data, error } = await supabase.from('gako_methods').select('*').order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

const useGakoLogs = () => useQuery({
  queryKey: ['gako-logs'],
  queryFn: async () => {
    const { data, error } = await supabase.from('gako_logs').select('*')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

const useGakoVersions = () => useQuery({
  queryKey: ['gako-versions'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('gako_versions')
      .select('id, version_number, status, summary, created_at, published_at, archived_at')
      .order('version_number', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

const useTestRuns = () => useQuery({
  queryKey: ['gako-test-runs'],
  queryFn: async () => {
    const { data, error } = await supabase.from('gako_test_runs').select('*')
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

// ─── Model-tab data hooks ─────────────────────────────────────────────────────

// Never select key_value — only masked key_hint is used in the UI
const useGakoApiKeys = () => useQuery({
  queryKey: ['gako-api-keys'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('gako_api_keys')
      .select('id,provider,label,key_hint,is_active,validated_at,last_tested_at,last_tested_ok,test_latency_ms,test_error,created_at,created_by_email')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

const useGakoAuditLog = () => useQuery({
  queryKey: ['gako-audit-log'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('gako_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  },
  retry: false,
});

// ─── Model-tab constants ──────────────────────────────────────────────────────

const PROVIDER_MODELS = {
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5', 'claude-3-5-sonnet-20241022', 'claude-sonnet-4-6'],
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini'],
  gemini:    ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  custom:    [],
};

const PROVIDER_PREFIXES = {
  anthropic: ['claude'],
  openai:    ['gpt-', 'o1', 'o3'],
  gemini:    ['gemini'],
};

const HEALTH_META = {
  connected:      { label: 'Connected',      color: 'text-emerald-500 bg-emerald-500/10', dot: 'bg-emerald-500' },
  untested:       { label: 'Untested',        color: 'text-blue-400    bg-blue-500/10',    dot: 'bg-blue-400'   },
  missing_key:    { label: 'Missing Key',     color: 'text-amber-400   bg-amber-500/10',   dot: 'bg-amber-500'  },
  invalid_config: { label: 'Invalid Config',  color: 'text-red-400     bg-red-500/10',     dot: 'bg-red-500'    },
  test_failed:    { label: 'Test Failed',     color: 'text-red-400     bg-red-500/10',     dot: 'bg-red-500'    },
  disabled:       { label: 'Disabled',        color: 'text-gray-400    bg-gray-500/10',    dot: 'dark:bg-gray-600 bg-gray-400' },
};

const HEALTH_DESCRIPTIONS = {
  connected:      'Active key tested successfully — ready to serve requests',
  untested:       'API key is set but has not been tested yet — run a connection test',
  missing_key:    'No active API key for this provider — add one below or set an env secret',
  invalid_config: 'Model name does not match the selected provider',
  test_failed:    'Last connection test failed — check your API key',
  disabled:       'Model is disabled — toggle "Model Active" to enable it',
};

const AUDIT_ACTION_LABELS = {
  settings_updated:  'Saved model settings',
  key_added:         'Added API key',
  key_deleted:       'Deleted API key',
  key_tested:        'Ran connection test',
  defaults_restored: 'Restored defaults',
};

// ─── Model-tab helpers ────────────────────────────────────────────────────────

function maskKey(raw) {
  if (!raw || raw.length < 8) return '•••••••';
  const prefix = raw.slice(0, Math.min(6, raw.length - 4));
  const suffix = raw.slice(-4);
  return `${prefix}...${suffix}`;
}

function fmtDt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function validateProviderModel(provider, modelName) {
  if (!modelName || provider === 'custom') return null;
  const prefixes = PROVIDER_PREFIXES[provider];
  if (!prefixes) return null;
  const lower = modelName.toLowerCase();
  if (!prefixes.some(p => lower.startsWith(p))) {
    return `"${modelName}" doesn't look like a ${PROVIDER_LABEL[provider] ?? provider} model name`;
  }
  return null;
}

function computeHealthState(form, apiKeys) {
  if (!form.enabled) return 'disabled';
  const modelErr = validateProviderModel(form.provider, form.model_name);
  if (modelErr) return 'invalid_config';
  const activeKey = apiKeys.find(k => k.provider === form.provider && k.is_active);
  if (!activeKey) return 'missing_key';
  if (activeKey.last_tested_ok === false) return 'test_failed';
  if (activeKey.last_tested_ok === true)  return 'connected';
  return 'untested';
}

// ─── 1. Overview helpers ──────────────────────────────────────────────────────

const STATUS_META = {
  online:  { dot: 'bg-emerald-500', badge: 'text-emerald-500 bg-emerald-500/10', label: 'Local Intelligence' },
  offline: { dot: 'bg-red-500',     badge: 'text-red-400    bg-red-500/10',      label: 'Offline'            },
  testing: { dot: 'bg-amber-500',   badge: 'text-amber-400  bg-amber-500/10',    label: 'Limited Mode'       },
  // future: ai_connected → 'AI Connected'
};

const PUBLISH_META = {
  draft:     'text-amber-400   bg-amber-500/10',
  published: 'text-emerald-500 bg-emerald-500/10',
  archived:  'text-gray-400    bg-gray-500/10',
};

const PROVIDER_LABEL = {
  anthropic: 'Anthropic / Claude',
  openai:    'OpenAI / GPT',
  gemini:    'Google / Gemini',
  custom:    'Custom Provider',
};

// ── Small reusable atoms ──────────────────────────────────────

function QuickBtn({ icon: Icon, label, onClick, variant = 'default' }) {
  const cls = variant === 'primary'
    ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500/50'
    : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 border dark:border-white/5 border-gray-200';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100
        text-left w-full group transition-all cursor-pointer
        dark:hover:bg-white/[0.06] hover:bg-gray-50/80
        dark:hover:border-white/10 hover:border-gray-200
        hover:shadow-sm focus:outline-none"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-semibold dark:text-gray-500 text-gray-400 uppercase tracking-widest">{label}</p>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold dark:text-white text-gray-900 tabular-nums">{value}</p>
      <p className="text-[11px] dark:text-gray-600 text-gray-400 mt-1 leading-snug">{sub}</p>
    </button>
  );
}

function InsightRow({ icon: Icon, iconColor, title, detail, state, onClick }) {
  const stateStyle = state === 'ok'      ? 'text-emerald-500 bg-emerald-500/10'
                   : state === 'warn'    ? 'text-amber-400   bg-amber-500/10'
                   :                      'text-gray-400     bg-gray-500/10';
  const stateLabel = state === 'ok' ? 'Ready' : state === 'warn' ? 'Needs setup' : 'Inactive';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 py-3 border-b dark:border-white/5 border-gray-50 last:border-0 transition-colors ${onClick ? 'cursor-pointer dark:hover:bg-white/[0.02] hover:bg-gray-50/60 rounded-xl px-2 -mx-2' : ''}`}
    >
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold dark:text-white text-gray-900 leading-snug">{title}</p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{detail}</p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide shrink-0 ${stateStyle}`}>
        {stateLabel}
      </span>
    </Tag>
  );
}

function EmptyCallout({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 rounded-2xl dark:bg-amber-500/[0.03] bg-amber-50/50 border border-amber-500/10">
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold dark:text-white text-gray-900 mb-0.5">{title}</p>
        <p className="text-xs dark:text-gray-500 text-gray-500 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onAction}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors shrink-0 mt-0.5 cursor-pointer"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function NextStepRow({ num, title, description, done, onClick }) {
  return (
    <button
      onClick={!done ? onClick : undefined}
      disabled={done}
      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
        done
          ? 'opacity-50 cursor-default'
          : 'cursor-pointer dark:hover:bg-white/[0.03] hover:bg-gray-50 group'
      }`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 transition-colors ${
        done
          ? 'bg-emerald-500/20 text-emerald-500'
          : 'dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-500 group-hover:bg-blue-500/10 group-hover:text-blue-400'
      }`}>
        {done ? <Check className="w-3 h-3" /> : num}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${done ? 'dark:text-gray-500 text-gray-400 line-through' : 'dark:text-white text-gray-900'}`}>
          {title}
        </p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{description}</p>
      </div>
      {!done && <ChevronDown className="w-3.5 h-3.5 dark:text-gray-600 text-gray-400 -rotate-90 shrink-0 mt-1 group-hover:text-blue-400 transition-colors" />}
    </button>
  );
}

// ─── 1. Overview ──────────────────────────────────────────────────────────────

function OverviewSection({ settings, skills, rules, methods, setTab }) {
  const qc = useQueryClient();
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: runs = [] } = useTestRuns();

  // ── Derived counts ────────────────────────────────────────
  const activeSkills  = skills.filter(s => s.enabled).length;
  const totalSkills   = skills.length;
  const activeRules   = rules.filter(r => r.enabled).length;
  const activeMethods = methods.filter(m => m.enabled).length;
  const scoredRuns    = runs.filter(r => r.passed !== null);
  const passedRuns    = runs.filter(r => r.passed === true).length;
  const successRate   = scoredRuns.length > 0
    ? Math.round((passedRuns / scoredRuns.length) * 100) + '%'
    : null;

  // ── Settings-derived display values ──────────────────────
  const statusKey  = settings?.status ?? 'online';
  const statusMeta = STATUS_META[statusKey] ?? STATUS_META.online;
  const publishKey = settings?.publish_status ?? 'draft';
  const modeLabel  = PROVIDER_LABEL[settings?.provider] ?? 'Local Intelligence';
  const updatedAt  = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // ── Version actions ───────────────────────────────────────
  const versionAction = useMutation({
    mutationFn: async (status) => {
      if (!settings?.id) throw new Error('No settings row found — save Model Settings first.');
      const patch = { publish_status: status, ...(status === 'published' ? { last_published: new Date().toISOString() } : {}) };
      const { error } = await supabase.from('gako_settings').update(patch).eq('id', settings.id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['gako-settings'] });
      const labels = { published: 'Published to production', draft: 'Saved as draft', archived: 'Archived' };
      toast.success(labels[status] ?? 'Updated');
    },
    onError: e => toast.error(e.message),
  });

  const handleCopy = () => {
    if (!settings?.system_prompt) return;
    navigator.clipboard.writeText(settings.system_prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Next steps derivation ────────────────────────────────
  const allReady = activeSkills > 0 && activeRules > 0 && activeMethods > 0 && runs.length > 0;
  const steps = [
    {
      title: 'Add behavior rules',
      description: 'Define how Gako should respond — tone, risk style, content boundaries.',
      done: activeRules > 0,
      onClick: () => setTab('behavior'),
    },
    {
      title: 'Create a playbook',
      description: 'Build structured reasoning flows for earnings, risk, and trade setups.',
      done: activeMethods > 0,
      onClick: () => setTab('methods'),
    },
    {
      title: 'Run a test',
      description: 'Validate Gako\'s responses from the Test Lab before going live.',
      done: runs.length > 0,
      onClick: () => setTab('testlab'),
    },
  ];

  return (
    <div className="space-y-4">

      {/* ── Identity / Hero card ─────────────────────────── */}
      <Card>
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div className="relative w-14 h-14 rounded-2xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            <GeckoIcon className="w-10 h-10" />
            <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 dark:border-[#0d0d1a] border-white ${statusMeta.dot}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-bold text-lg dark:text-white text-gray-900 leading-none">Gako AI</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${PUBLISH_META[publishKey]}`}>
                {publishKey}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusMeta.badge}`}>
                {statusMeta.label}
              </span>
              {settings?.enabled === false && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-500/10 text-red-400">
                  Disabled
                </span>
              )}
            </div>

            {/* Specs row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {[
                { label: 'Mode',    value: modeLabel },
                { label: 'Model',   value: settings?.model_name ?? '—' },
                { label: 'Temp',    value: settings?.temperature != null ? String(settings.temperature) : '—' },
                { label: 'Tokens',  value: settings?.max_tokens  != null ? settings.max_tokens.toLocaleString() : '—' },
                ...(updatedAt ? [{ label: 'Updated', value: updatedAt }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest dark:text-gray-600 text-gray-400">{label}</span>
                  <span className="text-xs dark:text-gray-300 text-gray-700 font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Action rows */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t dark:border-white/5 border-gray-100">
              {/* Version actions */}
              <button
                onClick={() => versionAction.mutate('published')}
                disabled={versionAction.isPending || publishKey === 'published'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer"
              >
                <Rocket className="w-3 h-3" />
                Publish Version
              </button>
              <button
                onClick={() => versionAction.mutate('draft')}
                disabled={versionAction.isPending || publishKey === 'draft'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 border dark:border-white/5 border-gray-200 disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
              >
                <GitBranch className="w-3 h-3" />
                Save as Draft
              </button>
              <button
                onClick={() => toast.info('Duplicate version — coming soon')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 border dark:border-white/5 border-gray-200 transition-colors shrink-0 cursor-pointer"
              >
                <Tag className="w-3 h-3" />
                Duplicate
              </button>

              <div className="flex-1" />

              {/* Nav shortcuts */}
              <QuickBtn icon={Cpu}  label="Edit Model"    onClick={() => setTab('model')}   />
              <QuickBtn icon={Play} label="Test Lab"      onClick={() => setTab('testlab')} />
              <QuickBtn icon={Zap}  label="Skills"        onClick={() => setTab('skills')}  />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Metric cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Active Skills"
          value={activeSkills}
          sub={totalSkills > 0 ? `${activeSkills} of ${totalSkills} enabled` : 'No skills yet'}
          icon={Zap}
          color="text-blue-400 bg-blue-500/10"
          onClick={() => setTab('skills')}
        />
        <MetricCard
          label="Behavior Rules"
          value={activeRules}
          sub={activeRules > 0 ? `${activeRules} rule${activeRules !== 1 ? 's' : ''} active` : 'Not configured'}
          icon={Brain}
          color="text-purple-400 bg-purple-500/10"
          onClick={() => setTab('behavior')}
        />
        <MetricCard
          label="Playbooks"
          value={activeMethods}
          sub={activeMethods > 0 ? `${activeMethods} available` : 'None created'}
          icon={BookOpen}
          color="text-amber-400 bg-amber-500/10"
          onClick={() => setTab('methods')}
        />
        <MetricCard
          label="Test Success"
          value={successRate ?? '—'}
          sub={scoredRuns.length > 0 ? `${passedRuns} of ${scoredRuns.length} passed` : 'No tests run yet'}
          icon={CheckCircle}
          color="text-emerald-500 bg-emerald-500/10"
          onClick={() => setTab('testlab')}
        />
      </div>

      {/* ── Empty-state callouts ────────────────────────────── */}
      <div className="space-y-2">
        {activeRules === 0 && (
          <EmptyCallout
            icon={Brain}
            title="Behavior Rules not configured"
            description="Define how Gako should respond in different scenarios — risk tone, aggressiveness, communication style."
            actionLabel="Create first rule"
            onAction={() => setTab('behavior')}
          />
        )}
        {activeMethods === 0 && (
          <EmptyCallout
            icon={BookOpen}
            title="No analysis methods yet"
            description="Create structured reasoning flows for complex analysis — earnings, risk assessment, trade setups."
            actionLabel="Create first playbook"
            onAction={() => setTab('methods')}
          />
        )}
      </div>

      {/* ── Active Configuration (System Prompt) ─────────��─── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
            <p className="text-xs font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-widest">Active Configuration</p>
            <div className="flex gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">Base Prompt</span>
              {activeSkills > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold">Skills</span>}
              {activeRules  > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10  text-amber-400  font-semibold">Rules</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              title="Copy prompt"
              className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {copied
                ? <Check   className="w-3.5 h-3.5 text-emerald-500" />
                : <FileText className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />}
            </button>
            <button
              onClick={() => setTab('model')}
              title="Edit in Model Settings"
              className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
            </button>
            <button
              onClick={() => setPromptExpanded(e => !e)}
              className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {promptExpanded
                ? <ChevronUp   className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
                : <ChevronDown className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />}
            </button>
          </div>
        </div>

        {settings?.system_prompt ? (
          <div className="p-3 rounded-xl dark:bg-black/20 bg-gray-50 border dark:border-white/5 border-gray-100">
            <p className={`text-xs dark:text-gray-300 text-gray-700 font-mono leading-relaxed whitespace-pre-wrap ${!promptExpanded ? 'line-clamp-3' : ''}`}>
              {settings.system_prompt}
            </p>
            {!promptExpanded && (
              <button onClick={() => setPromptExpanded(true)} className="text-[10px] text-blue-400 hover:underline mt-1.5 block cursor-pointer">
                Show full prompt
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-3 px-3 rounded-xl dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-xs dark:text-gray-500 text-gray-400">
              No system prompt configured.{' '}
              <button onClick={() => setTab('model')} className="text-blue-400 hover:underline cursor-pointer">
                Set one in Model Settings.
              </button>
            </p>
          </div>
        )}
      </Card>

      {/* ── System Insights ─────────────────────────────────── */}
      <Card>
        <SectionLabel>System Insights</SectionLabel>
        <InsightRow
          icon={Zap}
          iconColor="text-blue-400 bg-blue-500/10"
          title="Skills System"
          detail={activeSkills > 0 ? `${activeSkills} skill${activeSkills !== 1 ? 's' : ''} loaded and active` : 'No skills — Gako will respond without domain context'}
          state={activeSkills > 0 ? 'ok' : 'warn'}
          onClick={() => setTab('skills')}
        />
        <InsightRow
          icon={Brain}
          iconColor="text-purple-400 bg-purple-500/10"
          title="Behavior Rules"
          detail={activeRules > 0 ? `${activeRules} rule${activeRules !== 1 ? 's' : ''} shaping tone and content` : 'No behavior rules — responses are unconstrained'}
          state={activeRules > 0 ? 'ok' : 'warn'}
          onClick={() => setTab('behavior')}
        />
        <InsightRow
          icon={Play}
          iconColor="text-emerald-500 bg-emerald-500/10"
          title="Test Lab"
          detail={runs.length > 0 ? `${runs.length} test run${runs.length !== 1 ? 's' : ''} logged${successRate ? ` · ${successRate} pass rate` : ''}` : 'No runs yet — ready for internal validation'}
          state={runs.length > 0 ? 'ok' : 'inactive'}
          onClick={() => setTab('testlab')}
        />
      </Card>

      {/* ── Recommended Setup (Next Steps) ──────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Recommended Setup</SectionLabel>
          {allReady && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold uppercase tracking-wide">
              Complete
            </span>
          )}
        </div>

        {allReady ? (
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold dark:text-white text-gray-900">Gako is ready for production</p>
              <p className="text-xs dark:text-gray-500 text-gray-400">All systems configured. Publish this version when ready.</p>
            </div>
            <button
              onClick={() => versionAction.mutate('published')}
              disabled={versionAction.isPending || publishKey === 'published'}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer"
            >
              <Rocket className="w-3 h-3 inline mr-1" />
              Publish
            </button>
          </div>
        ) : (
          <div className="divide-y dark:divide-white/5 divide-gray-50">
            {steps.map((step, i) => (
              <NextStepRow
                key={step.title}
                num={i + 1}
                title={step.title}
                description={step.description}
                done={step.done}
                onClick={step.onClick}
              />
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}

// ─── 2. Model Settings ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  provider: 'anthropic', model_name: 'claude-sonnet-4-6', temperature: 0.7,
  max_tokens: 2048, system_prompt: '', fallback_model: '', fallback_provider: '',
  api_endpoint: '', enabled: true, status: 'online', publish_status: 'draft',
};

// ── Health Badge atom ─────────────────────────────────────────────────────────

function HealthBadge({ state }) {
  const meta = HEALTH_META[state] ?? HEALTH_META.missing_key;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

// ── API Keys Section ──────────────────────────────────────────────────────────

const EMPTY_NEW_KEY = { provider: 'gemini', label: '', key_value: '', is_active: true };

function ApiKeysSection({ apiKeys, keysLoading, adminEmail }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState(EMPTY_NEW_KEY);
  const [showValue, setShowValue] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [secrets, setSecrets] = useState(null);   // { env_secrets, db_keys }
  const [secretsLoading, setSecretsLoading] = useState(false);
  const nk = (k, v) => setNewKey(prev => ({ ...prev, [k]: v }));

  const checkSecrets = useCallback(async () => {
    setSecretsLoading(true);
    try {
      const data = await invokeWithAuth('gako-config', {
        body: { action: 'check_secrets' },
      });
      setSecrets(data);
    } catch (err) {
      console.error('[gako-config] check_secrets failed:', err.message);
      toast.error('Could not check secrets: ' + err.message);
    } finally {
      setSecretsLoading(false);
    }
  }, []);

  // Grouped by provider
  const grouped = PROVIDERS.reduce((acc, p) => {
    acc[p] = (apiKeys ?? []).filter(k => k.provider === p);
    return acc;
  }, {});

  const addKey = useMutation({
    mutationFn: async () => {
      const raw = newKey.key_value.trim();
      if (!raw) throw new Error('API key value is required');
      const hint = maskKey(raw);
      // Deactivate existing keys for this provider when setting new one as active
      if (newKey.is_active) {
        await supabase.from('gako_api_keys').update({ is_active: false }).eq('provider', newKey.provider);
      }
      const { error } = await supabase.from('gako_api_keys').insert({
        provider: newKey.provider,
        label: newKey.label.trim() || `${newKey.provider} key`,
        key_value: raw,
        key_hint: hint,
        is_active: newKey.is_active,
        created_by_email: adminEmail,
      });
      if (error) throw error;
      // Audit log (non-blocking)
      supabase.from('gako_audit_log').insert({
        admin_email: adminEmail,
        action: 'key_added',
        details: { provider: newKey.provider, label: newKey.label || `${newKey.provider} key` },
      }).then(({ error: e }) => { if (e) console.warn('[audit] key_added failed:', e.message); });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-api-keys'] });
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });
      toast.success('API key added');
      setAdding(false);
      setNewKey(EMPTY_NEW_KEY);
      setShowValue(false);
    },
    onError: e => toast.error('Add key failed: ' + e.message),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, provider }) => {
      await supabase.from('gako_api_keys').update({ is_active: false }).eq('provider', provider);
      const { error } = await supabase.from('gako_api_keys').update({ is_active: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-api-keys'] });
      toast.success('Active key updated');
    },
    onError: e => toast.error(e.message),
  });

  const deleteKey = useMutation({
    mutationFn: async (id) => {
      const key = (apiKeys ?? []).find(k => k.id === id);
      const { error } = await supabase.from('gako_api_keys').delete().eq('id', id);
      if (error) throw error;
      if (key) {
        supabase.from('gako_audit_log').insert({
          admin_email: adminEmail,
          action: 'key_deleted',
          details: { provider: key.provider, label: key.label },
        }).then(({ error: e }) => { if (e) console.warn('[audit] key_deleted failed:', e.message); });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-api-keys'] });
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });
      toast.success('Key removed');
      setConfirmDelete(null);
    },
    onError: e => toast.error(e.message),
  });

  const allProviders = PROVIDERS.filter(p => p !== 'custom');
  const hasAnyKey = (apiKeys ?? []).length > 0;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <SectionLabel>API Keys</SectionLabel>
        </div>
        <Button
          size="sm"
          onClick={() => { setAdding(a => !a); setShowValue(false); }}
          className={adding
            ? 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 border dark:border-white/10 border-gray-200 hover:opacity-80'
            : 'bg-blue-500 hover:bg-blue-600 text-white gap-1.5'
          }
        >
          {adding ? <><X className="w-3 h-3" /> Cancel</> : <><Plus className="w-3 h-3" /> Add Key</>}
        </Button>
      </div>

      {/* Add key form */}
      {adding && (
        <div className="mb-4 p-4 rounded-xl dark:bg-blue-500/[0.03] bg-blue-50/50 border dark:border-blue-500/15 border-blue-200/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Provider">
              <select value={newKey.provider} onChange={e => nk('provider', e.target.value)} className={inputCls}>
                {allProviders.map(p => <option key={p} value={p}>{PROVIDER_LABEL[p] ?? p}</option>)}
              </select>
            </Field>
            <Field label="Label (optional)">
              <Input
                value={newKey.label}
                onChange={e => nk('label', e.target.value)}
                placeholder="e.g. Production"
                className="dark:bg-white/5 dark:border-white/10 dark:text-white"
              />
            </Field>
          </div>

          <Field label="API Key — write-only, never shown again after save">
            <div className="relative">
              <Input
                type={showValue ? 'text' : 'password'}
                value={newKey.key_value}
                onChange={e => nk('key_value', e.target.value)}
                placeholder={
                  newKey.provider === 'anthropic' ? 'sk-ant-...' :
                  newKey.provider === 'openai'    ? 'sk-...' :
                  'AIza...'
                }
                className="pr-10 dark:bg-white/5 dark:border-white/10 dark:text-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowValue(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400 hover:opacity-80"
              >
                {showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700 cursor-pointer select-none">
              <Switch checked={newKey.is_active} onCheckedChange={v => nk('is_active', v)} />
              Set as active key for this provider
            </label>
            <Button
              size="sm"
              onClick={() => addKey.mutate()}
              disabled={!newKey.key_value.trim() || addKey.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {addKey.isPending ? <><Spin className="border-white/30 border-t-white" /> Adding…</> : 'Add Key'}
            </Button>
          </div>
        </div>
      )}

      {/* Key list */}
      {keysLoading ? (
        <div className="py-6 flex justify-center"><Spin /></div>
      ) : !hasAnyKey ? (
        <div className="py-6 text-center">
          <Key className="w-8 h-8 dark:text-gray-700 text-gray-300 mx-auto mb-2" />
          <p className="text-sm dark:text-gray-500 text-gray-400">No API keys stored yet</p>
          <p className="text-xs dark:text-gray-600 text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Add a key above to enable Gako, or set environment secrets in Supabase.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allProviders.map(provider => {
            const providerKeys = grouped[provider] ?? [];
            if (providerKeys.length === 0) return null;
            return (
              <div key={provider}>
                <p className="text-[10px] font-semibold dark:text-gray-600 text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                  {PROVIDER_LABEL[provider] ?? provider}
                </p>
                <div className="rounded-xl border dark:border-white/5 border-gray-100 overflow-hidden">
                  {providerKeys.map((key, idx) => {
                    const isLast    = idx === providerKeys.length - 1;
                    const isConfirm = confirmDelete === key.id;
                    return (
                      <div key={key.id}>
                        <div className={`px-4 py-3 flex items-center gap-3 ${!isLast ? 'border-b dark:border-white/5 border-gray-50' : ''}`}>
                          {/* Status dot */}
                          <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${
                            !key.is_active                   ? 'dark:bg-gray-600 bg-gray-300' :
                            key.last_tested_ok === true      ? 'bg-emerald-500' :
                            key.last_tested_ok === false     ? 'bg-red-500' :
                            'bg-blue-400'
                          }`} />

                          {/* Key info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs dark:text-gray-300 text-gray-700 font-mono">
                                {key.key_hint || '•••...•••'}
                              </code>
                              {key.label && (
                                <span className="text-[11px] dark:text-gray-500 text-gray-400">{key.label}</span>
                              )}
                              {key.is_active && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                                  active
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] flex items-center gap-2 flex-wrap">
                              {key.last_tested_at ? (
                                <span className={key.last_tested_ok ? 'text-emerald-500' : 'text-red-400'}>
                                  {key.last_tested_ok
                                    ? `✓ ${key.test_latency_ms}ms`
                                    : `✗ ${(key.test_error ?? 'failed').slice(0, 50)}`
                                  }
                                  {' · '}
                                  {new Date(key.last_tested_at).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="dark:text-gray-600 text-gray-400">Never tested</span>
                              )}
                              {key.created_by_email && (
                                <span className="dark:text-gray-600 text-gray-400">
                                  · {key.created_by_email.split('@')[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!key.is_active && (
                              <button
                                onClick={() => setActive.mutate({ id: key.id, provider: key.provider })}
                                disabled={setActive.isPending}
                                className="text-[10px] px-2 py-1 rounded-lg dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-600 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors disabled:opacity-40"
                              >
                                Set active
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(isConfirm ? null : key.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isConfirm
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'hover:bg-red-500/10 dark:text-gray-500 text-gray-400'
                              }`}
                              title="Delete key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Delete confirmation */}
                        {isConfirm && (
                          <div className="mx-3 mb-2 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/15 flex items-center justify-between gap-3">
                            <p className="text-xs text-red-400">Delete this key? This cannot be undone.</p>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2.5 py-1 text-xs rounded-lg dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-600 hover:opacity-80"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => deleteKey.mutate(key.id)}
                                disabled={deleteKey.isPending}
                                className="px-2.5 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {deleteKey.isPending ? <><Spin className="border-white/30 border-t-white" /> Deleting…</> : 'Yes, delete'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Secret presence indicators */}
      <div className="mt-4 pt-4 border-t dark:border-white/5 border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold dark:text-gray-500 text-gray-400 uppercase tracking-widest">
            Environment Secrets
          </p>
          <button
            onClick={checkSecrets}
            disabled={secretsLoading}
            className="flex items-center gap-1.5 text-[11px] dark:text-gray-500 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${secretsLoading ? 'animate-spin' : ''}`} />
            Check
          </button>
        </div>
        {secrets ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(secrets.env_secrets ?? {}).map(([provider, present]) => (
              <div key={provider} className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${
                present
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'dark:bg-white/5 bg-gray-100 dark:text-gray-500 text-gray-400'
              }`}>
                {present ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {PROVIDER_LABEL[provider] ?? provider}
                <span className="font-semibold">{present ? ' set' : ' not set'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] dark:text-gray-600 text-gray-400">
            Click Check to verify which environment secrets are configured in Supabase.
          </p>
        )}
      </div>

      {/* Security note */}
      <div className="mt-3 flex items-start gap-2 p-3 rounded-xl dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-100">
        <Shield className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[11px] dark:text-gray-500 text-gray-500 leading-relaxed">
          Keys are stored with admin-only RLS. Full values are write-only — only masked previews are shown.
          For maximum security, prefer{' '}
          <code className="dark:text-gray-400 text-gray-600">supabase secrets set GEMINI_API_KEY=…</code>{' '}
          over DB storage.
        </p>
      </div>
    </Card>
  );
}

// ── Shared SectionSaveBar ─────────────────────────────────────────────────────
// Appears at the bottom of every editable card when the section has changes.

function SectionSaveBar({ isDirty, isPending, isError, savedFlash, onSave, onReset, error, disabled }) {
  if (!isDirty && !isPending && !isError && !savedFlash) return null;
  return (
    <div className={`flex items-center justify-between mt-4 pt-4 border-t ${
      isDirty ? 'dark:border-blue-500/10 border-blue-200/60' : 'dark:border-white/5 border-gray-100'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <Spin className="border-blue-500/30 border-t-blue-500" /> Saving…
          </span>
        )}
        {!isPending && isError && (
          <span className="flex items-center gap-1.5 text-xs text-red-400 truncate max-w-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error?.message ?? 'Save failed'}
          </span>
        )}
        {!isPending && !isError && savedFlash && !isDirty && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Saved
          </span>
        )}
        {isDirty && !isPending && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Unsaved changes
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isDirty && !isPending && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl text-xs font-medium dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onSave}
          disabled={isPending || !isDirty || !!disabled}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
            isPending
              ? 'bg-blue-400/60 text-white cursor-not-allowed'
              : isDirty && !disabled
                ? 'bg-blue-500 hover:bg-blue-600 active:scale-95 text-white cursor-pointer shadow-sm shadow-blue-500/10'
                : 'dark:bg-white/5 bg-gray-100 dark:text-gray-500 text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          {isPending
            ? <><Spin className="border-white/30 border-t-white" /> Saving…</>
            : <><Check className="w-3.5 h-3.5" /> Save</>
          }
        </button>
      </div>
    </div>
  );
}

// ── useSectionForm: reusable pattern for per-section local state ──────────────
// Returns [form, set, isDirty, savedFlash, setSavedFlash, reset]
function useSectionForm(initial, syncKey) {
  const [form, setForm]           = useState(initial);
  const [isDirty, setIsDirty]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const set = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setIsDirty(true);
    setSavedFlash(false);
  }, []);

  useEffect(() => {
    if (!isDirty) setForm(initial);
  }, [syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setForm(initial);
    setIsDirty(false);
    setSavedFlash(false);
  }, [initial]);  // eslint-disable-line react-hooks/exhaustive-deps

  const markSaved = useCallback(() => {
    setIsDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }, []);

  return { form, set, isDirty, savedFlash, setSavedFlash, reset, markSaved };
}

// ── useSettingsSave: save a subset of fields to the singleton gako_settings row
// Never inserts a second row. Strategy:
//   1. If we have a UUID id → UPDATE … WHERE id = ?
//   2. If no id yet (table empty) → INSERT once, then all future saves use (1)
//   3. If UPDATE touches 0 rows (id somehow wrong) → throw so the user knows
function useSettingsSave({ settings, adminEmail, auditDetails, successMsg }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const dbPayload = { ...payload, updated_by_email: adminEmail };
      console.log('[useSettingsSave] settings.id:', settings?.id, '| payload:', dbPayload);

      if (settings?.id) {
        // Normal path: update the one canonical row by its UUID
        const { data, error } = await supabase
          .from('gako_settings')
          .update(dbPayload)
          .eq('id', settings.id)
          .select()
          .single();
        console.log('[useSettingsSave] update result:', { data, error });
        if (error) throw error;
        if (!data) throw new Error('UPDATE matched 0 rows — run supabase/gako_settings_fix_v2.sql in the Supabase SQL editor');
        return data;
      }

      // First-ever save: table is empty, insert the one seed row
      const { data, error } = await supabase
        .from('gako_settings')
        .insert({ ...DEFAULT_SETTINGS, ...dbPayload })
        .select()
        .single();
      console.log('[useSettingsSave] insert result:', { data, error });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-settings'] });
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });
      toast.success(successMsg);
    },
    onError: e => {
      console.error('[useSettingsSave] error:', e);
      toast.error('Save failed: ' + e.message);
    },
  });
}

// ── StatusSection ─────────────────────────────────────────────────────────────

function StatusSection({ settings, adminEmail, apiKeys }) {
  const initial = { enabled: settings?.enabled ?? true, status: settings?.status ?? 'online' };
  const { form, set, isDirty, savedFlash, reset, markSaved } =
    useSectionForm(initial, settings?.updated_at);

  // Health reflects saved settings + local unsaved changes
  const merged = { ...(settings ?? {}), ...form };
  const healthState = computeHealthState(merged, apiKeys ?? []);

  const save = useSettingsSave({
    settings, adminEmail,
    auditDetails: p => ({ section: 'status', enabled: p.enabled, status: p.status }),
    successMsg: 'Status settings saved',
  });

  return (
    <Card>
      <SectionLabel>Status & Availability</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-xl dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-100">
          <div>
            <p className="text-sm font-medium dark:text-white text-gray-900">Model Active</p>
            <p className="text-xs dark:text-gray-500 text-gray-400">Enable Gako for all users</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={v => set('enabled', v)} />
        </div>
        <Field label="Operational Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
            {STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-3 pt-3 border-t dark:border-white/5 border-gray-100 flex items-center gap-3">
        <HealthBadge state={healthState} />
        <p className="text-xs dark:text-gray-500 text-gray-400">{HEALTH_DESCRIPTIONS[healthState]}</p>
      </div>

      <SectionSaveBar
        isDirty={isDirty} isPending={save.isPending} isError={save.isError}
        savedFlash={savedFlash} error={save.error}
        onSave={() => save.mutate({ enabled: form.enabled, status: form.status }, { onSuccess: markSaved })}
        onReset={reset}
      />
    </Card>
  );
}

// ── ProviderModelSection ──────────────────────────────────────────────────────

function ProviderModelSection({ settings, adminEmail }) {
  const qc = useQueryClient();

  // Build initial state from settings prop (or defaults)
  const makeInitial = (s) => ({
    provider:          s?.provider          ?? 'anthropic',
    model_name:        s?.model_name        ?? 'claude-sonnet-4-6',
    temperature:       s?.temperature       ?? 0.7,
    max_tokens:        s?.max_tokens        ?? 2048,
    fallback_provider: s?.fallback_provider ?? '',
    fallback_model:    s?.fallback_model    ?? '',
    api_endpoint:      s?.api_endpoint      ?? '',
  });

  const [form, setForm]         = useState(() => makeInitial(settings));
  const [isDirty, setIsDirty]   = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sync from server whenever updated_at changes and no local edits are in flight
  useEffect(() => {
    if (!isDirty) setForm(makeInitial(settings));
  }, [settings?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setIsDirty(true);
    setSavedFlash(false);
  };

  const reset = () => {
    setForm(makeInitial(settings));
    setIsDirty(false);
    setSavedFlash(false);
  };

  const modelErr    = validateProviderModel(form.provider, form.model_name);
  const suggestions = PROVIDER_MODELS[form.provider] ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        provider:          form.provider,
        model_name:        form.model_name,
        temperature:       parseFloat(form.temperature),
        max_tokens:        parseInt(form.max_tokens, 10),
        fallback_provider: form.fallback_provider ?? '',
        fallback_model:    form.fallback_model    ?? '',
        api_endpoint:      form.api_endpoint      ?? '',
        updated_by_email:  adminEmail,
      };

      console.log('[ProviderModel] saving payload:', payload);
      console.log('[ProviderModel] settings.id:', settings?.id);

      if (settings?.id) {
        // Normal path: update the one canonical row
        const { data, error } = await supabase
          .from('gako_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();
        console.log('[ProviderModel] update result:', { data, error });
        if (error) throw error;
        if (!data) throw new Error(
          'UPDATE matched 0 rows. Run supabase/gako_settings_fix_v2.sql in the Supabase SQL editor to repair the settings table.'
        );
        return data;
      }

      // Table is empty — create the one seed row (protected by the singleton unique index)
      const { data, error } = await supabase
        .from('gako_settings')
        .insert({ ...DEFAULT_SETTINGS, ...payload })
        .select()
        .single();
      console.log('[ProviderModel] insert result:', { data, error });
      if (error) {
        if (error.code === '23505') {
          throw new Error(
            'A settings row already exists but could not be updated. ' +
            'Run supabase/gako_settings_fix_v2.sql in the Supabase SQL editor to repair the table.'
          );
        }
        throw error;
      }
      return data;
    },

    onSuccess: async (savedRow) => {
      // 1. Sync form immediately from the confirmed DB row — no prop re-render timing needed
      setForm(makeInitial(savedRow));
      setIsDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);

      // 2. Invalidate queries so the rest of the page reflects the new data
      await qc.invalidateQueries({ queryKey: ['gako-settings'] });
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });

      toast.success('Provider & model settings saved');

      // 3. Audit log (non-blocking)
      try {
        const { error: auditErr } = await supabase.from('gako_audit_log').insert({
          admin_email: adminEmail,
          action: 'settings_updated',
          details: { section: 'provider_model', provider: savedRow.provider, model: savedRow.model_name },
        });
        if (auditErr) console.warn('[audit] provider_model failed:', auditErr.message);
      } catch { /* ignore */ }
    },

    onError: (e) => {
      console.error('[ProviderModel] save error:', e);
      toast.error('Save failed: ' + e.message);
    },
  });

  return (
    <Card>
      <SectionLabel>Provider & Model</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Field label="AI Provider">
          <select value={form.provider} onChange={e => set('provider', e.target.value)} className={inputCls}>
            {PROVIDERS.map(p => <option key={p} value={p}>{PROVIDER_LABEL[p] ?? p}</option>)}
          </select>
        </Field>

        <Field label="Model Name">
          <Input
            value={form.model_name}
            onChange={e => set('model_name', e.target.value)}
            placeholder="e.g. gemini-2.5-flash"
            className="dark:bg-white/5 dark:border-white/10 dark:text-white"
          />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {suggestions.map(m => (
                <button key={m} type="button" onClick={() => set('model_name', m)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    form.model_name === m
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                      : 'dark:border-white/5 border-gray-200 dark:text-gray-500 text-gray-400 dark:hover:border-white/15 hover:border-gray-300'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </Field>

        {modelErr && (
          <div className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400">{modelErr}</p>
          </div>
        )}

        <Field label={`Temperature: ${Number(form.temperature).toFixed(2)}`}>
          <input type="range" min="0" max="2" step="0.05"
            value={form.temperature} onChange={e => set('temperature', e.target.value)}
            className="w-full accent-blue-500" />
          <div className="flex justify-between text-[10px] dark:text-gray-600 text-gray-400 mt-0.5">
            <span>Precise (0)</span><span>Creative (2)</span>
          </div>
        </Field>

        <Field label={`Max Tokens: ${Number(form.max_tokens).toLocaleString()}`}>
          <input type="range" min="256" max="8192" step="256"
            value={form.max_tokens} onChange={e => set('max_tokens', e.target.value)}
            className="w-full accent-blue-500" />
          <div className="flex justify-between text-[10px] dark:text-gray-600 text-gray-400 mt-0.5">
            <span>256</span><span>8,192</span>
          </div>
        </Field>

        <Field label="Fallback Provider">
          <select value={form.fallback_provider ?? ''} onChange={e => set('fallback_provider', e.target.value)} className={inputCls}>
            <option value="">None — no fallback</option>
            {PROVIDERS.filter(p => p !== form.provider).map(p => (
              <option key={p} value={p}>{PROVIDER_LABEL[p] ?? p}</option>
            ))}
          </select>
        </Field>

        <Field label="Fallback Model">
          <Input value={form.fallback_model} onChange={e => set('fallback_model', e.target.value)}
            placeholder="e.g. gemini-2.5-flash"
            className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
        </Field>

        {form.provider === 'custom' && (
          <div className="sm:col-span-2">
            <Field label="API Endpoint">
              <Input value={form.api_endpoint} onChange={e => set('api_endpoint', e.target.value)}
                placeholder="https://api.example.com/v1"
                className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
            </Field>
          </div>
        )}
      </div>

      <SectionSaveBar
        isDirty={isDirty} isPending={save.isPending} isError={save.isError}
        savedFlash={savedFlash} error={save.error} disabled={!!modelErr}
        onSave={() => save.mutate()}
        onReset={reset}
      />
    </Card>
  );
}

// ── SystemPromptSection ───────────────────────────────────────────────────────

function SystemPromptSection({ settings, adminEmail }) {
  const qc = useQueryClient();
  const [prompt, setPrompt]       = useState(settings?.system_prompt ?? '');
  const [isDirty, setIsDirty]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sync from server when not dirty
  useEffect(() => {
    if (!isDirty) setPrompt(settings?.system_prompt ?? '');
  }, [settings?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setPrompt(settings?.system_prompt ?? ''); setIsDirty(false); setSavedFlash(false); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { system_prompt: prompt, updated_by_email: adminEmail };
      if (settings?.id) {
        const { error } = await supabase.from('gako_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gako_settings').insert({ ...DEFAULT_SETTINGS, ...payload });
        if (error) throw error;
      }
      try {
        const { error: auditErr } = await supabase.from('gako_audit_log').insert({
          admin_email: adminEmail,
          action: 'settings_updated',
          details: { section: 'system_prompt', chars: prompt.length },
        });
        if (auditErr) console.warn('[audit] system_prompt failed:', auditErr.message);
      } catch { /* non-blocking — ignore */ }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-settings'] });
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });
      setIsDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      toast.success('System prompt saved');
    },
    onError: e => toast.error('Save failed: ' + e.message),
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
          <SectionLabel>System Prompt</SectionLabel>
        </div>
        <span className="text-[11px] dark:text-gray-600 text-gray-400">{prompt.length} chars</span>
      </div>
      <textarea
        value={prompt}
        onChange={e => { setPrompt(e.target.value); setIsDirty(true); setSavedFlash(false); }}
        rows={8}
        placeholder="You are Gako, an AI assistant specialized in stock market analysis and earnings research…"
        className={`${inputCls} font-mono resize-y`}
      />
      {!prompt.trim() && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">Empty system prompt — Gako will respond without instructions or persona.</p>
        </div>
      )}
      <SectionSaveBar
        isDirty={isDirty} isPending={save.isPending} isError={save.isError}
        savedFlash={savedFlash} error={save.error}
        onSave={() => save.mutate()}
        onReset={reset}
      />
    </Card>
  );
}

// ── EnvSecretsSection ─────────────────────────────────────────────────────────
// Standalone diagnostic panel — no save button needed.

function EnvSecretsSection() {
  const [secrets, setSecrets]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeWithAuth('gako-config', {
        body: { action: 'check_secrets' },
      });
      setSecrets(data);
    } catch (err) {
      setError(err.message);
      toast.error('Secret check failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const allProviders = ['anthropic', 'openai', 'gemini'];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <SectionLabel>Environment Secrets</SectionLabel>
        </div>
        <button
          onClick={check} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] dark:text-gray-500 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Check'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/15 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {secrets ? (
        <div className="space-y-2">
          {allProviders.map(p => {
            const envOk = secrets.env_secrets?.[p];
            const dbOk  = secrets.db_keys?.[p];
            const state = envOk ? 'env' : dbOk ? 'db' : 'missing';
            return (
              <div key={p} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                state === 'missing'
                  ? 'dark:bg-white/[0.02] bg-gray-50/50 dark:border-white/5 border-gray-100'
                  : 'bg-emerald-500/[0.04] border-emerald-500/15'
              }`}>
                <div className="flex items-center gap-2">
                  {state === 'missing'
                    ? <WifiOff className="w-3.5 h-3.5 dark:text-gray-600 text-gray-400" />
                    : <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  }
                  <span className={`text-sm font-medium ${state === 'missing' ? 'dark:text-gray-500 text-gray-400' : 'dark:text-gray-200 text-gray-800'}`}>
                    {PROVIDER_LABEL[p] ?? p}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {envOk && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">env secret</span>
                  )}
                  {dbOk && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">db key active</span>
                  )}
                  {state === 'missing' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full dark:bg-white/5 bg-gray-100 dark:text-gray-500 text-gray-400 font-semibold">not configured</span>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] dark:text-gray-600 text-gray-400 pt-1">
            "env secret" = set via <code className="dark:text-gray-400">supabase secrets set</code> (preferred) ·
            "db key active" = stored in gako_api_keys table
          </p>
        </div>
      ) : (
        <p className="text-[11px] dark:text-gray-600 text-gray-400">
          Click Check to verify which environment secrets are configured in Supabase.
        </p>
      )}
    </Card>
  );
}

// ── ConnectionTestSection ─────────────────────────────────────────────────────

function ConnectionTestSection({ settings, apiKeys, adminEmail }) {
  const qc = useQueryClient();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const provider  = settings?.provider   ?? 'anthropic';
  const modelName = settings?.model_name ?? '';
  const activeKey = (apiKeys ?? []).find(k => k.provider === provider && k.is_active);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await invokeWithAuth('gako-config', {
        body: { action: 'test', provider, model: modelName },
      });
      setResult(data);
      qc.invalidateQueries({ queryKey: ['gako-api-keys'] });
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });
      if (data?.ok) toast.success('Connection test passed');
      else toast.error('Connection test failed — check the result below');
    } catch (err) {
      setResult({ ok: false, error: err.message });
      toast.error('Test error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const noModel = !modelName;

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Activity className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
            <SectionLabel>Connection Test</SectionLabel>
          </div>
          <p className="text-xs dark:text-gray-500 text-gray-400">
            Tests the active key for{' '}
            <span className="dark:text-gray-300 text-gray-700 font-medium">{PROVIDER_LABEL[provider] ?? provider}</span>
            {activeKey
              ? <span className="text-blue-400"> · DB key: {activeKey.label || activeKey.key_hint}</span>
              : <span className="text-amber-400"> · no active DB key — will try env secret</span>
            }
            {noModel && <span className="text-red-400"> · save a model name first</span>}
          </p>
        </div>
        <button
          onClick={runTest}
          disabled={loading || noModel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer ml-3"
        >
          {loading
            ? <><Spin className="border-white/30 border-t-white" /> Testing…</>
            : <><Activity className="w-3 h-3" /> Run Test</>
          }
        </button>
      </div>

      {result && (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${
          result.ok ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'
        }`}>
          {result.ok
            ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          }
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${result.ok ? 'text-emerald-500' : 'text-red-400'}`}>
              {result.ok ? 'Connected' : 'Connection Failed'}
            </p>
            {result.ok ? (
              <p className="text-xs dark:text-gray-400 text-gray-600 mt-0.5">
                {result.model ?? modelName}{' · '}{result.latency_ms}ms
                {result.key_source === 'env' && <span className="text-amber-400"> · using env secret</span>}
                {result.key_source === 'db'  && <span className="text-blue-400">  · using DB key</span>}
              </p>
            ) : (
              <p className="text-xs text-red-400 mt-0.5 font-mono break-all">{result.error}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── QuickTestSection ──────────────────────────────────────────────────────────

function QuickTestSection({ settings }) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('gako-chat', {
        body: { prompt: text },
      });
      if (error) throw error;
      setResult(data);
      qc.invalidateQueries({ queryKey: ['gako-audit-log'] });
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Send className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
        <SectionLabel>Quick Test Prompt</SectionLabel>
      </div>
      <p className="text-xs dark:text-gray-500 text-gray-400 mb-3">
        Send a real prompt through the active Gako configuration to verify end-to-end behavior
      </p>
      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Briefly analyze AAPL's current earnings setup"
          className={`${inputCls} resize-y`}
        />
        <Button
          size="sm" onClick={handleSend}
          disabled={!prompt.trim() || loading}
          className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
        >
          {loading
            ? <><Spin className="border-white/30 border-t-white" /> Sending…</>
            : <><Send className="w-3.5 h-3.5" /> Send</>
          }
        </Button>

        {result && (
          <div className={`p-3 rounded-xl border ${
            result.success === false
              ? 'bg-red-500/5 border-red-500/15'
              : 'dark:bg-white/[0.02] bg-gray-50 dark:border-white/5 border-gray-100'
          }`}>
            {result.success === false ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400 font-mono break-all">{result.error}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm dark:text-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {result.reply ?? result.response ?? result.message ?? ''}
                </p>
                <p className="text-[11px] dark:text-gray-600 text-gray-400 mt-2 flex items-center gap-1.5">
                  <span>{result.provider ?? settings?.provider}</span>
                  <span>/</span>
                  <span>{result.model ?? settings?.model_name}</span>
                  {result.skillUsed    && <><span>·</span><span>Skill: {result.skillUsed}</span></>}
                  {result.duration_ms != null && <><span>·</span><span>{result.duration_ms}ms</span></>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── RecentChangesSection ──────────────────────────────────────────────────────

function RecentChangesSection({ auditLog }) {
  if (!auditLog?.length) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
        <SectionLabel>Recent Changes</SectionLabel>
      </div>
      <div>
        {auditLog.slice(0, 10).map(entry => (
          <div key={entry.id}
            className="flex items-center gap-3 py-2.5 border-b dark:border-white/5 border-gray-50 last:border-0">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
            <span className="text-[11px] dark:text-gray-600 text-gray-400 shrink-0 w-32 truncate">
              {fmtDt(entry.created_at)}
            </span>
            <span className="flex-1 text-xs dark:text-gray-300 text-gray-700 truncate">
              {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
              {entry.details?.provider  ? ` (${PROVIDER_LABEL[entry.details.provider] ?? entry.details.provider})` : ''}
              {entry.details?.model     ? ` · ${entry.details.model}`    : ''}
              {entry.details?.section   ? ` [${entry.details.section}]`  : ''}
            </span>
            <span className="text-[11px] dark:text-gray-600 text-gray-400 shrink-0">
              {entry.admin_email?.split('@')[0] ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main ModelSection (slim wrapper) ──────────────────────────────────────────

function ModelSection({ settings }) {
  const { user }   = useAuth();
  const adminEmail = user?.email ?? '';

  const { data: apiKeys = [], isLoading: keysLoading } = useGakoApiKeys();
  const { data: auditLog = [] }                         = useGakoAuditLog();

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Last-saved info bar */}
      <div className="flex items-center gap-1.5 px-1">
        {settings?.updated_at ? (
          <p className="text-xs dark:text-gray-600 text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 shrink-0" />
            Last saved {fmtDt(settings.updated_at)}
            {settings.updated_by_email && (
              <span> · by <span className="dark:text-gray-400 text-gray-600">{settings.updated_by_email}</span></span>
            )}
          </p>
        ) : (
          <p className="text-xs dark:text-gray-600 text-gray-400">
            No settings saved yet — use the Save button in each section below.
          </p>
        )}
      </div>

      <StatusSection     settings={settings}  adminEmail={adminEmail} apiKeys={apiKeys} />
      <ProviderModelSection settings={settings} adminEmail={adminEmail} />
      <SystemPromptSection  settings={settings} adminEmail={adminEmail} />
      <ApiKeysSection    apiKeys={apiKeys} keysLoading={keysLoading} adminEmail={adminEmail} />
      <EnvSecretsSection />
      <ConnectionTestSection settings={settings} apiKeys={apiKeys} adminEmail={adminEmail} />
      <QuickTestSection  settings={settings} />
      <RecentChangesSection auditLog={auditLog} />

    </div>
  );
}

// ─── 3. Skills Manager ────────────────────────────────────────────────────────

const EMPTY_SKILL = {
  name: '', slug: '', category: 'general', description: '',
  instructions: '', examples: [], enabled: true, visible: true,
};

function SkillsSection({ skills, isLoading, isError }) {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('all');
  const [form, setForm]             = useState(null);   // null=closed | {}=new | {id,...}=edit
  const [expanded, setExpanded]     = useState(null);
  const [confirmId, setConfirmId]   = useState(null);  // skill id pending delete confirm
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openEdit = (skill) => {
    setForm({
      id:           skill.id,
      name:         skill.name         ?? '',
      slug:         skill.slug         ?? '',
      category:     skill.category     ?? 'general',
      description:  skill.description  ?? '',
      instructions: skill.instructions ?? '',
      examples:     skill.examples     ?? [],
      enabled:      skill.enabled      ?? true,
      visible:      skill.visible      ?? true,
    });
    setExpanded(null);
    setConfirmId(null);
  };

  const filteredSkills = skills
    .filter(s => catFilter === 'all' || (s.category ?? 'general') === catFilter)
    .filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  // ── mutations ──────────────────────────────────────────────────────────────

  const upsertSkill = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error('Skill name is required');
      const args = {
        p_name:         form.name.trim(),
        p_slug:         form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        p_category:     form.category    || 'general',
        p_description:  form.description?.trim() || null,
        p_instructions: form.instructions?.trim() || null,
        p_enabled:      form.enabled  ?? true,
        p_visible:      form.visible  ?? true,
      };
      if (form.id) {
        const { error } = await supabase.rpc('admin_update_gako_skill', { p_skill_id: form.id, ...args });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('admin_create_gako_skill', args);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-skills'] });
      toast.success(form?.id ? 'Skill updated' : 'Skill added');
      setForm(null);
    },
    onError: e => toast.error(e.message),
  });

  const deleteSkill = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('admin_delete_gako_skill', { p_skill_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gako-skills'] });
      toast.success('Skill deleted');
      setConfirmId(null);
    },
    onError: e => { toast.error(e.message); setConfirmId(null); },
  });

  const toggleSkill = useMutation({
    mutationFn: async ({ id, enabled }) => {
      const { error } = await supabase.rpc('admin_toggle_gako_skill', { p_skill_id: id, p_enabled: enabled });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gako-skills'] }),
    onError: e => toast.error(e.message),
  });

  // ── filter pill categories ─────────────────────────────────────────────────

  const presentCats = ['all', ...new Set(skills.map(s => s.category ?? 'general').filter(Boolean))];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search skills…"
            className="pl-9 dark:bg-white/5 dark:border-white/10 dark:text-white"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {presentCats.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                catFilter === c
                  ? 'dark:bg-white/10 bg-gray-200 dark:text-white text-gray-900'
                  : 'dark:text-gray-500 text-gray-500 dark:hover:bg-white/5 hover:bg-gray-100'
              }`}
            >
              {c === 'all' ? 'All' : catMeta(c).label}
            </button>
          ))}
        </div>
        <Button
          onClick={() => { setForm(EMPTY_SKILL); setConfirmId(null); }}
          disabled={!!form}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add Skill
        </Button>
      </div>

      {/* Add / Edit form */}
      {form && (
        <Card className={`border ${form.id ? 'border-amber-500/20 dark:bg-amber-500/[0.02]' : 'border-blue-500/20 dark:bg-blue-500/[0.02]'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {form.id
                ? <><Edit2 className="w-3.5 h-3.5 text-amber-400" /><p className="font-semibold dark:text-white text-gray-900">Edit Skill</p></>
                : <><Plus  className="w-3.5 h-3.5 text-blue-400"  /><p className="font-semibold dark:text-white text-gray-900">New Skill</p></>
              }
            </div>
            <button
              onClick={() => setForm(null)}
              className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 dark:text-gray-500 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Skill Name *">
              <Input
                value={form.name}
                onChange={e => sf('name', e.target.value)}
                placeholder="e.g. Earnings Analysis"
                className="dark:bg-white/5 dark:border-white/10 dark:text-white"
                autoFocus
              />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={e => sf('category', e.target.value)} className={inputCls}>
                {SKILL_CATS.map(c => <option key={c} value={c}>{catMeta(c).label}</option>)}
              </select>
            </Field>
            <Field label="Short Description">
              <Input
                value={form.description ?? ''}
                onChange={e => sf('description', e.target.value)}
                placeholder="What this skill does"
                className="dark:bg-white/5 dark:border-white/10 dark:text-white"
              />
            </Field>
            <div className="flex items-center gap-5 pt-5">
              <label className="flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700 cursor-pointer select-none">
                <Switch checked={form.enabled} onCheckedChange={v => sf('enabled', v)} />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700 cursor-pointer select-none">
                <Switch checked={form.visible ?? true} onCheckedChange={v => sf('visible', v)} />
                Visible
              </label>
            </div>
          </div>

          <Field label="Instructions (injected into system prompt when skill is active)">
            <textarea
              value={form.instructions ?? ''}
              onChange={e => sf('instructions', e.target.value)}
              rows={6}
              placeholder="When this skill is active, Gako should…"
              className={`${inputCls} font-mono resize-y`}
            />
          </Field>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setForm(null)} disabled={upsertSkill.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => upsertSkill.mutate()}
              disabled={!form.name?.trim() || upsertSkill.isPending}
              className={form.id ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
            >
              {upsertSkill.isPending
                ? <><Spin className="border-white/30 border-t-white" /> Saving…</>
                : form.id ? 'Save Changes' : 'Add Skill'
              }
            </Button>
          </div>
        </Card>
      )}

      {/* Skills list */}
      {isError ? (
        <TableError />
      ) : isLoading ? (
        <div className="py-10 flex justify-center"><Spin /></div>
      ) : filteredSkills.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-2xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-100 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 dark:text-gray-600 text-gray-400" />
          </div>
          <p className="font-semibold dark:text-white text-gray-900 mb-1">
            {search || catFilter !== 'all' ? 'No skills match' : 'No skills yet'}
          </p>
          <p className="text-sm dark:text-gray-500 text-gray-400 max-w-xs">
            {search || catFilter !== 'all'
              ? 'Try a different filter or search term.'
              : 'Add your first skill to start training Gako.'}
          </p>
        </Card>
      ) : (
        <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">
          {filteredSkills.map(skill => {
            const isEditing  = form?.id === skill.id;
            const isDeleting = deleteSkill.isPending && confirmId === skill.id;
            const isConfirm  = confirmId === skill.id;

            return (
              <div
                key={skill.id}
                className={`border-b dark:border-white/5 border-gray-50 last:border-0 transition-colors ${
                  isEditing ? 'dark:bg-amber-500/[0.03] bg-amber-50/40' : ''
                }`}
              >
                {/* Main row */}
                <div className="px-4 py-3.5 flex items-center gap-3">

                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${catMeta(skill.category).color.split(' ')[1]} bg-opacity-10`}>
                    <Zap className={`w-3.5 h-3.5 ${catMeta(skill.category).color.split(' ')[0]}`} />
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold leading-tight ${
                        skill.enabled ? 'dark:text-white text-gray-900' : 'dark:text-gray-500 text-gray-400 line-through'
                      }`}>
                        {skill.name}
                      </p>
                      <CatBadge cat={skill.category} />
                      {!skill.visible && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 font-medium">
                          <EyeOff className="w-2.5 h-2.5" /> Hidden
                        </span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5 truncate max-w-sm">
                        {skill.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={skill.enabled ?? true}
                      onCheckedChange={v => toggleSkill.mutate({ id: skill.id, enabled: v })}
                      disabled={toggleSkill.isPending}
                    />
                    <button
                      onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}
                      className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400 transition-colors"
                      title="View instructions"
                    >
                      {expanded === skill.id
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => openEdit(skill)}
                      disabled={!!form}
                      title="Edit skill"
                      className={`p-1.5 rounded-lg transition-colors ${
                        isEditing
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400 disabled:opacity-40'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmId(isConfirm ? null : skill.id)}
                      disabled={isDeleting}
                      title="Delete skill"
                      className={`p-1.5 rounded-lg transition-colors ${
                        isConfirm
                          ? 'bg-red-500/10 text-red-400'
                          : 'hover:bg-red-500/10 dark:text-gray-500 text-gray-400 disabled:opacity-40'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation bar */}
                {isConfirm && (
                  <div className="mx-4 mb-3 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/15 flex items-center justify-between gap-3">
                    <p className="text-xs text-red-400">
                      Delete <span className="font-semibold">{skill.name}</span>? This cannot be undone.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2.5 py-1 text-xs rounded-lg dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-600 hover:opacity-80 transition-opacity"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteSkill.mutate(skill.id)}
                        disabled={isDeleting}
                        className="px-2.5 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {isDeleting ? <><Spin className="border-white/30 border-t-white" /> Deleting…</> : 'Yes, delete'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded instructions */}
                {expanded === skill.id && (
                  <div className="px-4 pb-4 space-y-2">
                    {skill.instructions ? (
                      <div className="p-3 rounded-xl dark:bg-black/20 bg-gray-50 border dark:border-white/5 border-gray-100">
                        <p className="text-[10px] font-semibold dark:text-gray-500 text-gray-400 uppercase tracking-widest mb-2">
                          Instructions
                        </p>
                        <p className="text-xs dark:text-gray-300 text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                          {skill.instructions}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs dark:text-gray-600 text-gray-400 italic">No instructions set.</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] dark:text-gray-600 text-gray-400">
                      <span>v{skill.version ?? 1}</span>
                      <span>·</span>
                      <span>{skill.created_at ? new Date(skill.created_at).toLocaleDateString() : '—'}</span>
                      {skill.slug && (
                        <><span>·</span><code className="dark:text-gray-500 text-gray-500">{skill.slug}</code></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 4. Behavior Rules ────────────────────────────────────────────────────────

const EMPTY_RULE = { type: 'do', content: '', enabled: true };

function BehaviorSection({ rules, isLoading, isError }) {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState(null);
  const rf = (k, v) => setForm(f => ({ ...f, [k]: v }));

const filtered = rules.filter(r => typeFilter === 'all' || r.category === typeFilter);

  const upsertRule = useMutation({
    mutationFn: async () => {
const payload = {
  category: form.type,
  title: (form.content || '').slice(0, 40),
  instruction: form.content,
  enabled: form.enabled,
  visible: true,
};      if (form.id) {
        const { error } = await supabase.from('gako_behavior_rules').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gako_behavior_rules').insert({ ...payload, sort_order: rules.length });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gako-behavior'] }); toast.success('Rule saved'); setForm(null); },
    onError: e => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async id => { const { error } = await supabase.from('gako_behavior_rules').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gako-behavior'] }); toast.success('Rule removed'); },
    onError: e => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }) => { const { error } = await supabase.from('gako_behavior_rules').update({ enabled }).eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gako-behavior'] }),
    onError: e => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {['all', ...RULE_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                typeFilter === t ? 'dark:bg-white/10 bg-gray-200 dark:text-white text-gray-900' : 'dark:text-gray-500 text-gray-500 dark:hover:bg-white/5 hover:bg-gray-100'
              }`}>{t === 'dont' ? "Don't" : t}</button>
          ))}
        </div>
        <Button onClick={() => setForm(EMPTY_RULE)} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </Button>
      </div>

      {form && (
        <Card className="border-blue-500/20 dark:bg-blue-500/[0.03]">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold dark:text-white text-gray-900">{form.id ? 'Edit Rule' : 'New Rule'}</p>
            <button onClick={() => setForm(null)}><X className="w-4 h-4 dark:text-gray-500 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Rule Type">
              <select value={form.type} onChange={e => rf('type', e.target.value)} className={inputCls}>
                {RULE_TYPES.map(t => <option key={t} value={t}>{t === 'dont' ? "Don't" : t}</option>)}
              </select>
            </Field>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={form.enabled} onCheckedChange={v => rf('enabled', v)} />
              <span className="text-sm dark:text-gray-300 text-gray-700">Enabled</span>
            </div>
          </div>
          <Field label="Rule Content">
            <textarea value={form.content} onChange={e => rf('content', e.target.value)}
              rows={3} placeholder="Describe the rule…" className={`${inputCls} resize-y`} />
          </Field>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setForm(null)}>Cancel</Button>
            <Button size="sm" onClick={() => upsertRule.mutate()} disabled={!form.content || upsertRule.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white">
              {upsertRule.isPending ? 'Saving…' : form.id ? 'Save' : 'Add Rule'}
            </Button>
          </div>
        </Card>
      )}

      {isError ? <TableError /> : isLoading ? (
        <div className="py-10 flex justify-center"><Spin /></div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm dark:text-gray-500 text-gray-400">No rules yet for this category.</p>
          )}
          {filtered.map(rule => {
            const meta = RULE_TYPE_META[rule.category] ?? RULE_TYPE_META.system;
            return (
              <div key={rule.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                rule.enabled
                  ? 'dark:bg-white/[0.02] bg-white dark:border-white/5 border-gray-100'
                  : 'dark:bg-white/[0.01] bg-gray-50/50 dark:border-white/[0.03] border-gray-50 opacity-50'
              }`}>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 mt-0.5 ${meta.color}`}>
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm dark:text-gray-200 text-gray-800 truncate">{rule.title}</div>
                  <div className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed mt-0.5">{rule.instruction}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={rule.enabled} onCheckedChange={v => toggleRule.mutate({ id: rule.id, enabled: v })} />
                  <button onClick={() => setForm({ id: rule.id, type: rule.category, content: rule.instruction, enabled: rule.enabled })}
                    className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteRule.mutate(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 5. Methods / Playbooks ───────────────────────────────────────────────────

const EMPTY_METHOD = { title: '', category: 'general', description: '', steps: [], when_to_use: '', when_not_to_use: '', confidence_notes: '', enabled: true };

function MethodsSection({ methods, isLoading, isError }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const mf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const upsertMethod = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title, category: form.category, description: form.description,
        steps: typeof form.steps === 'string' ? form.steps.split('\n').filter(Boolean) : form.steps,
        when_to_use: form.when_to_use, when_not_to_use: form.when_not_to_use,
        confidence_notes: form.confidence_notes, enabled: form.enabled,
      };
      if (form.id) {
        const { error } = await supabase.from('gako_methods').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gako_methods').insert({ ...payload, sort_order: methods.length });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gako-methods'] }); toast.success(form?.id ? 'Method updated' : 'Method added'); setForm(null); },
    onError: e => toast.error(e.message),
  });

  const deleteMethod = useMutation({
    mutationFn: async id => { const { error } = await supabase.from('gako_methods').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gako-methods'] }); toast.success('Method removed'); },
    onError: e => toast.error(e.message),
  });

  const toggleMethod = useMutation({
    mutationFn: async ({ id, enabled }) => { const { error } = await supabase.from('gako_methods').update({ enabled }).eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gako-methods'] }),
    onError: e => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ ...EMPTY_METHOD })} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Playbook
        </Button>
      </div>

      {form && (
        <Card className="border-blue-500/20 dark:bg-blue-500/[0.03]">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold dark:text-white text-gray-900">{form.id ? 'Edit Playbook' : 'New Playbook'}</p>
            <button onClick={() => setForm(null)}><X className="w-4 h-4 dark:text-gray-500 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Title">
              <Input value={form.title} onChange={e => mf('title', e.target.value)}
                placeholder="Earnings Beat Analysis" className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={e => mf('category', e.target.value)} className={inputCls}>
                {METHOD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Description">
              <textarea value={form.description ?? ''} onChange={e => mf('description', e.target.value)}
                rows={2} className={`${inputCls} resize-y`} placeholder="What this method covers" />
            </Field>
            <Field label="Steps (one per line)">
              <textarea value={Array.isArray(form.steps) ? form.steps.join('\n') : form.steps ?? ''} onChange={e => mf('steps', e.target.value)}
                rows={4} className={`${inputCls} font-mono resize-y`} placeholder="1. Check EPS vs estimate&#10;2. Review revenue trend" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="When to use">
                <textarea value={form.when_to_use ?? ''} onChange={e => mf('when_to_use', e.target.value)}
                  rows={2} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="When NOT to use">
                <textarea value={form.when_not_to_use ?? ''} onChange={e => mf('when_not_to_use', e.target.value)}
                  rows={2} className={`${inputCls} resize-none`} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setForm(null)}>Cancel</Button>
            <Button size="sm" onClick={() => upsertMethod.mutate()} disabled={!form.title || upsertMethod.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white">
              {upsertMethod.isPending ? 'Saving…' : form.id ? 'Save' : 'Add'}
            </Button>
          </div>
        </Card>
      )}

      {isError ? <TableError /> : isLoading ? (
        <div className="py-10 flex justify-center"><Spin /></div>
      ) : methods.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm dark:text-gray-500 text-gray-400">No playbooks yet. Add analysis frameworks to teach Gako how to reason.</p>
        </Card>
      ) : (
        <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">
          {methods.map(m => (
            <div key={m.id} className="border-b dark:border-white/5 border-gray-50 last:border-0">
              <div className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl dark:bg-white/5 bg-gray-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${m.enabled ? 'dark:text-white text-gray-900' : 'dark:text-gray-500 text-gray-400 line-through'}`}>{m.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded dark:bg-white/5 bg-gray-100 dark:text-gray-500 text-gray-400 capitalize">{m.category}</span>
                    {m.description && <p className="text-xs dark:text-gray-500 text-gray-400 truncate">{m.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={m.enabled} onCheckedChange={v => toggleMethod.mutate({ id: m.id, enabled: v })} />
                  <button onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                    className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400">
                    {expanded === m.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setForm({ ...m, steps: Array.isArray(m.steps) ? m.steps.join('\n') : '' }); setExpanded(null); }}
                    className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteMethod.mutate(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {expanded === m.id && Array.isArray(m.steps) && m.steps.length > 0 && (
                <div className="px-5 pb-4">
                  <p className="text-[10px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest mb-2">Steps</p>
                  <ol className="space-y-1">
                    {m.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs dark:text-gray-300 text-gray-700">
                        <span className="text-blue-400 font-mono shrink-0">{i + 1}.</span>{step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 6. Test Lab ──────────────────────────────────────────────────────────────

// ─── Chat Message Bubble ──────────────────────────────────────────────────────

function MessageBubble({ msg, settings }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-blue-500 text-white text-sm whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.pending) {
    return (
      <div className="flex gap-2.5 items-end">
        <div className="w-7 h-7 rounded-full dark:bg-white/10 bg-gray-100 flex items-center justify-center shrink-0">
          <GeckoIcon className="w-3.5 h-3.5 dark:text-blue-400 text-blue-500" />
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-bl-sm dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-100 flex items-center gap-1.5">
          {[0, 150, 300].map(delay => (
            <span key={delay} style={{ animationDelay: `${delay}ms` }}
              className="w-1.5 h-1.5 rounded-full dark:bg-gray-500 bg-gray-400 animate-bounce" />
          ))}
        </div>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="flex gap-2.5 items-start">
        <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 font-mono">{msg.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full dark:bg-white/10 bg-gray-100 flex items-center justify-center shrink-0">
        <GeckoIcon className="w-3.5 h-3.5 dark:text-blue-400 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-100">
          <p className="text-sm dark:text-gray-200 text-gray-800 whitespace-pre-wrap">{msg.content}</p>
        </div>
        {msg.meta && (
          <p className="text-[10px] dark:text-gray-600 text-gray-400 mt-1 ml-1">
            {msg.meta.provider}/{msg.meta.model}
            {msg.meta.skillUsed ? ` · ${msg.meta.skillUsed}` : ''}
            {msg.meta.duration_ms != null ? ` · ${msg.meta.duration_ms}ms` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Chat Mode ────────────────────────────────────────────────────────────────

function GakoChatMode({ skills, settings }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [skillSlug, setSkillSlug] = useState('auto');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const pendingIdRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startNew = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const pendingId = crypto.randomUUID();
    pendingIdRef.current = pendingId;
    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: text },
      { id: pendingId, role: 'assistant', pending: true },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke('gako-chat', {
        body: {
          prompt: text,
          conversationId,
          selectedSkillId: skillSlug === 'auto' ? null : skillSlug,
          useAutoSkill: skillSlug === 'auto',
        },
      });
      if (error) throw error;
      console.log('[gako-chat response]', data);
      if (!data?.success) throw new Error(data?.error ?? 'AI call failed');

      if (!conversationId && data.conversationId) setConversationId(data.conversationId);

      const replyText = data.reply ?? data.response ?? data.message ?? data.text ?? '';

      setMessages(prev => prev.map(m => m.id === pendingId ? {
        id: crypto.randomUUID(), role: 'assistant', content: replyText,
        meta: { provider: data.provider, model: data.model, skillUsed: data.skillUsed, duration_ms: data.duration_ms },
      } : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === pendingId ? {
        id: crypto.randomUUID(), role: 'assistant', error: err?.message ?? String(err),
      } : m));
    } finally {
      setSending(false);
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const enabledSkills = skills.filter(s => s.enabled);

  return (
    <div className="flex flex-col rounded-2xl border dark:border-white/5 border-gray-100 dark:bg-white/[0.03] bg-white overflow-hidden"
      style={{ height: 580 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b dark:border-white/5 border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <GeckoIcon className="w-4 h-4 dark:text-blue-400 text-blue-500" />
          <span className="text-sm font-semibold dark:text-white text-gray-900">Gako</span>
          {conversationId && (
            <span className="text-[10px] font-mono dark:text-gray-600 text-gray-400">
              #{conversationId.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={skillSlug} onChange={e => setSkillSlug(e.target.value)}
            className="text-xs dark:bg-white/5 bg-gray-50 dark:text-gray-300 text-gray-700 border dark:border-white/10 border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
            <option value="auto">Auto-detect</option>
            {enabledSkills.map(s => <option key={s.id} value={s.slug ?? s.id}>{s.name}</option>)}
          </select>
          <button onClick={startNew} title="New conversation"
            className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-500 text-gray-400 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center select-none">
            <div className="w-12 h-12 rounded-2xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-100 flex items-center justify-center mb-3">
              <GeckoIcon className="w-6 h-6 dark:text-gray-600 text-gray-400" />
            </div>
            <p className="text-sm font-medium dark:text-gray-400 text-gray-500 mb-1">Chat with Gako</p>
            <p className="text-xs dark:text-gray-600 text-gray-400 max-w-[200px]">
              Ask about stocks, earnings, or market analysis.
            </p>
          </div>
        )}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} settings={settings} />)}
      </div>

      {/* Input */}
      <div className="border-t dark:border-white/5 border-gray-100 p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            disabled={sending}
            placeholder="Ask Gako anything… (Enter to send · Shift+Enter for new line)"
            className="flex-1 text-sm resize-none dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200 rounded-xl px-3 py-2.5 dark:text-gray-200 text-gray-800 placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0 self-end"
          >
            {sending
              ? <Spin className="border-white/30 border-t-white" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single Test Mode (original Test Lab) ────────────────────────────────────

function GakoTestMode({ skills, settings }) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [skillSlug, setSkillSlug] = useState('auto');
  const [response, setResponse] = useState(null);
  const [meta, setMeta] = useState(null);
  const [runError, setRunError] = useState(null);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(null);
  const [running, setRunning] = useState(false);

  const { data: runs = [], isError: runsError } = useTestRuns();

  const runTest = async () => {
    if (!prompt.trim()) return;
    setRunning(true);
    setResponse(null);
    setMeta(null);
    setRunError(null);
    setScore(0);
    setPassed(null);
    try {
      const { data, error } = await supabase.functions.invoke('gako-chat', {
        body: {
          prompt,
          selectedSkillId: skillSlug === 'auto' ? null : skillSlug,
          useAutoSkill: skillSlug === 'auto',
        },
      });
      if (error) throw error;
      console.log('[gako-chat response]', data);
      if (!data?.success) throw new Error(data?.error ?? 'AI call failed');
      const replyText = data.reply ?? data.response ?? data.message ?? data.text ?? '';
      setResponse(replyText);
      setMeta({ provider: data.provider, model: data.model, skillUsed: data.skillUsed, duration_ms: data.duration_ms });
    } catch (err) {
      setRunError(err?.message ?? String(err));
    } finally {
      setRunning(false);
    }
  };

  const saveRun = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gako_test_runs').insert({
        prompt, response: response ?? '',
        skill_used: meta?.skillUsed ?? (skillSlug === 'auto' ? null : skillSlug),
        provider: meta?.provider ?? settings?.provider ?? 'anthropic',
        model_used: meta?.model ?? settings?.model_name ?? '',
        score: score || null, passed,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gako-test-runs'] }); toast.success('Test run saved'); },
    onError: e => toast.error(e.message),
  });

  const enabledSkills = skills.filter(s => s.enabled);

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>Test Prompt</SectionLabel>
        <div className="space-y-3">
          <Field label="Active Skill">
            <select value={skillSlug} onChange={e => setSkillSlug(e.target.value)} className={inputCls}>
              <option value="auto">Auto-detect</option>
              {enabledSkills.map(s => <option key={s.id} value={s.slug ?? s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Prompt">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              rows={5} placeholder="Enter a test prompt for Gako…"
              className={`${inputCls} resize-y`} />
          </Field>
          <Button onClick={runTest} disabled={!prompt.trim() || running}
            className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
            {running ? <><Spin className="border-white/30 border-t-white" /> Running…</> : <><Play className="w-3.5 h-3.5" /> Run Test</>}
          </Button>
        </div>
      </Card>

      {runError && (
        <Card>
          <div className="flex items-start gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Run failed</p>
              <p className="text-xs mt-0.5 font-mono dark:text-red-300 text-red-500">{runError}</p>
            </div>
          </div>
        </Card>
      )}

      {response && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Response</SectionLabel>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setScore(n)}
                    className={`w-5 h-5 ${n <= score ? 'text-amber-400' : 'dark:text-gray-600 text-gray-300'}`}>
                    <Star className="w-full h-full fill-current" />
                  </button>
                ))}
              </div>
              <button onClick={() => setPassed(true)}
                className={`p-1 rounded ${passed === true ? 'text-emerald-500 bg-emerald-500/10' : 'dark:text-gray-500 text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={() => setPassed(false)}
                className={`p-1 rounded ${passed === false ? 'text-red-400 bg-red-500/10' : 'dark:text-gray-500 text-gray-400'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-3 rounded-xl dark:bg-black/20 bg-gray-50 border dark:border-white/5 border-gray-100">
            <p className="text-sm dark:text-gray-300 text-gray-700 font-mono whitespace-pre-wrap">{response}</p>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs dark:text-gray-500 text-gray-400">
              {meta?.provider ?? settings?.provider} / {meta?.model ?? settings?.model_name}
              {meta?.skillUsed ? ` · Skill: ${meta.skillUsed}` : ` · Skill: ${skillSlug}`}
              {meta?.duration_ms != null ? ` · ${meta.duration_ms}ms` : ''}
            </p>
            <Button size="sm" variant="outline" onClick={() => saveRun.mutate()} disabled={saveRun.isPending}>
              {saveRun.isPending ? 'Saving…' : 'Save Run'}
            </Button>
          </div>
        </Card>
      )}

      {!runsError && runs.length > 0 && (
        <Card>
          <SectionLabel>Recent Test Runs</SectionLabel>
          <div className="space-y-2">
            {runs.slice(0, 5).map(run => (
              <div key={run.id} className="flex items-center gap-3 py-2 border-b dark:border-white/5 border-gray-50 last:border-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${run.passed === true ? 'bg-emerald-500' : run.passed === false ? 'bg-red-500' : 'dark:bg-gray-600 bg-gray-300'}`} />
                <p className="flex-1 text-sm dark:text-gray-300 text-gray-700 truncate">{run.prompt}</p>
                {run.score && (
                  <span className="text-xs text-amber-400 flex items-center gap-0.5">
                    {run.score}<Star className="w-3 h-3 fill-current" />
                  </span>
                )}
                <span className="text-[11px] dark:text-gray-600 text-gray-400">
                  {new Date(run.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── 6. Test Lab (mode toggle wrapper) ───────────────────────────────────────

function TestLabSection({ skills, settings }) {
  const [mode, setMode] = useState('chat');

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-100 w-fit">
        {[
          { id: 'chat', icon: MessageCircle, label: 'Chat' },
          { id: 'test', icon: Terminal,       label: 'Single Test' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === id
                ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white text-gray-900 border dark:border-white/10 border-gray-200'
                : 'dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'chat'
        ? <GakoChatMode skills={skills} settings={settings} />
        : <GakoTestMode skills={skills} settings={settings} />
      }
    </div>
  );
}

// ─── 7. Logs ─────────────────────────────────────────────────────────────────

function LogsSection() {
  const { data: logs = [], isLoading, isError } = useGakoLogs();

  return (
    <div className="space-y-4">
      {isError ? <TableError /> : isLoading ? (
        <div className="py-10 flex justify-center"><Spin /></div>
      ) : logs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <History className="w-10 h-10 dark:text-gray-700 text-gray-300 mb-3" />
          <p className="font-semibold dark:text-white text-gray-900 mb-1">No logs yet</p>
          <p className="text-sm dark:text-gray-500 text-gray-400 max-w-xs">
            Gako usage logs will appear here once the model is live and processing requests. Wire up the <code className="dark:text-gray-400">gako_logs</code> insert in your Edge Function.
          </p>
        </Card>
      ) : (
        <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-white/5 border-gray-100">
                  {['Time', 'Input', 'Skill', 'Model', 'Duration', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium dark:text-gray-500 text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b dark:border-white/5 border-gray-50 last:border-0 dark:hover:bg-white/[0.015] hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs dark:text-gray-500 text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-xs dark:text-gray-300 text-gray-700 max-w-[200px] truncate">{log.input ?? '—'}</td>
                    <td className="px-4 py-3 text-xs dark:text-gray-500 text-gray-400">{log.skill_used ?? '—'}</td>
                    <td className="px-4 py-3 text-xs dark:text-gray-500 text-gray-400">{log.model_used ?? '—'}</td>
                    <td className="px-4 py-3 text-xs dark:text-gray-500 text-gray-400">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${log.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                        {log.success ? 'ok' : 'fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 8. Versions ─────────────────────────────────────────────────────────────

function VersionsSection({ settings, skills = [], rules = [], methods = [] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: versions = [], isLoading: versionsLoading } = useGakoVersions();

  const publish = useMutation({
    mutationFn: async (status) => {
      const now = new Date().toISOString();

      if (status === 'published') {
        // Build config snapshot from current enabled items
        const snapshot_json = {
          settings: settings ?? {},
          skills:         skills.filter(s => s.enabled),
          behavior_rules: rules.filter(r => r.enabled),
          methods:        methods.filter(m => m.enabled),
        };
        const nextVersion = versions.length > 0
          ? Math.max(...versions.map(v => v.version_number)) + 1
          : 1;

        const { error: vErr } = await supabase.from('gako_versions').insert({
          version_number: nextVersion,
          status:         'published',
          snapshot_json,
          created_by:     user?.email ?? '',
          published_at:   now,
        });
        if (vErr) throw vErr;

        const { error } = await supabase.from('gako_settings')
          .update({ publish_status: 'published', last_published: now })
          .eq('id', settings?.id);
        if (error) throw error;

      } else if (status === 'archived') {
        // Mark the latest published snapshot as archived
        const latestPublished = versions.find(v => v.status === 'published');
        if (latestPublished) {
          await supabase.from('gako_versions')
            .update({ status: 'archived', archived_at: now })
            .eq('id', latestPublished.id);
        }
        const { error } = await supabase.from('gako_settings')
          .update({ publish_status: 'archived' })
          .eq('id', settings?.id);
        if (error) throw error;

      } else {
        // draft — just flip the status flag, no snapshot
        const { error } = await supabase.from('gako_settings')
          .update({ publish_status: 'draft' })
          .eq('id', settings?.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['gako-settings'] });
      qc.invalidateQueries({ queryKey: ['gako-versions'] });
      toast.success(
        status === 'published' ? 'Gako published to production' :
        status === 'draft'     ? 'Rolled back to draft' : 'Archived'
      );
    },
    onError: e => toast.error(e.message),
  });

  const currentStatus = settings?.publish_status ?? 'draft';

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <SectionLabel>Publish Status</SectionLabel>
        <div className="flex items-center gap-4">
          {PUBLISH_OPTS.map(s => (
            <div key={s} className={`flex-1 p-4 rounded-xl border text-center cursor-pointer transition-colors ${
              currentStatus === s
                ? s === 'published' ? 'border-emerald-500/30 dark:bg-emerald-500/5 bg-emerald-50/50'
                  : s === 'archived' ? 'border-gray-500/20 dark:bg-white/[0.02] bg-gray-50/50'
                  : 'border-amber-500/30 dark:bg-amber-500/5 bg-amber-50/50'
                : 'dark:border-white/5 border-gray-100 dark:hover:bg-white/[0.02] hover:bg-gray-50/50'
            }`} onClick={() => !publish.isPending && publish.mutate(s)}>
              <p className={`text-sm font-semibold capitalize ${
                currentStatus === s
                  ? s === 'published' ? 'text-emerald-500' : s === 'archived' ? 'dark:text-gray-400 text-gray-600' : 'text-amber-400'
                  : 'dark:text-gray-500 text-gray-400'
              }`}>{publish.isPending && publish.variables === s ? '…' : s}</p>
              <p className="text-xs dark:text-gray-600 text-gray-400 mt-1">
                {s === 'draft' ? 'Work in progress' : s === 'published' ? 'Live for all users' : 'Inactive / archived'}
              </p>
            </div>
          ))}
        </div>
        {settings?.last_published && (
          <p className="text-xs dark:text-gray-600 text-gray-400 mt-4 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Last published: {new Date(settings.last_published).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </Card>

      <Card>
        <SectionLabel>Version History</SectionLabel>
        {versionsLoading ? (
          <div className="flex justify-center py-6"><Spin /></div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <GitBranch className="w-9 h-9 dark:text-gray-700 text-gray-300 mb-3" />
            <p className="text-sm font-semibold dark:text-white text-gray-900 mb-1">No versions yet</p>
            <p className="text-xs dark:text-gray-500 text-gray-400 max-w-xs">
              Click <strong>Published</strong> above to snapshot the current config as v1.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/[0.02] bg-gray-50/50 border dark:border-white/5 border-gray-100">
                <div className="w-8 h-8 rounded-lg dark:bg-white/5 bg-gray-100 flex items-center justify-center shrink-0">
                  <Tag className="w-3.5 h-3.5 dark:text-gray-400 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium dark:text-white text-gray-900">v{v.version_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      v.status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-gray-500/10 dark:text-gray-400 text-gray-500'
                    }`}>{v.status}</span>
                  </div>
                  {v.summary && <p className="text-xs dark:text-gray-500 text-gray-400 truncate mt-0.5">{v.summary}</p>}
                  <p className="text-[11px] dark:text-gray-600 text-gray-400 mt-0.5">
                    {new Date(v.published_at ?? v.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {v.created_by ? ` · ${v.created_by}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>Danger Zone</SectionLabel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium dark:text-white text-gray-900">Archive this version</p>
            <p className="text-xs dark:text-gray-500 text-gray-400">Mark Gako as archived and disable it for users.</p>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => publish.mutate('archived')}
            disabled={publish.isPending || currentStatus === 'archived'}
            className="border-red-500/20 text-red-400 hover:bg-red-500/10">
            Archive
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Main GakoPanel ───────────────────────────────────────────────────────────

export default function GakoPanel() {
  const [tab, setTab] = useState('overview');

  const { data: settings, isLoading: loadingSettings } = useGakoSettings();
  const { data: skills = [], isLoading: loadingSkills, isError: skillsError } = useGakoSkills();
  const { data: rules = [], isLoading: loadingRules, isError: rulesError } = useGakoBehavior();
  const { data: methods = [], isLoading: loadingMethods, isError: methodsError } = useGakoMethods();

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex gap-1 flex-wrap dark:bg-white/[0.02] bg-gray-50 rounded-xl p-1 border dark:border-white/5 border-gray-100">
        {PANEL_TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === id
                ? 'dark:bg-white/10 bg-white dark:text-white text-gray-900 shadow-sm'
                : 'dark:text-gray-500 text-gray-500 dark:hover:bg-white/5 hover:bg-gray-100'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Sections */}
      {tab === 'overview' && <OverviewSection settings={settings} skills={skills} rules={rules} methods={methods} setTab={setTab} />}
      {tab === 'model'    && (loadingSettings
        ? <div className="py-10 flex justify-center"><Spin /></div>
        : <ModelSection key={settings?.id ?? 'new'} settings={settings} />
      )}
      {tab === 'skills'   && <SkillsSection skills={skills} isLoading={loadingSkills} isError={skillsError} />}
      {tab === 'behavior' && <BehaviorSection rules={rules} isLoading={loadingRules} isError={rulesError} />}
      {tab === 'methods'  && <MethodsSection methods={methods} isLoading={loadingMethods} isError={methodsError} />}
      {tab === 'testlab'  && <TestLabSection skills={skills} settings={settings} />}
      {tab === 'logs'     && <LogsSection />}
      {tab === 'versions' && <VersionsSection settings={settings} skills={skills} rules={rules} methods={methods} />}
    </div>
  );
}
