






//checked
import React, { useState } from 'react';
import { Phone, Mail, MapPin, Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Define color palette
const MINT_BG = '#BBE7D0';
const DEEP_CHARCOAL = 'rgb(17, 24, 39)';
const GREY_LIGHT = '#E8E6E6';
const MINT_ACCENT_LIGHT = '#D5EEE0';

// Import images - CORRECTED PATHS
const heroImage = '/assets/hero section img.png';
const valuesImage = '/assets/reliability innovation care img.png';
const serviceImage1 = '/assets/commercial laundry service.png';
const serviceImage2 = '/assets/linen hire and rental for services section.png';
const serviceImage3 = '/assets/uniform apparel.png';
const serviceImage4 = '/assets/customer owned goods for services section.png';
const serviceImage5 = '/assets/speciality and event.png';
const industryHospitality = '/assets/hospitality img.png';
const industryHealthcare = '/assets/healthcare img.png';
const priceLinenRental = '/assets/linen rental service.png';
const priceCOG = '/assets/COG services under prices section.png';
const whyIlsImage = '/assets/Home-About-1.jpg';

const servicesData = [
  { title: 'COMMERCIAL LAUNDRY SERVICES', description: 'High-volume, fast-turnaround for hotels, motels, resorts.', image: serviceImage1 },
  { title: 'LINEN HIRE & RENTAL', description: 'Clean, pressed linen delivered on your schedule; replacement of worn items included.', image: serviceImage2 },
  { title: 'UNIFORM & APPAREL CLEANING', description: 'Corporate/industrial/healthcare staff garments; tagging & segregation.', image: serviceImage3 },
  { title: 'CUSTOMER-OWNED GOODS (COG)', description: 'Per-kilo or per-piece cleaning of your own inventory; express options.', image: serviceImage4 },
  { title: 'SPECIALTY & EVENT LINEN', description: 'Napery, tablecloths, bedding packages for events.', image: serviceImage5 }
];

const pricingRental = [
  { product: 'King Sheets', price: 'from $2.25' },
  { product: 'Queen Sheets', price: 'from $2.05' },
  { product: 'Single Sheets', price: 'from $1.95' },
  { product: 'Bath Towels', price: 'from $1.50' },
  { product: 'Tea Towels', price: 'from $1.10' },
  { product: 'Pillowcases', price: 'from $1.05' },
  { product: 'Bath Mats', price: 'from $0.90' },
  { product: 'Hand Towels', price: 'from $0.80' },
  { product: 'Face Washers', price: 'from $0.75' }
];

const whyIlsFeatures = [
  { title: 'Electrolux Machinery', microcopy: 'Our state-of-the-art European machines provide best-in-class performance with exceptional water and energy efficiency.' },
  { title: 'Experience-Driven', microcopy: 'We know the industry inside-out because we are part of it.' },
  { title: 'Flexible Service Models', microcopy: 'Linen hire or COG, on-demand or scheduled – we work your way.' },
  { title: 'Trial & Sample Pickups Available', microcopy: 'Try us before you commit.' },
  { title: 'Sustainability-Focused', microcopy: 'Our machines and processes are designed to reduce consumption and environmental impact.' }
];

function LandingPage() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '', company: '', address: '' });
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

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('sending');
    
    try {
      // Combine company and address into the message if they exist
      let fullMessage = contactForm.message;
      if (contactForm.company) {
        fullMessage = `Company: ${contactForm.company}\n${fullMessage}`;
      }
      if (contactForm.address) {
        fullMessage = `Address: ${contactForm.address}\n${fullMessage}`;
      }
      
      const response = await fetch('https://api.infinitelaundrysolutions.com.au/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          message: fullMessage
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setContactForm({ name: '', email: '', phone: '', message: '', company: '', address: '' });
        setTimeout(() => setSubmitStatus(''), 5000);
      } else {
        setSubmitStatus('error');
        setTimeout(() => setSubmitStatus(''), 5000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(''), 5000);
    }
  };

  const handleLoginClick = () => {
    window.location.href = 'https://infinitelaundrysolutions.com.au/login';
  };

  const HeadingStyle = ({ children, style = {} }) => (
    <span style={{ color: DEEP_CHARCOAL, borderBottom: `8px solid ${DEEP_CHARCOAL}`, paddingBottom: '0.75rem', ...style }} className="inline-block">
      {children}
    </span>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full shadow-md z-50" style={{backgroundColor: MINT_BG}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex justify-between items-center h-20 sm:h-24">
            <div className="flex items-center gap-2 sm:gap-4">
              <img src="/assets/logo.png" alt="Infinite Laundry Solutions" className="h-14 sm:h-20 w-auto" />
            </div>
            
            <div className="hidden lg:flex items-center gap-6 xl:gap-8">
              <a onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">Home</a>
              <a onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">About</a>
              <a onClick={() => scrollToSection('services')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">Services</a>
              <a onClick={() => scrollToSection('industries')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">Industries we Serve</a>
              <a onClick={() => scrollToSection('prices')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">Our Prices</a>
              <a onClick={() => scrollToSection('why')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">Why Us?</a>
              <a onClick={() => scrollToSection('quote')} className="text-gray-700 hover:text-gray-900 cursor-pointer font-medium text-sm xl:text-base">Contact Us</a>
              
              <Button onClick={handleLoginClick} className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-full px-4 xl:px-6 text-sm xl:text-base font-medium shadow-md transition-colors">
                Login
              </Button>
            </div>
            
            <div className="lg:hidden flex items-center gap-2">
              <Button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} variant="ghost" size="sm">
                {mobileMenuOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
              </Button>
            </div>
          </div>
          
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-20 sm:top-24 left-0 w-full shadow-lg py-4 border-t border-gray-200" style={{backgroundColor: MINT_BG}}>
              <div className="flex flex-col space-y-3 px-4 sm:px-8">
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

      {/* Hero Section */}
      <section id="home" style={{backgroundColor: MINT_BG}} className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-8 relative overflow-hidden min-h-[500px] sm:min-h-[60vh]">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="Clean stacked laundry" className="w-full h-full object-cover opacity-60" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div style={{backgroundColor: MINT_ACCENT_LIGHT}} className="rounded-xl p-6 sm:p-12 text-center max-w-5xl mx-auto shadow-xl">
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800">Professional Laundry Services</span>
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800 hidden sm:inline">Professional Laundry Services</span>
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800 hidden md:inline">Professional Laundry Services</span>
            </div>

            <div className="grid lg:grid-cols-2 items-center text-left gap-6 sm:gap-8">
              <div>
                <h1 style={{color: DEEP_CHARCOAL}} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight mb-4">
                  Exceptional<br/>Laundry Care
                </h1>
              </div>
              <div className="lg:text-right text-sm sm:text-base md:text-lg leading-relaxed space-y-4">
                <p style={{color: DEEP_CHARCOAL}} className="mb-6">
                  Your premium laundry solution for hospitality and healthcare industries.
                </p>
                <Button onClick={() => scrollToSection('services')} className="bg-white hover:bg-gray-100 text-gray-800 px-6 sm:px-8 py-3 rounded-full text-base sm:text-lg font-semibold shadow-md transition-colors border-2 border-gray-800">
                  Discover More <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 inline ml-1"/>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* About Section */}
      <section id="about" style={{backgroundColor: MINT_BG}} className="py-12 sm:py-20 px-4 sm:px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-16">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 sm:mb-8">
                <HeadingStyle>About ILS</HeadingStyle>
              </h2>
              <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed">
                Born from the success of Infinite Asset Solutions, Infinite Laundry Solutions was created to solve a growing need we saw firsthand—dependable, quality-driven laundry services for the hospitality and healthcare sectors. As long-time operators in motel and commercial venue management, we understand what's at stake when it comes to clean, timely linen delivery.
              </p>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 sm:mb-8">
                <HeadingStyle>Our Mission</HeadingStyle>
              </h2>
              <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed mb-8 sm:mb-12">
                To deliver commercial laundry solutions with precision, reliability, and care—helping our clients focus on what they do best.
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-6 sm:mb-8">
                <HeadingStyle>Our Values</HeadingStyle>
              </h3>
              <div className="flex flex-col items-center">
                <div className="w-full max-w-lg">
                  <img src={valuesImage} alt="Value Icons Strip" className="w-full h-auto object-contain" />
                </div>
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

      {/* Services Section */}
      <section id="services" style={{backgroundColor: MINT_BG}} className="py-12 sm:py-20 px-4 sm:px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 sm:mb-8">
            <HeadingStyle>Services</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed mb-12 sm:mb-16 max-w-5xl">
            Clean linen shouldn't be a luxury—it should be the standard. At Infinite Laundry Solutions, we offer a range of services designed to meet the specific demands of busy venues across Queensland. From small boutique stays to large medical facilities, we provide scalable, stress-free laundry and linen solutions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            {servicesData.map((service, index) => (
              <div 
                key={index} 
                className={`${index % 2 === 1 ? 'bg-gray-600 text-white' : 'bg-white'} rounded-2xl p-6 sm:p-8 text-center shadow-lg hover:shadow-xl transition-shadow`}
              >
                <div className="mb-4 sm:mb-6">
                  <img src={service.image} alt={`${service.title} Icon`} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full object-cover shadow-md" />
                </div>
                <h3 className={`text-xs sm:text-sm font-black uppercase mb-3 sm:mb-4 tracking-wide ${index % 2 === 1 ? 'text-white' : 'text-gray-900'}`}>
                  {service.title}
                </h3>
                <p className={`text-xs leading-relaxed ${index % 2 === 1 ? 'text-gray-200' : 'text-gray-700'}`}>
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" style={{backgroundColor: MINT_BG}} className="py-12 sm:py-20 px-4 sm:px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 sm:mb-8">
            <HeadingStyle>Industries We Serve</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed mb-12 sm:mb-16 max-w-4xl">
            We understand the unique needs of every industry we serve. Whether you're welcoming guests, caring for patients, or feeding the masses, you need clean, dependable linen—and fast.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-12 sm:mb-16">
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg transition-shadow border-t-4 border-white/0 hover:border-gray-800">
              <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto mb-6 flex items-center justify-center">
                <img src={industryHospitality} alt="Hospitality Icon" className="w-full h-full object-contain"/>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Hospitality</h3>
              <p className="text-base sm:text-lg text-gray-800">Hotels, Motels, Resorts, Short-Term Rentals</p>
            </div>
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg transition-shadow border-t-4 border-white/0 hover:border-gray-800">
              <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto mb-6 flex items-center justify-center">
                <img src={industryHealthcare} alt="Healthcare Icon" className="w-full h-full object-contain"/>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Healthcare</h3>
              <p className="text-base sm:text-lg text-gray-800">Clinics, Medical Centres, Aged Care Homes</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 text-center max-w-3xl mx-auto shadow-lg border-2 border-gray-800">
            <p className="text-gray-900 font-black text-lg sm:text-xl mb-3">Don't see your industry?</p>
            <p className="text-gray-800 text-base sm:text-lg mb-6">Let's chat – we tailor our services to you.</p>
            <Button className="bg-gray-800 hover:bg-gray-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-md transition-colors" onClick={() => scrollToSection('quote')}>
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Prices Section */}
      <section id="prices" style={{backgroundColor: MINT_BG}} className="py-12 sm:py-20 px-4 sm:px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 sm:mb-8">
            <HeadingStyle>Our Prices</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed mb-12 sm:mb-16 max-w-5xl">
            At Infinite Laundry Solutions, we believe in transparent, tailored pricing that suits the unique needs of your business.
          </p>
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
            <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 shadow-lg border-t-8 border-gray-800">
              <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                  <img src={priceLinenRental} alt="Linen Rental Icon" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 uppercase">Linen Rental Services</h3>
              </div>
              <p className="text-gray-700 text-xs sm:text-sm lg:text-base mb-6 sm:mb-8 leading-relaxed">
                Perfect for businesses looking for a hassle-free solution. Our pricing includes laundering, drying and replacement of worn items—ideal for hospitality and healthcare settings.
              </p>
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b-4 border-gray-900 font-black text-xs sm:text-sm">
                  <div className='text-gray-900'>Product</div>
                  <div className="text-right text-gray-900">Pricing (ex. GST)</div>
                </div>
                {pricingRental.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 py-3 border-b border-gray-300 last:border-b-0">
                    <div className="text-gray-700 text-xs sm:text-sm">{item.product}</div>
                    <div className="text-right font-bold italic text-xs sm:text-sm" style={{color: DEEP_CHARCOAL, opacity: 0.75}}>{item.price}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 shadow-lg border-t-8 border-gray-800">
              <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                  <img src={priceCOG} alt="COG Icon" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 uppercase">Customer-Owned Goods (COG) Services</h3>
              </div>
              <p className="text-gray-700 text-xs sm:text-sm lg:text-base mb-8 sm:mb-10 leading-relaxed">
                Already have your own linen? No problem. We offer competitive per-kilo or per-piece pricing for cleaning and return of your linen, with options for express turnaround and volume discounts.
              </p>
              <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-gray-800 shadow-md">
                <p className="text-gray-900 font-black text-base sm:text-lg mb-5">For a custom quote based on your needs, please click here. We tailor to your needs!!</p>
                <Button className="bg-gray-800 hover:bg-gray-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-md transition-colors" onClick={() => scrollToSection('quote')}>
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why ILS Section */}
      <section id="why" style={{backgroundColor: MINT_BG}} className="py-12 sm:py-20 px-4 sm:px-8 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-12 sm:mb-16">
            <HeadingStyle>Why ILS?</HeadingStyle>
          </h2>
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-16 items-start">
            <div className="space-y-4">
              <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed">
                We've built Infinite Laundry Solutions on a foundation of industry knowledge, operational excellence, and next-generation technology. With premium Electrolux machines and sustainable practices at our core, we deliver more than clean linen—we deliver peace of mind.
              </p>
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-800">
                <p className="text-gray-900 font-semibold text-sm">Sustainability Footnote:</p>
                <p className="text-xs text-gray-700 mt-1">We prioritize water and energy efficiency in our machinery and use environmentally friendly detergents, actively supporting linen reuse programs.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-gray-800">
              <img src={whyIlsImage} alt="Stacked towels" className="w-full h-56 sm:h-64 lg:h-80 object-cover" />
            </div>
          </div>
          <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
            {whyIlsFeatures.map((feature, index) => (
              <div key={index} className="border-b-2 border-gray-400 pb-6">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-800 text-sm sm:text-base lg:text-lg">
                    {feature.microcopy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-8" style={{backgroundColor: MINT_BG}}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 sm:mb-8">
            <HeadingStyle>Our Service Areas</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed mb-8 sm:mb-12 max-w-4xl">
            We're proud to support businesses across Queensland with reliable, efficient linen and laundry services. From bustling city hotels to coastal clinics, our reach is growing fast.
          </p>
          <div className="grid sm:grid-cols-2 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 mb-4 sm:mb-6">Currently Serving:</h3>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Brisbane | Gold Coast | Sunshine Coast & Surrounding Suburbs</p>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 mb-4 sm:mb-6">Expanding Soon to:</h3>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Sydney | Newcastle | Hunter Region</p>
            </div>
          </div>
          <p className="text-gray-800 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8">
            Explore the map below to see if we service your area—or click the button for clean linen!!
          </p>
          
          <div className="bg-white rounded-2xl p-2 sm:p-4 h-64 sm:h-80 lg:h-96 flex items-center justify-center mb-8 sm:mb-10 shadow-lg border-2 border-gray-800 overflow-hidden">
            <iframe
              title="Infinite Laundry Solutions - Service Area"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3535.1159799028533!2d152.92012437514364!3d-27.62092442316589!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b914955d9951729%3A0xb16876b4fb2bb3a!2s3%2F76%20Mica%20St%2C%20Carole%20Park%20QLD%204300%2C%20Australia!5e0!3m2!1sen!2sin!4v1761402560116!5m2!1sen!2sin"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          
          <div className="text-center">
            <Button className="bg-white hover:bg-gray-100 text-gray-900 px-8 sm:px-10 py-4 sm:py-5 rounded-lg font-black text-base sm:text-lg lg:text-xl border-4 border-gray-900 shadow-md transition-colors" onClick={() => scrollToSection('quote')}>
              Get Clean Linen Now!
            </Button>
          </div>
        </div>
      </section>

      {/* Get a Quote Section */}
      <section id="quote" style={{backgroundColor: MINT_BG}} className="py-12 sm:py-20 px-4 sm:px-8 border-t border-gray-300">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-8 sm:mb-12">
            <HeadingStyle>GET A QUOTE</HeadingStyle>
          </h2>
          <p className="text-gray-800 text-sm sm:text-base lg:text-lg leading-relaxed mb-8 sm:mb-12">
            Try Us Today. We offer trial services and sample pickups for eligible businesses. Let's show you what premium laundry service feels like. Whether you're a hotelier seeking consistent quality, a clinic in need of hygienic linen turnover, or a venue requiring last-minute support, we're ready to step in. With Infinite Laundry Solutions, you're not just choosing a provider—you're choosing a partner in cleanliness, care, and operational excellence.
          </p>
          <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-12 shadow-lg border-t-8 border-gray-900">
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Full Name <span className="text-red-500">*</span></label>
                  <Input value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} required style={{backgroundColor: GREY_LIGHT}} className="border-none h-12" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Phone <span className="text-red-500">*</span></label>
                  <Input value={contactForm.phone} onChange={(e) => setContactForm({...contactForm, phone: e.target.value})} required style={{backgroundColor: GREY_LIGHT}} className="border-none h-12" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Company name</label>
                  <Input value={contactForm.company} onChange={(e) => setContactForm({...contactForm, company: e.target.value})} style={{backgroundColor: GREY_LIGHT}} className="border-none h-12" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Property Address</label>
                  <Input value={contactForm.address} onChange={(e) => setContactForm({...contactForm, address: e.target.value})} style={{backgroundColor: GREY_LIGHT}} className="border-none h-12" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Email <span className="text-red-500">*</span></label>
                <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} required style={{backgroundColor: GREY_LIGHT}} className="border-none h-12" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Services Required / Message</label>
                <Textarea rows={5} value={contactForm.message} onChange={(e) => setContactForm({...contactForm, message: e.target.value})} style={{backgroundColor: GREY_LIGHT}} className="border-none" />
              </div>
              <Button 
                type="submit" 
                disabled={submitStatus === 'sending'}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 sm:py-5 rounded-lg font-bold text-base sm:text-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitStatus === 'sending' ? 'Sending...' : 'Submit Quote Request'}
              </Button>
              {submitStatus === 'success' && <p className="text-green-600 text-center font-bold text-base sm:text-lg">✓ Message sent successfully! We'll be in touch soon.</p>}
              {submitStatus === 'error' && <p className="text-red-600 text-center font-bold text-base sm:text-lg">✗ Failed to send message. Please try again or contact us directly.</p>}
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{backgroundColor: MINT_BG}} className="py-12 sm:py-16 px-4 sm:px-8 border-t-8 border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
            <div className="flex flex-col items-start gap-4">
              <img src="/assets/logo.png" alt="ILS Logo" className="h-14 sm:h-16 w-auto" />
              <p className="text-base sm:text-lg font-black text-gray-900">Infinite Laundry Solutions</p>
            </div>

            <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className='space-y-2 pt-1'>
                <a onClick={() => scrollToSection('home')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">Home</a>
                <a onClick={() => scrollToSection('about')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">About</a>
                <a onClick={() => scrollToSection('services')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">Services</a>
                <a onClick={() => scrollToSection('industries')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">Industries We Serve</a>
                <a onClick={() => scrollToSection('prices')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">Our Prices</a>
                <a onClick={() => scrollToSection('why')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">Why Us?</a>
                <a onClick={() => scrollToSection('quote')} className="block text-gray-800 hover:text-gray-900 cursor-pointer text-sm sm:text-base">Contact Us</a>
              </div>

              <div style={{ backgroundColor: GREY_LIGHT }} className='space-y-3 p-4 rounded-lg'>
                <a href="tel:+61426159286" className="text-sm sm:text-base font-black text-gray-900 block hover:text-gray-700">+61426159286</a>
                <a href="mailto:info@infinitelaundrysolutions.com.au" className="text-sm sm:text-base text-gray-800 block hover:text-gray-700 break-words">info@infinitelaundrysolutions.com.au</a>
                <p className="text-sm sm:text-base text-gray-800">3/76 Mica Street, Carole Park, QLD, 4300</p>
                <Button className="bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-black text-xs sm:text-sm border-2 border-gray-900 shadow-md transition-colors mt-4 w-full sm:w-auto" onClick={() => scrollToSection('quote')}>
                  LETS CHAT!!
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-400 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-gray-700">
            <p className="text-xs sm:text-sm lg:text-base">© 2025 Infinite Laundry Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
