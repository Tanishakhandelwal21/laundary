
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, Check, Clock, Shield, Users, Shirt, Zap, Building2, Droplets, Package, TrendingUp, Menu, X, Heart, Hotel, Settings, Briefcase, Globe, BarChart, Handshake, ChevronRight, Lightbulb, Factory, Tag, Ruler, KeyRound, HandHelping, Utensils, TShirt } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// --- DEFINITIVE COLOR PALETTE ---
const MINT_BG = '#BBE7D0'; 
const DEEP_CHARCOAL = 'rgb(17, 24, 39)'; // Tailwind gray-900
const GREY_LIGHT = '#E8E6E6';
const MINT_ACCENT_LIGHT = '#D5EEE0'; 

// --- STATIC DATA DEFINITIONS (Simplified for final paths) ---
const servicesData = [
    { title: 'COMMERCIAL LAUNDRY SERVICES', description: 'High-volume, fast-turnaround for hotels, motels, resorts.', imagePath: '/assets/commercial laundry service.png' },
    { title: 'LINEN HIRE & RENTAL', description: 'Clean, pressed linen delivered on your schedule; replacement of worn items included.', imagePath: '/assets/linen hire and rental for services section.png' },
    { title: 'UNIFORM & APPAREL CLEANING', description: 'Corporate/industrial/healthcare staff garments; tagging & segregation.', imagePath: '/assets/uniform apparel.png' },
    { title: 'CUSTOMER-OWNED GOODS (COG)', description: 'Per-kilo or per-piece cleaning of your own inventory; express options.', imagePath: '/assets/customer owned goods for services section.png' },
    { title: 'SPECIALTY & EVENT LINEN', description: 'Napery, tablecloths, bedding packages for events.', imagePath: '/assets/speciality and event.png' } 
];
  
const industriesData = {
    hospitalityImagePath: '/assets/hospitality img.png',
    healthcareImagePath: '/assets/healthcare img.png',
    heroSectionImagePath: '/assets/hero section img.png',
};

const pricingRental = [
    { product: 'King Sheets', price: 'from $2.25' }, { product: 'Queen Sheets', price: 'from $2.05' },
    { product: 'Single Sheets', price: 'from $1.95' }, { product: 'Bath Towels', price: 'from $1.50' },
    { product: 'Tea Towels', price: 'from $1.10' }, { product: 'Pillowcases', price: 'from $1.05' },
    { product: 'Bath Mats', price: 'from $0.90' }, { product: 'Hand Towels', price: 'from $0.80' },
    { product: 'Face Washers', price: 'from $0.75' }
];

const whyIlsFeatures = [
    { title: 'Electrolux Machinery', microcopy: 'Our state-of-the-art European machines provide best-in-class performance with exceptional water and energy efficiency.' },
    { title: 'Experience-Driven', microcopy: 'We know the industry inside-out because we\'re part of it.' },
    { title: 'Flexible Service Models', microcopy: 'Linen hire or COG, on-demand or scheduled – we work your way.' },
    { title: 'Trial & Sample Pickups Available', microcopy: 'Try us before you commit.' },
    { title: 'Sustainability-Focused', microcopy: 'Our machines and processes are designed to reduce consumption and environmental impact.' },
];
// -------------------------------------------------------------

