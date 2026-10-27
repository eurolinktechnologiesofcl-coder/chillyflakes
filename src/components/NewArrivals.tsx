import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CornerDownRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees } from '../utils/currency';
import type { Product } from '../types';

/**
 * Curated "New Arrival" picks with their editorial collection label.
 * Order matters: the second card is the default highlighted "signature" card.
 */
const NEW_ARRIVAL_PICKS: { id: string; label: string }[] = [
  { id: 'prod-bamboo-lantern', label: 'Artisan Collection' },
  { id: 'prod-ceramic-mug', label: 'Signature Item' },
  { id: 'prod-moonstone-necklace', label: 'Luxe Collection' },
  { id: 'prod-olive-board', label: 'Artisan Collection' },
  { id: 'prod-linen-wrap-dress', label: 'Handloom Edit' },
  { id: 'prod-soy-candle', label: 'Small Batch' },
  { id: 'prod-seagrass-tote', label: 'Handwoven' },
  { id: 'prod-bamboo-planter', label: 'Eco Collection' },
];

const DEFAULT_ACTIVE_INDEX = 1;

/** Aligns the first card with the page container while letting the track bleed to the right edge. */
const TRACK_INSET = 'max(1rem, calc((100vw - 1360px) / 2 + 1.5rem))';

export const NewArrivals: React.FC = () => {
  const { products, openProductPage, setSelectedCategory } = useStore();
  const [activeIndex, setActiveIndex] = useState(DEFAULT_ACTIVE_INDEX);
  const [inView, setInView] = useState(false);
  const [revealDone, setRevealDone] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    return NEW_ARRIVAL_PICKS.map(({ id, label }) => {
      const product = products.find((p) => p.id === id);
      return product ? { product, label } : null;
    }).filter((x): x is { product: Product; label: string } => x !== null);
  }, [products]);

  // Reveal cards with a staggered fade-up the first time the section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Once the staggered reveal has played, drop per-card delays so hover feels instant
  useEffect(() => {
    if (!inView) return;
    const t = window.setTimeout(() => setRevealDone(true), 1000);
    return () => window.clearTimeout(t);
  }, [inView]);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 20 : 300;
    track.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  const handleExploreAll = () => {
    setSelectedCategory('All');
    document.getElementById('featured-products-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="new-arrivals-section"
      aria-labelledby="new-arrivals-heading"
      className="relative overflow-hidden py-14 sm:py-20 text-white"
      style={{
        background:
          'radial-gradient(120% 90% at 10% 110%, #B4531E 0%, rgba(140,62,22,0.55) 28%, transparent 60%), radial-gradient(80% 70% at 95% 0%, #4A2716 0%, transparent 70%), linear-gradient(160deg, #2B160C 0%, #3B1E10 45%, #54290F 100%)',
      }}
    >
      {/* Film-grain texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Oversized watermark lettering */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute -bottom-16 sm:-bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap font-script text-[10rem] sm:text-[16rem] lg:text-[20rem] leading-none text-[#E9A273]/[0.07]"
      >
        Handmade
      </span>

      {/* Header */}
      <div className="relative max-w-[1360px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <h2
            id="new-arrivals-heading"
            aria-label="New Arrival"
            className="flex items-baseline leading-none"
          >
            <span aria-hidden="true" className="font-script text-[68px] sm:text-[92px] -mr-1 sm:-mr-1.5 translate-y-1.5 text-white/95">
              N
            </span>
            <span aria-hidden="true" className="font-display font-normal text-[40px] sm:text-[58px] tracking-[-0.025em]">
              ew Arrival
            </span>
          </h2>

          <div className="sm:max-w-[260px] sm:pb-2">
            <p className="font-display text-[13.5px] sm:text-sm leading-snug text-white/85">
              Timeless craft. Honest materials.
              <br />
              Made by hand, made to be loved.
            </p>
            <div className="mt-4 flex items-center justify-between gap-6">
              <button
                id="new-arrivals-explore-all"
                type="button"
                onClick={handleExploreAll}
                className="group inline-flex items-center gap-2.5 font-editorial text-[15px] text-white/85 hover:text-white transition-colors"
              >
                <CornerDownRight className="w-3.5 h-3.5 stroke-[1.5] transition-transform duration-300 group-hover:translate-x-0.5" />
                <span className="border-b border-transparent group-hover:border-white/60 transition-colors">Explore all</span>
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  id="new-arrivals-prev"
                  type="button"
                  aria-label="Previous new arrivals"
                  onClick={() => scrollByCard(-1)}
                  className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-[#3B1E10] transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  id="new-arrivals-next"
                  type="button"
                  aria-label="Next new arrivals"
                  onClick={() => scrollByCard(1)}
                  className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-[#3B1E10] transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card track */}
      <div
        ref={trackRef}
        onMouseLeave={() => setActiveIndex(DEFAULT_ACTIVE_INDEX)}
        className="relative mt-10 sm:mt-12 flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4"
        style={{ paddingLeft: TRACK_INSET, paddingRight: TRACK_INSET, scrollPaddingLeft: TRACK_INSET }}
      >
        {items.map(({ product, label }, index) => {
          const isActive = index === activeIndex;
          return (
            <article
              key={product.id}
              id={`new-arrival-card-${product.id}`}
              data-card
              role="button"
              tabIndex={0}
              aria-label={`${product.name}, ${formatRupees(product.price)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => openProductPage(product)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openProductPage(product);
                }
              }}
              className={`group relative shrink-0 snap-start w-[250px] sm:w-[288px] h-[340px] sm:h-[372px] rounded-[22px] p-3.5 sm:p-4 flex flex-col cursor-pointer overflow-hidden bg-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-[transform,box-shadow,opacity] duration-500 ease-out ${
                isActive ? '-translate-y-1 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.65)]' : 'shadow-[0_10px_30px_-16px_rgba(0,0,0,0.5)]'
              } ${inView ? 'opacity-100' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: inView && !revealDone ? `${Math.min(index, 5) * 70}ms` : '0ms' }}
            >
              {/* Highlight gradient (cross-fades in for the active card) */}
              <div
                aria-hidden="true"
                className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: 'linear-gradient(180deg, #D3C5B6 0%, #A88B74 48%, #6A4632 100%)' }}
              />

              {/* Product image */}
              <div className="relative flex-1 rounded-2xl overflow-hidden bg-[#F4F1EC]">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
              </div>

              {/* Meta */}
              <div
                className={`relative mt-3.5 sm:mt-4 flex items-end justify-between gap-3 transition-colors duration-500 ${
                  isActive ? 'text-white' : 'text-[#1E1A17]'
                }`}
              >
                <div className="min-w-0">
                  <h3 className="font-display text-[15.5px] sm:text-[17px] font-normal tracking-[-0.01em] truncate">
                    {product.name}
                  </h3>
                  <p className={`font-display text-[13px] mt-0.5 ${isActive ? 'text-white/85' : 'text-[#4A4440]'}`}>
                    {formatRupees(product.price)}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2.5 pb-0.5">
                  <span
                    className={`font-display text-[9px] sm:text-[9.5px] uppercase tracking-[0.06em] whitespace-nowrap ${
                      isActive ? 'text-white/90' : 'text-[#4A4440]'
                    }`}
                  >
                    {label}
                  </span>
                  <CornerDownRight
                    className={`w-3.5 h-3.5 stroke-[1.25] transition-transform duration-300 group-hover:translate-x-0.5 ${
                      isActive ? 'text-white' : 'text-[#4A4440]'
                    }`}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default NewArrivals;
