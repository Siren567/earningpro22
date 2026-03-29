import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function PasswordInput({ label, value, onChange, placeholder, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label className="text-xs dark:text-gray-500 text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <Input
          type={isVisible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`dark:bg-white/5 dark:border-white/10 dark:text-white pr-10 ${className}`}
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}