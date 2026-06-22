import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import Footer from "../assets/components/Footer";
import { FaArrowLeft, FaChartLine, FaBrain, FaRobot, FaTriangleExclamation, FaChartColumn, FaFileLines, FaScaleBalanced } from "react-icons/fa6";

function formatKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatVal(v: unknown): string {
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
  }
  return String(v ?? "—");
}

function isNumeric(v: unknown): v is number {
  return typeof v === "number";
}

export default function Data() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [plot, setPlot] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [statementChunks, setStatementChunks] = useState<any>(null);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [fanCharts, setFanCharts] = useState<any>(null);
  const [ratioDashboard, setRatioDashboard] = useState<any>(null);

  useEffect(() => {
    if (location.state?.data) {
      const d = location.state.data;
      setData(d.answer || d.analysis || d);
      if (d.plotImage) setPlot(d.plotImage);
      if (d.interpretation) setInterpretation(d.interpretation);
      if (d.statementChunks) setStatementChunks(d.statementChunks);
      if (d.dataQuality) setDataQuality(d.dataQuality);
      if (d.fanCharts) setFanCharts(d.fanCharts);
      if (d.ratioDashboard) setRatioDashboard(d.ratioDashboard);
    }
  }, [location.state]);

  if (!data && !plot) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-accent text-lg font-semibold">
          <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading analysis...
        </div>
      </div>
    );
  }

  const entries = data ? Object.entries(data).filter(([k]) => k !== "question") : [];

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

                        <div className="flex gap-3">
                          {ratioDashboard && (
                            <button
                              onClick={() => navigate('/ratios', { state: { ratioDashboard, question: metricsData?.question } })}
                              className="bg-[#8c52ff] text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                            >
                              <FaScaleBalanced /> View Ratios
                            </button>
                          )}
                          <button
                            onClick={() => navigate('/product')}
                            className="bg-white border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <FaArrowLeft /> New Scan
                          </button>
                        </div>
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

                        {/* 2. Document Structure (Full Width) */}
                        {statementChunks && (
                          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]">
                                <FaFileLines />
                              </div>
                              <h2 className="text-xl font-bold text-gray-800">Document Structure</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {Object.entries(statementChunks).map(([type, info]: [string, any]) => {
                                const labels: Record<string, string> = {
                                  income_statement: "P&L Statement",
                                  balance_sheet: "Balance Sheet",
                                  cash_flow: "Cash Flow",
                                  operating_metrics: "Operating Metrics",
                                };
                                const icons: Record<string, string> = {
                                  income_statement: "📊",
                                  balance_sheet: "📋",
                                  cash_flow: "💵",
                                  operating_metrics: "📈",
                                };
                                return (
                                  <div key={type} className="bg-gray-50 p-4 rounded-[20px] border border-gray-100">
                                    <div className="text-2xl mb-2">{icons[type] || "📄"}</div>
                                    <div className="text-sm font-bold text-gray-800 mb-1">{labels[type] || type}</div>
                                    <div className="text-xs text-gray-500">
                                      {info.table_count} table{info.table_count !== 1 ? "s" : ""} · {info.metric_count} metric{info.metric_count !== 1 ? "s" : ""}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Data Quality (Full Width) */}
                        {dataQuality && (
                          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]">
                                <FaChartLine />
                              </div>
                              <h2 className="text-xl font-bold text-gray-800">Data Quality</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                                dataQuality.overall_grade === "A" ? "bg-green-100 text-green-700" :
                                dataQuality.overall_grade === "B" ? "bg-blue-100 text-blue-700" :
                                dataQuality.overall_grade === "C" ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                Grade: {dataQuality.overall_grade}
                              </div>
                              <div className="text-xs text-gray-500">
                                Source: {dataQuality.source_type === "digital" ? "Digital PDF (structured)" : "OCR (scanned)"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {["high", "medium", "low", "poor"].map((level) => {
                                const count = Object.values(dataQuality.metrics || {}).filter(
                                  (m: any) => m.label === level
                                ).length;
                                const colors: Record<string, string> = {
                                  high: "bg-green-100 text-green-700 border-green-200",
                                  medium: "bg-blue-100 text-blue-700 border-blue-200",
                                  low: "bg-yellow-100 text-yellow-700 border-yellow-200",
                                  poor: "bg-red-100 text-red-700 border-red-200",
                                };
                                return count > 0 ? (
                                  <div key={level} className={`text-center p-3 rounded-xl border ${colors[level]}`}>
                                    <div className="text-lg font-bold">{count}</div>
                                    <div className="text-xs capitalize">{level}</div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                            {dataQuality.metrics && (
                              <details className="mt-4">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                                  Per-metric breakdown
                                </summary>
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {Object.entries(dataQuality.metrics).map(([metric, info]: [string, any]) => {
                                    const dotColor = info.label === "high" ? "bg-green-500" :
                                      info.label === "medium" ? "bg-blue-500" :
                                      info.label === "low" ? "bg-yellow-500" : "bg-red-500";
                                    return (
                                      <div key={metric} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                                        <span className="truncate">{metric.replace(/_/g, " ")}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            )}
                          </div>
                        )}

                        {/* 4. Forecast Fan Chart (Full Width) */}
                        {fanCharts && (
                          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]">
                                <FaChartLine />
                              </div>
                              <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Forecast Fan Chart</h2>
                                <div className="flex gap-2">
                                  {Object.keys(fanCharts).map((key) => (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        const t = document.getElementById(`fan-tab-${key}`);
                                        document.querySelectorAll("[id^=fan-tab-]").forEach((el) => el.classList.remove("bg-purple-600", "text-white"));
                                        document.querySelectorAll("[id^=fan-panel-]").forEach((el) => el.classList.add("hidden"));
                                        t?.classList.add("bg-purple-600", "text-white");
                                        document.getElementById(`fan-panel-${key}`)?.classList.remove("hidden");
                                      }}
                                      id={`fan-tab-${key}`}
                                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${key === "revenue" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}
                                    >
                                      {key === "revenue" ? "Revenue" : "Cash"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-center p-4 bg-gray-50 rounded-[20px]">
                              {Object.entries(fanCharts).map(([key, img]) => (
                                <div key={key} id={`fan-panel-${key}`} className={key !== "revenue" ? "hidden" : ""}>
                                  <img
                                    src={img as string}
                                    alt={`${key} fan chart`}
                                    className="max-w-full h-auto rounded-lg shadow-sm"
                                    style={{ maxHeight: "500px" }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 5. Probability Distribution (Full Width) */}
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

                        {/* 4. Computed Metrics (Full Width) */}
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

                        {/* 5. Interpretation Card (Full Width) */}
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
}
