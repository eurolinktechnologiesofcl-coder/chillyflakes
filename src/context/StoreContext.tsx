import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { productsApi, authApi } from '../api';

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
  loginUser: (phoneOrEmail: string, passwordOrOtp?: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  addOrder: (order: BuyerOrder) => void;
  cancelOrder: (orderId: string) => void;
  addAddress: (address: Omit<BuyerAddress, 'id'>) => BuyerAddress;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  addBooking: (booking: Omit<BuyerBooking, 'id' | 'createdAt' | 'status'>) => BuyerBooking;
  cancelBooking: (bookingId: string) => void;
  addProductReview: (review: Omit<ProductReview, 'id' | 'createdAt' | 'verifiedPurchase'>) => void;
  cartCount: number;
  cartTotal: number;
  cartSavings: number;
}

const defaultAddresses: BuyerAddress[] = [
  {
    id: 'addr-default-1',
    fullName: 'Ananya Sharma',
    phone: '9876543210',
    street: 'Flat 402, Green Glen Orchid, Outer Ring Road, Bellandur',
    landmark: 'Opposite Ecospace Tech Park',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    type: 'Home',
    isDefault: true,
  },
  {
    id: 'addr-default-2',
    fullName: 'Ananya Sharma',
    phone: '9876543210',
    street: 'Building 7A, 3rd Floor, DLF Cyber City',
    landmark: 'Near Cyber Hub',
    city: 'Gurugram',
    state: 'Haryana',
    postalCode: '122002',
    type: 'Work',
    isDefault: false,
  }
];

