"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";

export function StoreSlider({ sliders = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sliders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sliders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sliders]);

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");

  function resolveImageUrl(img) {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    return `${API_BASE}${img}`;
  }

  if (!sliders || sliders.length === 0) {
    return (
      <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3] sm:aspect-[21/9] md:aspect-[3/1] flex items-center shadow-xl">
         <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-transparent w-full md:w-2/3 z-10 mix-blend-multiply"></div>
         <div className="relative z-20 p-8 md:p-16 w-full md:w-1/2 flex flex-col items-center md:items-start justify-center h-full text-center md:text-left">
           <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] drop-shadow-2xl italic">
             <span className="block text-4xl md:text-6xl text-white font-serif italic font-normal tracking-normal mb-[-10px] md:mb-[-20px]">Sale</span>
             BLACK<br/>FRIDAY
           </h1>
           <div className="mt-6 md:mt-10">
             <a href="/store/products" className="bg-[#E92B58] text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#d0204b] transition-transform hover:scale-105 shadow-xl inline-block">
               Shop Now
             </a>
           </div>
         </div>
         <div className="absolute right-0 top-0 bottom-0 w-full md:w-2/3 bg-[url('https://images.unsplash.com/photo-1607083206869-4c7672072395?q=80&w=2087&auto=format&fit=crop')] bg-cover bg-center md:bg-right opacity-60"></div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[21/9] md:aspect-[3/1] bg-black shadow-xl group">
      {sliders.map((slider, i) => (
        <div 
          key={slider.id || i} 
          className={`absolute inset-0 transition-opacity duration-1000 ${i === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Background Image */}
          {slider.image ? (
            <img src={resolveImageUrl(slider.image)} alt={slider.title || "Banner"} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
             <div className="absolute inset-0 bg-muted"></div>
          )}
          
          {/* Overlay text if provided */}
          {(slider.title || slider.subtitle || slider.buttonText) && (
            <div className="absolute inset-0 bg-black/30 flex items-center">
              <div className="p-8 md:p-16 w-full text-center md:text-left z-20">
                {slider.title && <h1 className="text-white text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">{slider.title}</h1>}
                {slider.subtitle && <p className="text-white/90 text-lg md:text-xl mb-6 drop-shadow">{slider.subtitle}</p>}
                {slider.buttonText && slider.url && (
                  <a href={slider.url} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E92B58] text-white font-bold hover:bg-[#d0204b] transition-all shadow-lg hover:scale-105">
                    {slider.buttonText}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Navigation Arrows */}
      {sliders.length > 1 && (
        <>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? sliders.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-colors opacity-0 sm:group-hover:opacity-100 z-30"
          >
            <Icon name="chevron-left" size={24} />
          </button>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev + 1) % sliders.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-colors opacity-0 sm:group-hover:opacity-100 z-30"
          >
            <Icon name="chevron-right" size={24} />
          </button>
          
          {/* Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
            {sliders.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-[#E92B58]' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
