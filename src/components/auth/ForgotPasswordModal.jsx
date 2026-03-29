import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import VerificationCodeInput from '../PasswordReset/VerificationCodeInput';
import PasswordResetModal from '../PasswordReset/PasswordResetModal';

export default function ForgotPasswordModal({ open, onOpenChange }) {
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

  const resetModal = () => {
    setStep(1);
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
    setCanResend(false);
    setResendCountdown(0);
  };

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
        
        // Show development fallback message if applicable
        if (res.data.isDevelopmentFallback) {
          toast.error(res.data.message, {
            duration: 8000,
            description: 'This is a temporary development message'
          });
        } else {
          toast.success('Verification code sent to your email');
        }
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
        // Don't show toast, let the modal handle it cleanly
      } else {
        setCodeError(true);
        setError(res.data.error || 'Invalid verification code');
        setTimeout(() => setCodeError(false), 500);
      }
    } catch (err) {
      setCodeError(true);
      setError(err.message || 'Invalid verification code');
      setTimeout(() => setCodeError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      const res = await base44.functions.invoke('resetPasswordWithCode', {
        email,
        code,
        newPassword,
        confirmPassword
      });
      if (res.data.success) {
        toast.success('Password successfully reset');
        resetModal();
        onOpenChange(false);
      } else {
        setError(res.data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
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
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetModal();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <p className="text-sm dark:text-gray-400 text-gray-600">
              Enter your email and we will send you a verification code.
            </p>
            <div>
              <Label htmlFor="modal-email" className="dark:text-gray-300">Email address</Label>
              <Input
                id="modal-email"
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : 'Send verification code'}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <p className="text-sm dark:text-gray-400 text-gray-600 mb-4 text-center">
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</> : 'Verify code'}
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
          <PasswordResetModal
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onSubmit={handleResetPassword}
            loading={loading}
            error={error}
          />
        )}
      </DialogContent>

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
    </Dialog>
  );
}