import React from 'react';
import { useLanguage } from '../LanguageContext';
import { useLogout } from '../auth/useLogout';
import { LogOut, CreditCard, Bell, Settings } from 'lucide-react';

function getInitials(first, last) {
  const f = (first || '').trim();
  const l = (last  || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f)      return f[0].toUpperCase();
  if (l)      return l[0].toUpperCase();
  return 'U';
}
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
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-blue-500/30 hover:border-blue-500/50 transition-colors overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
        >
          <span className="text-[13px] font-semibold text-white leading-none select-none">
            {getInitials(profile?.first_name, profile?.last_name)}
          </span>
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