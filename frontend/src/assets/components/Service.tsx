import { FaChartLine, FaFileInvoiceDollar, FaShield, FaCoins, FaRobot, FaCommentDots } from "react-icons/fa6";

const services = [
  { icon: FaChartLine, title: "Predictive Cash Flow", desc: "Monte Carlo simulations for future cash flow scenarios with probability-based accuracy. Know your liquidity risk before it hits." },
  { icon: FaFileInvoiceDollar, title: "Intelligent RAG Parsing", desc: "Upload PDFs or spreadsheets. Our engine instantly parses unstructured data into an interactive financial knowledge base." },
  { icon: FaShield, title: "Anomaly Detection", desc: "ML models monitor transactions to identify irregularities, fraud, or unexpected cost spikes in real-time." },
  { icon: FaCoins, title: "Smart Cost Optimization", desc: "Identify redundant subscriptions and inefficiencies. Highlight areas where capital can drive higher ROI." },
  { icon: FaRobot, title: "Board-Ready Reporting", desc: "Generate data-backed executive summaries in seconds. Turn hours of manual compilation into a single click." },
  { icon: FaCommentDots, title: "Conversational Querying", desc: "Ask 'What happens to burn rate if we hire 5 engineers?' and get an instant, data-backed answer." },
];

export default function Service() {
  return (
    <section id="service" className="py-24 bg-white dark:bg-dark-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent dark:bg-accent/10 mb-4">
            Our Services
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-dark-900 sm:text-4xl dark:text-white">
            Beyond Reporting. <span className="gradient-text">Intelligent Action.</span>
          </h2>
          <p className="mt-4 text-lg text-dark-400 dark:text-dark-300">
            We don't just organize your data. We analyze it, stress-test it, and predict where your business is going next.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <div key={i} className="card-hover group p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-5 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                <s.icon className="text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">{s.title}</h3>
              <p className="text-sm text-dark-400 dark:text-dark-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
