import React from 'react';
import { FaChartLine, FaFileInvoiceDollar, FaShieldAlt, FaCoins, FaRobot, FaCommentDots } from 'react-icons/fa';

const Service = () => {
  return (
    <section id="service" className="py-20 px-[5%] bg-white font-sans">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-[#8c52ff] font-bold tracking-widest text-sm mb-3">OUR SERVICES</h2>
        <h3 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-6">
          Beyond Reporting. <br />
          <span className="text-[#8c52ff]">Intelligent Action.</span>
        </h3>
        <p className="text-gray-500 text-lg">
          We don't just organize your data. We analyze it, stress-test it, and predict where your business is going next.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {services.map((service, index) => (
          <div key={index} className="group p-8 rounded-[30px] border border-gray-100 bg-white hover:border-[#8c52ff] hover:shadow-[0_10px_40px_rgba(140,82,255,0.1)] transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-[#8c52ff] text-2xl mb-6 group-hover:bg-[#8c52ff] group-hover:text-white transition-colors">
              {service.icon}
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-3">{service.title}</h4>
            <p className="text-gray-500 leading-relaxed">
              {service.desc}
            </p>
          </div>
        ))}
      </div>

    </section>
  );
};

const services = [
  {
    icon: <FaChartLine />,
    title: "Predictive Cash Flow",
    desc: "Run Monte Carlo simulations to predict future cash flow scenarios with probability-based accuracy. Know exactly when you might face a crunch."
  },
  {
    icon: <FaFileInvoiceDollar />,
    title: "Intelligent RAG Parsing",
    desc: "Upload PDFs or Excel sheets. Our engine instantly parses unstructured data, turning static documents into an interactive knowledge base."
  },
  {
    icon: <FaShieldAlt />,
    title: "Anomaly Detection",
    desc: "ML models monitor transactions to identify irregularities, fraud, or unexpected cost spikes in real-time, not at the end of the quarter."
  },
  {
    icon: <FaCoins />,
    title: "Smart Cost Optimization",
    desc: "Identify redundant subscriptions and inefficiencies. We highlight areas where capital can be reallocated to drive higher ROI."
  },
  {
    icon: <FaRobot />,
    title: "Board-Ready Reporting",
    desc: "Generate data-backed executive summaries in seconds. Turn hours of manual compilation into a single click."
  },
  {
    icon: <FaCommentDots />,
    title: "Conversational Querying",
    desc: "Simply ask, 'What happens to our burn rate if we hire 5 engineers?' and get an instant, data-backed answer."
  }
];

export default Service;