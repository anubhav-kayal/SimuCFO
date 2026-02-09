import React from 'react';

const Navbar = () => {
  return (
    <nav className="relative w-full h-[120px] flex items-center justify-between px-[5%] font-sans bg-transparent z-50">
      
      {/* 1. Logo */}
      <div className="text-3xl font-extrabold text-[#1a1a1a] tracking-tight z-20">
        SimuCFO
      </div>

      {/* 2. Navigation Links 
          FIX: Changed mr-[35%] to mr-[45%] to push links completely out of the purple blob.
          FIX: Reduced gap-10 to gap-8 to save space.
      */}
      <ul className="hidden md:flex items-center gap-8 list-none mr-[45%] text-[#666] font-medium text-lg whitespace-nowrap">
        <li><a href="#about" className="hover:text-[#8c52ff] transition-colors">About</a></li>
        <li><a href="#service" className="hover:text-[#8c52ff] transition-colors">Service</a></li>
        <li><a href="#product" className="hover:text-[#8c52ff] transition-colors">Product</a></li>
        <li><a href="#blog" className="hover:text-[#8c52ff] transition-colors">Blog</a></li>
      </ul>

      {/* 3. The GIANT Purple Corner Blob */}
      <div className="absolute top-0 right-0 w-[40%] min-w-[350px] h-full bg-[#8c52ff] rounded-bl-[100px] flex items-center justify-center z-10">
        <button className="border-[1.5px] border-white text-white px-8 py-2.5 rounded-full font-medium hover:bg-white hover:text-[#8c52ff] transition-all">
          Contact Us
        </button>
      </div>
    </nav>
  );
};

export default Navbar;