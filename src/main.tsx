import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './i18n/config';
import './index.css';
import AppRoutes from './routes';
import { VendorAuthProvider } from './context/VendorAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

import { fetchCsrfToken } from './api/client';

// TanStack Query Client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Start MSW whenever VITE_USE_MOCKS !== 'false' (both in dev and on Vercel preview/demos)
// Vendor auth endpoints can be passed through to a real local backend via MSW passthrough
async function prepareApp(): Promise<void> {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    try {
      const { startDemoWorker } = await import('./mocks/demoBrowser');
      await startDemoWorker();
      console.info('[Demo] Mock Service Worker running in DEMO MODE.');
    } catch (err) {
      console.warn('[Demo] Failed to initialize Demo MSW:', err);
    }
  } else if (import.meta.env.VITE_USE_MOCKS !== 'false') {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      });
      console.info('[MSW] Mock Service Worker running successfully.');
    } catch (err) {
      console.warn('[MSW] Failed to initialize Mock Service Worker:', err);
    }
  }

  // Fetch CSRF token into memory on app bootstrap (non-blocking for app rendering)
  try {
    await fetchCsrfToken('app start');
  } catch (err) {
    console.warn('[CSRF] Initial token fetch warning:', err);
  }
}

prepareApp()
  .catch((err) => {
    console.warn('[App] prepareApp warning:', err);
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <VendorAuthProvider>
              <AdminAuthProvider>
                <AppRoutes />
              </AdminAuthProvider>
            </VendorAuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </StrictMode>
    );
  });
