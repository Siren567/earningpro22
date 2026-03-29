import React from 'react';

export default function StatCard({ icon: Icon, label, value, change, changeType, color }) {
  const iconColor = color
    ? color.replace('bg-', 'text-').replace('/10', '')
    : 'text-blue-500';

  return (
    <div className="
      p-4 rounded-xl
      dark:bg-white/[0.03] bg-white
      border dark:border-white/5 border-gray-200
      shadow-[0_2px_12px_rgba(0,0,0,0.35)]
      hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]
      transition-shadow duration-200
    ">
      <div className="flex items-start justify-between mb-2.5">
        <div className={`w-8 h-8 rounded-lg ${color || 'bg-blue-500/10'} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {change && (
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
            changeType === 'up' ? 'text-blue-500 bg-blue-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {changeType === 'up' ? '+' : ''}{change}
          </span>
        )}
      </div>
      <p className="text-xl font-bold dark:text-white text-gray-900 leading-tight">{value}</p>
      <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">{label}</p>
    </div>
  );
}