import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-logo">SimuCFO</div>
      
      <ul className="nav-links">
        <li><a href="#about">CMO/CFO</a></li>
        <li><a href="#service">Service</a></li>
        <li><a href="#product">Product</a></li>
      </ul>

      {/* The purple curved background container */}
      <div className="nav-contact-wrapper">
        <button className="contact-btn">Contact Us</button>
      </div>
    </nav>
  );
};

export default Navbar;