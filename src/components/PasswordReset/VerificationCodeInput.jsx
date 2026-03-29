import React, { useRef, useEffect } from 'react';

export default function VerificationCodeInput({ code, onChange, error = false }) {
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value;
    const codeString = newCode.join('');

    onChange(codeString);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pastedData);
    
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    } else if (pastedData.length > 0) {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  return (
    <div className={`flex gap-3 justify-center ${error ? 'animate-shake' : ''}`}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength="1"
          value={code[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`w-12 h-12 text-center text-xl font-bold rounded-lg border-2 transition-all focus:outline-none ${
            error
              ? 'border-red-500 dark:border-red-500 dark:bg-red-500/10 bg-red-50'
              : code[index]
              ? 'border-blue-500 dark:border-blue-500 dark:bg-blue-500/10 bg-blue-50'
              : 'border-gray-300 dark:border-white/10 dark:bg-white/5 bg-gray-50'
          } dark:text-white text-gray-900 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
        />
      ))}
    </div>
  );
}