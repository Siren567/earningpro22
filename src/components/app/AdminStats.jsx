import React from 'react';
import { Users, CheckCircle, Shield, CreditCard } from 'lucide-react';

export default function AdminStats({ users = [] }) {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.is_suspended).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const paidUsers = users.filter(u => u.subscription_plan && u.subscription_plan !== 'free').length;

  const stats = [
    {
      icon: Users,
      label: 'Total Users',
      value: totalUsers,
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: CheckCircle,
      label: 'Active Users',
      value: activeUsers,
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: Shield,
      label: 'Admin Users',
      value: adminUsers,
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-500/20'
    },
    {
      icon: CreditCard,
      label: 'Paid Users',
      value: paidUsers,
      color: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl border ${stat.color} ${stat.borderColor} dark:bg-white/[0.03] bg-white dark:border-white/5 transition-all hover:shadow-lg`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="text-sm dark:text-gray-400 text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold dark:text-white text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}