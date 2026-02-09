import React from 'react';
import HeroImage from '../images/business-growth.png'; // Ensure path matches your folder structure
import { FaInstagram, FaTwitter, FaFacebookF } from "react-icons/fa";

const Hero = () => {
  return (
    <section className="relative w-full min-h-[calc(100vh-120px)] flex flex-col md:flex-row items-center justify-between px-[5%] pb-12 overflow-hidden font-sans">
      
      {/* --- Left Content --- */}
      <div className="flex-1 z-20 flex flex-col items-start pt-8">
        <h1 className="text-6xl md:text-[5rem] font-extrabold leading-[1.1] mb-6 tracking-tight">
          <span className="text-[#8c52ff]">Grow Your</span> <br />
          <span className="text-[#222]">Business</span>
        </h1>
        
        <p className="text-gray-500 mb-10 max-w-md text-lg leading-relaxed">
          Lorem ipsum dolor sit amet, consectetuer adipiscing elit,
          sed diam nonummy nibh euismod tincidunt ut laoreet dolore.
        </p>

        {/* 'Join Us' Button with Glow Effect */}
        <button className="bg-[#8c52ff] text-white px-10 py-3.5 rounded-full font-bold text-lg shadow-[0_10px_30px_rgba(140,82,255,0.4)] hover:shadow-[0_15px_35px_rgba(140,82,255,0.5)] transition-all transform hover:-translate-y-1">
          Join Us
        </button>

        {/* Social Icons */}
        <div className="flex gap-5 mt-12">
          <a href="#" className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#8c52ff] hover:text-[#8c52ff] hover:bg-purple-50 transition-all text-lg">
            <FaInstagram />
          </a>
          <a href="#" className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#8c52ff] hover:text-[#8c52ff] hover:bg-purple-50 transition-all text-lg">
            <FaTwitter />
          </a>
          <a href="#" className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#8c52ff] hover:text-[#8c52ff] hover:bg-purple-50 transition-all text-lg">
            <FaFacebookF />
          </a>
        </div>
      </div>

      {/* --- Right Image Section --- */}
      <div className="flex-1 flex justify-end items-center relative z-20">
        <div className="relative w-[90%] md:w-[100%] max-w-[650px]">
          <img 
            src={HeroImage} 
            alt="Business Analytics" 
            className="w-full h-auto object-contain drop-shadow-2xl" 
          />
        </div>
      </div>

      {/* --- The Bottom Right Purple Wave --- */}
      {/* - Positioned absolute bottom-right
         - rounded-tl-[150px] creates the large inward curve
      */}
      <div className="absolute bottom-0 right-0 w-[30%] h-[55%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none"></div>

      {/* Decorative Plus Signs (Optional based on design) */}
      <div className="absolute top-[30%] left-[45%] text-[#8c52ff] text-2xl font-bold opacity-30">+</div>
      <div className="absolute bottom-[20%] left-[5%] text-[#8c52ff] text-3xl font-bold opacity-20">+</div>

    </section>
  );
};

export default Hero;