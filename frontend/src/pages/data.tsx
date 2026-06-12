import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import Footer from "../assets/components/Footer";
import { FaArrowLeft, FaChartLine, FaBrain, FaRobot, FaTriangleExclamation, FaChartColumn } from "react-icons/fa6";

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

  useEffect(() => {
    if (location.state?.data) {
      const d = location.state.data;
      setData(d.answer || d.analysis || d);
      if (d.plotImage) setPlot(d.plotImage);
      if (d.interpretation) setInterpretation(d.interpretation);
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
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent dark:bg-accent/10 mb-3">
              <FaChartColumn /> Analysis Results
            </div>
            <h1 className="text-3xl font-extrabold text-dark-900 dark:text-white">
              Financial <span className="gradient-text">Deep Dive</span>
            </h1>
            {data?.question && (
              <p className="mt-2 text-dark-400 dark:text-dark-400 max-w-xl">
                &ldquo;{data.question}&rdquo;
              </p>
            )}
          </div>
          <button onClick={() => navigate("/product")} className="btn-ghost text-sm whitespace-nowrap">
            <FaArrowLeft /> New Analysis
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            {interpretation && (
              <div className="card p-6 relative overflow-hidden">
                <div className="absolute top-[-60px] right-[-60px] h-32 w-32 rounded-full bg-accent/10 blur-[60px]" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <FaBrain className="text-accent" />
                    <h2 className="text-sm font-bold text-dark-700 dark:text-dark-200 uppercase tracking-wider">AI Interpretation</h2>
                  </div>
                  <div className="text-sm text-dark-500 dark:text-dark-300 leading-relaxed whitespace-pre-wrap">
                    {interpretation}
                  </div>
                </div>
              </div>
            )}

            {plot && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaChartLine className="text-accent" />
                  <h2 className="text-sm font-bold text-dark-700 dark:text-dark-200 uppercase tracking-wider">Probability Distribution</h2>
                </div>
                <img src={plot} alt="Monte Carlo distribution" className="w-full rounded-xl bg-dark-50 dark:bg-dark-900" />
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <FaRobot className="text-accent" />
                <h2 className="text-sm font-bold text-dark-700 dark:text-dark-200 uppercase tracking-wider">Computed Metrics</h2>
              </div>

              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-dark-400 dark:text-dark-500">
                  <FaTriangleExclamation className="text-3xl mb-3" />
                  <p className="text-sm">No computed metrics available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {entries.map(([key, value]) => {
                    const numeric = isNumeric(value);
                    const isRisk = key.toLowerCase().includes("risk") || key.toLowerCase().includes("level");
                    const isProb = key.toLowerCase().includes("probabilit") || key.toLowerCase().includes("chance");

                    let badge = "";
                    if (isRisk && typeof value === "string") {
                      badge = value.toUpperCase();
                    }

                    return (
                      <div key={key} className="card-hover p-5">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-dark-400 dark:text-dark-400 uppercase tracking-wider">{formatKey(key)}</span>
                          {badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              badge === "HIGH" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                              badge === "MEDIUM" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                              badge === "LOW" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              "bg-dark-100 text-dark-500 dark:bg-dark-800 dark:text-dark-400"
                            }`}>{badge}</span>
                          )}
                        </div>

                        {typeof value === "object" && value !== null ? (
                          <div className="space-y-1.5">
                            {Object.entries(value as Record<string, unknown>).map(([sk, sv]) => (
                              <div key={sk} className="flex items-center justify-between text-sm">
                                <span className="text-dark-400 dark:text-dark-400">{formatKey(sk)}</span>
                                <span className={`font-semibold ${
                                  isProb ? (
                                    isNumeric(sv) && sv > 0.5 ? "text-red-500" :
                                    isNumeric(sv) && sv > 0.2 ? "text-amber-500" : "text-emerald-500"
                                  ) : "text-dark-900 dark:text-white"
                                }`}>{formatVal(sv)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`text-2xl font-extrabold ${
                            isProb && numeric ? (
                              value > 0.5 ? "text-red-500" :
                              value > 0.2 ? "text-amber-500" : "text-emerald-500"
                            ) : numeric ? "text-dark-900 dark:text-white" : "text-dark-900 dark:text-white"
                          }`}>
                            {isProb && numeric ? (Number(value) * 100).toFixed(1) + "%" : formatVal(value)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
