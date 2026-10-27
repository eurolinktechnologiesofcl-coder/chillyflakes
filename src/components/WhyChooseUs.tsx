import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  HeartHandshake, 
  ShieldCheck, 
  Truck, 
  Leaf 
} from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const { t } = useTranslation();

  const trustItems = [
    {
      icon: <CheckCircle className="w-8 h-8 text-[#2E4D34] stroke-[1.5]" />,
      title: t('home.trust1', '100% Natural\n& Handmade'),
    },
    {
      icon: <HeartHandshake className="w-8 h-8 text-[#2E4D34] stroke-[1.5]" />,
      title: t('home.trust2', 'Support Local\nSmall Businesses'),
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-[#2E4D34] stroke-[1.5]" />,
      title: t('home.trust3', 'Secure Payments\n& Safe Checkout'),
    },
    {
      icon: <Truck className="w-8 h-8 text-[#2E4D34] stroke-[1.5]" />,
      title: t('home.trust4', 'Fast & Reliable\nShipping'),
    },
    {
      icon: <Leaf className="w-8 h-8 text-[#2E4D34] stroke-[1.5]" />,
      title: t('home.trust5', 'Eco-Friendly\n& Sustainable'),
    },
  ];

  return (
    <section id="why-choose-section" className="py-14 sm:py-18 bg-[#FAF7F2] border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Centered Serif Section Title */}
        <div className="text-center mb-12 sm:mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] tracking-tight">
            {t('home.whyChooseTitle', 'Why Choose ChillyFlakes?')}
          </h2>
        </div>

        {/* 5-Column Feature Icons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-6 text-center">
          {trustItems.map((item, index) => (
            <div 
              key={index} 
              className={`flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1 ${
                index === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              {/* Clean Icon with soft hover circle */}
              <div className="w-16 h-16 rounded-full bg-white border border-[#E5E0D5] flex items-center justify-center mb-4 shadow-2xs group-hover:border-[#2E4D34] group-hover:shadow-xs transition-all">
                {item.icon}
              </div>

              {/* Title with preserved line breaks */}
              <h3 className="text-xs sm:text-sm font-semibold text-[#223B28] leading-tight whitespace-pre-line group-hover:text-[#2E4D34] transition-colors">
                {item.title}
              </h3>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyChooseUs;

