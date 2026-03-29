import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordStrengthIndicator({ password = '' }) {
  const requirements = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password),
    };
  }, [password]);

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (requirements.minLength) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    if (requirements.hasUppercase) score += 15;
    if (requirements.hasLowercase) score += 15;
    if (requirements.hasNumber) score += 15;
    if (requirements.hasSpecial) score += 15;

    let label = 'Very Weak';
    let color = 'bg-red-500';

    if (score >= 80) {
      label = 'Very Strong';
      color = 'bg-blue-500';
    } else if (score >= 60) {
      label = 'Strong';
      color = 'bg-blue-500';
    } else if (score >= 40) {
      label = 'Medium';
      color = 'bg-yellow-500';
    } else if (score >= 20) {
      label = 'Weak';
      color = 'bg-orange-500';
    }

    return { score, label, color };
  }, [password, requirements]);

  const RequirementItem = ({ met, text }) => (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="w-3.5 h-3.5 text-blue-500" />
      ) : (
        <X className="w-3.5 h-3.5 text-gray-500" />
      )}
      <span className={met ? 'text-blue-500 font-medium' : 'dark:text-gray-500 text-gray-500'}>
        {text}
      </span>
    </div>
  );

  return (
    <div className="space-y-2">
      {password && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs dark:text-gray-500 text-gray-500">Password strength</p>
              <span className="text-xs font-medium dark:text-gray-400 text-gray-600">
                {strength.label}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all duration-300`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-xs dark:text-gray-500 text-gray-500">Password must include:</p>
            <div className="space-y-1">
              <RequirementItem met={requirements.minLength} text="At least 8 characters" />
              <RequirementItem met={requirements.hasUppercase} text="1 uppercase letter (A-Z)" />
              <RequirementItem met={requirements.hasLowercase} text="1 lowercase letter (a-z)" />
              <RequirementItem met={requirements.hasNumber} text="1 number (0-9)" />
              <RequirementItem met={requirements.hasSpecial} text="1 special character (!@#$%^&*)" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}