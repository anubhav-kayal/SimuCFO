import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import FileUpload from "../assets/components/FileUpload";
import {
  FaChartSimple,
  FaArrowLeft,
  FaSpinner,
  FaTriangleExclamation,
  FaScaleBalanced,
} from "react-icons/fa6";

const METRIC_META: Record<string, { label: string; unit: string }> = {
  median_cash: { label: "Median Cash", unit: "absolute" },
  median_revenue: { label: "Median Revenue", unit: "absolute" },
  prob_cash_negative: { label: "Cash Negative Prob.", unit: "pct" },
};

const PARAM_LABELS: Record<string, string> = {
  revenue_growth_mean: "Revenue Growth",
  gross_margin_mean: "Gross Margin",
  opex_ratio_mean: "Opex Ratio",
  cash_conversion_mean: "Cash Conversion",
  capex_ratio_mean: "CapEx Ratio",
};

function formatVal(v: number): string {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

export default function SensitivityPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string>("median_cash");
  const navigate = useNavigate();

  const handleRun = async () => {
    if (!files.length) return setError("Please upload at least one PDF.");
    setLoading(true);
    setError("");

    const formData = new FormData();
    files.forEach((f) => formData.append("pdfFile", f));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/sensitivity`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Sensitivity analysis failed");
      }
      const json = await res.json();
      setResults(json.data);
    } catch (e: any) {
      setError(e.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const tornado = results?.sensitivity?.tornado;
  const baseline = results?.sensitivity?.baseline;
  const plots = results?.plots || {};

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-dark-950 font-sans flex flex-col">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-10 dark:opacity-5" />

      <Navbar />

      <main className="flex-grow px-[5%] py-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
            <div>
              <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] dark:text-[#a78bfa] font-semibold text-sm tracking-wide bg-white dark:bg-dark-900 shadow-sm">
                SENSITIVITY ANALYSIS
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a] dark:text-white">
                Tornado <span className="text-[#8c52ff]">Charts</span>
              </h1>
              <p className="text-gray-500 dark:text-dark-400 mt-4 text-lg max-w-2xl">
                See which financial drivers have the largest impact on your outcomes.
              </p>
            </div>
            <button
              onClick={() => navigate("/product")}
              className="bg-white dark:bg-dark-900 border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all shadow-sm flex items-center gap-2"
            >
              <FaArrowLeft /> Standard Analysis
            </button>
          </div>

          {!results ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <FileUpload files={files} setFiles={setFiles} />

                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaChartSimple />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">How It Works</h2>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-600 dark:text-dark-300">
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">1.</span>
                      <span>Upload financial PDFs (same as standard analysis)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">2.</span>
                      <span>Each key parameter is perturbed ±10% from its baseline</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">3.</span>
                      <span>Monte Carlo runs 5,000 simulations per perturbation</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">4.</span>
                      <span>Tornado chart shows which drivers matter most</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-[16px] text-xs text-purple-700 dark:text-purple-300">
                    <FaTriangleExclamation className="inline mr-1" />
                    Parameters tested: Revenue Growth, Gross Margin, Opex Ratio, Cash Conversion, CapEx Ratio
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-[20px] text-sm mb-6">
                  {error}
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="bg-[#8c52ff] hover:bg-[#7a3fe0] disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
                >
                  {loading ? (
                    <><FaSpinner className="animate-spin" /> Running Sensitivity...</>
                  ) : (
                    <><FaChartSimple /> Run Sensitivity Analysis</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-8 mb-20">
              {/* Metric selector */}
              {tornado && (
                <div className="flex flex-wrap gap-3">
                  {Object.keys(METRIC_META).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                        selectedMetric === key
                          ? "bg-[#8c52ff] text-white shadow-md"
                          : "bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-300 border border-gray-200 dark:border-dark-700 hover:border-[#8c52ff]"
                      }`}
                    >
                      {METRIC_META[key].label}
                    </button>
                  ))}
                </div>
              )}

              {/* Tornado Chart (relative) */}
              {plots[`tornado_${selectedMetric}`] && (
                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaChartSimple />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      {METRIC_META[selectedMetric]?.label} — Relative Impact
                    </h2>
                  </div>
                  <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-800/50 rounded-[20px]">
                    <img
                      src={plots[`tornado_${selectedMetric}`] as string}
                      alt="Tornado chart"
                      className="max-w-full h-auto rounded-lg shadow-sm"
                      style={{ maxHeight: "600px" }}
                    />
                  </div>
                </div>
              )}

              {/* Tornado Chart (absolute) */}
              {plots[`tornado_absolute_${selectedMetric}`] && (
                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaScaleBalanced />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      {METRIC_META[selectedMetric]?.label} — Absolute Values
                    </h2>
                  </div>
                  <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-800/50 rounded-[20px]">
                    <img
                      src={plots[`tornado_absolute_${selectedMetric}`] as string}
                      alt="Tornado chart absolute"
                      className="max-w-full h-auto rounded-lg shadow-sm"
                      style={{ maxHeight: "600px" }}
                    />
                  </div>
                </div>
              )}

              {/* Data table */}
              {tornado && tornado[selectedMetric] && (
                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaTriangleExclamation />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      Sensitivity Breakdown — {METRIC_META[selectedMetric]?.label}
                    </h2>
                    <span className="text-xs text-gray-500 dark:text-dark-400 ml-auto">
                      Baseline: {selectedMetric === "prob_cash_negative" ? pct(tornado[selectedMetric].baseline) : formatVal(tornado[selectedMetric].baseline)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-dark-700">
                          <th className="text-left py-3 px-3 font-bold text-gray-700 dark:text-dark-300">Parameter</th>
                          <th className="text-right py-3 px-3 font-bold text-green-600 dark:text-green-400">Low Impact</th>
                          <th className="text-right py-3 px-3 font-bold text-red-600 dark:text-red-400">High Impact</th>
                          <th className="text-right py-3 px-3 font-bold text-gray-700 dark:text-dark-300">Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tornado[selectedMetric].parameters.map((p: any) => (
                          <tr key={p.param} className="border-b border-gray-100 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800/30">
                            <td className="py-2.5 px-3 font-medium text-gray-700 dark:text-dark-300">{p.label}</td>
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-green-600 dark:text-green-400">
                              {p.low?.impact_pct != null ? `${p.low.impact_pct >= 0 ? "+" : ""}${p.low.impact_pct.toFixed(1)}%` : "—"}
                              <div className="text-[10px] text-gray-400">
                                {selectedMetric === "prob_cash_negative" ? pct(p.low?.value) : formatVal(p.low?.value)}
                              </div>
                            </td>
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                              {p.high?.impact_pct != null ? `${p.high.impact_pct >= 0 ? "+" : ""}${p.high.impact_pct.toFixed(1)}%` : "—"}
                              <div className="text-[10px] text-gray-400">
                                {selectedMetric === "prob_cash_negative" ? pct(p.high?.value) : formatVal(p.high?.value)}
                              </div>
                            </td>
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-gray-900 dark:text-white">
                              {p.range.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Baseline metrics summary */}
              {baseline && (
                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Baseline Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(baseline).filter(([k]) => k !== "starting_revenue" && k !== "starting_cash").map(([key, val]) => (
                      <div key={key} className="bg-gray-50 dark:bg-dark-800/50 p-3 rounded-[16px] border border-gray-100 dark:border-dark-700">
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider mb-1">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                        <div className="text-lg font-extrabold text-gray-800 dark:text-white">
                          {key.startsWith("prob_") || key.startsWith("median_") && key.includes("margin")
                            ? (typeof val === "number" ? (val * 100).toFixed(1) + "%" : val)
                            : formatVal(Number(val))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => { setResults(null); setError(""); setSelectedMetric("median_cash"); }}
                  className="bg-white dark:bg-dark-900 border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all shadow-sm"
                >
                  New Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
