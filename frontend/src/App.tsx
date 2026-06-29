import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./assets/components/Navbar";
import Hero from "./assets/components/Home";
import About from "./assets/components/about";
import Service from "./assets/components/Service";
import Pricing from "./assets/components/Pricing";
import FAQ from "./assets/components/FAQ";
import Contact from "./assets/components/Contact";
import Footer from "./assets/components/Footer";
import ProductPage from "./pages/ProductPage";
import Data from "./pages/data";
import ProcessingPage from "./pages/ProcessingPage";
import ScenarioPage from "./pages/ScenarioPage";
import RatioDashboard from "./pages/RatioDashboard";
import SensitivityPage from "./pages/SensitivityPage";
import BenchmarkingPage from "./pages/BenchmarkingPage";
import ChatHistoryPage from "./pages/ChatHistoryPage";
import WhatIfPage from "./pages/WhatIfPage";
import ShareViewPage from "./pages/ShareViewPage";

const Home = () => (
  <>
    <Navbar />
    <Hero />
    <About />
    <Service />
    <Pricing />
    <FAQ />
    <Contact />
    <Footer />
  </>
);

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/data" element={<Data />} />
          <Route path="/scenario" element={<ScenarioPage />} />
          <Route path="/ratios" element={<RatioDashboard />} />
          <Route path="/sensitivity" element={<SensitivityPage />} />
          <Route path="/benchmark" element={<BenchmarkingPage />} />
          <Route path="/chat" element={<ChatHistoryPage />} />
          <Route path="/whatif" element={<WhatIfPage />} />
          <Route path="/share/:token" element={<ShareViewPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
