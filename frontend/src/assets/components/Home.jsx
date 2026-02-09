import React from 'react';
import './Home.css';
import HeroImage from '../business-growth.png';
import { FaInstagram, FaTwitter, FaFacebookF } from "react-icons/fa";

const Hero = () => {
  return (
    <section className="hero-container">
      <div className="hero-content">
        <h1>
          Grow Your<br />
          <span className="text-black">Business</span>
        </h1>
        <p>
          Lorem ipsum dolor sit amet, consectetuer adipiscing elit,
          sed diam nonummy nibh euismod tincidunt ut laoreet dolore.
        </p>

        <button className="join-btn">Demo</button>

        <div className="social-icons">
          <a href="#" className="icon"><FaInstagram /></a>
          <a href="#" className="icon"><FaTwitter /></a>
          <a href="#" className="icon"><FaFacebookF /></a>
        </div>
      </div>

      <div className="hero-image-section">
        <div className="image-container">
          <img src={HeroImage} alt="Business Analytics" className="floating-image" />

          {/* Decorative floating elements if needed, but the image has them */}
          <div className="floating-card card-1">
            <div className="card-line"></div>
            <div className="card-line short"></div>
          </div>
          <div className="floating-card card-2">
            <div className="pie-chart-mini"></div>
          </div>
        </div>
      </div>

      {/* The Bottom Right Wave Background */}
      <div className="hero-wave"></div>
    </section>
  );
};

export default Hero;