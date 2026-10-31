import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Logo } from '../../../components/Logo';
import { Button } from '../../../components/ui/Button';
import { useAdminAuth } from '../../../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, password);
      const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(
        errObj?.response?.data?.message ||
          'Invalid administrator credentials. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#223B28] flex flex-col justify-between font-sans selection:bg-[#2E4D34] selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Logo variant="dark" size="sm" showTagline={false} />
        <span className="text-xs font-bold uppercase tracking-wider bg-[#2E4D34] text-white px-2.5 py-1 rounded-full shadow-2xs">
          Admin Portal
        </span>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAE5DB] p-6 sm:p-8 shadow-sm space-y-6 animate-scaleUp">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] text-[#2E4D34] flex items-center justify-center mx-auto shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#223B28]">
              Administrator Sign In
            </h1>
            <p className="text-xs sm:text-sm text-[#637365]">
              Access moderation tools, product review queues, and seller approvals.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FFF0F0] border border-[#FED7D7] text-xs text-[#C53030] flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#223B28] mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.com"
                  autoComplete="username"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/50 text-xs sm:text-sm text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#223B28] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/50 text-xs sm:text-sm text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9B90] hover:text-[#223B28] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center !py-2.5 mt-2"
              isLoading={isSubmitting}
            >
              Sign In to Admin Console
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#8E9B90]">
        <p>© 2026 ChillyFlakes Marketplace. Internal Administration Portal.</p>
      </footer>
    </div>
  );
};

export default AdminLoginPage;
