import React from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Stats from '../components/landing/Stats';
import Features from '../components/landing/Features';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';


export default function Landing() {
  return (
    <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}