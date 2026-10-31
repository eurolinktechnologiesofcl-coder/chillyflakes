import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Store,
  Layers,
  FileText,
  ShoppingBag,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Package,
  Tag,
  Calendar,
  LifeBuoy,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../api/client';
import { Logo } from '../components/Logo';
import { useAdminAuth } from '../context/AdminAuthContext';
import { usePermission } from '../features/admin/hooks/usePermission';
import { useAdminProducts } from '../features/admin/hooks/useAdminProducts';
import { useAdminSellers } from '../features/admin/hooks/useAdminSellers';
import { useAdminOrders } from '../features/admin/hooks/useAdminOrders';
import { useAdminFinance } from '../features/admin/hooks/useAdminFinance';
import { ToastProvider } from '../components/vendor/Toast';
import type { AdminModule } from '../types/admin';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  module?: AdminModule;
  badge?: string;
  badgeColor?: string;
  isPlaceholder?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { admin, logout } = useAdminAuth();
  const { canView, isSuperAdmin } = usePermission();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Live pending product reviews
  const { data: queueData } = useAdminProducts({ status: 'pending_review', page_size: 1 });
  const pendingProductCount = queueData?.status_counts?.pending_review ?? 0;

  // Live pending seller reviews
  const { data: sellersData } = useAdminSellers({ status: 'under_review', page_size: 1 });
  const pendingSellerCount = sellersData?.tab_counts?.under_review ?? 0;

  // Live pending return claims and orders
  const { data: ordersData } = useAdminOrders({ tab: 'return_requested', page_size: 1 });
  const pendingReturnCount = ordersData?.tab_counts?.return_requested ?? 0;
  const pendingOrderCount = ordersData?.tab_counts?.pending_dispatch ?? 0;

  // Live pending service appointments
  const { data: bookingsData } = useQuery<{ tab_counts?: { pending?: number } }>({
    queryKey: ['admin-pending-bookings'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/api/v1/admin/services/bookings/', { params: { limit: 1 } });
        return res.data;
      } catch {
        return { tab_counts: { pending: 0 } };
      }
    },
    refetchInterval: 15000,
  });
  const pendingBookingCount = bookingsData?.tab_counts?.pending ?? 0;

  // Live pending payouts
  const { data: financeData } = useAdminFinance();
  const pendingPayoutCount = financeData?.summary?.payout_batches_pending ?? 0;

  // Live open seller support tickets
  const { data: ticketsData } = useQuery<{ open_count?: number; tickets?: any[] }>({
    queryKey: ['admin-open-tickets'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/api/v1/admin/support/tickets/', { params: { status: 'open' } });
        return res.data;
      } catch {
        return { open_count: 0, tickets: [] };
      }
    },
    refetchInterval: 15000,
  });
  const pendingTicketCount = ticketsData?.open_count ?? (Array.isArray(ticketsData?.tickets) ? ticketsData.tickets.length : 0);

  const totalAlertCount = pendingProductCount + pendingSellerCount + pendingReturnCount + pendingPayoutCount + pendingOrderCount + pendingBookingCount + pendingTicketCount;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
    setNotifDropdownOpen(false);
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const navGroups: NavGroup[] = useMemo(() => {
    return [
      {
        id: 'overview',
        label: 'Overview',
        items: [
          {
            label: 'Marketplace Overview',
            path: '/admin',
            icon: <LayoutDashboard className="w-4 h-4" />,
            module: 'overview',
          },
        ],
      },
      {
        id: 'people',
        label: 'People & Merchants',
        items: [
          {
            label: 'Customer Management',
            path: '/admin/people/customers',
            icon: <Users className="w-4 h-4" />,
            module: 'customers',
          },
          {
            label: 'Vendor & Seller Hub',
            path: '/admin/people/sellers',
            icon: <Store className="w-4 h-4" />,
            module: 'sellers',
            badge: pendingSellerCount > 0 ? `${pendingSellerCount} pending` : undefined,
            badgeColor: 'bg-[#FAF3E0] text-[#8A5A00] border-[#F3E2B8]',
          },
          {
            label: 'Vendor Support Desk',
            path: '/admin/support',
            icon: <LifeBuoy className="w-4 h-4" />,
            module: 'sellers',
          },
        ],
      },
      {
        id: 'catalog',
        label: 'Catalog',
        items: [
          {
            label: 'All Products',
            path: '/admin/products',
            icon: <Package className="w-4 h-4" />,
            module: 'products',
          },
          {
            label: 'Product Reviews',
            path: '/admin/product-reviews',
            icon: <CheckSquare className="w-4 h-4" />,
            module: 'products',
            badge: pendingProductCount > 0 ? String(pendingProductCount) : undefined,
            badgeColor: 'bg-[#FAF3E0] text-[#8A5A00] border-[#F3E2B8]',
          },
          {
            label: 'Categories',
            path: '/admin/categories',
            icon: <Layers className="w-4 h-4" />,
            module: 'categories',
          },
          {
            label: 'Services',
            path: '/admin/services',
            icon: <Sparkles className="w-4 h-4" />,
            module: 'products',
          },
        ],
      },
      {
        id: 'system',
        label: 'System & Compliance',
        items: [
          {
            label: 'Audit Log',
            path: '/admin/audit-log',
            icon: <FileText className="w-4 h-4" />,
            module: 'audit_log',
          },
        ],
      },
      {
        id: 'operations',
        label: 'Operations & Governance',
        items: [
          {
            label: 'Orders & Returns',
            path: '/admin/orders',
            icon: <ShoppingBag className="w-4 h-4" />,
            module: 'orders',
            badge: pendingReturnCount > 0 ? `${pendingReturnCount} claims` : undefined,
            badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
          },
          {
            label: 'Finance & Payouts',
            path: '/admin/finance',
            icon: <CreditCard className="w-4 h-4" />,
            module: 'payouts',
            badge: pendingPayoutCount > 0 ? `${pendingPayoutCount} pending` : undefined,
            badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          },
          {
            label: 'Coupons & Promos',
            path: '/admin/coupons',
            icon: <Tag className="w-4 h-4" />,
            module: 'settings',
          },
          {
            label: 'Store Settings',
            path: '/admin/settings',
            icon: <Settings className="w-4 h-4" />,
            module: 'settings',
          },
        ],
      },
    ];
  }, [pendingProductCount, pendingSellerCount, pendingReturnCount, pendingPayoutCount]);

  // Filter groups and items based on permissions
  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          if (item.isPlaceholder) return true;
          if (!item.module) return true;
          return canView(item.module);
        });
        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [navGroups, canView]);

  // Compute Breadcrumb segments
  const breadcrumb = useMemo(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/dashboard') {
      return ['Admin Console', 'Overview', 'Marketplace Overview'];
    }
    if (path.startsWith('/admin/people/customers')) {
      return ['Admin Console', 'People & Merchants', 'Customer Management'];
    }
    if (path.startsWith('/admin/people/sellers/')) {
      return ['Admin Console', 'People & Merchants', 'Vendor Inspection'];
    }
    if (path.startsWith('/admin/people/sellers')) {
      return ['Admin Console', 'People & Merchants', 'Vendor & Seller Hub'];
    }
    if (path.startsWith('/admin/people/staff')) {
      return ['Admin Console', 'People & Merchants', 'Staff & Role Permissions'];
    }
    if (path.startsWith('/admin/product-reviews/')) {
      return ['Admin Console', 'Catalog', 'Product Inspection'];
    }
    if (path.startsWith('/admin/product-reviews')) {
      return ['Admin Console', 'Catalog', 'Product Reviews'];
    }
    if (path.startsWith('/admin/categories')) {
      return ['Admin Console', 'Catalog', 'Categories'];
    }
    if (path.startsWith('/admin/audit-log')) {
      return ['Admin Console', 'System', 'Audit Log'];
    }
    return ['Admin Console', 'Portal'];
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FAF7F2] text-[#223B28] flex flex-col font-sans selection:bg-[#2E4D34] selection:text-white">
        {/* DESKTOP FIXED SIDEBAR */}
        <aside
          role="navigation"
          aria-label="Admin Navigation"
          className="hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-[#EAE5DB] z-30"
        >
          {/* Logo Area */}
          <div className="h-20 px-6 border-b border-[#EAE5DB] flex items-center justify-between">
            <Link
              to="/admin"
              className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2E4D34] rounded-lg p-1"
            >
              <Logo variant="dark" size="sm" showTagline={false} />
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2E4D34] text-white px-2 py-0.5 rounded-full shadow-2xs">
                Admin
              </span>
            </Link>
          </div>

          {/* Navigation Items (Grouped & Collapsible) */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {visibleGroups.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.id]);
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8E9B90] hover:text-[#223B28] transition-colors rounded-lg"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isExactActive =
                          item.path === '/admin'
                            ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
                            : location.pathname.startsWith(item.path);

                        if (item.isPlaceholder) {
                          return (
                            <div
                              key={item.path}
                              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#A2ADA4] cursor-not-allowed select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                {item.icon}
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${item.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                              isExactActive
                                ? 'bg-[#2E4D34] text-white shadow-xs font-semibold'
                                : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-1">
                              {item.icon}
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full border leading-tight ${
                                  isExactActive
                                    ? 'bg-white/20 text-white border-white/30'
                                    : item.badgeColor || 'bg-[#FAF3E0] text-[#8A5A00] border-[#F3E2B8]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Staff User Switcher Footer / Profile */}
          <div className="p-3 border-t border-[#EAE5DB] bg-[#FDFCF9]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-xs font-bold text-[#2E4D34] shrink-0">
                  {admin?.name?.charAt(0) || 'A'}
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-semibold text-[#223B28] truncate">{admin?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-[#8E9B90] truncate font-medium">
                    {admin?.role_name || (isSuperAdmin ? 'Super Admin' : 'Staff')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-[#5F6D61] hover:text-[#9E2A2B] hover:bg-[#FAF7F2] rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE TOP BAR */}
        <header className="lg:hidden h-16 bg-white border-b border-[#EAE5DB] px-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 -ml-2 text-[#223B28] hover:bg-[#FAF7F2] rounded-lg focus:outline-none"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Logo variant="dark" size="sm" showTagline={false} />
          </div>

          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                Dev
              </span>
            )}

            <button
              type="button"
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-2 text-[#5F6D61] hover:text-[#223B28] rounded-lg"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {totalAlertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#9E2A2B]" />
              )}
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div
              ref={drawerRef}
              className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-slideRight"
            >
              <div className="h-16 px-4 border-b border-[#EAE5DB] flex items-center justify-between">
                <Logo variant="dark" size="sm" showTagline={false} />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 text-[#5F6D61] hover:text-[#223B28] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
                {visibleGroups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === '/admin'}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-[#2E4D34] text-white shadow-xs font-semibold'
                                : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
                            }`
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-1">
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3E0] text-[#8A5A00] border border-[#F3E2B8] leading-tight">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#EAE5DB] bg-[#FDFCF9]">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#9E2A2B] hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP TOP HEADER */}
        <header className="hidden lg:flex items-center justify-between h-16 bg-white border-b border-[#EAE5DB] px-8 fixed top-0 right-0 left-64 z-20">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-[#5F6D61]">
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#8E9B90]" />}
                <span className={idx === breadcrumb.length - 1 ? 'font-semibold text-[#223B28]' : 'text-[#8E9B90]'}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2.5 bg-white border border-[#D1DDD0] text-[#223B28] hover:border-[#2E4D34] hover:bg-[#FAF7F2] rounded-xl transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5 text-[#223B28]" />
                {totalAlertCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-[#B3261E] text-[10px] font-bold text-white shadow-xs border-2 border-white">
                    {totalAlertCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#EAE5DB] py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-[#EAE5DB] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#223B28] uppercase tracking-wider">
                      Operational Alerts
                    </span>
                    <span className="text-[10px] text-[#8E9B90] font-medium">
                      {totalAlertCount} requiring action
                    </span>
                  </div>

                  <div className="divide-y divide-[#F0EDE6] max-h-72 overflow-y-auto">
                    {pendingSellerCount > 0 && (
                      <Link
                        to="/admin/people/sellers"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#223B28]">
                            {pendingSellerCount} seller onboarding applications
                          </p>
                          <p className="text-[11px] text-[#5F6D61]">
                            Merchants awaiting KYC document review and verification.
                          </p>
                        </div>
                      </Link>
                    )}

                    {pendingProductCount > 0 && (
                      <Link
                        to="/admin/product-reviews"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#2E4D34] shrink-0 mt-0.5">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#223B28]">
                            {pendingProductCount} catalog products awaiting review
                          </p>
                          <p className="text-[11px] text-[#5F6D61]">
                            Items submitted by sellers awaiting publication approval.
                          </p>
                        </div>
                      </Link>
                    )}

                    {pendingOrderCount > 0 && (
                      <Link
                        to="/admin/orders"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#223B28]">
                            {pendingOrderCount} orders pending dispatch
                          </p>
                          <p className="text-[11px] text-[#5F6D61]">
                            New customer orders placed awaiting packaging & courier dispatch.
                          </p>
                        </div>
                      </Link>
                    )}

                    {pendingBookingCount > 0 && (
                      <Link
                        to="/admin/services"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#2E4D34] shrink-0 mt-0.5">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#223B28]">
                            {pendingBookingCount} service bookings requested
                          </p>
                          <p className="text-[11px] text-[#5F6D61]">
                            Client appointments awaiting review and confirmation.
                          </p>
                        </div>
                      </Link>
                    )}

                    {pendingTicketCount > 0 && (
                      <Link
                        to="/admin/support"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-[#9E2A2B] shrink-0 mt-0.5">
                          <LifeBuoy className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#223B28]">
                            {pendingTicketCount} seller support ticket{pendingTicketCount > 1 ? 's' : ''} open
                          </p>
                          <p className="text-[11px] text-[#5F6D61]">
                            Artisan queries and urgent seller tickets awaiting resolution.
                          </p>
                        </div>
                      </Link>
                    )}

                    {totalAlertCount === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-[#8E9B90]">
                        <Sparkles className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                        All clear! No pending operational reviews.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#FAF7F2] transition-colors border border-transparent hover:border-[#EAE5DB]"
              >
                <div className="w-8 h-8 rounded-full bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-xs font-bold text-[#2E4D34]">
                  {admin?.name?.charAt(0) || 'A'}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <p className="text-xs font-semibold text-[#223B28]">{admin?.name || 'Admin User'}</p>
                  <p className="text-[10px] text-[#8E9B90] capitalize">
                    {admin?.role_name || (isSuperAdmin ? 'Super Admin' : 'Staff')}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8E9B90]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#EAE5DB] py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-[#EAE5DB]">
                    <p className="text-xs font-bold text-[#223B28]">{admin?.name}</p>
                    <p className="text-[11px] text-[#8E9B90] truncate">{admin?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#EAF1EA] text-[#2E4D34] border border-[#D1DDD0]">
                      {admin?.role_name || (isSuperAdmin ? 'Super Admin' : 'Staff')}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#9E2A2B] hover:bg-red-50 transition-colors font-medium text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN OUTLET CONTAINER */}
        <main className="flex-1 lg:ml-64 pt-4 lg:pt-20 px-4 sm:px-8 pb-16">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
};

export default AdminLayout;
