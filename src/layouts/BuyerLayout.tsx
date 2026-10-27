import React from 'react';
import { Outlet } from 'react-router-dom';
import { StoreProvider } from '../context/StoreContext';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CartDrawer } from '../components/CartDrawer';
import { QuickViewModal } from '../components/QuickViewModal';
import { LoginModal } from '../components/LoginModal';
import { ToastContainer } from '../components/ToastContainer';
import { ScrollToTop } from '../components/ScrollToTop';

export const BuyerLayout: React.FC = () => {
  return (
    <StoreProvider>
      <ScrollToTop />
      <div className="min-h-screen bg-[#FAF7F2] text-[#223B28] flex flex-col font-sans selection:bg-[#2E4D34] selection:text-white">
        {/* 1. Top Announcement Bar */}
        <AnnouncementBar />

        {/* 2. Main Navigation Header */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow">
          <Outlet />
        </main>

        {/* 3. Deep Forest Green Footer */}
        <Footer />

        {/* Shared Interactive Overlays & Drawers */}
        <CartDrawer />
        <QuickViewModal />
        <LoginModal />
        <ToastContainer />
      </div>
    </StoreProvider>
  );
};

export default BuyerLayout;