const initialSampleReviews: Record<string, ProductReview[]> = {
  'prod-face-cream': [
    {
      id: 'rev-1',
      productId: 'prod-face-cream',
      userName: 'Priya Nambiar',
      rating: 5,
      title: 'Remarkably soothing and completely chemical free',
      comment: 'I have very sensitive skin and usually react to face creams with artificial fragrances. This botanical cream feels lightweight, smells of pure rosehip and jojoba, and leaves a silky satin finish all day.',
      createdAt: '2026-10-18',
      verifiedPurchase: true,
    },
    {
      id: 'rev-2',
      productId: 'prod-face-cream',
      userName: 'Rahul Deshmukh',
      rating: 5,
      title: 'Authentic handmade quality in amber glass',
      comment: 'Packaging arrived in a sturdy eco-cushioned box with zero plastic. Highly recommended for daily morning routine.',
      createdAt: '2026-10-12',
      verifiedPurchase: true,
    }
  ],
  'prod-lavender-soap': [
    {
      id: 'rev-3',
      productId: 'prod-lavender-soap',
      userName: 'Meera Iyer',
      rating: 5,
      title: 'Gentle creamy lather with natural lavender buds',
      comment: 'Long lasting bar that doesn’t turn mushy. The natural essential oils make the entire bathroom smell like a spa.',
      createdAt: '2026-10-20',
      verifiedPurchase: true,
    }
  ]
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('fk_cart');
      return saved ? JSON.parse(saved) : [{ product: initialProducts[0], quantity: 1 }];
    } catch {
      return [{ product: initialProducts[0], quantity: 1 }];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fk_wishlist');
      return saved ? JSON.parse(saved) : ['prod-face-cream', 'prod-moonstone-necklace'];
    } catch {
      return ['prod-face-cream', 'prod-moonstone-necklace'];
    }
  });

  const [orders, setOrders] = useState<BuyerOrder[]>(() => {
    try {
      const saved = localStorage.getItem('cf_buyer_orders');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default sample past order so buyer dashboard has realistic data
    return [
      {
        id: 'CF-842918',
        createdAt: '2026-10-24T10:30:00Z',
        status: 'Processing',
        items: [
          { product: initialProducts[0], quantity: 1 },
          { product: initialProducts[1], quantity: 2 }
        ],
        subtotal: 1697,
        discountAmount: 170,
        deliveryCharge: 0,
        totalAmount: 1527,
        shippingAddress: defaultAddresses[0],
        paymentMethod: 'upi',
        paymentId: 'upi_ref_9824021',
        deliverySpeed: 'standard',
        estimatedDeliveryDate: '2026-10-29'
      }
    ];
  });

  const [addresses, setAddresses] = useState<BuyerAddress[]>(() => {
    try {
      const saved = localStorage.getItem('cf_buyer_addresses');
      return saved ? JSON.parse(saved) : defaultAddresses;
    } catch {
      return defaultAddresses;
    }
  });

  const [bookings, setBookings] = useState<BuyerBooking[]>(() => {
    try {
      const saved = localStorage.getItem('cf_buyer_bookings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'SRV-BOOK-102',
        serviceId: 'srv-massage',
        serviceTitle: 'Massage Therapy',
        userName: 'Ananya Sharma',
        userContact: '9876543210',
        preferredDate: '2026-10-30',
        preferredTime: '11:00 AM',
        status: 'Confirmed',
        createdAt: '2026-10-25T14:20:00Z',
        price: 'From ₹1,499'
      }
    ];
  });

  const [productReviews, setProductReviews] = useState<Record<string, ProductReview[]>>(() => {
    try {
      const saved = localStorage.getItem('cf_product_reviews');
      return saved ? JSON.parse(saved) : initialSampleReviews;
    } catch {
      return initialSampleReviews;
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
  const [user, setUser] = useState<{ name: string; phone?: string; email?: string; isLoggedIn: boolean } | null>(() => {
    try {
      const saved = localStorage.getItem('cf_buyer_user');
      return saved ? JSON.parse(saved) : { name: 'Ananya Sharma', phone: '9876543210', email: 'ananya@example.com', isLoggedIn: true };
    } catch {
      return { name: 'Ananya Sharma', phone: '9876543210', email: 'ananya@example.com', isLoggedIn: true };
    }
  });

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

    authApi.getCurrentUser().then((res) => {
      if (res.data && res.data.isLoggedIn) {
        setUser(res.data);
      }
    });
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
      localStorage.setItem('cf_buyer_orders', JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  // Persist addresses
  useEffect(() => {
    try {
      localStorage.setItem('cf_buyer_addresses', JSON.stringify(addresses));
    } catch {
      // ignore
    }
  }, [addresses]);

  // Persist bookings
  useEffect(() => {
    try {
      localStorage.setItem('cf_buyer_bookings', JSON.stringify(bookings));
    } catch {
      // ignore
    }
  }, [bookings]);

  // Persist reviews
  useEffect(() => {
    try {
      localStorage.setItem('cf_product_reviews', JSON.stringify(productReviews));
    } catch {
      // ignore
    }
  }, [productReviews]);

  // Persist user
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('cf_buyer_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('cf_buyer_user');
      }
    } catch {
      // ignore
    }
  }, [user]);

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
    setWishlist((prev) => {
      if (prev.includes(product.id)) {
        showToast(`Removed from your wishlist`, 'info');
        return prev.filter((id) => id !== product.id);
      } else {
        showToast(`Saved ${product.name} to wishlist`, 'success');
        return [...prev, product.id];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.includes(productId);
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const loginUser = async (phoneOrEmail: string, passwordOrOtp = '1234'): Promise<boolean> => {
    try {
      const res = await authApi.login(phoneOrEmail, passwordOrOtp);
      if (res.data?.user) {
        setUser(res.data.user);
        setIsLoginOpen(false);
        showToast('Logged in successfully! Welcome to Chilly Flakes.', 'success');
        return true;
      }
    } catch (err) {
      console.error('[Auth] Login failed:', err);
    }
    const fallbackUser = {
      name: phoneOrEmail.includes('@') ? phoneOrEmail.split('@')[0] : 'Chilly Customer',
      phone: !phoneOrEmail.includes('@') ? phoneOrEmail : '9876543210',
      email: phoneOrEmail.includes('@') ? phoneOrEmail : 'buyer@example.com',
      isLoggedIn: true,
    };
    setUser(fallbackUser);
    setIsLoginOpen(false);
    showToast('Logged in successfully! Welcome back.', 'success');
    return true;
  };

  const logoutUser = async () => {
    await authApi.logout();
    setUser(null);
    showToast('Logged out of account.', 'info');
  };

  const addOrder = (newOrder: BuyerOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const cancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'Cancelled' } : ord))
    );
    showToast(`Order ${orderId} has been cancelled`, 'info');
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

  const addBooking = (bookingData: Omit<BuyerBooking, 'id' | 'createdAt' | 'status'>): BuyerBooking => {
    const newBooking: BuyerBooking = {
      ...bookingData,
      id: `SRV-BOOK-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      status: 'Requested',
    };
    setBookings((prev) => [newBooking, ...prev]);
    showToast(`Service appointment requested for ${bookingData.serviceTitle}!`, 'success');
    return newBooking;
  };

  const cancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'Cancelled' } : b))
    );
    showToast('Appointment cancelled', 'info');
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
        loginUser,
        logoutUser,
        addOrder,
        cancelOrder,
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
