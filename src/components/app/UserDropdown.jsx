import React from 'react';
import { useLanguage } from '../LanguageContext';
import { useLogout } from '../auth/useLogout';
import { User, LogOut, CreditCard, Calendar, Bell, Settings } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';

export default function UserDropdown({ profile }) {
  const { t } = useLanguage();
  const performLogout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center hover:border-blue-500/50 transition-colors">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-blue-500" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 dark:bg-[#1a1a2e] dark:border-white/10" align="end">
        <DropdownMenuLabel className="dark:text-white">
          <p>{profile?.first_name} {profile?.last_name}</p>
          <p className="text-xs font-normal dark:text-gray-500 text-gray-500 mt-0.5">
            {profile?.subscription_plan || 'free'} plan
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="dark:bg-white/5" />
        <DropdownMenuItem className="dark:text-gray-300 dark:focus:bg-white/5 gap-2" asChild>
          <Link to="/Settings">
            <Settings className="w-4 h-4" /> {t('nav_settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="dark:text-gray-300 dark:focus:bg-white/5 gap-2" asChild>
          <Link to="/Plans">
            <CreditCard className="w-4 h-4" /> {t('settings_subscription')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="dark:bg-white/5" />
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400 dark:focus:bg-red-500/10 focus:bg-red-50 gap-2"
          onClick={performLogout}
        >
          <LogOut className="w-4 h-4" /> {t('nav_logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}