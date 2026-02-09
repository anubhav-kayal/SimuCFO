import React from 'react';
import { FaCheck, FaChevronRight } from 'react-icons/fa';

const plans = [
  {
    id: 'free',
    name: "Starter",
    description: "Essential tools for small businesses.",
    price: "$0",
    period: "/ month",
    features: [
      "Basic Cash Flow Trends",
      "5 Document Uploads/mo",
      "Standard Support",
      "1 User Seat"
    ],
    highlight: false,
  },
  {
    id: 'pro',
    name: "Pro CFO",
    description: "AI-powered predictions for growing teams.",
    price: "$49",
    period: "/ month",
    features: [
      "Unlimited Monte Carlo Sims",
      "50 RAG Document Uploads",
      "Anomaly Detection",
      "Board-Ready Reports",
      "Priority Support"
    ],
    highlight: true, // Middle card
    discount: "POPULAR",
  },
  {
    id: 'team',
    name: "Enterprise",
    description: "Custom solutions for large organizations.",
    price: "$199",
    period: "/ month",
    features: [
      "API Access",
      "Custom ML Models",
      "Dedicated Account Manager",
      "SSO & Advanced Security",
      "Unlimited Seats"
    ],
    highlight: false,
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-white w-full font-sans">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Start for free, upgrade when you need the full power of our AI financial engine.
          </p>
        </div>

        {/* Pricing Grid - Clean & Simple */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`
                relative flex flex-col p-8 rounded-[24px] border transition-all duration-300
                ${plan.highlight 
                  ? 'bg-white border-[#8c52ff] shadow-2xl scale-105 z-10' 
                  : 'bg-[#F9FAFB] border-transparent shadow-sm hover:border-gray-200'
                }
              `}
            >
              {/* Badge for Pro */}
              {plan.discount && (
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#8c52ff] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  {plan.discount}
                </span>
              )}

              {/* Header */}
              <h3 className={`font-bold text-xl mb-2 ${plan.highlight ? 'text-[#8c52ff]' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <p className="text-gray-500 text-sm mb-6 min-h-[40px]">
                {plan.description}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm font-medium">
                  {plan.period}
                </span>
              </div>

              {/* Button */}
              <button className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors mb-8 ${
                  plan.highlight 
                  ? 'bg-[#1a1a1a] text-white hover:bg-gray-800' 
                  : 'bg-white border border-gray-200 text-gray-900 hover:border-gray-300'
              }`}>
                Choose {plan.name}
                <FaChevronRight className="text-xs" />
              </button>

              {/* Features */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">What's included</p>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        plan.highlight ? 'bg-purple-100 text-[#8c52ff]' : 'bg-gray-200 text-gray-500'
                    }`}>
                        <FaCheck size={8} />
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}