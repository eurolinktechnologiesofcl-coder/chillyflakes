import React from 'react';
import { ShieldCheck, Truck, RefreshCw, CreditCard } from 'lucide-react';
import { useLivePlatformSettings } from '../utils/platformSync';
import { formatRupees } from '../utils/currency';

export const OfferStrip: React.FC = () => {
  const { freeShippingThreshold } = useLivePlatformSettings();

  return (
    <section className="max-w-[1360px] mx-auto px-3 sm:px-6 py-2">
      <div className="bg-white rounded-2xl border border-[#E2E7DF] p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[#1D251E] shadow-soft">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0F4EE] border border-[#D5E1D3] text-[#3C4A3E] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1D251E] leading-none">Chilly Assured</p>
            <p className="text-[11px] text-[#5F6D61] mt-1">100% Sanitized & Tested</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0F4EE] border border-[#D5E1D3] text-[#3C4A3E] flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1D251E] leading-none">Free Delivery</p>
            <p className="text-[11px] text-[#5F6D61] mt-1">On orders above {formatRupees(freeShippingThreshold)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0F4EE] border border-[#D5E1D3] text-[#3C4A3E] flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1D251E] leading-none">7 Days Replacement</p>
            <p className="text-[11px] text-[#5F6D61] mt-1">Hassle-free doorstep pickup</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0F4EE] border border-[#D5E1D3] text-[#3C4A3E] flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1D251E] leading-none">Special Savings</p>
            <p className="text-[11px] text-[#5F6D61] mt-1">10% off with EARTHY10</p>
          </div>
        </div>

      </div>
    </section>
  );
};
