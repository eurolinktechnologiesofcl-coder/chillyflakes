import React, { useEffect } from 'react';
import { HeroSection } from '../components/HeroSection';
import { ShopByCategory } from '../components/ShopByCategory';
import { FeaturedProducts } from '../components/FeaturedProducts';
import { ServicesSection } from '../components/ServicesSection';
import { WhyChooseUs } from '../components/WhyChooseUs';
import { useStore } from '../context/StoreContext';

export const HomePage: React.FC = () => {
  const { setSelectedCategory } = useStore();

  useEffect(() => {
    setSelectedCategory('All');
  }, [setSelectedCategory]);

  return (
    <>
      {/* 1. Hero Section: Natural Products Handmade with Love */}
      <HeroSection />

      {/* 2. Shop by Category: 8 Circular Categories */}
      <ShopByCategory />

      {/* 3. Featured Products: Best-selling Handcrafted Goods */}
      <FeaturedProducts />

      {/* 4. Our Services: Skilled Community Professionals */}
      <ServicesSection />

      {/* 5. Why Choose ChillyFlakes: 5 Trust Badges */}
      <WhyChooseUs />
    </>
  );
};

export default HomePage;
