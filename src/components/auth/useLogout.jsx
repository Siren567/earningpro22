import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const performLogout = async () => {
    // Clear auth state
    await logout();
    
    // Hard redirect to landing page
    window.location.href = '/Landing';
  };

  return performLogout;
}