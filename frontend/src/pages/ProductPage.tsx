import React from 'react';
import Navbar from '../assets/components/Navbar'; 
import FileUpload from '../assets/components/FileUpload';
import QuestionInput from '../assets/components/QuestionInput';

const ProductPage = () => {
  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans relative overflow-x-hidden">
      
      {/* --- Background Decorative Elements --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>

      {/* 1. Navbar */}
      <Navbar />

      <main className="relative z-10 px-[5%] pb-20 pt-6">
        
        {/* 2. Page Header (Simplified Text) */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] font-bold text-xs tracking-wider bg-white shadow-sm">
            AI FINANCIAL ANALYST
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-6">
              Start Your <span className="text-[#8c52ff]">Deep Analysis</span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
              Simply upload your financial reports and ask a question. Our AI will analyze the numbers and give you the answers you need instantly.
          </p>
        </div>

        {/* 3. The Workflow Grid (Arrow Removed) */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* --- Step 1: Upload --- */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4 pl-2">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-sm">1</div>
                <span className="font-bold text-gray-700 tracking-wide text-sm">UPLOAD DATA</span>
            </div>
            {/* The Component */}
            <div className="flex-1">
                <FileUpload />
            </div>
          </div>

          {/* --- Step 2: Analysis --- */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4 pl-2">
                <div className="w-8 h-8 rounded-full bg-[#8c52ff] text-white flex items-center justify-center font-bold text-sm">2</div>
                <span className="font-bold text-gray-700 tracking-wide text-sm">ASK QUESTION</span>
            </div>
            {/* The Component */}
            <div className="flex-1">
                <QuestionInput />
            </div>
          </div>

        </div>
      </main>

    </div>
  );
};

export default ProductPage;