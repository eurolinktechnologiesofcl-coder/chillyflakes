import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ShieldCheck,
  Building,
  Smartphone
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { INDIAN_STATES } from '../data/indianStates';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

export const ContactUsPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('Karnataka');
  const [inquiryType, setInquiryType] = useState('customer-support');
  const [categoryInterest, setCategoryInterest] = useState('Natural Products');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      showToast(t('contact.form.validationError', 'Please fill in your name, email, and message.'), 'warning');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = `CF-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicket(ticketId);
      setIsSubmitting(false);
      showToast(t('contact.form.toastSuccess', { ticketId, defaultValue: `Inquiry received! Ticket reference: ${ticketId}` }), 'success');
    }, 800);
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setMessage('');
  };

  const faqs = [
    {
      q: t('contact.faq.q1', 'How does ChillyFlakes verify that products are truly handmade and natural?'),
      a: t('contact.faq.a1', 'Every artisan partner on ChillyFlakes undergoes rigorous onboarding verification. We review artisan cards, geographical origin documents, batch purity tests, and photograph authentic production setups. No chemical fillers, toxic foaming agents, or artificial preservatives are permitted.'),
    },
    {
      q: t('contact.faq.q2', 'I am a rural artisan or self-help group. How do I start selling?'),
      a: t('contact.faq.a2', 'We welcome master craftspeople, handloom weavers, and organic cultivators from all Indian states. Click "Become a Seller" in our header or select "Artisan / Craftsman Direct Selling" on this form. Our regional coordinator will guide you through digital onboarding and zero-upfront-cost store setup.'),
    },
    {
      q: t('contact.faq.q3', 'How do community service appointments work (e.g. Massage, Tutoring)?'),
      a: t('contact.faq.a3', 'You can browse verified local practitioners under our Services tab, select a convenient date and time, and submit your request. The service provider will confirm the appointment directly with you via phone/WhatsApp.'),
    },
    {
      q: t('contact.faq.q4', 'What are your delivery timelines for domestic and interstate orders?'),
      a: t('contact.faq.a4', 'Handmade items are lovingly prepared and packed by the artisan within 24–48 hours. Standard courier delivery takes 3–5 business days across major Indian cities, and 4–7 days for remote destinations.'),
    },
    {
      q: t('contact.faq.q5', 'Do you offer bulk corporate gifts, custom wedding favors, or export orders?'),
      a: t('contact.faq.a5', 'Yes! We frequently organize bespoke artisan gift boxes (spice hampers, handmade soaps, brass lamps, and handloom shawls) for festive occasions, weddings, and eco-conscious businesses. Choose "Bulk / Wholesale & Corporate Gifting" in the form below.'),
    },
  ];

  return (
    <div className="bg-[#FAF7F2] min-h-screen text-[#223B28] font-sans pb-16">
      
      {/* 1. Header Banner */}
      <section className="bg-[#243F29] text-white py-14 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#2E4D34]/40 blur-3xl pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E4D34] border border-[#426849] text-xs font-semibold text-[#A3C4A5] uppercase tracking-widest mx-auto">
            <MessageSquare className="w-4 h-4 text-[#A3C4A5]" />
            <span>{t('contact.badge', 'We’re Here to Help • Direct Support')}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            {t('contact.title', 'Contact ChillyFlakes')}
          </h1>

          <p className="text-xs sm:text-sm text-[#D1DEC0] max-w-xl mx-auto leading-relaxed">
            {t(
              'contact.subtitle',
              'Have questions about a handcrafted order, artisan direct-selling partnerships, or community service bookings? Reach out to our team in your preferred regional language.'
            )}
          </p>

          {/* Regional language indicator */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[#A3C4A5]">
            <span>{t('contact.speakIn', 'Speak to us in your language:')}</span>
            <LanguageSwitcher variant="dark" />
          </div>
        </div>
      </section>

      {/* Breadcrumb Navigation */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D]">
          <Link to="/" className="hover:text-[#2E4D34] transition-colors">
            {t('nav.home', 'Home')}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">
            {t('nav.contact', 'Contact Us')}
          </span>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 space-y-12">
        
        {/* 2. Direct Contacts Grid: Phone, Email, WhatsApp, Hours */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#223B28]">
                {t('contact.cards.call.title', 'Call Us Directly')}
              </h3>
              <p className="text-xs text-[#6C7B6D] mt-0.5">
                {t('contact.cards.call.sub', 'Toll-free customer & artisan helpline')}
              </p>
            </div>
            <div className="pt-1 text-xs font-semibold text-[#2E4D34] space-y-0.5">
              <p>+91 98765 43210</p>
              <p className="text-[#6C7B6D] font-normal">1800-CHILLY-ART</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#223B28]">
                {t('contact.cards.email.title', 'Email Inquiries')}
              </h3>
              <p className="text-xs text-[#6C7B6D] mt-0.5">
                {t('contact.cards.email.sub', 'Prompt response within 4 business hours')}
              </p>
            </div>
            <div className="pt-1 text-xs font-semibold text-[#2E4D34] space-y-0.5">
              <p>namaste@chillyflakes.in</p>
              <p className="text-[#6C7B6D] font-normal">artisans@chillyflakes.in</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#223B28]">
                {t('contact.cards.whatsapp.title', 'WhatsApp Support')}
              </h3>
              <p className="text-xs text-[#6C7B6D] mt-0.5">
                {t('contact.cards.whatsapp.sub', 'Instant chat for tracking & inquiries')}
              </p>
            </div>
            <div className="pt-1">
              <a 
                href="https://wa.me/919876543210" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E4D34] hover:underline"
              >
                <span>{t('contact.cards.whatsapp.btn', 'Chat on WhatsApp →')}</span>
              </a>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#223B28]">
                {t('contact.cards.hours.title', 'Operating Hours')}
              </h3>
              <p className="text-xs text-[#6C7B6D] mt-0.5">
                {t('contact.cards.hours.sub', 'Monday to Saturday')}
              </p>
            </div>
            <div className="pt-1 text-xs text-[#223B28]">
              <p className="font-semibold">{t('contact.cards.hours.time', '9:00 AM – 7:00 PM IST')}</p>
              <p className="text-[#6C7B6D]">{t('contact.cards.hours.sunday', 'Sunday: Artisan Village Fieldwork')}</p>
            </div>
          </div>

        </section>

        {/* 3. Main Form & Physical Experience Hubs Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Contact Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-[#ECE7DD] shadow-xs space-y-6">
            
            {submittedTicket ? (
              <div className="p-8 text-center space-y-4 bg-[#FAF7F2] rounded-3xl border border-[#ECE7DD]">
                <div className="w-16 h-16 rounded-full bg-[#EAF1EA] text-[#2E4D34] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#223B28]">
                  {t('contact.form.successTitle', 'Thank You for Reaching Out!')}
                </h3>
                <p className="text-xs sm:text-sm text-[#5E6D60] max-w-md mx-auto leading-relaxed">
                  {t('contact.form.successDesc', { email, defaultValue: `Your message has been assigned to our regional coordinator. We will get in touch with you at ${email} in your preferred language.` })}
                </p>
                <div className="inline-block px-4 py-2 bg-white rounded-xl border border-[#D5DDD0] text-xs font-mono font-bold text-[#2E4D34]">
                  {t('contact.form.ticketRef', 'Ticket Reference:')} {submittedTicket}
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleResetForm}
                    className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
                  >
                    {t('contact.form.reset', 'Submit Another Inquiry')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#223B28]">
                    {t('contact.form.title', 'Send Us a Message')}
                  </h2>
                  <p className="text-xs text-[#6C7B6D] mt-1">
                    {t('contact.form.sub', 'Fill out the form below and an artisan coordinator will respond shortly.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#223B28] mb-1">
                      {t('contact.form.fullName', 'Your Full Name')} <span className="text-[#D82C20]">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('contact.form.fullNamePlaceholder', 'e.g. Priya Nair')}
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#223B28] mb-1">
                      {t('contact.form.email', 'Email Address')} <span className="text-[#D82C20]">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('contact.form.emailPlaceholder', 'e.g. priya@example.com')}
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#223B28] mb-1">
                      {t('contact.form.phone', 'Mobile Number')}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('contact.form.phonePlaceholder', 'e.g. +91 98765 43210')}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#223B28] mb-1">
                      {t('contact.form.state', 'State / Union Territory')}
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.code} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Inquiry Type */}
                <div>
                  <label className="block text-xs font-semibold text-[#223B28] mb-1">
                    {t('contact.form.inquiryType', 'What is this inquiry about?')}
                  </label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                  >
                    <option value="customer-support">
                      {t('contact.form.inquiryOptions.support', 'Customer Support (Order Status, Delivery, Returns)')}
                    </option>
                    <option value="artisan-selling">
                      {t('contact.form.inquiryOptions.artisan', 'Artisan / Craftsman Direct Selling (I make handmade crafts)')}
                    </option>
                    <option value="service-partner">
                      {t('contact.form.inquiryOptions.service', 'Community Service Provider (Massage, Beauty, Tutoring, Cleaning)')}
                    </option>
                    <option value="bulk-corporate">
                      {t('contact.form.inquiryOptions.bulk', 'Bulk / Wholesale Orders & Corporate Gifting')}
                    </option>
                    <option value="general">
                      {t('contact.form.inquiryOptions.general', 'General Marketplace Inquiry')}
                    </option>
                  </select>
                </div>

                {/* Category & Preferred Language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#223B28] mb-1">
                      {t('contact.form.category', 'Relevant Category')}
                    </label>
                    <select
                      value={categoryInterest}
                      onChange={(e) => setCategoryInterest(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                    >
                      <option value="Natural Products">
                        {t('contact.form.categoryOptions.natural', 'Natural Products (Spices, Botanicals, Oils)')}
                      </option>
                      <option value="Handmade Products">
                        {t('contact.form.categoryOptions.handmade', 'Handmade Products (Pottery, Wood, Decor)')}
                      </option>
                      <option value="Jewelry">
                        {t('contact.form.categoryOptions.jewelry', 'Jewelry (Silver, Gemstones, Terracotta)')}
                      </option>
                      <option value="Clothes & Fashion">
                        {t('contact.form.categoryOptions.clothes', 'Clothes & Fashion (Handlooms, Khadi, Linen)')}
                      </option>
                      <option value="Home & Living">
                        {t('contact.form.categoryOptions.home', 'Home & Living (Brass, Cookware, Rugs)')}
                      </option>
                      <option value="Retail Products">
                        {t('contact.form.categoryOptions.retail', 'Retail Products (Packaged Spices, Coffee)')}
                      </option>
                      <option value="Massage Therapy">
                        {t('contact.form.categoryOptions.massage', 'Service: Massage Therapy')}
                      </option>
                      <option value="Beauty & Skincare">
                        {t('contact.form.categoryOptions.beauty', 'Service: Beauty & Skincare')}
                      </option>
                      <option value="Tutoring">
                        {t('contact.form.categoryOptions.tutoring', 'Service: Regional Languages & Tutoring')}
                      </option>
                      <option value="Home Cleaning">
                        {t('contact.form.categoryOptions.cleaning', 'Service: Eco-Friendly Home Cleaning')}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#223B28] mb-1">
                      {t('contact.form.prefLang', 'Preferred Language for Reply')}
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                    >
                      <option value="English">English</option>
                      <option value="Malayalam">Malayalam (മലയാളം)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-[#223B28] mb-1">
                    {t('contact.form.message', 'Your Message')} <span className="text-[#D82C20]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t(
                      'contact.form.messagePlaceholder',
                      'Tell us more about your inquiry, handmade craft products, order details, or questions...'
                    )}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] bg-[#FAF7F2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#2E4D34] hover:bg-[#233B27] disabled:bg-[#8F9E8F] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? t('contact.form.submitting', 'Sending Message...') : t('contact.form.submit', 'Submit Inquiry')}</span>
                </button>

              </form>
            )}

          </div>

          {/* Right Column: Physical Heritage Hubs & Artisan Desks */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E4D34]">
                <Building className="w-4 h-4" />
                <span>{t('contact.hubs.title', 'Our Heritage Hubs & Sourcing Centers')}</span>
              </div>
              
              <div className="space-y-4 divide-y divide-[#F2ECE1]">
                
                {/* Bengaluru Hub */}
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2E4D34] flex-shrink-0" />
                    <h4 className="font-serif font-bold text-sm text-[#223B28]">
                      {t('contact.hubs.hub1Name', 'Bengaluru Technology & Logistics Hub')}
                    </h4>
                  </div>
                  <p className="text-xs text-[#5E6D60] pl-6 leading-relaxed">
                    {t('contact.hubs.hub1Addr', '#48, 100ft Road, Indiranagar, Bengaluru, Karnataka 560038')}
                  </p>
                  <p className="text-[11px] text-[#6C7B6D] pl-6">
                    {t('contact.hubs.hub1Desc', 'Handling nationwide artisan supply-chain & Karnataka craft outreach.')}
                  </p>
                </div>

                {/* Kochi Experience Center */}
                <div className="pt-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2E4D34] flex-shrink-0" />
                    <h4 className="font-serif font-bold text-sm text-[#223B28]">
                      {t('contact.hubs.hub2Name', 'Kochi Artisan Experience & Sourcing Center')}
                    </h4>
                  </div>
                  <p className="text-xs text-[#5E6D60] pl-6 leading-relaxed">
                    {t('contact.hubs.hub2Addr', 'Heritage Compound, Calvathy Road, Fort Kochi, Kerala 682001')}
                  </p>
                  <p className="text-[11px] text-[#6C7B6D] pl-6">
                    {t('contact.hubs.hub2Desc', 'Direct coordinator for spices, coir, bell metal & Kerala handlooms.')}
                  </p>
                </div>

              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#ECE7DD] text-xs text-[#5E6D60] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#223B28]">
                  <ShieldCheck className="w-4 h-4 text-[#2E4D34]" />
                  <span>{t('contact.hubs.visitingTitle', 'Artisan Visiting Hours')}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {t(
                    'contact.hubs.visitingDesc',
                    'Artisans and small-scale cultivators wishing to showcase samples are welcome on Tuesdays & Thursdays with prior appointment.'
                  )}
                </p>
              </div>

            </div>

            {/* Quick Seller CTA box */}
            <div className="bg-[#243F29] text-white rounded-3xl p-6 sm:p-8 space-y-3">
              <h3 className="font-serif font-bold text-xl">
                {t('contact.cta.title', 'Are You an Indian Artisan?')}
              </h3>
              <p className="text-xs text-[#D1DEC0] leading-relaxed">
                {t(
                  'contact.cta.desc',
                  'Skip retail middlemen. Open your digital storefront on ChillyFlakes in minutes and get listed in our natural & handmade marketplace.'
                )}
              </p>
              <div className="pt-2">
                <Link
                  to="/vendor/register"
                  className="inline-block px-5 py-2.5 bg-white text-[#243F29] hover:bg-[#EAF1EA] text-xs font-bold rounded-full transition-colors"
                >
                  {t('contact.cta.button', 'Register as an Artisan →')}
                </Link>
              </div>
            </div>

          </div>

        </section>

        {/* 4. Frequently Asked Questions (FAQ) Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#ECE7DD] shadow-xs space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2E4D34]">
              <HelpCircle className="w-4 h-4" />
              <span>{t('contact.faq.eyebrow', 'Got Questions?')}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28]">
              {t('contact.faq.title', 'Frequently Asked Questions')}
            </h2>
            <p className="text-xs sm:text-sm text-[#6C7B6D]">
              {t(
                'contact.faq.subtitle',
                'Learn more about our authentic handmade sourcing, community services, and artisan direct-selling.'
              )}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 pt-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-[#ECE7DD] rounded-2xl overflow-hidden bg-[#FAF7F2] transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-semibold text-[#223B28] hover:text-[#2E4D34] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#7E8F80] transition-transform duration-200 flex-shrink-0 ml-2 ${
                        isOpen ? 'rotate-180 text-[#2E4D34]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs text-[#5E6D60] leading-relaxed border-t border-[#ECE7DD]/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ContactUsPage;
