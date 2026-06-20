import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import FileUpload from "../assets/components/FileUpload";
import {
  FaFlask,
  FaPlus,
  FaTrashCan,
  FaArrowLeft,
  FaChartColumn,
  FaSpinner,
} from "react-icons/fa6";

interface ScenarioOverride {
  revenue_growth_mean: number;
  gross_margin_mean: number;
  opex_ratio_mean: number;
  cash_conversion_mean: number;
}

interface Scenario {
  name: string;
  overrides: ScenarioOverride;
}

const DEFAULT_OVERRIDES: ScenarioOverride = {
  revenue_growth_mean: 0.15,
  gross_margin_mean: 0.55,
  opex_ratio_mean: 0.28,
  cash_conversion_mean: 0.85,
};

const SCENARIO_PRESETS = [
  { label: "Base Case", overrides: { ...DEFAULT_OVERRIDES } },
  { label: "Optimistic", overrides: { ...DEFAULT_OVERRIDES, revenue_growth_mean: 0.30, gross_margin_mean: 0.65 } },
  { label: "Pessimistic", overrides: { ...DEFAULT_OVERRIDES, revenue_growth_mean: 0.0, gross_margin_mean: 0.40 } },
];

function defaultScenarios(): Scenario[] {
  return SCENARIO_PRESETS.map((p) => ({
    name: p.label,
    overrides: { ...p.overrides },
  }));
}

