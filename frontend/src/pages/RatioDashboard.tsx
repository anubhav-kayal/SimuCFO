import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import Footer from "../assets/components/Footer";
import {
  FaArrowLeft,
  FaChartLine,
  FaScaleBalanced,
  FaDroplet,
  FaShield,
  FaGaugeHigh,
} from "react-icons/fa6";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Profitability: <FaChartLine />,
  Liquidity: <FaDroplet />,
  Solvency: <FaShield />,
  Efficiency: <FaGaugeHigh />,
};

function riskColor(risk: string): string {
  switch (risk) {
    case "low": return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "medium": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "high": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    default: return "text-gray-500 bg-gray-100";
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

function gaugeColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

function Gauge({ score, size = 80 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} className="dark:stroke-dark-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={gaugeColor(score)} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="text-xs font-bold" fill="currentColor">{score}</text>
    </svg>
  );
}

function formatRatioValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "—";
  if (unit === "%") return (value * 100).toFixed(1) + "%";
  if (unit === "x") return value.toFixed(2) + "x";
  if (unit === "days") return Math.round(value).toString();
  return String(value);
}

export default function RatioDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [question, setQuestion] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.ratioDashboard) {
      setDashboard(location.state.ratioDashboard);
    }
    if (location.state?.question) {
      setQuestion(location.state.question);
    }
  }, [location.state]);

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-dark-400 text-sm font-medium">No ratio data available. Run an analysis first.</p>
          <button onClick={() => navigate("/product")} className="btn-primary mt-6 text-sm">
            Go to Product
          </button>
        </div>
      </div>
    );
  }

  const categories = dashboard.categories || {};
  const ratios = dashboard.ratios || {};
  const catKeys = Object.keys(categories);
  const displayedRatios = activeCategory
    ? Object.entries(ratios).filter(([, r]: any) => r.category === activeCategory)
    : Object.entries(ratios);

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-10"></div>

      <Navbar />

      <main className="flex-grow px-[5%] py-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] font-semibold text-sm tracking-wide bg-white shadow-sm">
                <FaScaleBalanced /> RATIO ANALYSIS
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a]">
                Financial <span className="text-[#8c52ff]">Health Dashboard</span>
              </h1>
              <p className="text-gray-500 mt-4 text-lg max-w-2xl">
                Comprehensive ratio analysis across profitability, liquidity, solvency, and efficiency.
              </p>
            </div>
            <button onClick={() => navigate("/data")} className="bg-white border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
              <FaArrowLeft /> Back to Analysis
            </button>
          </div>

          {question && (
            <div className="bg-white p-5 rounded-[20px] shadow-sm border border-purple-50 mb-8">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Analysis Context</span>
              <p className="text-lg font-semibold text-[#1a1a1a]">"{question}"</p>
            </div>
          )}

          {/* Overall Health */}
          <div className="bg-white p-8 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-purple-50 mb-8 flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <Gauge score={dashboard.overall_health_score} size={120} />
              <div className={`mt-2 text-xs font-bold uppercase ${riskColor(dashboard.overall_risk)} inline-block px-3 py-1 rounded-full`}>
                {dashboard.overall_risk} Risk
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Overall Financial Health</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Aggregated score across {displayedRatios.length} financial ratios. Scores above 80 indicate strong financial health,
                50-80 warrant attention, and below 50 signal potential distress.
              </p>
            </div>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {catKeys.map((key) => {
              const cat = categories[key];
              const isActive = activeCategory === key;
              return (
                <button key={key} onClick={() => setActiveCategory(isActive ? null : key)}
                  className={`bg-white p-5 rounded-[20px] border text-left transition-all duration-200 hover:shadow-md ${
                    isActive ? "border-[#8c52ff] shadow-[0_0_0_2px_#8c52ff]" : "border-gray-100 shadow-sm"
                  }`}
                >
                  <div className="text-2xl mb-2 text-[#8c52ff]">{CATEGORY_ICONS[key] || <FaChartLine />}</div>
                  <div className="text-sm font-bold text-gray-800 mb-1">{key}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-extrabold ${scoreColor(cat.score)}`}>{cat.score}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${riskColor(cat.risk)}`}>
                      {cat.risk}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ratio Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {displayedRatios.map(([key, ratio]: [string, any]) => (
              <div key={key} className="bg-white p-6 rounded-[25px] shadow-[0_5px_20px_rgba(0,0,0,0.03)] border border-gray-100 hover:border-[#8c52ff]/30 hover:shadow-[0_15px_30px_rgba(140,82,255,0.15)] transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">{key.replace(/_/g, " ")}</div>
                    <div className="text-gray-400 text-[10px] font-medium mt-0.5">{ratio.category}</div>
                  </div>
                  <Gauge score={ratio.health_score} size={56} />
                </div>

                <div className="text-3xl font-extrabold text-[#1a1a1a] group-hover:text-[#8c52ff] transition-colors mb-3">
                  {formatRatioValue(ratio.value, ratio.unit)}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${riskColor(ratio.risk)}`}>
                    {ratio.risk} risk
                  </span>
                  <span className="text-xs text-gray-400">Score: {ratio.health_score}</span>
                </div>

                {ratio.simulated && (
                  <details className="mt-3 border-t border-gray-100 pt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 font-medium">
                      Simulated distribution
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 font-mono">
                      <span>P5: {formatRatioValue(ratio.simulated.p5, ratio.unit)}</span>
                      <span>P25: {formatRatioValue(ratio.simulated.p25, ratio.unit)}</span>
                      <span>Median: {formatRatioValue(ratio.simulated.median, ratio.unit)}</span>
                      <span>P75: {formatRatioValue(ratio.simulated.p75, ratio.unit)}</span>
                      <span>P95: {formatRatioValue(ratio.simulated.p95, ratio.unit)}</span>
                      <span>Std: {formatRatioValue(ratio.simulated.std, ratio.unit)}</span>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
