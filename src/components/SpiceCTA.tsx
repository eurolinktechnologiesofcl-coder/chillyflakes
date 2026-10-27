import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONTACT } from '../config/site';

/**
 * Full-bleed rounded CTA card on a macro chilli photograph, inspired by
 * bold produce-brand sites: oversized headline, letter-spaced subline, pill buttons.
 */
export const SpiceCTA: React.FC = () => {
  return (
    <section id="spice-cta-section" aria-labelledby="spice-cta-heading" className="bg-[#FAF7F2] px-3 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="group relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] sm:rounded-[44px] min-h-[440px] sm:min-h-[520px] lg:min-h-[560px] flex items-center justify-center isolate">
        {/* Photo */}
        <img
          src="/chilli-drops.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 -z-20 h-full w-full object-cover scale-[1.04] transition-transform duration-[2500ms] ease-out group-hover:scale-100"
        />
        {/* Warm tint + centre vignette for legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(70% 65% at 50% 50%, rgba(170,20,10,0.55) 0%, rgba(200,40,20,0.25) 55%, rgba(120,10,5,0.35) 100%), linear-gradient(180deg, rgba(255,80,40,0.18), rgba(120,10,0,0.25))',
          }}
        />

        <div className="relative px-6 py-16 text-center text-[#FBF5EC]">
          <h2
            id="spice-cta-heading"
            className="font-marquee font-black leading-[0.86] tracking-[-0.035em] text-[64px] sm:text-[112px] lg:text-[148px] drop-shadow-[0_6px_30px_rgba(90,0,0,0.25)]"
          >
            Let&apos;s spice
            <br />
            things up
          </h2>

          <p className="mx-auto mt-6 sm:mt-8 max-w-[300px] sm:max-w-[360px] font-condensed text-[12px] sm:text-[13px] uppercase leading-[1.7] tracking-[0.2em] text-[#FBF5EC]/95">
            Seller onboarding, bulk &amp; wholesale orders, or general questions.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              id="spice-cta-become-seller"
              to="/vendor/register"
              className="rounded-full bg-[#FBF5EC] px-7 py-3 font-condensed text-[12.5px] uppercase tracking-[0.18em] text-[#E2452A] shadow-[0_8px_24px_-10px_rgba(80,0,0,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              Become a seller
            </Link>
            <a
              id="spice-cta-email"
              href={`mailto:${SITE_CONTACT.supportEmail}`}
              className="rounded-full border border-[#FBF5EC]/90 px-7 py-3 font-condensed text-[12.5px] uppercase tracking-[0.18em] text-[#FBF5EC] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FBF5EC] hover:text-[#E2452A]"
            >
              Email us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpiceCTA;
