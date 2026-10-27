import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'light',
  className = '',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const isDarkBg = variant === 'dark';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="language-switcher-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
          isDarkBg
            ? 'bg-[#2E4D34]/30 border-[#426849] text-white hover:bg-[#2E4D34]/50'
            : 'bg-white/90 border-[#E5ECE3] text-[#223B28] hover:bg-white hover:border-[#2E4D34] shadow-xs'
        } focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:ring-offset-1`}
      >
        <Globe className={`w-3.5 h-3.5 ${isDarkBg ? 'text-[#A3C4A5]' : 'text-[#2E4D34]'}`} />
        <span className="font-medium">{currentLang.nativeName}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
            isDarkBg ? 'text-[#A3C4A5]' : 'text-[#5F6D61]'
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby="language-switcher-button"
          className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-2xl border border-[#EAE5DB] py-1.5 z-[100] text-[#223B28] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[#637365] tracking-wider border-b border-[#F4EFE6]">
            Select Language
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#EAF1EA] text-[#2E4D34] font-semibold'
                    : 'text-[#223B28] hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-xs">{lang.nativeName}</span>
                  <span className="text-[10px] text-[#637365] font-normal">
                    {lang.code === 'en' ? 'English' : lang.name}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#2E4D34]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default LanguageSwitcher;