function LandingPage() {
  const navigate = useNavigate();

  const [contactForm, setContactForm] = useState({ 
    name: '', email: '', phone: '', message: '', company: '', address: ''
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if(el) {
      setMobileMenuOpen(false); 
      const y = el.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    console.log('Quote form submitted:', contactForm);
    setSubmitStatus('success');
    setContactForm({ 
        name: '', email: '', phone: '', message: '', company: '', address: ''
    });
    setTimeout(() => setSubmitStatus(''), 3000);
  };
  
  const handleLoginClick = () => {
    window.location.href = 'https://infinitelaundrysolutions.com.au/login';
  };

  // Helper component for the bold typography style matching the screenshot
  const HeadingStyle = ({ children, style = {} }) => (
    <span 
      style={{ 
        color: DEEP_CHARCOAL, 
        borderBottom: `8px solid ${DEEP_CHARCOAL}`, 
        paddingBottom: '0.75rem', 
        ...style 
      }} 
      className="inline-block"
    >
      {children}
    </span>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar (Header) */}
      <nav className="fixed top-0 w-full bg-white shadow-md z-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center h-24">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <img src="/assets/logo.png" alt="Infinite Laundry Solutions" className="h-20 w-auto" />
            </div>
            
            {/* Desktop Navigation Links and Login Button */}
            <div className="hidden lg:flex items-center gap-8">
              <a onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">Home</a>
              <a onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">About</a>
              <a onClick={() => scrollToSection('services')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">Services</a>
              <a onClick={() => scrollToSection('industries')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">Industries we Serve</a>
              <a onClick={() => scrollToSection('prices')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">Our Prices</a>
              <a onClick={() => scrollToSection('why')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">Why Us?</a>
              <a onClick={() => scrollToSection('quote')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium">Contact Us</a> 
              
              {/* Login Button */}
              <Button 
                onClick={handleLoginClick} 
                className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-full px-6 text-base font-medium shadow-md transition-colors"
                data-testid="nav-login-btn"
              >
                Login
              </Button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <Button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} variant="ghost">
                {mobileMenuOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-24 left-0 w-full bg-white shadow-lg py-4 border-t border-gray-200" data-testid="mobile-menu">
              <div className="flex flex-col space-y-3 px-8">
                <a onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-gray-900 font-medium py-2">Home</a>
                <a onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-gray-900 font-medium py-2">About</a>
                <a onClick={() => scrollToSection('services')} className="text-gray-700 hover:text-gray-900 font-medium py-2">Services</a>
                <a onClick={() => scrollToSection('industries')} className="text-gray-700 hover:text-gray-900 font-medium py-2">Industries we Serve</a>
                <a onClick={() => scrollToSection('prices')} className="text-gray-700 hover:text-gray-900 font-medium py-2">Our Prices</a>
                <a onClick={() => scrollToSection('why')} className="text-gray-700 hover:text-gray-900 font-medium py-2">Why Us?</a>
                <a onClick={() => scrollToSection('quote')} className="text-gray-700 hover:text-gray-900 font-medium py-2">Contact Us</a>
                <Button onClick={handleLoginClick} className="bg-gray-800 hover:bg-gray-700 text-white rounded-full w-full mt-4">Login</Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* --- */}
      
      {/* Hero Section - MINT Background (Guaranteed Color and Image) */}
      <section id="home" style={{backgroundColor: MINT_BG}} className="pt-32 pb-20 px-8 relative overflow-hidden h-[60vh] sm:h-[70vh]"> {/* Added fixed height for image to show */}
        {/* Background Image Element - Using the exact file path */}
        <div className="absolute inset-0 z-0">
            <img 
                src={industriesData.heroSectionImagePath} 
                alt="Clean stacked laundry" 
                className="w-full h-full object-cover opacity-30" // Use low opacity to allow text readability
            />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Hero Banner Box - Matching the light accent box inside the mint section */}
          <div style={{backgroundColor: MINT_ACCENT_LIGHT}} className="rounded-xl p-6 sm:p-12 text-center max-w-5xl mx-auto shadow-xl">
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800">Professional Laundry Services</span>
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800">Professional Laundry Services</span>
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800">Professional Laundry Services</span>
            </div>

            <div className="grid lg:grid-cols-2 items-center text-left gap-8">
                <div>
                    <h1 style={{color: DEEP_CHARCOAL, fontSize: '4rem'}} className="font-black leading-none mb-4">
                        Exceptional<br/>Laundry Care
                    </h1>
                </div>
                <div className="lg:text-right text-base md:text-lg leading-relaxed space-y-4">
                    <p style={{color: DEEP_CHARCOAL}}>
                        Your premium laundry solution for hospitality and healthcare industries.
                    </p>
                    <Button 
                        onClick={() => scrollToSection('services')}
                        className="bg-white hover:bg-gray-100 text-gray-800 px-8 py-4 rounded-full text-lg font-semibold shadow-md transition-colors border-2 border-gray-800"
                    >
                        Discover More <ChevronRight className="w-5 h-5 inline ml-1"/>
                    </Button>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* About ILS Section - MINT Background */}
      <section id="about" style={{backgroundColor: MINT_BG}} className="py-20 px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black mb-8">
                <HeadingStyle>About ILS</HeadingStyle>
              </h2>
              <p className="text-gray-800 text-base sm:text-lg leading-relaxed">
                Born from the success of Infinite Asset Solutions, Infinite Laundry Solutions was created to solve a growing need we saw firsthand—dependable, quality-driven laundry services for the hospitality and healthcare sectors. As long-time operators in motel and commercial venue management, we understand what's at stake when it comes to clean, timely linen delivery.
              </p>
            </div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black mb-8">
                <HeadingStyle>Our Mission</HeadingStyle>
              </h2>
              <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-12">
                To deliver commercial laundry solutions with precision, reliability, and care—helping our clients focus on what they do best.
              </p>
              <h3 className="text-3xl sm:text-4xl font-black mb-8">
                <HeadingStyle>Our Values</HeadingStyle>
              </h3>
              <div className="flex flex-col items-center">
                
                {/* 1. Icon Strip Image */}
                <div className="w-full max-w-lg">
                    <img src="/assets/reliability innovation care img.png" alt="Value Icons Strip" className="w-full h-auto object-contain" />
                </div>
                
                {/* 2. Text Labels (Manually spaced to align with image sections) */}
                <div style={{color: DEEP_CHARCOAL}} className="w-full max-w-lg flex justify-between mt-2 text-center text-xs font-bold">
                    <p className="w-[20%]">Quality</p>
                    <p className="w-[20%]">Transparency</p>
                    <p className="w-[20%]">Reliability</p>
                    <p className="w-[20%]">Innovation</p>
                    <p className="w-[20%]">Care</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Services Section - MINT Background (Using Local Image Paths) */}
      <section id="services" style={{backgroundColor: MINT_BG}} className="py-20 px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-8">
            <HeadingStyle>Services</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-16 max-w-5xl">
            Clean linen shouldn't be a luxury—it should be the standard. At Infinite Laundry Solutions, we offer a range of services designed to meet the specific demands of busy venues across Queensland.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {servicesData.map((service, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-lg transition-shadow border-t-4 border-white/0 hover:border-gray-800">
                    <div className="text-gray-900 mb-4 sm:mb-6">
                        {/* Using local image path */}
                        <img 
                            src={service.imagePath} 
                            alt={`${service.title} Icon`}
                            className="w-16 h-16 mx-auto object-contain"
                        />
                    </div>
                    <h3 className="text-xs sm:text-sm font-black uppercase mb-3 tracking-wide text-gray-900">{service.title}</h3>
                    <p className="text-xs text-gray-700 leading-snug">{service.description}</p>
                </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* --- */}

      {/* Industries Section - MINT Background (Using Local Image Paths) */}
      <section id="industries" style={{backgroundColor: MINT_BG}} className="py-20 px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-8">
            <HeadingStyle>Industries We Serve</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-16 max-w-4xl">
            We understand the unique needs of every industry we serve. Whether you're welcoming guests, caring for patients, or feeding the masses, you need clean, dependable linen—and fast.
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Hospitality Tile */}
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg transition-shadow border-t-4 border-white/0 hover:border-gray-800">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 flex items-center justify-center">
                 {/* Using local image path for specific line art icon */}
                <img src={industriesData.hospitalityImagePath} alt="Hospitality Icon" className="w-20 h-20 object-contain"/>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Hospitality</h3>
              <p className="text-base sm:text-lg text-gray-800">Hotels, Motels, Resorts, Short-Term Rentals</p>
            </div>
            {/* Healthcare Tile */}
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg transition-shadow border-t-4 border-white/0 hover:border-gray-800">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 flex items-center justify-center">
                 {/* Using local image path for specific line art icon */}
                <img src={industriesData.healthcareImagePath} alt="Healthcare Icon" className="w-20 h-20 object-contain"/>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Healthcare</h3>
              <p className="text-base sm:text-lg text-gray-800">Clinics, Medical Centres, Aged Care Homes</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-8 sm:p-10 text-center max-w-3xl mx-auto shadow-lg border-2 border-gray-800">
            <p className="text-gray-900 font-black text-xl mb-3">Don't see your industry?</p>
            <p className="text-gray-800 text-lg mb-6">Let's chat – we tailor our services to you.</p>
            <Button 
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-md transition-colors"
              onClick={() => scrollToSection('quote')}
            >
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Prices Section - MINT Background */}
      <section id="prices" style={{backgroundColor: MINT_BG}} className="py-20 px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-8">
            <HeadingStyle>Our Prices</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-16 max-w-5xl">
            At Infinite Laundry Solutions, we believe in transparent, tailored pricing that suits the unique needs of your business.
          </p>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-lg border-t-8 border-gray-800">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-12 h-12 flex-shrink-0">
                    {/* Using Linen Rental image for Pricing Section */}
                    <img src="/assets/linen rental service.png" alt="Linen Rental Icon" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 uppercase">Linen Rental Services</h3>
              </div>
              <p className="text-gray-700 text-sm sm:text-base mb-8 leading-relaxed">
                Perfect for businesses looking for a hassle-free solution. Our pricing includes laundering, drying and replacement of worn items—ideal for hospitality and healthcare settings.
              </p>
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b-4 border-gray-900 font-black text-sm">
                  <div className='text-gray-900'>Product</div>
                  <div className="text-right text-gray-900">Pricing (ex. GST)</div>
                </div>
                {pricingRental.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 py-3 border-b border-gray-300 last:border-b-0">
                    <div className="text-gray-700 text-sm">{item.product}</div>
                    <div className="text-right font-bold italic" style={{color: DEEP_CHARCOAL, opacity: 0.75}}>{item.price}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-lg border-t-8 border-gray-800">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-12 h-12 flex-shrink-0">
                    {/* Using COG image for Pricing Section */}
                    <img src="/assets/COG services under prices section.png" alt="COG Icon" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 uppercase">Customer-Owned Goods (COG) Services</h3>
              </div>
              <p className="text-gray-700 text-sm sm:text-base mb-10 leading-relaxed">
                Already have your own linen? No problem. We offer competitive per-kilo or per-piece pricing for cleaning and return of your linen, with options for express turnaround and volume discounts.
              </p>
              <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-gray-800 shadow-md">
                <p className="text-gray-900 font-black text-lg mb-5">For a custom quote based on your needs, please click here. We tailor to your needs!!</p>
                <Button 
                  className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-md transition-colors"
                  onClick={() => scrollToSection('quote')}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Why ILS? Section - MINT Background */}
      <section id="why" style={{backgroundColor: MINT_BG}} className="py-20 px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-16">
            <HeadingStyle>Why ILS?</HeadingStyle>
          </h2>
          <div className="grid md:grid-cols-2 gap-12 mb-16 items-start">
            <div className="space-y-4">
              <p className="text-gray-800 text-base sm:text-lg leading-relaxed">
                We've built Infinite Laundry Solutions on a foundation of industry knowledge, operational excellence, and next-generation technology. With premium Electrolux machines and sustainable practices at our core, we deliver more than clean linen—we deliver peace of mind.
              </p>
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-800">
                <p className="text-gray-900 font-semibold text-sm">Sustainability Footnote:</p>
                <p className="text-xs text-gray-700 mt-1">We prioritize water and energy efficiency in our machinery and use environmentally friendly detergents, actively supporting linen reuse programs.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-gray-800">
              {/* Using image from the assets folder for the Why ILS visual */}
              <img src="/assets/Home-About-1.jpg" alt="Stacked towels" className="w-full h-64 sm:h-80 object-cover" />
            </div>
          </div>
          <div className="space-y-8 max-w-5xl mx-auto">
            {whyIlsFeatures.map((feature, index) => {
                return (
                    <div key={index} className="border-b-2 border-gray-400 pb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-8">
                            <h3 className="text-xl sm:text-2xl font-black text-gray-900 flex-1 flex items-center">
                                {feature.title}
                            </h3>
                            <p className="text-gray-800 text-base sm:text-lg flex-1 text-left sm:text-right">
                                {feature.microcopy}
                            </p>
                        </div>
                    </div>
                );
            })}
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Service Areas Section - MINT Background */}
      <section className="py-20 px-8" style={{backgroundColor: MINT_BG}}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-8">
            <HeadingStyle>Our Service Areas</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-12 max-w-4xl">
            We're proud to support businesses across Queensland with reliable, efficient linen and laundry services. From bustling city hotels to coastal clinics, our reach is growing fast.
          </p>
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-6">Currently Serving:</h3>
              <p className="text-lg sm:text-xl font-bold text-gray-900">Brisbane | Gold Coast | Sunshine Coast & Surrounding Suburbs</p>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-6">Expanding Soon to:</h3>
              <p className="text-lg sm:text-xl font-bold text-gray-900">Sydney | Newcastle | Hunter Region</p>
            </div>
          </div>
          <p className="text-gray-800 text-base sm:text-lg mb-8">
            Explore the map below to see if we service your area—or click the button for clean linen!!
          </p>
          
          {/* EMBEDDED MAP IFRAME */}
          <div className="bg-white rounded-2xl p-4 h-96 flex items-center justify-center mb-10 shadow-lg border-2 border-gray-800 overflow-hidden">
            <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3535.1159799028533!2d152.92012437514364!3d-27.62092442316589!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b914955d9951729%3A0xb16876b4fb2bb3a!2s3%2F76%20Mica%20St%2C%20Carole%20Park%20QLD%204300%2C%20Australia!5e0!3m2!1sen!2sin!4v1761402560116!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          
          <div className="text-center">
            <Button 
              className="bg-white hover:bg-gray-100 text-gray-900 px-10 py-5 rounded-lg font-black text-lg sm:text-xl border-4 border-gray-900 shadow-md transition-colors"
              onClick={() => scrollToSection('quote')}
            >
              Get Clean Linen Now!
            </Button>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Get a Quote / Contact Form Section - MINT Background */}
      <section id="quote" style={{backgroundColor: MINT_BG}} className="py-20 px-8 border-t border-gray-300">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-12">
            <HeadingStyle>GET A QUOTE</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-12">
            Try Us Today. We offer trial services and sample pickups for eligible businesses. Let's show you what premium laundry service feels like. Whether you're a hotelier seeking consistent quality, a clinic in need of hygienic linen turnover, or a venue requiring last-minute support, we're ready to step in. With **Infinite Laundry Solutions**, you're not just choosing a provider—you're choosing a partner in cleanliness, care, and operational excellence.
          </p>
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-lg border-t-8 border-gray-900">
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Full Name <span className="text-red-500">*</span></label>
                  <Input 
                    value={contactForm.name} 
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})} 
                    required 
                    style={{backgroundColor: GREY_LIGHT}}
                    className="border-none h-12" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Phone <span className="text-red-500">*</span></label>
                  <Input 
                    value={contactForm.phone} 
                    onChange={(e) => setContactForm({...contactForm, phone: e.target.value})} 
                    required 
                    style={{backgroundColor: GREY_LIGHT}}
                    className="border-none h-12" 
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Company name</label>
                  <Input 
                    value={contactForm.company} 
                    onChange={(e) => setContactForm({...contactForm, company: e.target.value})} 
                    style={{backgroundColor: GREY_LIGHT}}
                    className="border-none h-12" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Property Address</label>
                  <Input 
                    value={contactForm.address} 
                    onChange={(e) => setContactForm({...contactForm, address: e.target.value})} 
                    style={{backgroundColor: GREY_LIGHT}}
                    className="border-none h-12" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Email <span className="text-red-500">*</span></label>
                <Input 
                  type="email" 
                  value={contactForm.email} 
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})} 
                  required 
                  style={{backgroundColor: GREY_LIGHT}}
                  className="border-none h-12" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Services Required / Message</label>
                <Textarea 
                  rows={5} 
                  value={contactForm.message} 
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})} 
                  style={{backgroundColor: GREY_LIGHT}}
                  className="border-none" 
                />
              </div>
              <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white py-5 rounded-lg font-bold text-lg shadow-md transition-colors">
                Submit Quote Request
              </Button>
              {submitStatus === 'success' && <p className="text-green-600 text-center font-bold text-lg">Message sent successfully! We'll be in touch soon.</p>}
            </form>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Footer - MINT Background (Matching screenshot aesthetic) */}
      <footer style={{backgroundColor: MINT_BG}} className="py-16 px-8 border-t-8 border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Column 1: Logo/Brand */}
            <div className="flex flex-col items-start gap-4">
              <img src="/assets/logo.png" alt="ILS Logo" className="h-16 w-auto" />
              <p className="text-lg font-black text-gray-900">Infinite Laundry Solutions</p>
            </div>

            {/* Column 2 & 3: Navigation and Contact Details (MATCHING FOOTER SCREENSHOT) */}
            <div className="col-span-2 grid grid-cols-2 gap-8">
                {/* 2A: Navigation Links */}
                <div className='space-y-2 pt-1'>
                    <a onClick={() => scrollToSection('home')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">Home</a>
                    <a onClick={() => scrollToSection('about')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">About</a>
                    <a onClick={() => scrollToSection('services')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">Services</a>
                    <a onClick={() => scrollToSection('industries')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">Industries We Serve</a>
                    <a onClick={() => scrollToSection('prices')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">Our Prices</a>
                    <a onClick={() => scrollToSection('why')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">Why Us?</a>
                    <a href="#" className="block text-gray-800 hover:text-gray-900 cursor-pointer text-base">Contact Us</a>
                </div>

                {/* 2B: Contact Details & CTA - APPLIED GREY BACKGROUND */}
                <div 
                    style={{ backgroundColor: GREY_LIGHT }} 
                    className='space-y-3 p-4 rounded-lg'
                >
                    <a href="tel:+61426159286" className="text-base font-black text-gray-900 block hover:text-gray-700">+61426159286</a>
                    <a href="mailto:info@infinitelaundrysolutions.com.au" className="text-base text-gray-800 block hover:text-gray-700">info@infinitelaundrysolutions.com.au</a>
                    <p className="text-base text-gray-800">3/76 Mica Street, Carole Park, QLD, 4300</p>
                    <Button 
                      className="bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-black text-sm border-2 border-gray-900 shadow-md transition-colors mt-4"
                      onClick={() => scrollToSection('quote')}
                    >
                      LETS CHAT!!
                    </Button>
                </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-400 mt-12 pt-8 text-center text-gray-700">
            <p className="text-sm sm:text-base">© 2025 Infinite Laundry Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- FINAL EXPORT ---
export default LandingPage;
