import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import Footer from "../assets/components/Footer";
import { FaArrowLeft, FaChartLine, FaBrain, FaRobot, FaFileLines, FaScaleBalanced, FaPaperPlane, FaSpinner, FaTriangleExclamation, FaFlask } from "react-icons/fa6";

function formatKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [anomalyDetection, setAnomalyDetection] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

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
      if (d.anomalyDetection) setAnomalyDetection(d.anomalyDetection);
      if (d.executiveSummary) setExecutiveSummary(d.executiveSummary);
    }
    if (location.state?.sessionId) {
      setSessionId(location.state.sessionId);
    }
  }, [location.state]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendFollowUp = async () => {
    const q = chatInput.trim();
    if (!q || !sessionId || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question: q }),
      });
      if (res.ok) {
        const json = await res.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: json.data.reasoning || "Analysis complete." }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that question. Please try again." }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please check if the server is running." }]);
    }
    setChatLoading(false);
  };

  const questionText = data?.question || location.state?.data?.question || "General Analysis";

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

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-10"></div>

      <Navbar />

      {sessionId && (
        <div className="fixed bottom-0 right-0 z-50 w-full md:w-[420px] md:right-4 md:bottom-4 md:rounded-[20px] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "60vh" }}>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#8c52ff] text-white text-sm font-bold shrink-0">
            <FaBrain /> Ask a follow-up
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm" style={{ maxHeight: "300px" }}>
            {chatMessages.length === 0 && (
              <p className="text-gray-400 text-xs text-center py-4">Ask a follow-up question about this analysis.</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#8c52ff] text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-gray-500">
                  <FaSpinner className="animate-spin" /> Analyzing...
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 shrink-0">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendFollowUp()}
              placeholder="Ask a follow-up question..."
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8c52ff]/30 focus:border-[#8c52ff]"
              disabled={chatLoading}
            />
            <button onClick={sendFollowUp} disabled={!chatInput.trim() || chatLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#8c52ff] text-white disabled:opacity-40 transition-all hover:bg-purple-700 shrink-0"
            >
              <FaPaperPlane className="text-sm" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow px-[5%] py-8 relative z-10">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] font-semibold text-sm tracking-wide bg-white shadow-sm">
                AI ANALYSIS RESULT
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a]">
                Financial <span className="text-[#8c52ff]">Deep Dive</span>
              </h1>
              <p className="text-gray-500 mt-4 text-lg max-w-2xl">
                Insights extracted from your Monte Carlo simulation.
              </p>
            </div>

            <div className="flex gap-3">
              {sessionId && (
                <button
                  onClick={() => navigate('/whatif', { state: { sessionId } })}
                  className="bg-emerald-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-emerald-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <FaFlask /> What-If
                </button>
              )}
              {ratioDashboard && (
                <button
                  onClick={() => navigate('/ratios', { state: { ratioDashboard, question: questionText } })}
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

            {/* 1. Target Question */}
            <div className="bg-white p-8 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-purple-50">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Target Question</span>
              <h3 className="text-xl md:text-2xl font-bold text-[#1a1a1a] leading-relaxed">
                "{questionText}"
              </h3>
            </div>

            {/* 2. Executive Summary */}
            {executiveSummary && (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d1b4e] text-white p-8 rounded-[30px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-[#8c52ff] rounded-full blur-[60px] opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <FaBrain className="text-[#8c52ff] text-2xl" />
                    <h2 className="text-xl font-bold">Executive Summary</h2>
                    <div className="ml-auto flex gap-2">
                      {executiveSummary.cash_outlook && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          executiveSummary.cash_outlook === 'strong' ? 'bg-emerald-500/20 text-emerald-400' :
                          executiveSummary.cash_outlook === 'critical' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          Cash: {executiveSummary.cash_outlook}
                        </span>
                      )}
                      {executiveSummary.revenue_outlook && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          executiveSummary.revenue_outlook === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                          executiveSummary.revenue_outlook === 'negative' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          Revenue: {executiveSummary.revenue_outlook}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {executiveSummary.key_findings?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-[#8c52ff] uppercase tracking-wider mb-2">Key Findings</h3>
                        <ul className="space-y-2">
                          {executiveSummary.key_findings.map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                              <span className="text-[#8c52ff] mt-1">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {executiveSummary.risks?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Risks & Concerns</h3>
                        <ul className="space-y-2">
                          {executiveSummary.risks.map((r: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                              <span className="text-red-400 mt-1">⚠</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {executiveSummary.opportunities?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Opportunities</h3>
                        <ul className="space-y-2">
                          {executiveSummary.opportunities.map((o: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                              <span className="text-emerald-400 mt-1">✓</span>
                              <span>{o}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Document Structure */}
            {statementChunks && (
              <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]"><FaFileLines /></div>
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

            {/* 3. Data Quality */}
            {dataQuality && (
              <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]"><FaChartLine /></div>
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
                    const count = Object.values(dataQuality.metrics || {}).filter((m: any) => m.label === level).length;
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
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Per-metric breakdown</summary>
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

            {/* 4. Anomaly Detection */}
            {anomalyDetection && anomalyDetection.summary && (
              <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-lg ${
                    anomalyDetection.summary.overall_risk === 'high' ? 'bg-red-100 text-red-600' :
                    anomalyDetection.summary.overall_risk === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    <FaTriangleExclamation />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Anomaly Detection</h2>
                  <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                    anomalyDetection.summary.overall_risk === 'high' ? 'bg-red-100 text-red-700' :
                    anomalyDetection.summary.overall_risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {anomalyDetection.summary.overall_risk.toUpperCase()} Risk
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 rounded-xl bg-gray-50">
                    <div className="text-lg font-bold text-gray-800">{anomalyDetection.summary.total_anomalies}</div>
                    <div className="text-xs text-gray-500">Total Anomalies</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100">
                    <div className="text-lg font-bold text-red-600">{anomalyDetection.summary.severity_breakdown?.critical || 0}</div>
                    <div className="text-xs text-red-500">Critical</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="text-lg font-bold text-orange-600">{anomalyDetection.summary.severity_breakdown?.high || 0}</div>
                    <div className="text-xs text-orange-500">High</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-lg font-bold text-blue-600">{anomalyDetection.summary.severity_breakdown?.medium || 0}</div>
                    <div className="text-xs text-blue-500">Medium</div>
                  </div>
                </div>
                {anomalyDetection.anomalies && anomalyDetection.anomalies.length > 0 && (
                  <details>
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 font-medium">
                      View {anomalyDetection.anomalies.length} detected anomalies
                    </summary>
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      {anomalyDetection.anomalies.slice(0, 20).map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl text-sm">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            a.severity === 'critical' ? 'bg-red-500' :
                            a.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                          }`} />
                          <span className="font-mono text-xs font-bold text-gray-700 w-16">
                            P{a.period_index}
                          </span>
                          <span className="text-gray-600 capitalize">{a.metric.replace(/_/g, ' ')}</span>
                          <span className="ml-auto text-xs font-bold text-gray-500">
                            {a.direction === 'spike' ? '↑' : '↓'} {Math.abs(a.deviation_pct || 0).toFixed(1)}%
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            a.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {a.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {anomalyDetection.trends && anomalyDetection.trends.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 font-medium">
                      View trends across {anomalyDetection.summary.metrics_analyzed} metrics
                    </summary>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {anomalyDetection.trends.map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            t.trend === 'increasing' ? 'bg-green-500' :
                            t.trend === 'decreasing' ? 'bg-red-500' : 'bg-gray-400'
                          }`} />
                          <span className="truncate">{t.metric.replace(/_/g, ' ')}</span>
                          <span className="ml-auto font-bold">{t.avg_change_pct > 0 ? '+' : ''}{t.avg_change_pct}%</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* 5. Fan Charts */}
            {fanCharts && (
              <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]"><FaChartLine /></div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Forecast Fan Chart</h2>
                    <div className="flex gap-2">
                      {Object.keys(fanCharts).map((key) => (
                        <button key={key} onClick={() => {
                          const t = document.getElementById(`fan-tab-${key}`);
                          document.querySelectorAll("[id^=fan-tab-]").forEach((el) => el.classList.remove("bg-purple-600", "text-white"));
                          document.querySelectorAll("[id^=fan-panel-]").forEach((el) => el.classList.add("hidden"));
                          t?.classList.add("bg-purple-600", "text-white");
                          document.getElementById(`fan-panel-${key}`)?.classList.remove("hidden");
                        }} id={`fan-tab-${key}`}
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
                      <img src={img as string} alt={`${key} fan chart`} className="max-w-full h-auto rounded-lg shadow-sm" style={{ maxHeight: "500px" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Probability Distribution */}
            {plot && (
              <div className="bg-white p-6 rounded-[30px] shadow-sm border border-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg text-[#8c52ff]"><FaChartLine /></div>
                  <h2 className="text-xl font-bold text-gray-800">Probability Distribution</h2>
                </div>
                <div className="flex justify-center p-4 bg-gray-50 rounded-[20px]">
                  <img src={plot} alt="Monte Carlo Bell Curve" className="max-w-full h-auto rounded-lg shadow-sm" style={{ maxHeight: '500px' }} />
                </div>
              </div>
            )}

            {/* 7. Computed Metrics */}
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[30px] border border-white shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-100 rounded-xl text-[#8c52ff]"><FaRobot className="text-xl" /></div>
                <h2 className="text-2xl font-bold text-gray-800">Computed Metrics</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data && Object.entries(data).filter(([k]) => k !== "question").map(([key, value]) => (
                  <div key={key} className="bg-white p-6 rounded-[25px] shadow-[0_5px_20px_rgba(0,0,0,0.03)] border border-gray-100 hover:border-[#8c52ff]/30 hover:shadow-[0_15px_30px_rgba(140,82,255,0.15)] transition-all duration-300 group">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 flex justify-between">
                      {formatKey(key)}
                      <FaChartLine className="text-gray-300 group-hover:text-[#8c52ff] transition-colors" />
                    </div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] group-hover:text-[#8c52ff] transition-colors break-words">
                      {typeof value === 'object' ? JSON.stringify(value) : (
                        typeof value === 'number'
                          ? (value % 1 !== 0 ? value.toFixed(2) : value)
                          : String(value)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. AI Interpretation */}
            <div className="bg-[#1a1a1a] text-white p-8 rounded-[30px] shadow-2xl relative overflow-hidden min-h-[300px] mb-20">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#8c52ff] rounded-full blur-[60px] opacity-60"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <FaBrain className="text-[#8c52ff] text-2xl" />
                  <span className="font-bold text-lg tracking-wide">AI Interpretation</span>
                </div>
                <div className="text-white leading-relaxed text-sm md:text-base font-medium whitespace-pre-wrap">
                  {(interpretation || data?.reasoning || "Reasoning not available.").replace(/[*=]/g, '').trim()}
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
