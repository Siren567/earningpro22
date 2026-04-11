import { useCallback, useEffect, useState } from 'react';

/**
 * Detect PWA standalone / installed display modes (Chromium + iOS Safari).
 */
function getIsStandalone() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  } catch {
    /* ignore */
  }
  // iOS Safari — only on real standalone PWA
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true;
  return false;
}

/**
 * iOS (including iPadOS desktop mode).
 */
function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * Rough "Mobile Safari" (not Chrome/Firefox/Edge on iOS).
 */
function isIosSafariInstallContext() {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent || '';
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\//i.test(ua)) return false;
  if (/Instagram|FBAN|FBAV|Line\/|Twitter/i.test(ua)) return false;
  return true;
}

/**
 * PWA install helpers: Chromium `beforeinstallprompt` + iOS Safari manual install path.
 */
export function usePwaInstall() {
  const [isStandalone, setIsStandalone] = useState(() => getIsStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    setIsStandalone(getIsStandalone());
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setIsStandalone(getIsStandalone());
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const promptInstall = useCallback(async () => {
    const ev = deferredPrompt;
    if (!ev || typeof ev.prompt !== 'function') {
      return { outcome: 'unavailable' };
    }
    try {
      await ev.prompt();
      const result = await ev.userChoice;
      setDeferredPrompt(null);
      return { outcome: result?.outcome ?? 'dismissed' };
    } catch {
      setDeferredPrompt(null);
      return { outcome: 'error' };
    }
  }, [deferredPrompt]);

  const canUseNativePrompt = Boolean(deferredPrompt);
  const iosManualInstall = !isStandalone && isIosSafariInstallContext();

  const showInstallSection =
    !isStandalone && (canUseNativePrompt || iosManualInstall);

  return {
    isStandalone,
    canUseNativePrompt,
    iosManualInstall,
    showInstallSection,
    promptInstall,
  };
}
