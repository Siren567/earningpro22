import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Guard: only create a real SDK client when appId is configured.
// If VITE_BASE44_APP_ID is empty the SDK hits /api/apps/null/... and gets 404s.
export const base44 = appId
  ? createClient({ appId, token, functionsVersion, serverUrl: '', requiresAuth: false, appBaseUrl })
  : createClient({ appId: '__disabled__', token: '', functionsVersion: '', serverUrl: '', requiresAuth: false, appBaseUrl: '' });