function formatVal(v: number): string {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

const PARAM_META: Record<keyof ScenarioOverride, { label: string; min: number; max: number; step: number; fmt: (v: number) => string }> = {
  revenue_growth_mean: { label: "Revenue Growth", min: -0.2, max: 0.5, step: 0.01, fmt: pct },
  gross_margin_mean: { label: "Gross Margin", min: 0.1, max: 0.9, step: 0.01, fmt: pct },
  opex_ratio_mean: { label: "Opex Ratio", min: 0.05, max: 0.6, step: 0.01, fmt: pct },
  cash_conversion_mean: { label: "Cash Conversion", min: 0.2, max: 1.5, step: 0.01, fmt: (v) => v.toFixed(2) },
};

export default function ScenarioPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const updateScenario = (i: number, field: keyof ScenarioOverride, value: number) => {
    setScenarios((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], overrides: { ...next[i].overrides, [field]: value } };
      return next;
    });
  };

  const updateName = (i: number, name: string) => {
    setScenarios((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], name };
      return next;
    });
  };

  const addScenario = () => {
    setScenarios((prev) => [
      ...prev,
      { name: `Scenario ${prev.length + 1}`, overrides: { ...DEFAULT_OVERRIDES } },
    ]);
  };

  const removeScenario = (i: number) => {
    if (scenarios.length <= 2) return;
    setScenarios((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleCompare = async () => {
    if (!files.length) return setError("Please upload at least one PDF.");
    if (scenarios.length < 2) return setError("Please define at least 2 scenarios.");
    setLoading(true);
    setError("");

    const formData = new FormData();
    files.forEach((f) => formData.append("pdfFile", f));
    formData.append("scenarios", JSON.stringify(scenarios));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/compare`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Comparison failed");
      }
      const json = await res.json();
      setResults(json.data);
    } catch (e: any) {
      setError(e.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

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
                SCENARIO COMPARISON
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a] dark:text-white">
                What-If <span className="text-[#8c52ff]">Analysis</span>
              </h1>
              <p className="text-gray-500 dark:text-dark-400 mt-4 text-lg max-w-2xl">
                Define multiple scenarios to compare financial outcomes side by side.
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

                <div>
                  <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-purple-50 dark:border-dark-700">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                          <FaFlask />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Scenarios</h2>
                      </div>
                      {scenarios.length < 5 && (
                        <button
                          onClick={addScenario}
                          className="flex items-center gap-1 text-sm font-semibold text-[#8c52ff] hover:text-purple-700 transition-colors"
                        >
                          <FaPlus /> Add
                        </button>
                      )}
                    </div>

                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                      {scenarios.map((sc, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 dark:bg-dark-800/50 p-4 rounded-[20px] border border-gray-100 dark:border-dark-700"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <input
                              value={sc.name}
                              onChange={(e) => updateName(i, e.target.value)}
                              className="text-sm font-bold text-gray-800 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#8c52ff] focus:outline-none px-1 py-0.5 w-40"
                            />
                            {scenarios.length > 2 && (
                              <button
                                onClick={() => removeScenario(i)}
                                className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                              >
                                <FaTrashCan />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {(Object.keys(PARAM_META) as (keyof ScenarioOverride)[]).map((key) => {
                              const meta = PARAM_META[key];
                              return (
                                <div key={key} className="flex flex-col gap-1">
                                  <label className="text-[10px] font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                                    {meta.label}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min={meta.min}
                                      max={meta.max}
                                      step={meta.step}
                                      value={sc.overrides[key]}
                                      onChange={(e) => updateScenario(i, key, parseFloat(e.target.value))}
                                      className="flex-1 accent-[#8c52ff] h-1.5"
                                    />
                                    <span className="text-xs font-mono font-bold text-gray-700 dark:text-dark-300 w-14 text-right">
                                      {meta.fmt(sc.overrides[key])}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
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
                  onClick={handleCompare}
                  disabled={loading}
                  className="bg-[#8c52ff] hover:bg-[#7a3fe0] disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
                >
                  {loading ? (
                    <><FaSpinner className="animate-spin" /> Running Comparison...</>
                  ) : (
                    <><FaFlask /> Compare Scenarios</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-8 mb-20">
              <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                    <FaChartColumn />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Comparison Results</h2>
                  <span className="text-xs text-gray-500 dark:text-dark-400 ml-auto">
                    {results.num_simulations?.toLocaleString()} simulations per scenario
                  </span>
                </div>

                {results.plot && (
                  <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-800/50 rounded-[20px] mb-6">
                    <img
                      src={results.plot as string}
                      alt="Scenario comparison chart"
                      className="max-w-full h-auto rounded-lg shadow-sm"
                      style={{ maxHeight: "600px" }}
                    />
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-dark-700">
                        <th className="text-left py-3 px-3 font-bold text-gray-700 dark:text-dark-300">Metric</th>
                        {results.scenarios?.map((s: any) => (
                          <th key={s.name} className="text-right py-3 px-3 font-bold text-[#8c52ff]">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Revenue (P10)", get: (s: any) => formatVal(s.revenue?.p10) },
                        { label: "Revenue (Median)", get: (s: any) => formatVal(s.revenue?.median) },
                        { label: "Revenue (P90)", get: (s: any) => formatVal(s.revenue?.p90) },
                        { label: "Rev Decline Prob.", get: (s: any) => pct(s.revenue?.prob_decline) },
                        { label: "Cash (P5)", get: (s: any) => formatVal(s.cash?.p5) },
                        { label: "Cash (Median)", get: (s: any) => formatVal(s.cash?.median) },
                        { label: "Cash (P95)", get: (s: any) => formatVal(s.cash?.p95) },
                        { label: "Cash Negative Prob.", get: (s: any) => pct(s.cash?.prob_negative) },
                        { label: "Gross Margin (Median)", get: (s: any) => pct(s.margins?.gross_margin_median / 100) },
                        { label: "Op. Margin (Median)", get: (s: any) => pct(s.margins?.operating_margin_median / 100) },
                        { label: "Revenue Risk", get: (s: any) => s.risk?.revenue_risk },
                        { label: "Cash Risk", get: (s: any) => s.risk?.cash_risk },
                      ].map((row) => (
                        <tr key={row.label} className="border-b border-gray-100 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800/30">
                          <td className="py-2.5 px-3 font-medium text-gray-700 dark:text-dark-300">{row.label}</td>
                          {results.scenarios?.map((s: any) => {
                            const val = row.get(s);
                            const isHigh = val === "HIGH";
                            const isLow = val === "LOW";
                            return (
                              <td
                                key={s.name}
                                className={`text-right py-2.5 px-3 font-mono font-bold ${
                                  isHigh ? "text-red-600 dark:text-red-400" :
                                  isLow ? "text-emerald-600 dark:text-emerald-400" :
                                  "text-gray-900 dark:text-white"
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => { setResults(null); setError(""); }}
                  className="bg-white dark:bg-dark-900 border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all shadow-sm"
                >
                  New Comparison
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
