import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import {
  FaFlask,
  FaArrowLeft,
  FaChartColumn,
  FaSpinner,
  FaRotate,
  FaScaleBalanced,
  FaTriangleExclamation,
} from "react-icons/fa6";

interface WhatIfOverrides {
  revenue_growth_mean: number;
  gross_margin_mean: number;
  opex_ratio_mean: number;
  cash_conversion_mean: number;
  capex_ratio_mean: number;
}

const DEFAULT_OVERRIDES: WhatIfOverrides = {
  revenue_growth_mean: 0.15,
  gross_margin_mean: 0.55,
  opex_ratio_mean: 0.28,
  cash_conversion_mean: 0.85,
  capex_ratio_mean: 0.05,
};

const PARAM_META: Record<keyof WhatIfOverrides, { label: string; min: number; max: number; step: number; fmt: (v: number) => string }> = {
  revenue_growth_mean: { label: "Revenue Growth", min: -0.2, max: 0.5, step: 0.01, fmt: (v) => (v * 100).toFixed(1) + "%" },
  gross_margin_mean: { label: "Gross Margin", min: 0.1, max: 0.9, step: 0.01, fmt: (v) => (v * 100).toFixed(1) + "%" },
  opex_ratio_mean: { label: "Opex Ratio", min: 0.05, max: 0.6, step: 0.01, fmt: (v) => (v * 100).toFixed(1) + "%" },
  cash_conversion_mean: { label: "Cash Conversion", min: 0.2, max: 1.5, step: 0.01, fmt: (v) => v.toFixed(2) },
  capex_ratio_mean: { label: "CapEx Ratio", min: 0.0, max: 0.2, step: 0.005, fmt: (v) => (v * 100).toFixed(1) + "%" },
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

export default function WhatIfPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<WhatIfOverrides>({ ...DEFAULT_OVERRIDES });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.state?.sessionId) {
      setSessionId(location.state.sessionId);
    }
    if (location.state?.baseMetrics) {
      const bm = location.state.baseMetrics;
      setOverrides({
        revenue_growth_mean: bm.revenue_growth_mean ?? DEFAULT_OVERRIDES.revenue_growth_mean,
        gross_margin_mean: bm.gross_margin_mean ?? DEFAULT_OVERRIDES.gross_margin_mean,
        opex_ratio_mean: bm.opex_ratio_mean ?? DEFAULT_OVERRIDES.opex_ratio_mean,
        cash_conversion_mean: bm.cash_conversion_mean ?? DEFAULT_OVERRIDES.cash_conversion_mean,
        capex_ratio_mean: bm.capex_ratio_mean ?? DEFAULT_OVERRIDES.capex_ratio_mean,
      });
    }
  }, [location.state]);

  const handleRun = async () => {
    if (!sessionId) return setError("No session data available. Please run an analysis first.");
    setLoading(true);
    setError("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/whatif`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, overrides }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "What-if projection failed");
      }
      const json = await res.json();
      setResults(json.data);
    } catch (e: any) {
      setError(e.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOverrides({ ...DEFAULT_OVERRIDES });
    setResults(null);
    setError("");
  };

  const isModified = Object.entries(DEFAULT_OVERRIDES).some(
    ([k, v]) => Math.abs(overrides[k as keyof WhatIfOverrides] - v) > 0.001
  );

  const baseResult = results?.base;
  const whatIfResult = results?.what_if;

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
                WHAT-IF BUILDER
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a] dark:text-white">
                Interactive <span className="text-[#8c52ff]">Projection</span>
              </h1>
              <p className="text-gray-500 dark:text-dark-400 mt-4 text-lg max-w-2xl">
                Adjust key financial drivers and instantly see the impact on your projections.
                No re-upload needed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="bg-white dark:bg-dark-900 border-2 border-[#8c52ff] text-[#8c52ff] px-6 py-3 rounded-full font-bold text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all shadow-sm flex items-center gap-2"
              >
                <FaArrowLeft /> Back
              </button>
              <button
                onClick={() => navigate("/product")}
                className="bg-white dark:bg-dark-900 border-2 border-gray-300 dark:border-dark-700 text-gray-600 dark:text-dark-300 px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
              >
                New Analysis
              </button>
            </div>
          </div>

          {!sessionId && !results && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-6 rounded-[30px] text-center mb-8">
              <FaTriangleExclamation className="text-2xl mx-auto mb-2" />
              <p className="font-bold text-lg">No analysis data available</p>
              <p className="text-sm mt-1">Upload financial PDFs and run a standard analysis first, then return here to explore what-if scenarios.</p>
              <button
                onClick={() => navigate("/product")}
                className="mt-4 bg-[#8c52ff] text-white px-8 py-2.5 rounded-full font-bold text-sm hover:bg-purple-700 transition-all"
              >
                Go to Upload
              </button>
            </div>
          )}

          {sessionId && !results && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-dark-900 p-8 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaFlask />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Adjust Parameters</h2>
                    {isModified && (
                      <button
                        onClick={handleReset}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#8c52ff] transition-colors"
                      >
                        <FaRotate /> Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {(Object.keys(PARAM_META) as (keyof WhatIfOverrides)[]).map((key) => {
                      const meta = PARAM_META[key];
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-dark-200">
                              {meta.label}
                            </label>
                            <span className="text-xs font-mono font-bold text-[#8c52ff] bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-lg">
                              {meta.fmt(overrides[key])}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={meta.min}
                            max={meta.max}
                            step={meta.step}
                            value={overrides[key]}
                            onChange={(e) =>
                              setOverrides((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))
                            }
                            className="w-full accent-[#8c52ff] h-2 rounded-full appearance-none bg-gray-200 dark:bg-dark-700 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-gray-400 dark:text-dark-500 mt-1">
                            <span>{meta.fmt(meta.min)}</span>
                            <span>{meta.fmt(meta.max)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-900 p-8 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                      <FaScaleBalanced />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">How It Works</h2>
                  </div>
                  <ul className="space-y-4 text-sm text-gray-600 dark:text-dark-300">
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">1.</span>
                      <span>Adjust the sliders to set your assumptions for each financial driver</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">2.</span>
                      <span>Click "Run Projection" to simulate 5,000 Monte Carlo paths with your new parameters</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">3.</span>
                      <span>Compare projected outcomes side-by-side with the base case</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#8c52ff] font-bold mt-0.5">4.</span>
                      <span>Fine-tune and re-run until you're satisfied — no PDF re-upload required</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-[20px] border border-purple-100 dark:border-purple-800">
                    <div className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1">Available Drivers</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["Revenue Growth", "Gross Margin", "Opex Ratio", "Cash Conversion", "CapEx Ratio"].map((d) => (
                        <span key={d} className="px-2.5 py-1 bg-white dark:bg-dark-800 rounded-full text-[10px] font-semibold text-gray-600 dark:text-dark-300 border border-purple-100 dark:border-dark-700">
                          {d}
                        </span>
                      ))}
                    </div>
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
                  className="bg-[#8c52ff] hover:bg-[#7a3fe0] disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
                >
                  {loading ? (
                    <><FaSpinner className="animate-spin" /> Running Projection...</>
                  ) : (
                    <><FaFlask /> Run Projection</>
                  )}
                </button>
              </div>
            </>
          )}

          {results && (
            <div className="space-y-8 mb-20">
              <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaChartColumn />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Projection Results</h2>
                    <span className="text-xs text-gray-500 dark:text-dark-400">
                      {results.num_simulations?.toLocaleString()} simulations
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRun}
                      disabled={loading}
                      className="bg-[#8c52ff] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : <FaRotate />} Re-run
                    </button>
                    <button
                      onClick={() => { setResults(null); setError(""); }}
                      className="bg-white dark:bg-dark-900 border-2 border-gray-300 dark:border-dark-700 text-gray-600 dark:text-dark-300 px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-50 transition-all"
                    >
                      New Scenario
                    </button>
                  </div>
                </div>

                {results.plot && (
                  <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-800/50 rounded-[20px] mb-6">
                    <img
                      src={results.plot as string}
                      alt="What-if comparison chart"
                      className="max-w-full h-auto rounded-lg shadow-sm"
                      style={{ maxHeight: "500px" }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {baseResult && (
                    <div className="bg-gray-50 dark:bg-dark-800/50 p-5 rounded-[20px] border border-gray-100 dark:border-dark-700">
                      <div className="text-xs font-bold text-gray-400 dark:text-dark-500 uppercase tracking-wider mb-1">Base Case</div>
                      <div className="text-lg font-extrabold text-gray-800 dark:text-white mb-3">Current Projection</div>
                      <div className="space-y-2">
                        <DisplayRow label="Revenue (Median)" value={formatVal(baseResult.revenue?.median)} />
                        <DisplayRow label="Revenue (P10-P90)" value={`${formatVal(baseResult.revenue?.p10)} – ${formatVal(baseResult.revenue?.p90)}`} />
                        <DisplayRow label="Cash (Median)" value={formatVal(baseResult.cash?.median)} />
                        <DisplayRow label="Cash (P5-P95)" value={`${formatVal(baseResult.cash?.p5)} – ${formatVal(baseResult.cash?.p95)}`} />
                        <DisplayRow label="Gross Margin" value={pct(baseResult.margins?.gross_margin_median / 100)} />
                        <DisplayRow label="Op. Margin" value={pct(baseResult.margins?.operating_margin_median / 100)} />
                        <DisplayRow label="Cash Neg. Prob." value={pct(baseResult.risk?.prob_cash_negative)} isRisk />
                        <DisplayRow label="Rev Decline Prob." value={pct(baseResult.risk?.prob_revenue_decline)} isRisk />
                      </div>
                    </div>
                  )}
                  {whatIfResult && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-[20px] border border-purple-200 dark:border-purple-800">
                      <div className="text-xs font-bold text-[#8c52ff] uppercase tracking-wider mb-1">What-If</div>
                      <div className="text-lg font-extrabold text-[#8c52ff] mb-3">Adjusted Projection</div>
                      <div className="space-y-2">
                        <DisplayRow label="Revenue (Median)" value={formatVal(whatIfResult.revenue?.median)} highlight />
                        <DisplayRow label="Revenue (P10-P90)" value={`${formatVal(whatIfResult.revenue?.p10)} – ${formatVal(whatIfResult.revenue?.p90)}`} />
                        <DisplayRow label="Cash (Median)" value={formatVal(whatIfResult.cash?.median)} highlight />
                        <DisplayRow label="Cash (P5-P95)" value={`${formatVal(whatIfResult.cash?.p5)} – ${formatVal(whatIfResult.cash?.p95)}`} />
                        <DisplayRow label="Gross Margin" value={pct(whatIfResult.margins?.gross_margin_median / 100)} />
                        <DisplayRow label="Op. Margin" value={pct(whatIfResult.margins?.operating_margin_median / 100)} />
                        <DisplayRow label="Cash Neg. Prob." value={pct(whatIfResult.risk?.prob_cash_negative)} isRisk />
                        <DisplayRow label="Rev Decline Prob." value={pct(whatIfResult.risk?.prob_revenue_decline)} isRisk />
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-dark-700">
                        <th className="text-left py-3 px-3 font-bold text-gray-700 dark:text-dark-300">Metric</th>
                        <th className="text-right py-3 px-3 font-bold text-gray-500">Base Case</th>
                        <th className="text-right py-3 px-3 font-bold text-[#8c52ff]">What-If</th>
                        <th className="text-right py-3 px-3 font-bold text-gray-700 dark:text-dark-300">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseResult && whatIfResult && [
                        { label: "Revenue (Median)", baseVal: baseResult.revenue?.median, wiVal: whatIfResult.revenue?.median, fmt: formatVal },
                        { label: "Revenue (P10)", baseVal: baseResult.revenue?.p10, wiVal: whatIfResult.revenue?.p10, fmt: formatVal },
                        { label: "Revenue (P90)", baseVal: baseResult.revenue?.p90, wiVal: whatIfResult.revenue?.p90, fmt: formatVal },
                        { label: "Cash (Median)", baseVal: baseResult.cash?.median, wiVal: whatIfResult.cash?.median, fmt: formatVal },
                        { label: "Cash (P5)", baseVal: baseResult.cash?.p5, wiVal: whatIfResult.cash?.p5, fmt: formatVal },
                        { label: "Cash (P95)", baseVal: baseResult.cash?.p95, wiVal: whatIfResult.cash?.p95, fmt: formatVal },
                        { label: "Gross Margin (Median)", baseVal: baseResult.margins?.gross_margin_median / 100, wiVal: whatIfResult.margins?.gross_margin_median / 100, fmt: pct },
                        { label: "Op. Margin (Median)", baseVal: baseResult.margins?.operating_margin_median / 100, wiVal: whatIfResult.margins?.operating_margin_median / 100, fmt: pct },
                        { label: "Rev Decline Prob.", baseVal: baseResult.risk?.prob_revenue_decline, wiVal: whatIfResult.risk?.prob_revenue_decline, fmt: pct },
                        { label: "Cash Negative Prob.", baseVal: baseResult.risk?.prob_cash_negative, wiVal: whatIfResult.risk?.prob_cash_negative, fmt: pct },
                      ].map((row) => {
                        const change = row.wiVal - row.baseVal;
                        const changePct = row.baseVal !== 0 ? ((change / Math.abs(row.baseVal)) * 100) : 0;
                        return (
                          <tr key={row.label} className="border-b border-gray-100 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800/30">
                            <td className="py-2.5 px-3 font-medium text-gray-700 dark:text-dark-300">{row.label}</td>
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-gray-600 dark:text-dark-400">{row.fmt(row.baseVal)}</td>
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-[#8c52ff]">{row.fmt(row.wiVal)}</td>
                            <td className={`text-right py-2.5 px-3 font-mono font-bold ${
                              change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-gray-500"
                            }`}>
                              {change > 0 ? "+" : ""}{changePct.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                    <FaFlask />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Parameters Applied</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(results.overrides_applied || {}).map(([key, val]) => {
                    const meta = PARAM_META[key as keyof WhatIfOverrides];
                    return meta ? (
                      <div key={key} className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800">
                        <span className="text-xs font-semibold text-gray-500 dark:text-dark-400">{meta.label}: </span>
                        <span className="text-sm font-bold text-[#8c52ff]">{meta.fmt(val as number)}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DisplayRow({ label, value, highlight, isRisk }: { label: string; value: string; highlight?: boolean; isRisk?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-medium text-gray-500 dark:text-dark-400">{label}</span>
      <span className={`text-sm font-bold font-mono ${
        isRisk ? (parseFloat(value) > 15 ? "text-red-600" : parseFloat(value) > 5 ? "text-amber-600" : "text-emerald-600")
        : highlight ? "text-[#8c52ff]" : "text-gray-800 dark:text-white"
      }`}>
        {value}
      </span>
    </div>
  );
}
