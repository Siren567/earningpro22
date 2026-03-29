import React from 'react';
import { useLanguage } from '../LanguageContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function DisclaimerModal({ open, onAccept }) {
  const { t } = useLanguage();

  return (
    <Dialog open={open}>
      <DialogContent className="dark:bg-[#1a1a2e] dark:border-white/10 max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center dark:text-white">{t('disclaimer_title')}</DialogTitle>
          <DialogDescription className="text-center dark:text-gray-400 leading-relaxed mt-4">
            {t('disclaimer_text')}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onAccept} className="w-full bg-blue-500 hover:bg-blue-600 text-white mt-4">
          {t('disclaimer_accept')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}