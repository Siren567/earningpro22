import React from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function NotificationPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const me = await base44.auth.me();
      return await base44.entities.NotificationHistory.filter({ user_email: me.email }, '-created_date', 20);
    },
  });

  const markAsRead = useMutation({
    mutationFn: (id) => base44.entities.NotificationHistory.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg dark:text-gray-400 dark:hover:bg-white/5 text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 dark:border-[#0a0a0f] border-white" />
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 dark:bg-[#1a1a2e] dark:border-white/10" align="end">
        <div className="p-4 border-b dark:border-white/5">
          <h3 className="font-semibold dark:text-white text-gray-900">Notifications</h3>
          <p className="text-xs dark:text-gray-500 text-gray-500">{unreadCount} unread</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm dark:text-gray-500 text-gray-500">No notifications</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead.mutate(notif.id)}
                className={`w-full text-left p-3 border-b dark:border-white/5 border-gray-100 hover:bg-white/5 transition-colors ${
                  !notif.is_read ? 'dark:bg-white/[0.03] bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium dark:text-white text-gray-900">{notif.stock_symbol || 'Alert'}</p>
                      {!notif.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                    <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs dark:text-gray-600 text-gray-400 mt-1">
                      {notif.notification_type}
                    </p>
                  </div>
                  <span className="text-xs dark:text-gray-600 text-gray-400 shrink-0 ml-2">
                    {format(new Date(notif.created_date), 'MMM d')}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}