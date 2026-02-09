import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="relative w-full h-[120px] flex items-center justify-between px-[5%] font-sans bg-transparent z-50">
      
      {/* Logo */}
      <Link to="/" className="text-3xl font-extrabold text-[#1a1a1a] tracking-tight z-20 cursor-pointer">
        SimuCFO
      </Link>

      {/* Links */}
      <ul className="hidden md:flex items-center gap-8 list-none mr-[45%] text-[#666] font-medium text-lg whitespace-nowrap">
        <li><Link to="/product" className="hover:text-[#8c52ff] transition-colors">Product</Link></li>
        <li><a href="/#about" className="hover:text-[#8c52ff] transition-colors">About</a></li>
        <li><a href="/#service" className="hover:text-[#8c52ff] transition-colors">Service</a></li>
        <li><a href="/#pricing" className="hover:text-[#8c52ff] transition-colors">Pricing</a></li>
      </ul>

      {/* Purple Blob + Contact Link */}
      <div className="absolute top-0 right-0 w-[40%] min-w-[350px] h-full bg-[#8c52ff] rounded-bl-[100px] flex items-center justify-center z-10">
        
        {/* CHANGED: Wrapped button in an anchor tag pointing to #contact */}
        <a href="/#contact">
            <button className="border-[1.5px] border-white text-white px-8 py-2.5 rounded-full font-medium hover:bg-white hover:text-[#8c52ff] transition-all cursor-pointer">
            Contact Us
            </button>
        </a>

      </div>
    </nav>
  );
};

export default Navbar;