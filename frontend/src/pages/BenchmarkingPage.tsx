import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import FileUpload from "../assets/components/FileUpload";
import {
  FaArrowLeft,
  FaChartColumn,
  FaSpinner,
  FaBuilding,
  FaCircle,
} from "react-icons/fa6";

function formatVal(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return v.toFixed(2);
  }
  return String(v);
}

function pct(v: any): string {
  if (v === null || v === undefined) return "—";
  return (v).toFixed(1) + "%";
}

const UNIT_FORMATTERS: Record<string, (v: any) => string> = {
  currency: formatVal,
  pct: pct,
  ratio: (v: any) => v !== null && v !== undefined ? v.toFixed(2) : "—",
  count: (v: any) => v !== null && v !== undefined ? Math.round(v).toString() : "—",
};

export default function BenchmarkingPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRun = async () => {
    if (!files.length) return setError("Please upload at least one PDF.");
    if (files.length < 2) return setError("Please upload PDFs for at least 2 companies.");
    setLoading(true);
    setError("");

    const formData = new FormData();
    files.forEach((f) => formData.append("pdfFile", f));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/benchmark`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Benchmarking failed");
      }
      const json = await res.json();
      setResults(json.data);
    } catch (e: any) {
      setError(e.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const companies = results?.companies || [];
  const summary = results?.summary || [];
  const charts = results?.charts || {};

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
                MULTI-COMPANY BENCHMARKING
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a] dark:text-white">
                Benchmark <span className="text-[#8c52ff]">Comparison</span>
              </h1>
              <p className="text-gray-500 dark:text-dark-400 mt-4 text-lg max-w-2xl">
                Upload financial PDFs for multiple companies and compare their key metrics side by side.
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
                <div>
                  <FileUpload files={files} setFiles={setFiles} />
                  {files.length > 0 && (
                    <div className="mt-4 bg-white dark:bg-dark-900 p-4 rounded-[20px] shadow-sm border border-purple-50 dark:border-dark-700">
                      <p className="text-sm font-bold text-gray-700 dark:text-dark-300 mb-2">
                        {files.length} file{files.length > 1 ? "s" : ""} selected
                      </p>
                      <p className="text-xs text-gray-500">
                        {files.length < 2
                          ? "Upload at least 2 PDFs from different companies to compare."
                          : "Ready to benchmark!"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-purple-50 dark:border-dark-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                      <FaBuilding />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">How it works</h2>
                  </div>
                  <ol className="space-y-3 text-sm text-gray-600 dark:text-dark-300">
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-[#8c52ff] text-xs font-bold shrink-0">1</span>
                      Upload PDF financial statements for each company
                    </li>
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-[#8c52ff] text-xs font-bold shrink-0">2</span>
                      Our AI extracts and normalizes key financial metrics
                    </li>
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-[#8c52ff] text-xs font-bold shrink-0">3</span>
                      View side-by-side comparison with radar and bar charts
                    </li>
                  </ol>
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
                  disabled={loading || files.length < 2}
                  className="bg-[#8c52ff] hover:bg-[#7a3fe0] disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
                >
                  {loading ? (
                    <><FaSpinner className="animate-spin" /> Running Benchmark...</>
                  ) : (
                    <><FaChartColumn /> Compare Companies</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-8 mb-20">
              {/* Charts */}
              {Object.keys(charts).length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {charts.radar && (
                    <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Radar Comparison</h3>
                      <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-800/50 rounded-[20px]">
                        <img src={charts.radar} alt="Radar chart" className="max-w-full h-auto rounded-lg" style={{ maxHeight: "500px" }} />
                      </div>
                    </div>
                  )}
                  {charts.bar && (
                    <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Key Metrics Comparison</h3>
                      <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-800/50 rounded-[20px]">
                        <img src={charts.bar} alt="Bar chart" className="max-w-full h-auto rounded-lg" style={{ maxHeight: "500px" }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Company Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {companies.map((c: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                        <FaBuilding />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">{c.label || `Company ${idx + 1}`}</h3>
                    </div>
                    {c.error ? (
                      <p className="text-sm text-red-500">{c.error}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {c.metrics && Object.entries(c.metrics).map(([key, m]: [string, any]) => (
                          <div key={key} className="bg-gray-50 dark:bg-dark-800/50 p-3 rounded-xl">
                            <div className="text-[10px] font-bold text-gray-500 dark:text-dark-400 uppercase tracking-wider">{m.label || key}</div>
                            <div className="text-lg font-extrabold text-gray-800 dark:text-white mt-1">
                              {(UNIT_FORMATTERS[m.unit] || formatVal)(m.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {c.periods_analyzed && (
                      <p className="text-xs text-gray-400 mt-3">{c.periods_analyzed} periods analyzed</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary Table */}
              {summary.length > 0 && (
                <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Metric Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-dark-700">
                          <th className="text-left py-3 px-3 font-bold text-gray-700 dark:text-dark-300">Metric</th>
                          {companies.map((c: any, i: number) => (
                            <th key={i} className="text-right py-3 px-3 font-bold text-[#8c52ff]">{c.label || `C${i+1}`}</th>
                          ))}
                          <th className="text-right py-3 px-3 font-bold text-gray-500">Average</th>
                          <th className="text-right py-3 px-3 font-bold text-green-600">Best</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800/30">
                            <td className="py-2.5 px-3 font-medium text-gray-700 dark:text-dark-300">{row.metric_label}</td>
                            {row.values.map((v: any, j: number) => {
                              const isBest = v === row.best && row.best !== row.worst;
                              return (
                                <td key={j} className={`text-right py-2.5 px-3 font-mono font-bold ${
                                  isBest ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"
                                }`}>
                                  {v !== null && v !== undefined ? formatVal(v) : "—"}
                                </td>
                              );
                            })}
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-gray-500">
                              {row.average !== null && row.average !== undefined ? formatVal(row.average) : "—"}
                            </td>
                            <td className="text-right py-2.5 px-3 font-mono font-bold text-green-600">
                              {row.best !== null && row.best !== undefined ? formatVal(row.best) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => { setResults(null); setError(""); }}
                  className="bg-white dark:bg-dark-900 border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all shadow-sm"
                >
                  New Benchmark
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
