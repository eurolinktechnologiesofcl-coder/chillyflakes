import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  Calendar,
  ShoppingBag,
  Wallet,
  Star,
  Store,
  HelpCircle,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Info,
} from 'lucide-react';

import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import { ToastProvider } from '../components/vendor/Toast';
import { DemoBanner } from '../components/DemoBanner';
import { useQuery } from '@tanstack/react-query';
import { getVendorNotifications, type VendorAlertItem } from '../api/vendorPortalApi';

export const VendorLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close drawer and menus on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileDrawerOpen(false);
      setNotificationsOpen(false);
      setUserMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Focus trap for mobile drawer
  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);

  // Live vendor notifications
  const { data: notifData } = useQuery<{
    count: number;
    unread_count: number;
    results: VendorAlertItem[];
  }>({
    queryKey: ['vendor-notifications'],
    queryFn: getVendorNotifications,
    refetchInterval: 15000,
  });

  const alerts = notifData?.results || [];
  const alertCount = notifData?.unread_count ?? alerts.length;

  // Menu items list (Settings removed)
  const navItems = [
    { label: t('vendorNav.dashboard', 'Dashboard'), path: '/vendor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: t('vendorNav.products', 'Products'), path: '/vendor/products', icon: <Package className="w-4 h-4" /> },
    { label: t('vendorNav.services', 'Services & Workshops'), path: '/vendor/services', icon: <Calendar className="w-4 h-4" /> },
    { label: t('vendorNav.orders', 'Orders'), path: '/vendor/orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { label: t('vendorNav.earnings', 'Earnings'), path: '/vendor/earnings', icon: <Wallet className="w-4 h-4" /> },
    { label: t('vendorNav.reviews', 'Reviews'), path: '/vendor/reviews', icon: <Star className="w-4 h-4" /> },
    { label: t('vendorNav.profile', 'Store Profile'), path: '/vendor/profile', icon: <Store className="w-4 h-4" /> },
    { label: t('vendorNav.support', 'Support'), path: '/vendor/support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  // Derive page title for topbar
  const getCurrentPageTitle = () => {
    const item = navItems.find((n) => location.pathname.startsWith(n.path));
    return item ? item.label : 'Seller Portal';
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FAF7F2] text-[#223B28] flex flex-col font-sans selection:bg-[#2E4D34] selection:text-white">
        {import.meta.env.VITE_DEMO_MODE === 'true' && <DemoBanner />}
        {/* Skip to Content for Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2E4D34] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>

        {/* ======================================================== */}
        {/* DESKTOP FIXED SIDEBAR */}
        {/* ======================================================== */}
        <aside
          role="navigation"
          aria-label="Vendor Portal Navigation"
          className="hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-[#EAE5DB] z-30"
        >
          {/* Logo Area */}
          <div className="h-20 px-6 border-b border-[#EAE5DB] flex items-center justify-between">
            <Link
              to="/vendor/dashboard"
              className="group flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2E4D34] rounded-lg p-1"
              aria-label="ChillyFlakes Vendor Dashboard"
            >
              <Logo variant="dark" size="sm" showTagline={false} />
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EAF1EA] text-[#2E4D34] px-2 py-0.5 rounded-full border border-[#D1DDD0]">
                Seller
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#2E4D34] text-white shadow-xs font-semibold'
                      : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
                  }`
                }
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Sidebar Bottom Store Info */}
          <div className="p-4 border-t border-[#EAE5DB] bg-[#FAF7F2]/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2E4D34] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.store_name?.charAt(0) || user?.full_name?.charAt(0) || 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#223B28] truncate">
                  {user?.store_name || 'My Store'}
                </p>
                <p className="text-[11px] text-[#8E9B90] truncate">
                  {user?.full_name || 'Artisan Seller'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MOBILE SLIDE-IN DRAWER */}
        {/* ======================================================== */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden bg-black/40 backdrop-blur-xs flex animate-fadeIn"
            onClick={() => setMobileDrawerOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <div
              ref={drawerRef}
              className="w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col animate-slideInLeft"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="h-16 px-5 border-b border-[#EAE5DB] flex items-center justify-between">
                <Link
                  to="/vendor/dashboard"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2"
                >
                  <Logo variant="dark" size="sm" showTagline={false} />
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EAF1EA] text-[#2E4D34] px-2 py-0.5 rounded-full">
                    Seller
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#637365] hover:text-[#223B28] hover:bg-[#FAF7F2]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#2E4D34] text-white shadow-xs font-semibold'
                          : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
                      }`
                    }
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-[#EAE5DB] bg-[#FAF7F2]/60">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#EAE5DB] bg-white text-xs font-semibold text-[#DC2626] hover:bg-[#FFF0F0] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MAIN BODY AREA (Offset by sidebar on desktop) */}
        {/* ======================================================== */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          {/* Topbar */}
          <header className="sticky top-0 z-20 h-16 sm:h-20 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE5DB] flex items-center justify-between px-4 sm:px-8">
            {/* Left: Mobile hamburger + Page Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-[#EAE5DB] bg-white text-[#223B28] hover:bg-[#FAF7F2] transition-colors"
                aria-label="Open mobile navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <h2 className="text-base sm:text-lg font-bold text-[#223B28] tracking-tight">
                {getCurrentPageTitle()}
              </h2>

              {/* Vacation Mode Indicator slot (hidden for now) */}
              <div className="hidden" aria-hidden="true" id="vacation-mode-slot" />
            </div>

            {/* Right: Language Switcher, Notifications, User Menu */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Language Switcher */}
              <LanguageSwitcher variant="light" />

              {/* Notification Bell */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-xl border border-[#EAE5DB] bg-white text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
                  aria-label="View notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="w-4 h-4" />
                  {alertCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E29D38] text-white text-[10px] font-bold flex items-center justify-center">
                      {alertCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#EAE5DB] py-3 z-30 animate-fadeIn">
                    <div className="px-4 pb-2 border-b border-[#EAE5DB] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#223B28]">
                        Notifications
                      </span>
                      {alertCount > 0 ? (
                        <span className="text-[10px] font-semibold text-[#2E4D34] bg-[#EAF1EA] px-2 py-0.5 rounded-full">
                          {alertCount} new
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#8E9B90]">All caught up</span>
                      )}
                    </div>

                    <div className="divide-y divide-[#EAE5DB]/60 max-h-72 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#8E9B90]">
                          No notifications at this time.
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <Link
                            key={alert.id}
                            to={alert.link}
                            onClick={() => setNotificationsOpen(false)}
                            className="p-3.5 hover:bg-[#FAF7F2] transition-colors flex items-start gap-3 text-left block"
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {alert.type === 'order' && <ShoppingBag className="w-4 h-4 text-[#2E4D34]" />}
                              {alert.type === 'booking' && <Calendar className="w-4 h-4 text-[#1D63B8]" />}
                              {alert.type === 'stock' && <AlertTriangle className="w-4 h-4 text-[#8A5A00]" />}
                              {alert.type === 'support' && <HelpCircle className="w-4 h-4 text-[#9E2A2B]" />}
                              {alert.type !== 'order' && alert.type !== 'booking' && alert.type !== 'stock' && alert.type !== 'support' && (
                                <Info className="w-4 h-4 text-[#2E4D34]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#223B28]">
                                {alert.title}
                              </p>
                              <p className="text-[11px] text-[#637365] mt-0.5 leading-snug">
                                {alert.desc}
                              </p>
                              <span className="text-[10px] text-[#8E9B90] mt-1 block">
                                {alert.time}
                              </span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 sm:gap-2.5 p-1 sm:pr-3 rounded-full sm:rounded-xl border border-[#EAE5DB] bg-white hover:bg-[#FAF7F2] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
                  aria-label="User account menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold">
                    {user?.store_name?.charAt(0) || user?.full_name?.charAt(0) || 'V'}
                  </div>
                  <div className="hidden sm:block text-left text-xs leading-tight">
                    <p className="font-semibold text-[#223B28] truncate max-w-[110px]">
                      {user?.full_name || 'Vendor'}
                    </p>
                    <p className="text-[10px] text-[#8E9B90] truncate max-w-[110px]">
                      {user?.store_name || 'Artisan Seller'}
                    </p>
                  </div>
                  <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#8E9B90]" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#EAE5DB] py-2 z-30 animate-fadeIn text-xs">
                    <div className="px-4 py-2 border-b border-[#EAE5DB] mb-1">
                      <p className="font-bold text-[#223B28] truncate">
                        {user?.full_name}
                      </p>
                      <p className="text-[#8E9B90] text-[11px] truncate">
                        {user?.email}
                      </p>
                    </div>

                    <Link
                      to="/vendor/profile"
                      className="flex items-center gap-2.5 px-4 py-2 text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2] transition-colors"
                    >
                      <Store className="w-3.5 h-3.5 text-[#8E9B90]" />
                      <span>Store Profile</span>
                    </Link>

                    <div className="my-1 border-t border-[#EAE5DB]" />

                    <button
                      type="button"
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-[#DC2626] hover:bg-[#FFF0F0] transition-colors text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 focus:outline-none"
          >
            <Outlet />
          </main>

          {/* Portal Footer */}
          <footer className="border-t border-[#EAE5DB] bg-white py-4 px-4 sm:px-8">
            <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8E9B90]">
              <p>© 2026 ChillyFlakes Seller Portal. Empowering Indian Artisans & Creators.</p>
              <div className="flex items-center gap-4">
                <Link to="/vendor/support" className="hover:text-[#2E4D34] transition-colors">
                  Seller Support
                </Link>
                <span>•</span>
                <a
                  href="mailto:sellers@chillyflakes.in"
                  className="hover:text-[#2E4D34] transition-colors underline"
                >
                  sellers@chillyflakes.in
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
};

export default VendorLayout;
