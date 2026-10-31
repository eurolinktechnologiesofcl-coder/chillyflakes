import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

/**
 * Legacy entry point: any code that calls `setIsLoginOpen(true)` is routed to the
 * dedicated, secure sign-in screen and returned to the current page afterwards.
 */
export const LoginModal: React.FC = () => {
  const { isLoginOpen, setIsLoginOpen } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoginOpen) return;
    setIsLoginOpen(false);
    const redirect = `${location.pathname}${location.search}`;
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [isLoginOpen, setIsLoginOpen, navigate, location.pathname, location.search]);

  return null;
};

export default LoginModal;
