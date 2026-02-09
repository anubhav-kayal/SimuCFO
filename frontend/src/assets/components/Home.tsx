import React from 'react';
import HeroImage from '../images/business-growth.png'; // Ensure this path is correct
import { FaChartLine, FaBrain, FaRobot } from "react-icons/fa";

const Hero = () => {
  return (
    <section className="relative w-full min-h-[calc(100vh-120px)] flex flex-col md:flex-row items-center justify-between px-[5%] pb-12 overflow-hidden font-sans">

      {/* --- Left Content --- */}
      <div className="flex-1 z-20 flex flex-col items-start pt-8">
        {/* <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] font-semibold text-sm tracking-wide bg-purple-50">
          🚀 POWERED BY RAG & MONTE CARLO
        </div> */}

        <h1 className="text-5xl md:text-[4.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-[#1a1a1a]">
          Your AI-Powered <br />
          <span className="text-[#8c52ff]">CFO Co-Pilot</span>
        </h1>

        <p className="text-gray-500 mb-8 max-w-lg text-lg leading-relaxed">
          Move beyond static reporting. SimuCFO delivers predictive insights,
          automated scenario analysis, and board-ready reports to help you
          decide the future, not just report the past.
        </p>

        <div className="flex flex-wrap gap-4">
          <button className="bg-[#8c52ff] text-white px-8 py-3.5 rounded-full font-bold text-lg shadow-[0_10px_30px_rgba(140,82,255,0.4)] hover:shadow-[0_15px_35px_rgba(140,82,255,0.5)] transition-all transform hover:-translate-y-1">
            Try Simulator
          </button>
          <button className="bg-white border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3.5 rounded-full font-bold text-lg hover:bg-purple-50 transition-all">
            View Analysis
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="flex gap-6 mt-12 text-gray-400">
          <div className="flex items-center gap-2">
            <FaBrain className="text-[#8c52ff] text-xl" />
            <span className="text-sm font-medium text-gray-600">ML Forecasting</span>
          </div>
          <div className="flex items-center gap-2">
            <FaChartLine className="text-[#8c52ff] text-xl" />
            <span className="text-sm font-medium text-gray-600">Anomaly Detection</span>
          </div>
          <div className="flex items-center gap-2">
            <FaRobot className="text-[#8c52ff] text-xl" />
            <span className="text-sm font-medium text-gray-600">Auto Reports</span>
          </div>
        </div>
      </div>

      {/* --- Right Image Section --- */}
      <div className="flex-1 flex justify-end items-center relative z-20 mt-10 md:mt-0">
        <div className="relative w-[90%] md:w-[100%] max-w-[650px]">
          <img
            src={HeroImage}
            alt="AI Financial Dashboard"
            className="w-full h-auto object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
      </div>

      {/* --- The Bottom Right Purple Wave --- */}
      <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-90"></div>
    </section>
  );
};

export default Hero;