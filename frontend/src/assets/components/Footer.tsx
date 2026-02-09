import React from 'react';
import { FaTwitter, FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-[#1a1a1a] text-white pt-20 pb-10 px-[5%] font-sans border-t border-gray-800">
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        
        {/* Column 1: Brand & Bio */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">SimuCFO</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            The AI-powered financial intelligence platform for modern CFOs. 
            Move beyond static reporting into predictive, data-driven decision making.
          </p>
          <div className="flex gap-4">
            <SocialLink href="#" icon={<FaTwitter />} />
            <SocialLink href="#" icon={<FaLinkedin />} />
            <SocialLink href="#" icon={<FaGithub />} />
            <SocialLink href="#" icon={<FaInstagram />} />
          </div>
        </div>

        {/* Column 2: Product */}
        <div>
          <h3 className="font-bold text-lg mb-6 text-gray-200">Product</h3>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><FooterLink href="#">Features</FooterLink></li>
            <li><FooterLink href="#">Integrations</FooterLink></li>
            <li><FooterLink href="#pricing">Pricing</FooterLink></li>
            {/* <li><FooterLink href="#">Case Studies</FooterLink></li>
            <li><FooterLink href="#">Reviews</FooterLink></li> */}
          </ul>
        </div>

        {/* Column 3: Company */}
        <div>
          <h3 className="font-bold text-lg mb-6 text-gray-200">Company</h3>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><FooterLink href="#about">About Us</FooterLink></li>
            {/* <li><FooterLink href="#">Careers</FooterLink></li> */}
            {/* <li><FooterLink href="#blog">Blog</FooterLink></li> */}
            <li><FooterLink href="#contact">Contact</FooterLink></li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div>
          <h3 className="font-bold text-lg mb-6 text-gray-200">Stay Updated</h3>
          <p className="text-gray-400 text-sm mb-4">
            Get the latest financial AI trends delivered to your inbox.
          </p>
          <form className="flex flex-col gap-3">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-[#8c52ff] text-sm transition-colors"
            />
            <button className="px-4 py-3 bg-[#8c52ff] hover:bg-[#7a45e0] text-white font-bold rounded-lg transition-colors text-sm">
              Subscribe
            </button>
          </form>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} SimuCFO. All rights reserved.
        </p>
        <div className="flex gap-8 text-sm text-gray-500">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>

    </footer>
  );
};

// Helper Components for clean code
const SocialLink = ({ href, icon }: { href: string, icon: React.ReactNode }) => (
  <a 
    href={href} 
    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[#8c52ff] hover:text-white transition-all duration-300"
  >
    {icon}
  </a>
);

const FooterLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <a href={href} className="hover:text-[#8c52ff] transition-colors">
    {children}
  </a>
);

export default Footer;