import React from 'react';
import { FaMagic, FaArrowRight } from 'react-icons/fa';

interface QuestionInputProps {
  question: string;
  setQuestion: (q: string) => void;
  onGenerate: () => void;
}

const QuestionInput = ({ question, setQuestion, onGenerate }: QuestionInputProps) => {
  return (
    <div className="w-full bg-white p-8 rounded-[30px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FaMagic className="text-[#8c52ff]" />
          <span className="text-[#8c52ff] font-bold text-sm tracking-wide">AI ANALYSIS</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-800">What do you want to know?</h3>
        <p className="text-gray-400 text-sm mt-1">Ask complex questions about the financial data you uploaded.</p>
      </div>

      <div className="flex-1 relative">
        <textarea
          className="w-full h-full min-h-[200px] p-6 bg-gray-50 rounded-2xl border border-gray-200 focus:border-[#8c52ff] focus:ring-2 focus:ring-purple-100 focus:outline-none resize-none text-gray-700 text-lg leading-relaxed placeholder-gray-300 transition-all"
          placeholder="e.g., Run a Monte Carlo simulation for next quarter's cash flow if we increase marketing spend by 20%..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {/* Helper Chips */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 cursor-pointer hover:border-[#8c52ff] hover:text-[#8c52ff] transition-colors">Risk Analysis</span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 cursor-pointer hover:border-[#8c52ff] hover:text-[#8c52ff] transition-colors">Revenue Forecast</span>
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="w-full mt-6 py-4 bg-gray-900 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-black transition-all"
      >
        Generate Report <FaArrowRight />
      </button>
    </div>
  );
};

export default QuestionInput;