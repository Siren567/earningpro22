import React, { useState } from 'react';
import { Download, Share2, PlusSquare } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PwaInstallSection() {
  const { t } = useLanguage();
  const {
    showInstallSection,
    canUseNativePrompt,
    iosManualInstall,
    promptInstall,
  } = usePwaInstall();

  const [iosOpen, setIosOpen] = useState(false);

  if (!showInstallSection) return null;

  const handleNativeInstall = async () => {
    const { outcome } = await promptInstall();
    if (outcome === 'accepted') {
      toast.success(t('pwa_install_toast_accepted'));
    } else if (outcome === 'dismissed') {
      toast.message(t('pwa_install_toast_dismissed'));
    }
  };

  return (
    <>
      <div className="rounded-xl border dark:border-[#4CBFF5]/10 border-[#ECE9E4] dark:bg-[#0D1628]/40 bg-gray-50/80 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl dark:bg-[#4CBFF5]/10 bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-[#4CBFF5] dark:text-[#4CBFF5] text-[#6C5CE7]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold dark:text-white text-gray-900">
              {t('pwa_install_title')}
            </p>
            <p className="text-xs dark:text-gray-500 text-gray-500 mt-1 leading-relaxed">
              {t('pwa_install_desc')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {canUseNativePrompt && (
            <Button
              type="button"
              onClick={handleNativeInstall}
              className="bg-blue-500 hover:bg-blue-600 text-white gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4 shrink-0" />
              {t('pwa_install_button')}
            </Button>
          )}
          {iosManualInstall && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIosOpen(true)}
              className="dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5 w-full sm:w-auto gap-2"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              {t('pwa_install_ios_button')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="dark:bg-[#0D1628] dark:border-[#4CBFF5]/15 border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white text-gray-900">
              {t('pwa_ios_modal_title')}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400 text-gray-600 text-start">
              {t('pwa_ios_modal_intro')}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 text-sm dark:text-gray-300 text-gray-700 list-none ps-0">
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg dark:bg-white/10 bg-gray-100">
                <Share2 className="w-4 h-4 text-[#4CBFF5]" />
              </span>
              <div>
                <p className="font-medium dark:text-white text-gray-900">
                  {t('pwa_ios_step1_title')}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5">
                  {t('pwa_ios_step1_desc')}
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg dark:bg-white/10 bg-gray-100">
                <PlusSquare className="w-4 h-4 text-[#4CBFF5]" />
              </span>
              <div>
                <p className="font-medium dark:text-white text-gray-900">
                  {t('pwa_ios_step2_title')}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5">
                  {t('pwa_ios_step2_desc')}
                </p>
              </div>
            </li>
          </ol>
          <Button
            type="button"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => setIosOpen(false)}
          >
            {t('close')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
