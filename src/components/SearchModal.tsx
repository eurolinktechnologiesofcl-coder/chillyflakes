import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { productsApi } from '../api';
import type { Product } from '../types';
import { formatRupees } from '../utils/currency';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, products, openProductPage } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [apiResults, setApiResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
      setApiResults([]);
    }
  }, [isSearchOpen]);

  // Live debounced search via the backend API with local fallback
  useEffect(() => {
    if (!searchTerm.trim()) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await productsApi.searchProducts(searchTerm);
        if (res.data) {
          setApiResults(res.data);
        }
      } catch {
        // fallback to store products
        setApiResults(
          products.filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.material.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, products]);

  if (!isSearchOpen) return null;

  const results = apiResults;

  const popularSearches = [
    'Wooden Spoon',
    'Pre-Owned',
    'Ceramic Bowl',
    'Storage Jar',
    'Stainless Steel',
    'Tray'
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsSearchOpen(false)}
      />

      <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:pt-24 text-center">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-[#E2E7DF] text-[#1D251E]">
          
          {/* Header Input */}
          <div className="p-4 sm:p-5 border-b border-[#EEF2EB] flex items-center gap-3 bg-[#F9FAF8]">
            <Search className="w-5 h-5 text-[#3C4A3E] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cookware, ceramics, pre-owned pieces..."
              className="w-full bg-transparent text-sm text-[#1D251E] placeholder-[#7F8F81] focus:outline-none font-medium"
            />
            {isSearching && (
              <span className="text-[11px] text-[#7E8F80] shrink-0 animate-pulse">Searching...</span>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-[#5F6D61] hover:text-[#1D251E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(false)}
              className="px-2.5 py-1 text-[10px] font-mono rounded-full bg-white text-[#5F6D61] border border-[#DFE6DD]"
            >
              ESC
            </button>
          </div>

          {/* Suggestions */}
          {searchTerm.trim() === '' ? (
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-[#5F6D61] uppercase tracking-wider mb-3">
                  Frequently Searched
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchTerm(term)}
                      className="px-3.5 py-1.5 rounded-full bg-[#F4F6F2] border border-[#DFE6DD] text-xs font-medium text-[#1D251E] hover:border-[#3C4A3E] hover:bg-[#EAEFE8] transition-colors flex items-center gap-1.5"
                    >
                      <Tag className="w-3 h-3 text-[#3C4A3E]" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#EEF2EB] text-[11px] text-[#5F6D61]">
                <p>Filter by material ("wood", "brass", "ceramic") or condition ("pre-owned", "like new").</p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="p-3 max-h-96 overflow-y-auto divide-y divide-[#EEF2EB]">
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    openProductPage(product);
                    setIsSearchOpen(false);
                  }}
                  className="py-3 px-3 rounded-2xl hover:bg-[#F4F6F2] cursor-pointer flex items-center justify-between gap-4 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F4F6F2] p-1.5 flex items-center justify-center flex-shrink-0 border border-[#E5EAE2]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1D251E] group-hover:text-[#3C4A3E] transition-colors">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#5F6D61] uppercase">
                        <span>{product.condition}</span>
                        <span>•</span>
                        <span>{product.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-[#3C4A3E]">
                      {formatRupees(product.price)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#3C4A3E] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-[#5F6D61]">
              <p className="font-semibold text-sm text-[#1D251E]">No items matching "{searchTerm}"</p>
              <p className="text-xs text-[#5F6D61] mt-1">
                Try searching for "spoon", "tray", "bowl", or "cup".
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
