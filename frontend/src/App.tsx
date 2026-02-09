import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './assets/components/Navbar';
import Hero from './assets/components/Home';
import About from './assets/components/about';
import Service from './assets/components/Service'; // If you made this earlier
import Pricing from './assets/components/Pricing'; // <--- NEW IMPORT
import FAQ from './assets/components/FAQ';         // <--- NEW IMPORT
import ProductPage from './pages/ProductPage';
import Contact from './assets/components/Contact';
import Footer from './assets/components/Footer';

// The Landing Page Combination
const Home = () => (
  <>
    <Navbar />
    <Hero />
    <About />
    <Service />
    <Pricing /> 
    <FAQ />  
    <Contact/> 
    <Footer/> 
  </>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<ProductPage />} />
      </Routes>
    </Router>
  );
}

export default App;