import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Star, 
  Clock, 
  ShieldCheck, 
  X, 
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { servicesData, type ServiceItem } from '../components/ServicesSection';
import { servicesApi } from '../api';

export const ServicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { addBooking, showToast } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  // Booking Form State
  const [userName, setUserName] = useState<string>('');
  const [userContact, setUserContact] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('10:00 AM');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  const localizedServices = useMemo(() => {
    return servicesData.map((s) => ({
      ...s,
      title: t(`services.items.${s.id}.title`, s.title),
      subtitle: t(`services.items.${s.id}.subtitle`, s.subtitle),
      description: t(`services.items.${s.id}.description`, s.description),
      duration: t(`services.items.${s.id}.duration`, s.duration),
      price: t(`services.items.${s.id}.price`, s.price),
      displayCategory: t(`services.tags.${s.category}`, s.category),
    }));
  }, [t]);

  const filteredServices = useMemo(() => {
    return localizedServices.filter((s) => {
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm.trim() === '' ||
        s.title.toLowerCase().includes(query) ||
        s.subtitle.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.displayCategory.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [localizedServices, selectedCategory, searchTerm]);

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsSubmitting(true);
    try {
      await servicesApi.createBooking({
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        userName,
        userContact,
        preferredDate: bookingDate,
        preferredTime: bookingTime,
      });

      addBooking({
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        userName,
        userContact,
        preferredDate: bookingDate,
        preferredTime: bookingTime,
        price: selectedService.price,
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setSelectedService(null);
        setBookingSuccess(false);
        setUserName('');
        setUserContact('');
        setBookingDate('');
      }, 2000);
    } catch {
      showToast(t('services.modal.errorMsg', 'Could not schedule appointment. Please try again.'), 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12 border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D] mb-4">
          <Link to="/" className="hover:text-[#2E4D34]">
            {t('nav.home', 'Home')}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">
            {t('services.breadcrumb', 'Community Services')}
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#ECE7DD] mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2E4D34] mb-1">
              <ShieldCheck className="w-4 h-4 text-[#2E4D34]" />
              <span>{t('services.verifiedBadge', 'Verified Local Practitioners')}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] tracking-tight">
              {t('services.title', 'Professional Community Services')}
            </h1>
            <p className="text-xs sm:text-sm text-[#5E6D60] mt-1 max-w-xl">
              {t(
                'services.subtitle',
                'From organic botanical facials and deep-tissue massage to chemical-free eco-cleaning and academic tutoring — vetted experts at your doorstep.'
              )}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#7E8F80] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('services.searchPlaceholder', 'Search services...')}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-full text-xs border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8">
          {[
            { id: 'All', label: t('services.categories.all', 'All Services') },
            { id: 'Wellness', label: t('services.categories.wellness', 'Wellness & Massage') },
            { id: 'Home', label: t('services.categories.home', 'Eco Home & Living') },
            { id: 'Crafts', label: t('services.categories.crafts', 'Artisan Workshops') },
            { id: 'Education', label: t('services.categories.education', 'Tutoring & Skills') },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#2E4D34] text-white shadow-xs'
                  : 'bg-white text-[#4A5749] border border-[#D5C9B3] hover:border-[#2E4D34]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => setSelectedService(service)}
              className="group bg-white rounded-3xl overflow-hidden border border-[#ECE7DD] hover:border-[#2E4D34]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
            >
              <div className="aspect-[16/10] overflow-hidden bg-[#FAF7F2] relative">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/95 text-[#2E4D34] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {service.displayCategory}
                </span>
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span>{service.rating.toFixed(1)}</span>
                  <Star className="w-2.5 h-2.5 fill-[#FBBF24] text-[#FBBF24]" />
                </div>
              </div>

              <div className="p-5 flex flex-col flex-grow justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#223B28] group-hover:text-[#2E4D34] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-[11px] font-medium text-[#6C7B6D] mt-0.5">
                    {service.subtitle}
                  </p>
                  <p className="text-xs text-[#506052] mt-2 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#2E4D34] block">
                      {service.price}
                    </span>
                    <span className="text-[10px] text-[#7E8F80] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {service.duration}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedService(service);
                    }}
                    className="px-3.5 py-1.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                  >
                    {t('services.bookNow', 'Book Now')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Interactive Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedService(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#ECE7DD] text-[#223B28]">
              
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 p-2 text-[#7E8F80] hover:text-[#223B28] rounded-full hover:bg-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-4">
                <img src={selectedService.image} alt={selectedService.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#2E4D34] bg-[#EAF1EA] px-3 py-1 rounded-full">
                  {selectedService.price}
                </span>
                <span className="text-xs text-[#6C7B6D] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {selectedService.duration}
                </span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-[#223B28] mt-1">{selectedService.title}</h3>
              <p className="text-xs text-[#506052] leading-relaxed mt-2">{selectedService.description}</p>

              {bookingSuccess ? (
                <div className="mt-6 p-4 bg-[#EAF1EA] rounded-2xl flex items-center gap-3 text-[#2E4D34] text-xs font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-[#2E4D34]" />
                  <span>{t('services.modal.successMsg', 'Your booking request has been submitted! View it in My Account.')}</span>
                </div>
              ) : (
                <form onSubmit={handleBookService} className="mt-6 space-y-3 pt-3 border-t border-[#ECE7DD]">
                  <p className="text-xs font-semibold text-[#223B28]">
                    {t('services.modal.title', 'Book an Appointment:')}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={t('services.modal.namePlaceholder', 'Your Full Name')}
                      className="px-3 py-2 text-xs rounded-xl border border-[#D5C9B3] bg-[#FAF7F2]"
                    />
                    <input
                      type="text"
                      required
                      value={userContact}
                      onChange={(e) => setUserContact(e.target.value)}
                      placeholder={t('services.modal.contactPlaceholder', 'Phone or Email')}
                      className="px-3 py-2 text-xs rounded-xl border border-[#D5C9B3] bg-[#FAF7F2]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-[#D5C9B3] bg-[#FAF7F2]"
                    />
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-[#D5C9B3] bg-[#FAF7F2]"
                    >
                      <option>{t('services.modal.slotMorning', 'Morning (09:00 AM - 12:00 PM)')}</option>
                      <option>{t('services.modal.slotAfternoon', 'Afternoon (12:00 PM - 03:00 PM)')}</option>
                      <option>{t('services.modal.slotEvening', 'Evening (03:00 PM - 06:00 PM)')}</option>
                      <option>{t('services.modal.slotWeekend', 'Weekend Special Slot')}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 mt-2 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {isSubmitting ? t('services.modal.submitting', 'Requesting...') : t('services.modal.confirmBtn', 'Confirm Appointment Request')}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ServicesPage;
