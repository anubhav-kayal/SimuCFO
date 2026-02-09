import React, { useState } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';

const faqData = [
  {
    question: "Is my financial data secure?",
    answer: "Yes. We use bank-grade AES-256 encryption. Your data is processed in an isolated environment and never shared."
  },
  {
    question: "How accurate are the AI predictions?",
    answer: "Our models provide probability-based forecasts (e.g., 95% confidence). We don't just guess; we run thousands of simulations to show you the likely outcomes."
  },
  {
    question: "Can I upload Excel files?",
    answer: "Yes, we support PDF, CSV, and XLSX formats for direct data ingestion."
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes, the Starter plan is completely free forever. You can try the Pro features with a 14-day trial."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-white w-full font-sans">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16 tracking-tight">
          Frequently Asked Questions
        </h2>

        <div className="flex flex-col border-t border-gray-200">
          {faqData.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={index} className="border-b border-gray-200 py-6">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between text-left focus:outline-none group"
                >
                  <span className={`text-lg font-medium transition-colors ${
                    isOpen ? 'text-[#8c52ff]' : 'text-gray-900 group-hover:text-gray-600'
                  }`}>
                    {faq.question}
                  </span>

                  <span className={`ml-6 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    {isOpen ? (
                      <FaMinus className="text-[#8c52ff]" />
                    ) : (
                      <FaPlus className="text-gray-400" />
                    )}
                  </span>
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
                  }`}
                >
                  <p className="text-gray-500 leading-relaxed pr-8">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}