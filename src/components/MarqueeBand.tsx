import React from 'react';

/**
 * Two-word phrases: first word renders white, second in soft peach,
 * reproducing the alternating rhythm of the reference band.
 */
const PHRASES: [string, string][] = [
  ['Handmade', 'Soaps'],
  ['Organic', 'Skincare'],
  ['Artisan', 'Pottery'],
  ['Handloom', 'Fabrics'],
  ['Bamboo', 'Decor'],
  ['Silver', 'Jewelry'],
  ['Cold-Pressed', 'Oils'],
  ['Herbal', 'Teas'],
  ['Soy', 'Candles'],
];

const PhraseRun: React.FC<{ hidden?: boolean }> = ({ hidden }) => (
  <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
    {PHRASES.map(([first, second]) => (
      <span key={first + second} className="flex items-center whitespace-nowrap pr-[0.32em]">
        <span className="text-white">{first}</span>
        <span className="pl-[0.28em] text-[#FFC8B8]">{second}</span>
      </span>
    ))}
  </div>
);

export const MarqueeBand: React.FC = () => {
  return (
    <section
      id="marquee-band-section"
      aria-label="What you'll find on ChillyFlakes"
      className="bg-[#FAF7F2] pt-0 pb-6 sm:pb-8 overflow-hidden"
    >
      <div className="marquee-band relative bg-[#FB5A3C] py-3 sm:py-4 shadow-[0_10px_30px_-18px_rgba(200,60,30,0.6)]">
        <div
          className="marquee-track flex w-max font-marquee font-extrabold leading-none tracking-[-0.02em] text-[40px] sm:text-[56px] lg:text-[64px]"
          style={{ ['--marquee-duration' as string]: '42s' }}
        >
          <PhraseRun />
          <PhraseRun hidden />
        </div>
      </div>
    </section>
  );
};

export default MarqueeBand;
