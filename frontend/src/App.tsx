// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Components
import Navbar from './assets/components/Navbar';
import Hero from './assets/components/Home';
import About from './assets/components/about'; 
import Service from './assets/components/Service';
import ProductPage from './pages/ProductPage';

// Create a "Home" component that bundles the landing page sections
const Home = () => (
  <>
    <Navbar />
    <Hero />
    <About />
    <Service/>
  </>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* The Landing Page (localhost:5173/) */}
        <Route path="/" element={<Home />} />
        
        {/* The Product Tool (localhost:5173/product) */}
        <Route path="/product" element={<ProductPage />} />
      </Routes>
    </Router>
  );
}

export default App;