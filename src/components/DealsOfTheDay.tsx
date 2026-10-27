import React, { useState, useEffect } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees } from '../utils/currency';

export const DealsOfTheDay: React.FC = () => {
  const { products, setQuickViewProduct, setSelectedCategory } = useStore();
  const [timeLeft, setTimeLeft] = useState({ hours: 16, minutes: 42, seconds: 19 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dealProducts = products.slice(0, 6);

  const handleViewAll = () => {
    setSelectedCategory('All');
    const el = document.getElementById('shop-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="max-w-[1360px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
      <div className="bg-white text-[#1D251E] rounded-3xl shadow-soft border border-[#E2E7DF] p-5 sm:p-7">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#EEF2EB] gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1D251E]">
              Deals of the Day
            </h2>
            {/* Timer with Chilly Red badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDECEB] text-[#D82C20] text-xs font-semibold border border-[#FAC7C3]">
              <Clock className="w-3.5 h-3.5 text-[#D82C20]" />
              <span className="font-mono">
                {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>

          <button
            onClick={handleViewAll}
            className="self-start sm:self-auto px-5 py-2 bg-[#3C4A3E] hover:bg-[#D82C20] text-white text-xs font-semibold rounded-full transition-all shadow-xs flex items-center gap-1.5 group"
          >
            <span>View All Deals</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Horizontal Deals Grid with Chilly Red Accents */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {dealProducts.map((prod) => (
            <div
              key={prod.id}
              onClick={() => setQuickViewProduct(prod)}
              className="p-3 sm:p-3.5 rounded-2xl border border-[#EDE3DE] hover:border-[#D82C20]/50 hover:shadow-card-chilly transition-all cursor-pointer flex flex-col justify-between group bg-[#FFFDFD] text-center"
            >
              <div className="relative aspect-square w-full mb-3 flex items-center justify-center p-3 bg-[#FAF7F6] rounded-xl overflow-hidden border border-[#F3EAE8]">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-108 transition-transform duration-300"
                />
                {/* Chilly Red discount pill */}
                <span className="absolute bottom-1.5 left-1.5 bg-[#D82C20] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-2xs">
                  {prod.discount}% off
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-[#1D251E] line-clamp-1 group-hover:text-[#D82C20] transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs font-bold text-[#D82C20]">
                  From {formatRupees(prod.price)}
                </p>
                <p className="text-[11px] text-[#8C6D65] truncate">
                  {prod.category}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
