import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../components/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Check, X, ArrowLeft, Eye, EyeOff, Wand2 } from 'lucide-react';
import AppLogo from '../components/app/AppLogo';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import SuspensionModal from '../components/auth/SuspensionModal';
import { generateStrongPassword } from '@/lib/passwordUtils';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSuspension, setShowSuspension] = useState(false);
  const [suspendedEmail, setSuspendedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  
  const { login, register, user, isGuest, enterGuestMode } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const accountConfirmed = searchParams.get('confirmed') === 'true';

  useEffect(() => {
    if (searchParams.get('suspended') === 'true') {
      setShowSuspension(true);
    }
  }, [searchParams]);

  // Signed-in users and active guest sessions should not stay on the auth screen.
  useEffect(() => {
    if (user || isGuest) {
      navigate('/Dashboard', { replace: true });
    }
  }, [user, isGuest, navigate]);

  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword(16);
    setFormData(prev => ({ ...prev, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  const handleBirthDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
      value = value.slice(0, 2) + ' / ' + value.slice(2);
    }
    if (value.length >= 7) {
      value = value.slice(0, 7) + ' / ' + value.slice(7, 11);
    }
    
    setFormData({ ...formData, birth_date: value });
  };

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;
    
    // Length check
    if (pwd.length >= 8) score += 20;
    if (pwd.length >= 12) score += 10;
    if (pwd.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[!@#$%^&*]/.test(pwd)) score += 15;
    
    let label = t('auth_pwd_very_weak');
    let color = 'bg-red-500';

    if (score >= 80) {
      label = t('auth_pwd_very_strong');
      color = 'bg-blue-500';
    } else if (score >= 60) {
      label = t('auth_pwd_strong');
      color = 'bg-blue-500';
    } else if (score >= 40) {
      label = t('auth_pwd_medium');
      color = 'bg-yellow-500';
    } else if (score >= 20) {
      label = t('auth_pwd_weak');
      color = 'bg-orange-500';
    }
    
    return { score, label, color };
  }, [formData.password, t]);

  // Password validation
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least 1 uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least 1 lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('At least 1 number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('At least 1 special character (!@#$%^&*)');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      
      if (mode === 'login') {
        result = await login(formData.email, formData.password, rememberMe);
      } else {
        // Registration validations
        if (!formData.first_name || !formData.last_name) {
          setError('First name and last name are required');
          setLoading(false);
          return;
        }

        // Password strength validation
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
          setError('Password requirements:\n' + passwordErrors.join('\n'));
          setLoading(false);
          return;
        }

        // Confirm password match
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        // Terms agreement check
        if (!agreeToTerms) {
          setError('You must agree to the Terms of Service to create an account.');
          setLoading(false);
          return;
        }

        result = await register(formData);
      }

      if (result.success) {
        if (result.emailConfirmationRequired) {
          setEmailConfirmationSent(true);
        } else {
          // Full page replace so AuthContext re-initializes from localStorage
          // and ProtectedRoute sees the session on first render (no race).
          window.location.replace('/Dashboard');
          return;
        }
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/Landing">
          <Button variant="ghost" className="mb-4 gap-2 dark:text-gray-400 text-gray-600">
            <ArrowLeft className="w-4 h-4" />
            {t('auth_back_home')}
          </Button>
        </Link>

        {accountConfirmed && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#4CBFF5]/10 border border-[#4CBFF5]/25 text-sm text-[#4CBFF5] text-center">
            {t('auth_account_confirmed')}
          </div>
        )}

        {emailConfirmationSent ? (
          <div className="dark:bg-[#1a1a2e] bg-white rounded-2xl shadow-xl border dark:border-white/10 border-gray-200 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#4CBFF5]/10 border border-[#4CBFF5]/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-[#4CBFF5]" />
            </div>
            <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-2">{t('auth_check_email')}</h2>
            <p className="text-sm dark:text-gray-400 text-gray-600 mb-6">
              {t('auth_check_email_desc')} <span className="text-[#4CBFF5] font-medium">{formData.email}</span>.{' '}
              {t('auth_activate')}
            </p>
            <Button
              onClick={() => { setEmailConfirmationSent(false); setMode('login'); }}
              className="w-full gradient-primary border-0 text-white"
            >
              {t('auth_back_login')}
            </Button>
          </div>
        ) : (

        <div className="dark:bg-[#1a1a2e] bg-white rounded-2xl shadow-xl border dark:border-white/10 border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppLogo size="w-14 h-14" />
            </div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900 mb-2">
              StockPulse AI
            </h1>
            <p className="text-sm dark:text-gray-400 text-gray-600">
              {mode === 'login' ? t('auth_welcome') : t('auth_create_account')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <Label htmlFor="first_name" className="dark:text-gray-300">{t('auth_first_name')}</Label>
                  <Input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="dark:bg-white/5 dark:border-white/10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="dark:text-gray-300">{t('auth_last_name')}</Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="dark:bg-white/5 dark:border-white/10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date" className="dark:text-gray-300">{t('auth_birth_date')}</Label>
                  <Input
                    id="birth_date"
                    type="text"
                    placeholder="DD / MM / YYYY"
                    value={formData.birth_date}
                    onChange={handleBirthDateChange}
                    maxLength={14}
                    className="dark:bg-white/5 dark:border-white/10"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email" className="dark:text-gray-300">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="dark:bg-white/5 dark:border-white/10"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password" className="dark:text-gray-300">{t('password')}</Label>
                {mode === 'register' && (
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-1 text-xs text-[#4CBFF5] hover:text-blue-400 transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    {t('auth_generate_password')}
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="dark:bg-white/5 dark:border-white/10 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4CBFF5] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'login' && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 dark:bg-white/5"
                    />
                    <Label htmlFor="rememberMe" className="dark:text-gray-300 text-sm cursor-pointer">
                      {t('auth_remember_me')}
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-500 hover:text-cyan-400 transition-colors"
                  >
                    {t('auth_forgot_password')}
                  </button>
                </div>
              )}
              {mode === 'register' && formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <span className="text-xs dark:text-gray-400 text-gray-600 min-w-[80px]">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs dark:text-gray-500 text-gray-600">
                    <div className="flex items-center gap-1">
                      {formData.password.length >= 8 ?
                        <Check className="w-3 h-3 text-blue-500" /> :
                        <X className="w-3 h-3 text-red-500" />
                      }
                      <span>{t('auth_pwd_req_length')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/[A-Z]/.test(formData.password) ?
                        <Check className="w-3 h-3 text-blue-500" /> :
                        <X className="w-3 h-3 text-red-500" />
                      }
                      <span>{t('auth_pwd_req_upper')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/[a-z]/.test(formData.password) ?
                        <Check className="w-3 h-3 text-blue-500" /> :
                        <X className="w-3 h-3 text-red-500" />
                      }
                      <span>{t('auth_pwd_req_lower')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/[0-9]/.test(formData.password) ?
                        <Check className="w-3 h-3 text-blue-500" /> :
                        <X className="w-3 h-3 text-red-500" />
                      }
                      <span>{t('auth_pwd_req_number')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/[!@#$%^&*]/.test(formData.password) ?
                        <Check className="w-3 h-3 text-blue-500" /> :
                        <X className="w-3 h-3 text-red-500" />
                      }
                      <span>{t('auth_pwd_req_special')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <Label htmlFor="confirmPassword" className="dark:text-gray-300 mb-1 block">{t('settings_confirm_password')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="dark:bg-white/5 dark:border-white/10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4CBFF5] transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {formData.password === formData.confirmPassword ? (
                      <><Check className="w-3 h-3 text-blue-500" /><span className="text-blue-500">{t('auth_passwords_match')}</span></>
                    ) : (
                      <><X className="w-3 h-3 text-red-500" /><span className="text-red-500">{t('auth_passwords_no_match')}</span></>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    id="agreeToTerms"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 dark:bg-white/5"
                  />
                  <Label htmlFor="agreeToTerms" className="dark:text-gray-300 text-sm cursor-pointer">
                    {t('auth_agree_terms')}{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="text-blue-500 hover:text-cyan-400 underline"
                    >
                      {t('footer_terms')}
                    </button>
                    {' '}{t('auth_and')}{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      className="text-blue-500 hover:text-cyan-400 underline"
                    >
                      {t('footer_privacy')}
                    </button>
                  </Label>
                </div>
                <p className="text-xs dark:text-gray-500 text-gray-600 pl-6">
                  {t('auth_disclaimer_notice')}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('auth_processing')}</>
              ) : (
                mode === 'login' ? t('auth_login') : t('auth_register')
              )}
            </Button>

            {mode === 'login' && (
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
                  disabled={loading}
                  onClick={() => enterGuestMode()}
                >
                  {t('auth_continue_guest')}
                </Button>
                <p className="text-xs text-center dark:text-gray-500 text-gray-500 leading-relaxed px-1">
                  {t('auth_guest_hint')}
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm dark:text-cyan-400 text-blue-600 hover:underline"
            >
              {mode === 'login' ? t('auth_no_account') : t('auth_has_account')}
            </button>
          </div>
        </div>
        )} {/* end emailConfirmationSent else */}
      </div>

      {/* Terms of Service Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('footer_terms')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4 text-sm dark:text-gray-300 text-gray-700">
            <p className="text-xs dark:text-gray-400 text-gray-600">Last updated: 2026</p>
            
            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Introduction</h3>
              <p>Welcome to this platform. By accessing or using this website and its services, you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, please do not use the platform.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Use of the Platform</h3>
              <p>The information, data, analysis, scores, alerts, watchlists, earnings calendars, technical indicators, and any other content provided on this platform is for informational and educational purposes only.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Important Notice</h3>
              
              <p className="mb-3">This platform aggregates and summarizes market data and analysis from third-party sources. We do not create this data ourselves, nor do we guarantee its accuracy, completeness, timeliness, or reliability. Market data may be delayed, inaccurate, or incomplete.</p>
              
              <p className="mb-3">Nothing on this platform constitutes financial advice, investment advice, trading advice, tax advice, or any recommendation to buy, sell, or hold any security or financial instrument. All investment and trading decisions are the sole responsibility of the user.</p>
              
              <p className="mb-3">You acknowledge that investing and trading in securities involves substantial risk of loss and is not suitable for all users. Past performance does not guarantee future results. You should consult with a qualified financial advisor before making any investment decisions.</p>
              
              <p>The platform owners, operators, developers, and service providers shall not be liable for any direct, indirect, incidental, consequential, or financial damages, including but not limited to trading losses, investment losses, or lost profits, resulting from the use of the platform or reliance on any information provided herein.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Use of the Platform</h3>
              <p>This platform provides tools, analytics, market data, earnings-related information, watchlists, alerts, and other informational resources related to stocks and financial markets. The platform is intended for informational, educational, and research purposes only.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Eligibility</h3>
              <p>By using this platform, you confirm that you are legally permitted to use the service under the laws applicable to you.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">No Financial Advice</h3>
              <p className="mb-3">
                <span className="font-extrabold px-1 py-0.5 rounded" style={{ backgroundColor: '#FFF3A0' }}>THIS PLATFORM DOES NOT PROVIDE FINANCIAL OR INVESTMENT ADVICE.</span>
              </p>
              <p className="mb-3">The information provided on this platform does not constitute financial advice, investment advice, trading advice, legal advice, tax advice, or any recommendation to buy, sell, or hold any security or financial instrument.</p>
              <p className="mb-3">All data, scores, alerts, rankings, analytics, indicators, watchlists, and other information are provided strictly for informational and educational purposes only.</p>
              <p className="mb-3">Users are solely responsible for their own financial decisions, trades, investments, and risk management.</p>
              <p>You should consult a qualified financial advisor or other licensed professional before making investment or financial decisions.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Market Data Disclaimer</h3>
              <p>Market data, financial metrics, earnings information, analytics, and news displayed on this platform may be provided by third-party sources. We do not guarantee that such data is accurate, complete, current, uninterrupted, or error-free. Delays, omissions, and inaccuracies may occur.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">User Responsibility</h3>
              <p>You are solely responsible for your use of the platform and for any actions you take based on the information provided. You agree not to misuse the service, interfere with the platform, attempt unauthorized access, or use the platform for unlawful purposes.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Accounts and Credentials</h3>
              <p>Users are responsible for maintaining the confidentiality of their login credentials and for all activity that occurs under their accounts.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Limitation of Liability</h3>
              <p className="mb-3">To the fullest extent permitted by law, the platform, its owners, operators, developers, affiliates, and service providers shall not be liable for any direct, indirect, incidental, consequential, special, exemplary, or financial damages, including trading losses, investment losses, lost profits, or losses resulting from reliance on data or platform functionality.</p>
              <p>Use of the platform is entirely at your own risk.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Availability of Service</h3>
              <p>We do not guarantee that the platform will always be available, uninterrupted, secure, or free from bugs or errors. Features, data sources, and services may be modified, suspended, or discontinued at any time.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Changes to the Terms</h3>
              <p>We reserve the right to update or modify these Terms of Service at any time. Continued use of the platform after changes are posted constitutes acceptance of the updated terms.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Contact</h3>
              <p>If you have any questions regarding these Terms of Service, please contact us through the Contact form available on the platform.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('footer_privacy')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4 text-sm dark:text-gray-300 text-gray-700">
            <p className="text-xs dark:text-gray-400 text-gray-600">Last updated: 2026</p>
            
            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Introduction</h3>
              <p>This Privacy Policy explains how we collect, use, store, and protect user information when using this platform.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Information We Collect</h3>
              <p>We may collect information such as:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>name</li>
                <li>email address</li>
                <li>account credentials</li>
                <li>profile settings</li>
                <li>subscription details</li>
                <li>usage data</li>
                <li>device or browser-related technical data</li>
                <li>platform interaction data</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">How We Use Information</h3>
              <p>We may use collected information to:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>create and manage user accounts</li>
                <li>authenticate users</li>
                <li>operate and improve platform functionality</li>
                <li>personalize user experience</li>
                <li>send service-related notifications</li>
                <li>maintain security and prevent misuse</li>
                <li>analyze performance and usage patterns</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Account Security</h3>
              <p>Passwords must be stored securely using hashing and must never be stored in plain text.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Data Protection</h3>
              <p>We implement reasonable technical and organizational measures to protect personal information. However, no internet-based system or storage solution can be guaranteed to be completely secure.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Third-Party Services</h3>
              <p className="mb-2">This platform may use third-party providers and APIs for services such as:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>market data</li>
                <li>analytics</li>
                <li>infrastructure</li>
                <li>notifications</li>
                <li>authentication-related functionality</li>
              </ul>
              <p className="mt-2">These third parties may process certain information as necessary for the platform to function.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Cookies and Sessions</h3>
              <p>The platform may use cookies, session tokens, and similar technologies to maintain login sessions, remember preferences, and improve user experience.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">User Rights</h3>
              <p>Where applicable, users may request access to, correction of, or deletion of their account information by contacting the platform through the Contact form.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Data Retention</h3>
              <p>We may retain account and usage information for as long as reasonably necessary to provide the service, comply with legal obligations, resolve disputes, and enforce platform policies.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Policy Updates</h3>
              <p>We may update this Privacy Policy from time to time. Continued use of the platform after updates are posted constitutes acceptance of the revised policy.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Contact</h3>
              <p>If you have any questions about this Privacy Policy, please contact us through the Contact form on the platform.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal open={showForgotPassword} onOpenChange={setShowForgotPassword} />

      {/* Suspension Modal */}
      <SuspensionModal email={suspendedEmail} open={showSuspension} onOpenChange={setShowSuspension} />
    </div>
  );
}