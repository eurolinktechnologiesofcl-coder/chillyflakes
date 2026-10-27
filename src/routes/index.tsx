import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BuyerLayout } from '../layouts/BuyerLayout';
import { HomePage } from '../pages/HomePage';
import { ShopPage } from '../pages/ShopPage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderSuccessPage } from '../pages/OrderSuccessPage';
import { BuyerAccountPage } from '../pages/BuyerAccountPage';
import { WishlistPage } from '../pages/WishlistPage';
import { ServicesPage } from '../pages/ServicesPage';
import { AboutUsPage } from '../pages/AboutUsPage';
import { ContactUsPage } from '../pages/ContactUsPage';
import { AuthLayout } from '../layouts/AuthLayout';
import { VendorRegisterPage } from '../features/auth/pages/VendorRegisterPage';
import { VendorLoginPage } from '../features/auth/pages/VendorLoginPage';
import { VendorVerifyOtpPage } from '../features/auth/pages/VendorVerifyOtpPage';
import { VendorForgotPasswordPage } from '../features/auth/pages/VendorForgotPasswordPage';
import { VendorOnboardingPage } from '../features/onboarding/pages/VendorOnboardingPage';
import { VendorStatusPage } from '../features/onboarding/pages/VendorStatusPage';
import { VendorLayout } from '../layouts/VendorLayout';
import {
  RequireApprovedVendor,
  RequireVendorOnboarding,
  RequireVendorStatusGate,
} from './RequireApprovedVendor';
import { VendorDashboardPage } from '../features/dashboard/pages/VendorDashboardPage';
import { VendorPlaceholderPage } from '../features/dashboard/pages/VendorPlaceholderPage';
import { VendorProductsPage } from '../features/products/pages/VendorProductsPage';
import { VendorProductFormPage } from '../features/products/pages/VendorProductFormPage';
import { TermsPage } from '../pages/TermsPage';
import { PrivacyPage } from '../pages/PrivacyPage';
import { AdminLoginPage } from '../features/admin/pages/AdminLoginPage';
import { AdminLayout } from '../layouts/AdminLayout';
import { RequireAdmin } from './RequireAdmin';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage';
import { AdminProductReviewsPage } from '../features/admin/pages/AdminProductReviewsPage';
import { AdminProductReviewDetailPage } from '../features/admin/pages/AdminProductReviewDetailPage';
import { AdminCategoriesPage } from '../features/admin/pages/AdminCategoriesPage';
import { AdminCustomersPage } from '../features/admin/pages/AdminCustomersPage';
import { AdminSellersPage } from '../features/admin/pages/AdminSellersPage';
import { AdminStaffPage } from '../features/admin/pages/AdminStaffPage';
import { AdminAuditLogPage } from '../features/admin/pages/AdminAuditLogPage';
import { RequirePermission } from './RequirePermission';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 100% Complete Buyer Experience Routes */}
      <Route element={<BuyerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
        <Route path="/account" element={<BuyerAccountPage />} />
        <Route path="/account/*" element={<BuyerAccountPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/cart" element={<Navigate to="/checkout" replace />} />
      </Route>

      {/* Vendor Authentication & Onboarding Routes */}
      <Route
        path="/vendor/register"
        element={
          <AuthLayout>
            <VendorRegisterPage />
          </AuthLayout>
        }
      />
      <Route
        path="/vendor/login"
        element={
          <AuthLayout>
            <VendorLoginPage />
          </AuthLayout>
        }
      />
      <Route
        path="/vendor/verify-otp"
        element={
          <AuthLayout>
            <VendorVerifyOtpPage />
          </AuthLayout>
        }
      />
      <Route
        path="/vendor/forgot-password"
        element={
          <AuthLayout>
            <VendorForgotPasswordPage />
          </AuthLayout>
        }
      />

      {/* Approved Vendor Portal Protected Routes */}
      <Route
        element={
          <RequireApprovedVendor>
            <VendorLayout />
          </RequireApprovedVendor>
        }
      >
        <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
        <Route path="/vendor/products" element={<VendorProductsPage />} />
        <Route path="/vendor/products/new" element={<VendorProductFormPage />} />
        <Route path="/vendor/products/:id/edit" element={<VendorProductFormPage />} />
        <Route path="/vendor/services" element={<VendorPlaceholderPage />} />
        <Route path="/vendor/orders" element={<VendorPlaceholderPage />} />
        <Route path="/vendor/earnings" element={<VendorPlaceholderPage />} />
        <Route path="/vendor/reviews" element={<VendorPlaceholderPage />} />
        <Route path="/vendor/profile" element={<VendorPlaceholderPage />} />
        <Route path="/vendor/settings" element={<VendorPlaceholderPage />} />
        <Route path="/vendor/support" element={<VendorPlaceholderPage />} />
      </Route>
      <Route
        path="/vendor/onboarding"
        element={
          <RequireVendorOnboarding>
            <AuthLayout>
              <VendorOnboardingPage />
            </AuthLayout>
          </RequireVendorOnboarding>
        }
      />
      <Route
        path="/vendor/status"
        element={
          <RequireVendorStatusGate>
            <AuthLayout>
              <VendorStatusPage />
            </AuthLayout>
          </RequireVendorStatusGate>
        }
      />

      {/* Super Admin Console Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route
          path="/admin"
          element={
            <RequirePermission module="overview">
              <AdminDashboardPage />
            </RequirePermission>
          }
        />
        <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

        {/* People & Merchants */}
        <Route
          path="/admin/people/customers"
          element={
            <RequirePermission module="customers">
              <AdminCustomersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/admin/people/sellers"
          element={
            <RequirePermission module="sellers">
              <AdminSellersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/admin/people/sellers/:id"
          element={
            <RequirePermission module="sellers">
              <AdminSellersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/admin/people/staff"
          element={
            <RequirePermission module="staff_roles">
              <AdminStaffPage />
            </RequirePermission>
          }
        />

        {/* Catalog */}
        <Route
          path="/admin/product-reviews"
          element={
            <RequirePermission module="products">
              <AdminProductReviewsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/admin/product-reviews/:id"
          element={
            <RequirePermission module="products">
              <AdminProductReviewDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RequirePermission module="categories">
              <AdminCategoriesPage />
            </RequirePermission>
          }
        />

        {/* System */}
        <Route
          path="/admin/audit-log"
          element={
            <RequirePermission module="audit_log">
              <AdminAuditLogPage />
            </RequirePermission>
          }
        />

        {/* Legacy redirect */}
        <Route path="/admin/seller-approvals" element={<Navigate to="/admin/people/sellers" replace />} />
      </Route>

      {/* Legal & Policy Pages */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
export default AppRoutes;
