import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Wand2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const generateStrongPassword = () => {
  const length = Math.floor(Math.random() * 5) + 12; // 12-16 chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const all = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const calculatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Very Weak', color: 'bg-red-500' };

  let score = 0;
  
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*]/.test(password)) score += 15;
  
  if (score >= 80) return { score, label: 'Very Strong', color: 'bg-blue-500' };
  if (score >= 60) return { score, label: 'Strong', color: 'bg-blue-500' };
  if (score >= 40) return { score, label: 'Medium', color: 'bg-yellow-500' };
  if (score >= 20) return { score, label: 'Weak', color: 'bg-orange-500' };
  return { score, label: 'Very Weak', color: 'bg-red-500' };
};

export default function PasswordResetModal({ newPassword, setNewPassword, confirmPassword, setConfirmPassword, onSubmit, loading, error }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const strength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword]);
  
  const requirements = useMemo(() => ({
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*]/.test(newPassword),
  }), [newPassword]);
  
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const allRequirementsMet = Object.values(requirements).every(r => r);

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    navigator.clipboard.writeText(generated);
    toast.success('Password copied to clipboard');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="new-password" className="dark:text-gray-300">New Password</Label>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="text-xs text-blue-500 hover:text-cyan-400 flex items-center gap-1 font-medium transition-colors"
          >
            <Wand2 className="w-3 h-3" /> Generate
          </button>
        </div>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="dark:bg-white/5 dark:border-white/10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-gray-400 text-gray-600 hover:dark:text-gray-300 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Password strength bar */}
        {newPassword && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: `${strength.score}%` }}
                />
              </div>
              <span className="text-xs dark:text-gray-400 text-gray-600 min-w-[80px]">
                {strength.label}
              </span>
            </div>
            
            {/* Requirements checklist */}
            <div className="space-y-0.5 text-xs mt-2">
              <div className={`flex items-center gap-1 ${requirements.length ? 'dark:text-cyan-400 text-blue-600' : 'dark:text-gray-500 text-gray-500'}`}>
                {requirements.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                At least 8 characters
              </div>
              <div className={`flex items-center gap-1 ${requirements.uppercase ? 'dark:text-cyan-400 text-blue-600' : 'dark:text-gray-500 text-gray-500'}`}>
                {requirements.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 uppercase letter
              </div>
              <div className={`flex items-center gap-1 ${requirements.lowercase ? 'dark:text-cyan-400 text-blue-600' : 'dark:text-gray-500 text-gray-500'}`}>
                {requirements.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 lowercase letter
              </div>
              <div className={`flex items-center gap-1 ${requirements.number ? 'dark:text-cyan-400 text-blue-600' : 'dark:text-gray-500 text-gray-500'}`}>
                {requirements.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 number
              </div>
              <div className={`flex items-center gap-1 ${requirements.special ? 'dark:text-cyan-400 text-blue-600' : 'dark:text-gray-500 text-gray-500'}`}>
                {requirements.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                1 special character (!@#$%^&*)
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="confirm-password" className="dark:text-gray-300">Confirm New Password</Label>
        </div>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="dark:bg-white/5 dark:border-white/10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-gray-400 text-gray-600 hover:dark:text-gray-300 hover:text-gray-700"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        {confirmPassword && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {passwordsMatch ? (
              <><Check className="w-3 h-3 text-blue-500" /><span className="text-blue-500">Passwords match</span></>
            ) : (
              <><X className="w-3 h-3 text-red-500" /><span className="text-red-500">Passwords do not match</span></>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !allRequirementsMet || !passwordsMatch}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}