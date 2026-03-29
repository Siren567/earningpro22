import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import PasswordInput from '../components/settings/PasswordInput';
import PasswordStrengthIndicator from '../components/settings/PasswordStrengthIndicator';
import VerificationCodeInput from '../components/PasswordReset/VerificationCodeInput';

export default function PasswordReset() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('sendPasswordResetCode', { email });
      if (res.data.success) {
        setStep(2);
        setCanResend(false);
        setResendCountdown(60);
        toast.success('Verification code sent to your email');
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setCodeError(false);
    setError('');

    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);

    try {
      const res = await base44.functions.invoke('verifyPasswordResetCode', { email, code });
      if (res.data.success) {
        setStep(3);
        toast.success('Code verified');
      } else {
        setCodeError(true);
        setError(res.data.error);
        setTimeout(() => setCodeError(false), 500);
      }
    } catch (err) {
      setCodeError(true);
      setError(err.message);
      setTimeout(() => setCodeError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*]/.test(newPassword)) {
      setError('Password does not meet requirements');
      return;
    }

    setLoading(true);

    try {
      const res = await base44.functions.invoke('resetPasswordWithCode', {
        email,
        code,
        newPassword,
        confirmPassword
      });
      if (res.data.success) {
        toast.success('Password reset successfully');
        setTimeout(() => navigate('/Auth'), 2000);
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('sendPasswordResetCode', { email });
      if (res.data.success) {
        setCanResend(false);
        setResendCountdown(60);
        setCode('');
        toast.success('New code sent to your email');
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && step === 2) {
      setCanResend(true);
    }
  }, [resendCountdown, step]);

  return (
    <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/Auth">
          <Button variant="ghost" className="mb-4 gap-2 dark:text-gray-400 text-gray-600">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Button>
        </Link>
        <div className="dark:bg-[#1a1a2e] bg-white rounded-2xl shadow-xl border dark:border-white/10 border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">
              Reset Password
            </h1>
            <p className="text-xs dark:text-gray-400 text-gray-600">
              Step {step} of 3
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="dark:text-gray-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="dark:bg-white/5 dark:border-white/10"
                  required
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : 'Send Verification Code'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <p className="text-sm dark:text-gray-300 text-gray-700 mb-4 text-center">
                  Enter the 6-digit code sent to<br/><span className="font-medium dark:text-white text-gray-900">{email}</span>
                </p>
                <VerificationCodeInput 
                  code={code} 
                  onChange={setCode}
                  error={codeError}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</> : 'Verify Code'}
              </Button>

              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-sm text-blue-500 hover:text-cyan-400 transition-colors font-medium"
                  >
                    Resend Code
                  </button>
                ) : (
                  <p className="text-xs dark:text-gray-500 text-gray-500">
                    Resend code in <span className="font-medium">{resendCountdown}s</span>
                  </p>
                )}
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <div className="mt-3">
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Resetting...</> : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}