import React from 'react';
import { FaCode, FaLightbulb, FaRocket } from "react-icons/fa";

const About = () => {
  return (
    <section id="about" className="relative w-full py-24 px-[5%] bg-white overflow-hidden font-sans">
      
      {/* --- Background Decorative Blob (Left Side) --- */}
      <div className="absolute top-10 left-0 w-[15%] h-[70%] bg-[#8c52ff] rounded-tr-[100px] rounded-br-[100px] opacity-10 md:opacity-100 z-0"></div>

      <div className="relative z-10 flex flex-col md:flex-row gap-16 items-center">
        
        {/* --- Left Column: The "Story" Card --- */}
        <div className="flex-1 w-full">
            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100 relative overflow-hidden">
                {/* Badge */}
                <div className="absolute top-0 right-0 bg-[#8c52ff] text-white text-xs font-bold px-6 py-2 rounded-bl-[20px]">
                    HACKATHON PROJECT
                </div>

                <h3 className="text-[#8c52ff] font-bold text-lg mb-2 flex items-center gap-2">
                    <FaCode /> BUILT WITH PASSION
                </h3>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] mb-6">
                    More Than a Tool.<br/>An AI CFO.
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">
                    We are currently building SimuCFO in a high-intensity hackathon environment with a single mission: 
                    To prove that financial intelligence can be automated, accurate, and explainable.
                </p>
                <p className="text-gray-500 leading-relaxed">
                    By combining <strong>Machine Learning</strong>, <strong>Monte Carlo simulations</strong>, and <strong>RAG technology</strong>, 
                    we aren't just reporting the future — we are helping CFOs confidently decide it.
                </p>

                <div className="mt-8 pt-8 border-t border-gray-100 flex gap-8">
                    <div>
                        <span className="block text-3xl font-bold text-[#8c52ff]">98%</span>
                        <span className="text-sm text-gray-400">Accuracy Goal</span>
                    </div>
                    <div>
                        <span className="block text-3xl font-bold text-[#8c52ff]">24/7</span>
                        <span className="text-sm text-gray-400">Monitoring</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- Right Column: The Features Grid --- */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {features.map((feature, index) => (
                <div key={index} className="group p-6 rounded-[30px] bg-white border border-gray-100 hover:border-[#8c52ff] hover:shadow-lg transition-all duration-300 cursor-default">
                    <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-[#8c52ff] text-xl mb-4 group-hover:bg-[#8c52ff] group-hover:text-white transition-colors">
                        {feature.icon}
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-2">{feature.title}</h4>
                    <p className="text-sm text-gray-500 leading-snug">{feature.desc}</p>
                </div>
            ))}
        </div>

      </div>
    </section>
  );
};

// Feature Data
const features = [
    {
        title: "Monte Carlo Sims",
        desc: "Advanced cash flow forecasting and probability-based scenario analysis.",
        icon: <FaRocket />
    },
    {
        title: "ML Forecasting",
        desc: "Predictive models for revenue, expenses, and burn-rate trends.",
        icon: <FaLightbulb />
    },
    {
        title: "Anomaly Detection",
        desc: "Identifies irregular transactions and prevents cost leakages instantly.",
        icon: <FaCode />
    },
    {
        title: "Cost Optimization",
        desc: "AI-driven suggestions to cut costs and reallocate spend efficiently.",
        icon: <FaRocket />
    },
    {
        title: "Board-Ready Reports",
        desc: "One-click generation of investor summaries and visual dashboards.",
        icon: <FaLightbulb />
    },
    {
        title: "Visual Trust",
        desc: "Interactive graphs comparing actual vs. predicted outcomes.",
        icon: <FaCode />
    }
];

export default About;