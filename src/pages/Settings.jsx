import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../components/LanguageContext';
import { useTheme } from '../components/ThemeContext';
import { useLogout } from '../components/auth/useLogout';
import { useAuth } from '../components/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Shield, CreditCard, Globe, Sun, Moon, Save, LogOut, AlertCircle, Wand2, Bell, User } from 'lucide-react';

function getInitials(first, last) {
  const f = (first || '').trim();
  const l = (last  || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f)      return f[0].toUpperCase();
  if (l)      return l[0].toUpperCase();
  return 'U';
}
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, differenceInDays } from 'date-fns';
import PasswordInput from '../components/settings/PasswordInput';
import PasswordStrengthIndicator from '../components/settings/PasswordStrengthIndicator';
import LanguageSelector from '../components/LanguageSelector';
import NotificationsSettings from '../components/settings/NotificationsSettings';

export default function Settings() {
  const { t, lang, setLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const performLogout = useLogout();
  const queryClient = useQueryClient();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── Auth user from Supabase (always available for logged-in users) ──────────
  // user.email         → email address
  // user.created_at    → account creation timestamp
  // user.user_metadata → { first_name, last_name, birth_date } stored at signup
  const { user } = useAuth();

  // ── Base44 profile — subscription data only (falls back to null if base44 dead) ─
  const { data: profile } = useQuery({
    queryKey: ['settingsProfile'],
    queryFn: async () => {
      try {
        const me = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ created_by: me.email });
        if (profiles.length > 0) return profiles[0];
      } catch {
        // base44 is disabled — that's expected; subscription defaults to 'free'
      }
      return null;
    },
  });

  const [form, setForm] = useState({ first_name: '', last_name: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Populate form as soon as the auth user is available
  React.useEffect(() => {
    if (!user) return;

    const meta = user.user_metadata ?? {};
    const firstName = meta.first_name || meta.name?.split(' ')[0] || '';
    const lastName  = meta.last_name  || meta.name?.split(' ').slice(1).join(' ') || '';

    console.log('[settings] auth user:', user);
    console.log('[settings] profile data:', profile);

    setForm({
      first_name: profile?.first_name || firstName,
      last_name:  profile?.last_name  || lastName,
    });
  }, [user, profile]);

  // Also re-populate if profile arrives after user
  React.useEffect(() => {
    if (!profile) return;
    setForm(prev => ({
      first_name: profile.first_name || prev.first_name,
      last_name:  profile.last_name  || prev.last_name,
    }));
  }, [profile]);

  // ── Save — updates Supabase auth metadata (works without base44) ─────────
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: form.first_name, last_name: form.last_name },
      });
      if (error) throw error;

      // Also try base44 profile if it exists
      if (profile?.id) {
        try {
          await base44.entities.UserProfile.update(profile.id, {
            first_name: form.first_name,
            last_name:  form.last_name,
          });
          queryClient.invalidateQueries({ queryKey: ['settingsProfile'] });
        } catch {
          // base44 unavailable — Supabase save already succeeded
        }
      }

      toast.success('Settings saved');
    } catch (err) {
      toast.error('Could not save: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settingsProfile'] });
    },
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);

    try {
      const res = await base44.functions.invoke('changePassword', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });

      if (res.data.success) {
        setPasswordSuccess('Password updated successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        setPasswordError(res.data.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError(error.message || 'An error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    const length = 14;
    let password = '';
    
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setPasswordForm({ ...passwordForm, newPassword: password, confirmPassword: password });
    
    navigator.clipboard.writeText(password).then(() => {
      toast.success('Password copied to clipboard');
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold dark:text-white text-gray-900">{t('settings_title')}</h1>

      <Tabs defaultValue="profile">
        <TabsList className="dark:bg-white/5 bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="profile" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User className="w-4 h-4" /> {t('settings_profile')}
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4" /> {t('settings_security')}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Globe className="w-4 h-4" /> {t('settings_preferences')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Bell className="w-4 h-4" /> {t('settings_notifications_tab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
            {/* Avatar — initials-based, updates live as name is edited */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
              >
                <span className="text-xl font-bold text-white leading-none select-none">
                  {getInitials(form.first_name, form.last_name)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium dark:text-white text-gray-900">
                  {form.first_name || form.last_name
                    ? `${form.first_name} ${form.last_name}`.trim()
                    : t('settings_your_name')}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs dark:text-gray-500 text-gray-500 mb-1 block">{t('auth_first_name')}</label>
                <Input
                  value={form.first_name || ''}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="dark:bg-white/5 dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs dark:text-gray-500 text-gray-500 mb-1 block">{t('settings_last_name')}</label>
                <Input
                  value={form.last_name || ''}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="dark:bg-white/5 dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs dark:text-gray-500 text-gray-500 mb-1 block">{t('email')}</label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="dark:bg-white/5 dark:border-white/10 dark:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs dark:text-gray-500 text-gray-500 mb-1 block">{t('settings_member_since')}</label>
                <Input
                  value={(() => {
                    const raw = user?.created_at || profile?.created_date;
                    if (!raw) return '';
                    try { return format(new Date(raw), 'MMM yyyy'); } catch { return ''; }
                  })()}
                  disabled
                  className="dark:bg-white/5 dark:border-white/10 dark:text-gray-500"
                />
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
              <div className="space-y-4">
                <div>
                  <p className="text-xs dark:text-gray-500 text-gray-500 uppercase font-semibold mb-3">{t('settings_subscription')}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">{t('settings_plan_label')}</p>
                      <p className="text-sm font-semibold dark:text-white text-gray-900">
                        {profile?.subscription_plan === 'free' ? t('plans_free') : profile?.subscription_plan === 'premium' ? t('plans_premium') : t('plans_free')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs dark:text-gray-500 text-gray-500 mb-1.5">{t('settings_status')}</p>
                      {(() => {
                        const plan = profile?.subscription_plan;
                        const isFree = !plan || plan.toLowerCase() === 'free';

                        if (isFree) {
                          return (
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-500 border-blue-500/20">
                                {t('settings_free_plan')}
                              </div>
                              <p className="text-[11px] dark:text-gray-500 text-gray-400 mt-1.5">
                                {t('settings_on_free')}
                              </p>
                            </div>
                          );
                        }

                        if (!profile?.subscription_expiry) {
                          return (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-500 border-blue-500/20">
                              {t('settings_active')}
                            </div>
                          );
                        }

                        const daysLeft = Math.ceil(
                          (new Date(profile.subscription_expiry) - new Date()) / (1000 * 60 * 60 * 24)
                        );

                        let status = '';
                        let badgeColor = '';
                        let icon = null;

                        if (daysLeft < 0) {
                          status = t('settings_expired');
                          badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
                          icon = <AlertCircle className="w-3 h-3" />;
                        } else if (daysLeft < 3) {
                          status = `${t('settings_expires_in')} ${daysLeft} ${daysLeft !== 1 ? t('status_days') : t('status_day')}`;
                          badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
                          icon = <AlertCircle className="w-3 h-3" />;
                        } else if (daysLeft < 14) {
                          status = `${t('settings_expires_in')} ${daysLeft} ${t('status_days')}`;
                          badgeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                          icon = <AlertCircle className="w-3 h-3" />;
                        } else {
                          status = `${t('settings_active_days')} ${daysLeft} ${t('settings_days_remaining')}`;
                          badgeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                        }

                        return (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColor}`}>
                            {icon}
                            {status}
                          </div>
                        );
                      })()}
                    </div>

                    {(() => {
                      const plan = profile?.subscription_plan;
                      const isPaid = plan && plan.toLowerCase() !== 'free';
                      if (!isPaid || !profile?.subscription_expiry) return null;
                      return (
                        <div>
                          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">{t('settings_renewal')}</p>
                          <p className="text-sm dark:text-gray-300 text-gray-700">
                            {format(new Date(profile.subscription_expiry), 'MMM d, yyyy')}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {profile?.subscription_plan === 'free' && (
                <Link to="/Plans" className="block mt-4">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                    {t('settings_upgrade_plan')}
                  </Button>
                </Link>
              )}
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="mt-6 bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? t('settings_saving') : t('save')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-4">
          <div className="p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 space-y-4">
            <div>
              <p className="text-sm font-medium dark:text-white text-gray-900 mb-4">{t('settings_change_password_title')}</p>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <PasswordInput
                  label={t('settings_current_password')}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder={t('settings_current_password')}
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs dark:text-gray-500 text-gray-500">{t('settings_new_password')}</label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-xs text-blue-500 hover:text-cyan-400 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Wand2 className="w-3 h-3" /> {t('settings_generate')}
                    </button>
                  </div>
                  <PasswordInput
                    label=""
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder={t('settings_new_password')}
                  />
                  <div className="mt-3">
                    <PasswordStrengthIndicator password={passwordForm.newPassword} />
                  </div>
                </div>

                <PasswordInput
                  label={t('settings_confirm_password')}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder={t('settings_confirm_password')}
                />

                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-500">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-500">{passwordSuccess}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {passwordLoading ? t('settings_updating') : t('save')}
                </Button>
              </form>
            </div>
            
            <div className="border-t dark:border-white/10 border-gray-200 pt-4 mt-6">
              <p className="text-sm font-medium dark:text-white text-gray-900 mb-3">{t('settings_logout_title')}</p>
              <Button onClick={performLogout} className="w-full bg-red-500 hover:bg-red-600 text-white gap-2">
                <LogOut className="w-4 h-4" /> {t('nav_logout')}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6 space-y-4">
          <div className="p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 space-y-5">
            <div>
              <p className="text-sm font-medium dark:text-white text-gray-900 mb-2">{t('settings_language')}</p>
              <p className="text-xs dark:text-gray-500 text-gray-500 mb-3">
                {t('settings_current_lang')} {lang === 'en' ? 'English' : 'עברית'}
              </p>
              <LanguageSelector
                onLanguageChange={(newLang) => {
                  if (profile) {
                    updateProfile.mutate({ language: newLang });
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium dark:text-white text-gray-900">{t('settings_theme')}</p>
                <p className="text-xs dark:text-gray-500 text-gray-500">{isDark ? t('settings_dark') : t('settings_light')}</p>
              </div>
              <button
                onClick={() => {
                  toggleTheme();
                  if (profile) {
                    updateProfile.mutate({ theme: isDark ? 'light' : 'dark' });
                  }
                }}
                className="p-2.5 rounded-xl dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-600 hover:bg-gray-200 dark:hover:bg-white/10"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationsSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
}