import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { LanguageProvider } from './components/LanguageContext';
import { ThemeProvider } from './components/ThemeContext.jsx';
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Landing from './pages/Landing';
import Plans from './pages/Plans';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Terms from './pages/Terms';
import Dashboard from './pages/Dashboard';
import Earnings from './pages/Earnings';
import WatchlistPage from './pages/Watchlist';
import Alerts from './pages/Alerts';
import StockView from './pages/StockView';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Opportunities from './pages/Opportunities';
import GeckoAnalyze  from './pages/GeckoAnalyze';
import AppLayout from './components/app/AppLayout';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Earnings" replace />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/Plans" element={<Plans />} />
      <Route path="/Auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/Terms" element={<Terms />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Earnings" element={<Earnings />} />
        <Route path="/Watchlist" element={<WatchlistPage />} />
        <Route path="/Alerts" element={<Alerts />} />
        <Route path="/StockView" element={<StockView />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/Opportunities" element={<Opportunities />} />
        <Route path="/gecko/analyze" element={<GeckoAnalyze />} />
      </Route>
      <Route path="/Admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App