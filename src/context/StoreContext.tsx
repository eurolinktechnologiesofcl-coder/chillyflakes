import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Product, 
  CartItem, 
  Toast, 
  BuyerOrder, 
  BuyerAddress, 
  BuyerBooking, 
  ProductReview 
} from '../types';
import { products as initialProducts } from '../data/products';
import { productsApi, servicesApi } from '../api';
import { axiosClient } from '../api/client';
import {
  syncBuyerCancelToAdmin,
  syncBuyerReturnToAdmin,
} from '../utils/platformSync';
import { useBuyerAuth } from './BuyerAuthContextDef';

const addressKey = (owner: string) => `cf_buyer_addresses:${owner}`;

function loadAddresses(owner: string | null): BuyerAddress[] {
  if (!owner) return [];
  try {
    const saved = localStorage.getItem(addressKey(owner));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

interface StoreContextType {
  products: Product[];
  isLoadingProducts: boolean;
  isBackendConnected: boolean;
  refreshProducts: () => Promise<void>;
  cart: CartItem[];
  wishlist: string[];
  selectedCategory: string;
  searchQuery: string;
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isLoginOpen: boolean;
  quickViewProduct: Product | null;
  selectedProduct: Product | null;
  toasts: Toast[];
  user: { name: string; phone?: string; email?: string; isLoggedIn: boolean } | null;
  orders: BuyerOrder[];
  addresses: BuyerAddress[];
  bookings: BuyerBooking[];
  productReviews: Record<string, ProductReview[]>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsLoginOpen: (open: boolean) => void;
  setQuickViewProduct: (product: Product | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  openProductPage: (product: Product) => void;
  closeProductPage: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  logoutUser: () => Promise<void>;
  addOrder: (order: BuyerOrder) => void;
  cancelOrder: (orderId: string) => void;
  requestReturn: (orderId: string, reason: string) => void;
  addAddress: (address: Omit<BuyerAddress, 'id'>) => BuyerAddress;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  addBooking: (booking: Omit<BuyerBooking, 'id' | 'createdAt' | 'status'>, customId?: string) => BuyerBooking;
  cancelBooking: (bookingId: string) => void;
  addProductReview: (review: Omit<ProductReview, 'id' | 'createdAt' | 'verifiedPurchase'>) => void;
  cartCount: number;
  cartTotal: number;
  cartSavings: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('fk_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fk_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [allOrders, setOrders] = useState<BuyerOrder[]>(() => {
    try {
      const saved = localStorage.getItem('cf_buyer_orders');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Authenticated shopper (real session from BuyerAuthProvider)
  const auth = useBuyerAuth();
  const authUser = auth.user;
  const user = useMemo(
    () =>
      authUser
        ? { name: authUser.name, email: authUser.email, phone: authUser.phone, isLoggedIn: true }
        : null,
    [authUser]
  );
  const ownerKey = authUser?.email ?? null;

  // Saved addresses are scoped to the signed-in account
  const [addrState, setAddrState] = useState<{ owner: string | null; list: BuyerAddress[] }>(() => ({
    owner: ownerKey,
    list: loadAddresses(ownerKey),
  }));
  if (addrState.owner !== ownerKey) {
    setAddrState({ owner: ownerKey, list: loadAddresses(ownerKey) });
  }
  const addresses = addrState.owner === ownerKey ? addrState.list : [];
  const setAddresses = (updater: (prev: BuyerAddress[]) => BuyerAddress[]) =>
    setAddrState((s) => ({ ...s, list: updater(s.list) }));

  // Only the signed-in customer's orders are visible
  const orders = useMemo(
    () =>
      ownerKey
        ? allOrders.filter((o) => (o.customerEmail || '').toLowerCase() === ownerKey)
        : [],
    [allOrders, ownerKey]
  );

  const [allBookings, setAllBookings] = useState<BuyerBooking[]>(() => {
    try {
      const saved = localStorage.getItem('cf_buyer_bookings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const bookings = useMemo(
    () =>
      ownerKey
        ? allBookings.filter(
            (b) =>
              (b.userContact || '').toLowerCase() === ownerKey ||
              ((b as any).customerEmail || '').toLowerCase() === ownerKey ||
              (Boolean((b as any).userPhone && user?.phone) && (b as any).userPhone === user?.phone)
          )
        : allBookings,
    [allBookings, ownerKey, user?.phone]
  );

  const [productReviews, setProductReviews] = useState<Record<string, ProductReview[]>>(() => {
    try {
      const saved = localStorage.getItem('cf_product_reviews');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Fetch products from the backend on mount with fallback to local curated data.
   */
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await productsApi.getProducts();
      if (res.data && res.data.length > 0) {
        setProducts(res.data);
      }
      setIsBackendConnected(!res.isMock);
    } catch (err) {
      console.warn('[API] Error loading products:', err);
      setIsBackendConnected(false);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();

    const handleCatalogSync = () => {
      loadProducts();
    };

    window.addEventListener('cf_catalog_updated', handleCatalogSync);

    return () => {
      window.removeEventListener('cf_catalog_updated', handleCatalogSync);
    };
  }, [loadProducts]);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem('fk_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Persist wishlist
  useEffect(() => {
    try {
      localStorage.setItem('fk_wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  // Persist orders
  useEffect(() => {
    try {
      localStorage.setItem('cf_buyer_orders', JSON.stringify(allOrders));
    } catch {
      // ignore
    }
  }, [allOrders]);

  // Real-time synchronization when Super Admin updates order status or dispatches tracking
  useEffect(() => {
    let isMounted = true;
    const fetchServerOrders = async () => {
      if (!ownerKey) return;
      try {
        const res = await axiosClient.get(`/api/v1/orders/?email=${encodeURIComponent(ownerKey)}`);
        if (res.data && Array.isArray(res.data) && isMounted) {
          setOrders((prev) => {
            const map = new Map<string, BuyerOrder>();
            // Add server orders
            for (const sOrd of res.data) {
              const statusMap: Record<string, BuyerOrder['status']> = {
                pending_dispatch: 'Placed',
                in_transit: 'Shipped',
                delivered: 'Delivered',
                cancelled: 'Cancelled',
              };
              const mappedStatus = statusMap[sOrd.orderStatus?.toLowerCase()] || 'Processing';
              const mapped: BuyerOrder = {
                id: sOrd.orderNumber || sOrd.id,
                createdAt: sOrd.createdAt,
                status: mappedStatus,
                items: (sOrd.items || []).map((it: any) => ({
                  product: {
                    id: it.productId,
                    name: it.title,
                    price: it.unitPrice,
                    image: it.image,
                    category: 'Handcrafted',
                  },
                  quantity: it.quantity,
                })),
                subtotal: sOrd.totalAmount,
                discountAmount: sOrd.discountAmount || 0,
                deliveryCharge: sOrd.shippingFee || 0,
                totalAmount: sOrd.totalAmount,
                shippingAddress: sOrd.shippingAddress,
                paymentMethod: sOrd.paymentMethod || 'cod',
                deliverySpeed: sOrd.deliverySpeed || 'standard',
                courierPartner: sOrd.courierPartner,
                trackingNumber: sOrd.trackingNumber,
                customerEmail: sOrd.customerEmail,
              };
              map.set(mapped.id, mapped);
            }
            // Keep any local orders not yet on server
            for (const lOrd of prev) {
              if (!map.has(lOrd.id)) {
                map.set(lOrd.id, lOrd);
              }
            }
            return Array.from(map.values());
          });
        }
      } catch {
        // ignore
      }
    };

    fetchServerOrders();

    const handleOrdersSync = () => {
      try {
        const saved = localStorage.getItem('cf_buyer_orders');
        if (saved) {
          setOrders(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('[StoreContext] Failed to reload synchronized orders:', err);
      }
      fetchServerOrders();
    };

    window.addEventListener('cf_buyer_orders_updated', handleOrdersSync);
    window.addEventListener('cf_order_status_updated', handleOrdersSync);
    window.addEventListener('storage', handleOrdersSync);

    return () => {
      isMounted = false;
      window.removeEventListener('cf_buyer_orders_updated', handleOrdersSync);
      window.removeEventListener('cf_order_status_updated', handleOrdersSync);
      window.removeEventListener('storage', handleOrdersSync);
    };
  }, [ownerKey]);

  // Persist addresses (per account)
  useEffect(() => {
    if (!addrState.owner) return;
    try {
      localStorage.setItem(addressKey(addrState.owner), JSON.stringify(addrState.list));
    } catch {
      // ignore
    }
  }, [addrState]);

  // Persist bookings
  useEffect(() => {
    try {
      localStorage.setItem('cf_buyer_bookings', JSON.stringify(allBookings));
    } catch {
      // ignore
    }
  }, [allBookings]);

  // Real-time synchronization when Super Admin updates service booking status
  useEffect(() => {
    let isMounted = true;
    const fetchServerBookings = async () => {
      if (!ownerKey) return;
      try {
        const res = await servicesApi.getMyBookings(ownerKey);
        if (res.data && Array.isArray(res.data) && isMounted) {
          setAllBookings((prev) => {
            const map = new Map<string, BuyerBooking>();
            const localByTitleAndDate = new Map<string, BuyerBooking>();

            for (const lb of prev) {
              map.set(lb.id, lb);
              const key = `${lb.serviceTitle?.trim().toLowerCase()}_${lb.preferredDate?.trim()}`;
              localByTitleAndDate.set(key, lb);
            }

            for (const sBk of res.data) {
              const key = `${sBk.serviceTitle?.trim().toLowerCase()}_${sBk.preferredDate?.trim()}`;
              const matchedLocal =
                map.get(sBk.id) ||
                (sBk.bookingRef ? map.get(sBk.bookingRef) : undefined) ||
                localByTitleAndDate.get(key);

              if (matchedLocal && matchedLocal.id !== sBk.id) {
                map.delete(matchedLocal.id);
              }

              const merged: BuyerBooking = {
                ...(matchedLocal || {}),
                ...sBk,
                id: sBk.bookingRef || sBk.id,
                status: sBk.status,
                userContact: sBk.userContact || ownerKey,
                userPhone: sBk.userPhone || matchedLocal?.userPhone,
                price: sBk.price || matchedLocal?.price || 'On Request',
              };
              map.set(merged.id, merged);
            }

            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('[StoreContext] Failed to sync server bookings:', err);
      }
    };

    fetchServerBookings();

    const handleBookingsSync = () => {
      try {
        const saved = localStorage.getItem('cf_buyer_bookings');
        if (saved) {
          setAllBookings(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('[StoreContext] Failed to reload synchronized bookings:', err);
      }
      fetchServerBookings();
    };

    window.addEventListener('cf_buyer_bookings_updated', handleBookingsSync);
    window.addEventListener('cf_service_booked', handleBookingsSync);
    window.addEventListener('storage', handleBookingsSync);

    return () => {
      isMounted = false;
      window.removeEventListener('cf_buyer_bookings_updated', handleBookingsSync);
      window.removeEventListener('cf_service_booked', handleBookingsSync);
      window.removeEventListener('storage', handleBookingsSync);
    };
  }, [ownerKey]);

  // Persist reviews
  useEffect(() => {
    try {
      localStorage.setItem('cf_product_reviews', JSON.stringify(productReviews));
    } catch {
      // ignore
    }
  }, [productReviews]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (product: Product) => {
    const isAlreadySaved = wishlist.includes(product.id);
    if (isAlreadySaved) {
      setWishlist((prev) => prev.filter((id) => id !== product.id));
      showToast('Removed from your wishlist', 'info');
    } else {
      setWishlist((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]));
      showToast(`Saved ${product.name} to wishlist`, 'success');
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.includes(productId);
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToasts((prev) => {
      // Prevent duplicate identical toasts from appearing simultaneously
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      const id = Date.now().toString() + Math.random().toString().slice(2, 6);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 3200);
      return [...prev, { id, message, type }];
    });
  };

  const logoutUser = async () => {
    await auth.logout();
    showToast('You have been signed out.', 'info');
  };

  const addOrder = (newOrder: BuyerOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const cancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'Cancelled' } : ord))
    );
    syncBuyerCancelToAdmin(orderId);
    showToast(`Order ${orderId} has been cancelled`, 'info');

    // Notify real backend API to atomically update DB and restock inventory
    void axiosClient
      .post(`/api/v1/orders/${orderId}/cancel/`, {
        reason: 'Cancelled by customer from account page',
      })
      .catch((err) => {
        console.warn('Backend cancel sync:', err?.response?.data?.message || err.message);
      });
  };

  const requestReturn = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, returnRequested: true, returnReason: reason } : ord))
    );
    syncBuyerReturnToAdmin(orderId, reason);
    showToast(`Return requested for ${orderId}`, 'info');
  };

  const addAddress = (addr: Omit<BuyerAddress, 'id'>): BuyerAddress => {
    const newAddr: BuyerAddress = {
      ...addr,
      id: `addr-${Date.now()}`,
    };
    setAddresses((prev) => {
      if (newAddr.isDefault) {
        return [newAddr, ...prev.map((a) => ({ ...a, isDefault: false }))];
      }
      return [newAddr, ...prev];
    });
    showToast('Address saved successfully!', 'success');
    return newAddr;
  };

  const removeAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast('Address removed', 'info');
  };

  const setDefaultAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
    showToast('Default delivery address updated', 'success');
  };

  const addBooking = (
    bookingData: Omit<BuyerBooking, 'id' | 'createdAt' | 'status'>,
    customId?: string
  ): BuyerBooking => {
    const newBooking: BuyerBooking = {
      ...bookingData,
      id: customId || `CF-SRV-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
      status: 'Requested',
    };
    setAllBookings((prev) => [newBooking, ...prev]);
    showToast(`Service appointment requested for ${bookingData.serviceTitle}!`, 'success');
    return newBooking;
  };

  const cancelBooking = (bookingId: string) => {
    setAllBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'Cancelled' } : b))
    );
    showToast('Appointment cancelled', 'info');

    // Notify backend API to update database and dispatch alert to Super Admin email
    void servicesApi
      .cancelBooking(bookingId, 'Client requested cancellation from account page', ownerKey || undefined)
      .then(() => {
        window.dispatchEvent(new CustomEvent('cf_buyer_bookings_updated'));
      })
      .catch((err) => {
        console.warn('Backend service booking cancel sync:', err?.response?.data?.message || err.message);
      });
  };

  const addProductReview = (reviewData: Omit<ProductReview, 'id' | 'createdAt' | 'verifiedPurchase'>) => {
    const newRev: ProductReview = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      verifiedPurchase: true,
    };
    setProductReviews((prev) => ({
      ...prev,
      [reviewData.productId]: [newRev, ...(prev[reviewData.productId] || [])],
    }));
    showToast('Thank you! Your verified review has been published.', 'success');
  };

  const openProductPage = (product: Product) => {
    setSelectedProduct(product);
    setQuickViewProduct(null);
  };

  const closeProductPage = () => {
    setSelectedProduct(null);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const cartSavings = cart.reduce(
    (total, item) => total + Math.max(0, item.product.originalPrice - item.product.price) * item.quantity,
    0
  );

  return (
    <StoreContext.Provider
      value={{
        products,
        isLoadingProducts,
        isBackendConnected,
        refreshProducts: loadProducts,
        cart,
        wishlist,
        selectedCategory,
        searchQuery,
        isCartOpen,
        isSearchOpen,
        isLoginOpen,
        quickViewProduct,
        selectedProduct,
        toasts,
        user,
        orders,
        addresses,
        bookings,
        productReviews,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        setSelectedCategory,
        setSearchQuery,
        setIsCartOpen,
        setIsSearchOpen,
        setIsLoginOpen,
        setQuickViewProduct,
        setSelectedProduct,
        openProductPage,
        closeProductPage,
        showToast,
        logoutUser,
        addOrder,
        cancelOrder,
        requestReturn,
        addAddress,
        removeAddress,
        setDefaultAddress,
        addBooking,
        cancelBooking,
        addProductReview,
        cartCount,
        cartTotal,
        cartSavings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
