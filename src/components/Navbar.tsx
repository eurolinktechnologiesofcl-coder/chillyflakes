import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  ShoppingCart, 
  ChevronDown, 
  Menu, 
  X,
  Heart,
  User
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Logo } from './Logo';
import { formatRupees } from '../utils/currency';
import { LanguageSwitcher } from './ui/LanguageSwitcher';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    cartCount, 
    setIsCartOpen, 
    products, 
    wishlist,
    user,
    setSelectedCategory
  } = useStore();

  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [showServicesDropdown, setShowServicesDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const servicesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleShopMouseEnter = () => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setShowShopDropdown(true);
  };

  const handleShopMouseLeave = () => {
    shopTimeoutRef.current = setTimeout(() => {
      setShowShopDropdown(false);
    }, 180);
  };

  const handleServicesMouseEnter = () => {
    if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
    setShowServicesDropdown(true);
  };

  const handleServicesMouseLeave = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      setShowServicesDropdown(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
      if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSuggestions = searchInput.trim() === ''
    ? []
    : products.filter(p => 
        p.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        p.category.toLowerCase().includes(searchInput.toLowerCase())
      ).slice(0, 5);

  const handleSelectProduct = (product: any) => {
    setShowSuggestions(false);
    setSearchInput('');
    navigate(`/products/${product.id}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      setShowSuggestions(false);
      navigate(`/shop?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleCategoryNav = (cat: string) => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setSelectedCategory(cat);
    setShowShopDropdown(false);
    setMobileMenuOpen(false);
    navigate(`/shop?category=${encodeURIComponent(cat)}`);
  };

  const handleServicesNav = () => {
    if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
    setShowServicesDropdown(false);
    setMobileMenuOpen(false);
    navigate('/services');
  };

  const isHomeActive = location.pathname === '/';
  const isShopActive = location.pathname.startsWith('/shop');
  const isServicesActive = location.pathname === '/services';
  const isAboutActive = location.pathname === '/about';
  const isContactActive = location.pathname === '/contact';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#ECE7DD] shadow-[0_2px_12px_rgba(46,77,52,0.04)]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-3 sm:gap-4 lg:gap-8">
          
          {/* Mobile hamburger */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-[#2E4D34] hover:bg-[#F2F5F0] rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Left: Custom ChillyFlakes Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link 
              to="/" 
              onClick={() => {
                setSelectedCategory('All');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group py-1"
            >
              <Logo variant="dark" size="md" showTagline={true} />
            </Link>
          </div>

          {/* Center: Search Bar with Integrated Forest Green Button */}
          <div ref={searchRef} className="relative flex-1 max-w-xl mx-2 sm:mx-6 hidden sm:block">
            <form 
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white rounded-full border border-[#B6C6B5] focus-within:border-[#2E4D34] focus-within:ring-2 focus-within:ring-[#2E4D34]/15 transition-all pl-4 pr-1 py-1 shadow-xs"
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={t('nav.searchPlaceholder', 'Search handcrafted products, spices, or artisans...')}
                className="w-full py-1.5 pr-3 text-xs sm:text-sm text-[#223B28] placeholder-[#7E8F80] bg-transparent focus:outline-none"
              />

              {searchInput && (
                <button 
                  type="button"
                  onClick={() => setSearchInput('')} 
                  className="pr-2 text-[#7E8F80] hover:text-[#223B28]"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Integrated Forest Green Search Button */}
              <button 
                type="submit"
                className="w-9 h-9 rounded-full bg-[#2E4D34] hover:bg-[#233B27] flex items-center justify-center text-white flex-shrink-0 transition-transform active:scale-95 shadow-xs"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#ECE7DD] overflow-hidden z-50 text-[#223B28]">
                <div className="px-4 py-2 text-[11px] font-semibold text-[#5E6D60] uppercase border-b border-[#F4EFE6] bg-[#FAF7F2] flex items-center justify-between">
                  <span>Products & Suggestions</span>
                  <span className="text-[10px] text-[#2E4D34] font-normal">Press Enter to view all</span>
                </div>
                {searchSuggestions.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className="flex items-center justify-between p-3 hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FAF7F2] p-1 flex items-center justify-center border border-[#ECE7DD]">
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-contain rounded-md" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#223B28] line-clamp-1">{prod.name}</p>
                        <p className="text-[10px] text-[#5E6D60]">{prod.category}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#2E4D34]">{formatRupees(prod.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Navigation Links & Actions */}
          <nav className="flex items-center gap-4 sm:gap-6 lg:gap-7">
            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#2D3A2F]">
              
              {/* Home */}
              <Link 
                to="/"
                onClick={() => {
                  setSelectedCategory('All');
                }}
                className={`py-1 transition-colors ${
                  isHomeActive 
                    ? 'text-[#2E4D34] font-bold border-b-2 border-[#2E4D34]' 
                    : 'hover:text-[#2E4D34]'
                }`}
              >
                {t('nav.home', 'Home')}
              </Link>

              {/* Shop ▾ with Dropdown */}
              <div 
                className="relative py-2"
                onMouseEnter={handleShopMouseEnter}
                onMouseLeave={handleShopMouseLeave}
              >
                <Link 
                  to="/shop"
                  className={`flex items-center gap-1 py-1 transition-colors ${
                    isShopActive 
                      ? 'text-[#2E4D34] font-bold border-b-2 border-[#2E4D34]' 
                      : 'hover:text-[#2E4D34]'
                  }`}
                >
                  <span>{t('nav.shop', 'Shop')}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#7E8F80]" />
                </Link>

                {showShopDropdown && (
                  <div 
                    className="absolute left-0 top-full pt-1 w-60 z-50 animate-in fade-in duration-150"
                    onMouseEnter={handleShopMouseEnter}
                    onMouseLeave={handleShopMouseLeave}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-[#ECE7DD] py-2 overflow-hidden">
                      <Link
                        to="/shop"
                        onClick={() => {
                          if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
                          setShowShopDropdown(false);
                        }}
                        className="block px-4 py-2.5 text-xs font-bold text-[#2E4D34] hover:bg-[#FAF7F2] border-b border-[#F4EFE6] transition-colors"
                      >
                        {t('nav.allCategories', 'All Categories →')}
                      </Link>
                      {[
                        { name: 'Natural Products', key: 'categories.naturalProducts' },
                        { name: 'Handmade Products', key: 'categories.handmadeProducts' },
                        { name: 'Jewelry', key: 'categories.jewelry' },
                        { name: 'Clothes & Fashion', key: 'categories.clothesFashion' },
                        { name: 'Home & Living', key: 'categories.homeLiving' },
                        { name: 'Retail Products', key: 'categories.retailProducts' }
                      ].map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => handleCategoryNav(cat.name)}
                          className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#2D3A2F] hover:bg-[#FAF7F2] hover:text-[#2E4D34] transition-colors cursor-pointer"
                        >
                          {t(cat.key, cat.name)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Services ▾ with Dropdown */}
              <div 
                className="relative py-2"
                onMouseEnter={handleServicesMouseEnter}
                onMouseLeave={handleServicesMouseLeave}
              >
                <Link 
                  to="/services"
                  className={`flex items-center gap-1 py-1 transition-colors ${
                    isServicesActive 
                      ? 'text-[#2E4D34] font-bold border-b-2 border-[#2E4D34]' 
                      : 'hover:text-[#2E4D34]'
                  }`}
                >
                  <span>{t('nav.services', 'Services')}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#7E8F80]" />
                </Link>

                {showServicesDropdown && (
                  <div 
                    className="absolute left-0 top-full pt-1 w-56 z-50 animate-in fade-in duration-150"
                    onMouseEnter={handleServicesMouseEnter}
                    onMouseLeave={handleServicesMouseLeave}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-[#ECE7DD] py-2 overflow-hidden">
                      <Link
                        to="/services"
                        onClick={() => {
                          if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
                          setShowServicesDropdown(false);
                        }}
                        className="block px-4 py-2.5 text-xs font-bold text-[#2E4D34] hover:bg-[#FAF7F2] border-b border-[#F4EFE6] transition-colors"
                      >
                        {t('nav.browseAllServices', 'Browse All Services →')}
                      </Link>
                      {[
                        { title: 'Massage Therapy', key: 'services.items.srv-massage.title' },
                        { title: 'Beauty & Skincare', key: 'services.items.srv-beauty.title' },
                        { title: 'Tutoring', key: 'services.items.srv-tutoring.title' },
                        { title: 'Home Cleaning', key: 'services.items.srv-cleaning.title' }
                      ].map((service) => (
                        <button
                          key={service.title}
                          onClick={() => handleServicesNav()}
                          className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#2D3A2F] hover:bg-[#FAF7F2] hover:text-[#2E4D34] transition-colors cursor-pointer"
                        >
                          {t(service.key, service.title)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* About Us */}
              <Link 
                to="/about"
                className={`py-1 transition-colors ${
                  isAboutActive 
                    ? 'text-[#2E4D34] font-bold border-b-2 border-[#2E4D34]' 
                    : 'hover:text-[#2E4D34]'
                }`}
              >
                {t('nav.about', 'About Us')}
              </Link>

              {/* Contact */}
              <Link 
                to="/contact"
                className={`py-1 transition-colors ${
                  isContactActive 
                    ? 'text-[#2E4D34] font-bold border-b-2 border-[#2E4D34]' 
                    : 'hover:text-[#2E4D34]'
                }`}
              >
                {t('nav.contact', 'Contact')}
              </Link>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Wishlist Icon */}
              <Link 
                to="/wishlist"
                className="relative p-2 rounded-full hover:bg-[#F2F5F0] text-[#2E4D34] transition-colors flex items-center justify-center"
                title="Wishlist"
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-[#D82C20] text-[#D82C20]' : 'text-[#2E4D34]'}`} />
                {wishlist.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#D82C20] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart Icon */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-[#F2F5F0] text-[#2E4D34] hover:text-[#233B27] font-medium transition-colors"
                aria-label="Shopping Cart"
              >
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 text-[#2E4D34]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-[#2E4D34] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {cartCount}
                    </span>
                  )}
                </div>
              </button>

              {/* User Account / Sign In */}
              {user?.isLoggedIn ? (
                <Link
                  to="/account"
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#F2F5F0] transition-colors"
                  title="My Account"
                  aria-label="My Account"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center font-bold text-xs border border-[#CDE1CB]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden xl:inline text-xs font-semibold text-[#223B28]">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>
              ) : (
                <Link
                  id="navbar-signin"
                  to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2E4D34] text-[#2E4D34] hover:bg-[#2E4D34] hover:text-white transition-all text-xs font-semibold"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('nav.signIn', 'Sign In')}</span>
                </Link>
              )}
            </div>

          </nav>

        </div>

        {/* Mobile Search Bar visible on small devices */}
        <div className="pb-3 sm:hidden">
          <form 
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-white rounded-full border border-[#B6C6B5] pl-4 pr-1 py-1"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('nav.searchMobile', t('nav.searchPlaceholder', 'Search products...'))}
              className="w-full py-1 pr-3 text-xs text-[#223B28] placeholder-[#7E8F80] bg-transparent focus:outline-none"
            />
            <button 
              type="submit"
              className="w-8 h-8 rounded-full bg-[#2E4D34] flex items-center justify-center text-white"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl p-6 flex flex-col justify-between z-[100] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#ECE7DD]">
                <Logo variant="dark" size="sm" showTagline={false} />
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-full text-[#7E8F80] hover:text-[#223B28]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 space-y-3 text-sm font-medium text-[#2D3A2F]">
                <Link 
                  to="/"
                  onClick={() => {
                    setSelectedCategory('All');
                    setMobileMenuOpen(false);
                  }}
                  className="block py-2 text-[#2E4D34] font-semibold border-b border-[#F4EFE6]"
                >
                  {t('nav.home', 'Home')}
                </Link>
                <Link 
                  to="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 hover:text-[#2E4D34] border-b border-[#F4EFE6]"
                >
                  {t('nav.shop', 'Shop Catalog')}
                </Link>
                <Link 
                  to="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 hover:text-[#2E4D34] border-b border-[#F4EFE6]"
                >
                  {t('nav.services', 'Our Services')}
                </Link>
                <Link 
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 hover:text-[#2E4D34] border-b border-[#F4EFE6]"
                >
                  <span>{t('nav.wishlist', 'My Wishlist')}</span>
                  {wishlist.length > 0 && (
                    <span className="bg-[#D82C20] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 hover:text-[#2E4D34] border-b border-[#F4EFE6]"
                >
                  {t('nav.account', 'My Orders & Account')}
                </Link>
                <Link 
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 hover:text-[#2E4D34] border-b border-[#F4EFE6] ${
                    isAboutActive ? 'text-[#2E4D34] font-bold' : ''
                  }`}
                >
                  {t('nav.about', 'About Us')}
                </Link>
                <Link 
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 hover:text-[#2E4D34] ${
                    isContactActive ? 'text-[#2E4D34] font-bold' : ''
                  }`}
                >
                  {t('nav.contact', 'Contact Us')}
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-[#ECE7DD] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5F6D61]">Language / ഭാഷ:</span>
                <LanguageSwitcher variant="light" />
              </div>
              <p className="text-xs text-[#7E8F80]">
                Natural • Handmade • Unique
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
