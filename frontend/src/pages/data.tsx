import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../assets/components/Navbar';
import Footer from '../assets/components/Footer';
import { FaChartLine, FaArrowLeft, FaRobot, FaBrain } from 'react-icons/fa';

const Data = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [metricsData, setMetricsData] = useState<any>(null);
    const [plotImage, setPlotImage] = useState<string | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);

    useEffect(() => {
        if (location.state?.data) {
            console.log("📊 Received Data:", location.state.data);

            // Handle different data structures (analysis wrapper or direct)
            const analysis = location.state.data.analysis || location.state.data;
            setMetricsData(analysis);

            // Set Plot and Interpretation if available
            if (location.state.data.plotImage) {
                setPlotImage(location.state.data.plotImage);
            }
            if (location.state.data.interpretation) {
                setInterpretation(location.state.data.interpretation);
            }
        }
    }, [location.state]);

    // Recursive helper to render JSON objects
    const renderValue = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return (
                <div className="pl-4 border-l-2 border-purple-100 mt-2">
                    {Object.entries(value).map(([subKey, subValue]) => (
                        <div key={subKey} className="mb-1">
                            <span className="font-semibold text-gray-700 text-sm">{formatKey(subKey)}: </span>
                            <span className="text-gray-600 text-sm">{renderValue(subValue)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        // Format numbers nicely
        if (typeof value === 'number') {
            if (value > 1000000) return (value / 1000000).toFixed(2) + 'M';
            if (value > 1000) return (value / 1000).toFixed(2) + 'k';
            return value.toFixed(2);
        }
        return String(value);
    };

    // Format helper
    const formatKey = (key: string) => {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (!metricsData && !plotImage) return (
        <div className="min-h-screen bg-[#f8f9ff] font-sans flex flex-col items-center justify-center">
            <div className="text-[#8c52ff] text-xl font-bold animate-pulse">Loading Analysis...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8f9ff] font-sans flex flex-col relative overflow-hidden">
            {/* --- Background Elements --- */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-10"></div>

            <Navbar />

            <main className="flex-grow px-[5%] py-8 relative z-10">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] font-semibold text-sm tracking-wide bg-white shadow-sm">
                                🚀 AI ANALYSIS RESULT
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a]">
                                Financial <span className="text-[#8c52ff]">Deep Dive</span>
                            </h1>
                            <p className="text-gray-500 mt-4 text-lg max-w-2xl">
                                Insights extracted from your Monte Carlo simulation.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/product')}
                            className="bg-white border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                        >
                            <FaArrowLeft /> New Scan
                        </button>
                    </div>

                    {/* Main Layout - Vertical Stack */}
                    <div className="flex flex-col gap-8">

                        {/* 1. Target Question (Full Width) */}
                        <div className="bg-white p-8 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-purple-50">
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Question</span>
                            <h3 className="text-xl md:text-2xl font-bold text-[#1a1a1a] leading-relaxed">
                                "{metricsData?.question || "General Analysis"}"
                            </h3>
                        </div>

                        {/* 2. Probability Distribution (Full Width) */}
                        {plotImage && (
                            <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]">
                                        <FaChartLine />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">Probability Distribution</h2>
                                </div>
                                <div className="flex justify-center p-4 bg-gray-50 rounded-[20px]">
                                    <img
                                        src={plotImage}
                                        alt="Monte Carlo Bell Curve"
                                        className="max-w-full h-auto rounded-lg shadow-sm"
                                        style={{ maxHeight: '500px' }} // Increased max-height for better visibility
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. Computed Metrics (Full Width) */}
                        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[30px] border border-white shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-purple-100 rounded-xl text-[#8c52ff]">
                                    <FaRobot className="text-xl" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">Computed Metrics</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Expanded to 3 cols usually better for full width */}
                                {metricsData?.answer && Object.entries(metricsData.answer).map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="bg-white p-6 rounded-[25px] shadow-[0_5px_20px_rgba(0,0,0,0.03)] border border-gray-100 hover:border-[#8c52ff]/30 hover:shadow-[0_15px_30px_rgba(140,82,255,0.15)] transition-all duration-300 group"
                                    >
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 flex justify-between">
                                            {formatKey(key)}
                                            <FaChartLine className="text-gray-300 group-hover:text-[#8c52ff] transition-colors" />
                                        </div>
                                        <div className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] group-hover:text-[#8c52ff] transition-colors break-words">
                                            {typeof value === 'object' ? renderValue(value) : (
                                                typeof value === 'number'
                                                    ? (value % 1 !== 0 ? value.toFixed(2) : value)
                                                    : String(value)
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Interpretation Card (Full Width) */}
                        <div className="bg-[#1a1a1a] text-white p-8 rounded-[30px] shadow-2xl relative overflow-hidden min-h-[300px] mb-20">
                            {/* Abstract blob inside */}
                            <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#8c52ff] rounded-full blur-[60px] opacity-60"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <FaBrain className="text-[#8c52ff] text-2xl" />
                                    <span className="font-bold text-lg tracking-wide">AI Interpretation</span>
                                </div>
                                <div className="text-white leading-relaxed text-sm md:text-base font-medium whitespace-pre-wrap">
                                    {(interpretation || metricsData?.reasoning || "Reasoning not available.").replace(/[*=]/g, '').trim()}
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
