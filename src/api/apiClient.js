/**
 * apiClient.js — drop-in replacement for base44Client.js
 *
 * Mirrors the exact same interface as the Base44 SDK:
 *   apiClient.auth.me()
 *   apiClient.entities.Alert.list()
 *   apiClient.entities.Alert.filter(conditions, sortField, limit)
 *   apiClient.entities.Alert.create(data)
 *   apiClient.entities.Alert.update(id, data)
 *   apiClient.entities.Alert.delete(id)
 *   apiClient.functions.invoke(name, params)
 *   apiClient.integrations.Core.UploadFile(file)
 *   apiClient.integrations.Core.SendEmail(config)
 *   apiClient.users.inviteUser(email, role)
 *
 * To wire up: point API_BASE_URL to your backend and swap the import
 * in every file from `base44Client` → `apiClient`, renaming `base44` → `apiClient`.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Reads the auth token from localStorage (same key the Base44 SDK used)
const getToken = () => localStorage.getItem('base44_access_token');

const http = axios.create({ baseURL: API_BASE_URL });

// Attach auth token to every request
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────

const auth = {
  me: () =>
    http.get('/api/auth/me').then((r) => r.data),

  logout: (redirectUrl) =>
    http.post('/api/auth/logout').then(() => {
      localStorage.removeItem('base44_access_token');
      if (redirectUrl) window.location.href = redirectUrl;
    }),

  redirectToLogin: (returnUrl) => {
    window.location.href = `/login?return_url=${encodeURIComponent(returnUrl || window.location.href)}`;
  },
};

// ─── Entities ────────────────────────────────────────────────────────────────
// Builds a CRUD object for a given entity name, matching Base44's entity API.

const createEntity = (entityName) => ({
  list: (sortField, limit) =>
    http.get(`/api/entities/${entityName}`, { params: { sortField, limit } }).then((r) => r.data),

  filter: (conditions, sortField, limit) =>
    http.post(`/api/entities/${entityName}/filter`, { conditions, sortField, limit }).then((r) => r.data),

  create: (data) =>
    http.post(`/api/entities/${entityName}`, data).then((r) => r.data),

  update: (id, data) =>
    http.put(`/api/entities/${entityName}/${id}`, data).then((r) => r.data),

  delete: (id) =>
    http.delete(`/api/entities/${entityName}/${id}`).then((r) => r.data),
});

const entities = new Proxy({}, {
  get: (_, entityName) => createEntity(entityName),
});

// ─── Functions ───────────────────────────────────────────────────────────────

const functions = {
  invoke: (name, params = {}) =>
    http.post(`/api/functions/${name}`, params).then((r) => r.data),
};

// ─── Integrations ────────────────────────────────────────────────────────────

const integrations = {
  Core: {
    UploadFile: (file) => {
      const form = new FormData();
      form.append('file', file);
      return http.post('/api/integrations/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },

    SendEmail: (config) =>
      http.post('/api/integrations/email', config).then((r) => r.data),
  },
};

// ─── Users ───────────────────────────────────────────────────────────────────

const users = {
  inviteUser: (email, role) =>
    http.post('/api/users/invite', { email, role }).then((r) => r.data),
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const apiClient = { auth, entities, functions, integrations, users };
