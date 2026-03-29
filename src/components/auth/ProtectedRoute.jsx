import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/Auth" replace />;
  }

  if (adminOnly && user.user_metadata?.role !== 'admin') {
    return (
      <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Access Denied</h1>
          <p className="dark:text-gray-400 text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
}