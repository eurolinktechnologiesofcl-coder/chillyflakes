import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { useStore } from '../context/StoreContext';
import { LanguageSwitcher } from './ui/LanguageSwitcher';
import { useLivePlatformSettings } from '../utils/platformSync';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { showToast, setSelectedCategory } = useStore();
  const [email, setEmail] = useState('');
  const { settings } = useLivePlatformSettings();
  const c = settings.compliance;
  const complianceLine = [
    c?.legal_entity_name,
    c?.gstin ? `GSTIN: ${c.gstin}` : '',
    c?.registered_office_address,
  ].filter(Boolean).join(' · ');
  const supportLine = [c?.support_email, c?.support_phone].filter(Boolean).join(' · ');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    showToast('Thank you for subscribing to our newsletter!', 'success');
    setEmail('');
  };

  return (
    <footer id="footer-section" className="bg-[#243F29] text-[#E5EBE3] pt-14 pb-8 border-t border-[#1C3220]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Main 4-Column Grid matching screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-[#35523A]">
          
          {/* Column 1: Custom Logo + Tagline */}
          <div className="lg:col-span-4 space-y-4">
            <Link 
              to="/" 
              onClick={() => {
                setSelectedCategory('All');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-block"
            >
              <Logo variant="light" size="lg" showTagline={true} />
            </Link>
            <p className="text-xs text-[#C8D6C7] max-w-sm leading-relaxed pt-2">
              {t('footer.tagline', 'ChillyFlakes connects conscious shoppers with talented local artisans, offering handcrafted essentials, natural self-care, and skilled community services.')}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
              {t('footer.quickLinks', 'Quick Links')}
            </h4>
            <ul className="space-y-2.5 text-xs text-[#D1DEC0]/85">
              <li>
                <Link 
                  to="/" 
                  onClick={() => {
                    setSelectedCategory('All');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  {t('footer.home', 'Home')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/shop" 
                  className="hover:text-white transition-colors"
                >
                  {t('nav.shop', 'Shop Catalog')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/services" 
                  className="hover:text-white transition-colors"
                >
                  {t('nav.services', 'Our Services')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className="hover:text-white transition-colors"
                >
                  {t('nav.about', 'About Us')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="hover:text-white transition-colors"
                >
                  {t('nav.contact', 'Contact Us')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/wishlist" 
                  className="hover:text-white transition-colors"
                >
                  {t('nav.wishlist', 'My Wishlist')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/account" 
                  className="hover:text-white transition-colors"
                >
                  {t('footer.myAccount', 'My Account')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin/login" 
                  className="hover:text-white transition-colors text-[#A3C4A5]/70 hover:text-[#A3C4A5] text-[11px]"
                >
                  Super Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
              {t('footer.customerCare', 'Customer Care')}
            </h4>
            <ul className="space-y-2.5 text-xs text-[#D1DEC0]/85">
              <li>
                <Link 
                  to="/account?tab=orders" 
                  className="hover:text-white transition-colors"
                >
                  {t('footer.trackOrder', 'Track My Order')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/account?tab=bookings" 
                  className="hover:text-white transition-colors"
                >
                  {t('footer.serviceAppointments', 'Service Appointments')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/account?tab=addresses" 
                  className="hover:text-white transition-colors"
                >
                  {t('footer.deliveryAddresses', 'Delivery Addresses')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="hover:text-white transition-colors text-[#A3C4A5] font-medium"
                >
                  {t('footer.artisanSelling', 'Artisan Direct Selling')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="hover:text-white transition-colors"
                >
                  {t('footer.privacyPolicy', 'Privacy Policy')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="hover:text-white transition-colors"
                >
                  {t('footer.termsConditions', 'Terms & Conditions')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Stay Connected & Newsletter */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2">
              {t('footer.stayConnected', 'Stay Connected')}
            </h4>

            {/* Social Icons matching screenshot (FB, IG, Pinterest, YouTube) */}
            <div className="flex items-center gap-3 text-white">
              {/* Facebook */}
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#35523A] hover:bg-[#476C4D] flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Instagram */}
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#35523A] hover:bg-[#476C4D] flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Pinterest */}
              <a 
                href="https://pinterest.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#35523A] hover:bg-[#476C4D] flex items-center justify-center transition-colors"
                aria-label="Pinterest"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.368-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                </svg>
              </a>

              {/* YouTube */}
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#35523A] hover:bg-[#476C4D] flex items-center justify-center transition-colors"
                aria-label="YouTube"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>

            {/* Newsletter Input matching screenshot */}
            <div className="pt-2">
              <p className="text-xs text-[#D1DEC0] mb-2 font-medium">
                Subscribe to our newsletter
              </p>
              <form onSubmit={handleSubscribe} className="flex items-center gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full bg-white text-[#223B28] px-3.5 py-2 rounded-lg text-xs placeholder-[#7E8F80] focus:outline-none focus:ring-2 focus:ring-[#6BAF75]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2E4D34] hover:bg-[#1E3622] border border-[#446849] text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Bottom Bar matching screenshot */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#B2C5B1] gap-4">
          <div>
            <p>
              {t('footer.rights', '© 2026 ChillyFlakes. All rights reserved.')}
            </p>
            {complianceLine && <p className="mt-1 text-[10px] text-[#8FA68E]">{complianceLine}</p>}
            {supportLine && <p className="mt-0.5 text-[10px] text-[#8FA68E]">Support: {supportLine}</p>}
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <span className="text-white/70">{t('footer.language', 'Language:')}</span>
              <LanguageSwitcher variant="dark" />
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-[#C8D6C7]">
              <span>{t('footer.shopNatural', 'Shop Natural')}</span>
              <span className="text-[#4E7052]">&bull;</span>
              <span>{t('footer.shopHandmade', 'Shop Handmade')}</span>
              <span className="text-[#4E7052]">&bull;</span>
              <span>{t('footer.makeDifference', 'Make a Difference')}</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
