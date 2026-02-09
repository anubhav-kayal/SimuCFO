import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../assets/components/Navbar';
import Footer from '../assets/components/Footer';
import { FaChartLine, FaLightbulb, FaArrowLeft, FaRobot, FaBrain } from 'react-icons/fa';

interface AnalysisData {
    question: string;
    answer: {
        [key: string]: string | number;
    };
    reasoning: string;
}

const Data = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

    useEffect(() => {
        if (location.state?.data) {
            console.log("📊 Received Analysis Data:", location.state.data); // LOGGING ADDED HERE
            setAnalysisData(location.state.data);
        }
    }, [location.state]);

    // Format helper
    const formatKey = (key: string) => {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (!analysisData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
                <h2 className="text-xl font-bold text-gray-800 mb-2">No Analysis Found</h2>
                <button
                    onClick={() => navigate('/product')}
                    className="bg-[#8c52ff] text-white px-6 py-2 rounded-full font-bold hover:shadow-lg transition transform hover:-translate-y-1"
                >
                    Go to Upload
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f9ff] font-sans flex flex-col relative overflow-hidden">
            {/* --- Background Elements from Home/Product --- */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-10"></div>

            <Navbar />

            <main className="flex-grow px-[5%] py-8 relative z-10">
                <div className="max-w-7xl mx-auto">

                    {/* Header with Home-like typography */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] font-semibold text-sm tracking-wide bg-white shadow-sm">
                                🚀 AI ANALYSIS RESULT
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a]">
                                Financial <span className="text-[#8c52ff]">Deep Dive</span>
                            </h1>
                            <p className="text-gray-500 mt-4 text-lg max-w-2xl">
                                Here are the insights extracted from your forecast.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/product')}
                            className="bg-white border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                        >
                            <FaArrowLeft /> New Scan
                        </button>
                    </div>

                    {/* Main Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* LEFT: Context & Reasoning (4 cols) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">

                            {/* Question Card using Home colors */}
                            <div className="bg-white p-8 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-purple-50">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Question</span>
                                <h3 className="text-xl md:text-2xl font-bold text-[#1a1a1a] leading-relaxed">
                                    "{analysisData.question}"
                                </h3>
                            </div>

                            {/* Reasoning Card - Dark Mode for Contrast/Coolness */}
                            <div className="bg-[#1a1a1a] text-white p-8 rounded-[30px] shadow-2xl relative overflow-hidden flex-grow">
                                {/* Abstract blob inside */}
                                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#8c52ff] rounded-full blur-[60px] opacity-60"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <FaBrain className="text-[#8c52ff] text-2xl" />
                                        <span className="font-bold text-lg tracking-wide">AI Reasoning</span>
                                    </div>
                                    <p className="text-gray-300 leading-relaxed text-lg font-light">
                                        {analysisData.reasoning}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Metrics Grid (8 cols) */}
                        <div className="lg:col-span-8">
                            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[30px] border border-white shadow-sm h-full">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-purple-100 rounded-xl text-[#8c52ff]">
                                        <FaChartLine className="text-xl" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Key Metrics</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {Object.entries(analysisData.answer).map(([key, value], index) => (
                                        <div
                                            key={key}
                                            className="bg-white p-6 rounded-[25px] shadow-[0_5px_20px_rgba(0,0,0,0.03)] border border-gray-100 hover:border-[#8c52ff]/30 hover:shadow-[0_15px_30px_rgba(140,82,255,0.15)] transition-all duration-300 group"
                                        >
                                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 flex justify-between">
                                                {formatKey(key)}
                                                <FaRobot className="text-gray-300 group-hover:text-[#8c52ff] transition-colors" />
                                            </div>
                                            <div className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] group-hover:text-[#8c52ff] transition-colors">
                                                {typeof value === 'number'
                                                    ? (value % 1 !== 0 ? value.toFixed(2) : value)
                                                    : value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Data;
