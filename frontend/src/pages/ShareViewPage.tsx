import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../assets/components/Navbar";

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${apiUrl}/share/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setData(json.data);
        else setError("Share not found or expired.");
      })
      .catch(() => setError("Failed to load shared analysis."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] dark:bg-dark-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#8c52ff] font-semibold">
          <div className="h-5 w-5 rounded-full border-2 border-[#8c52ff] border-t-transparent animate-spin" />
          Loading shared analysis...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] dark:bg-dark-950 font-sans">
        <Navbar />
        <main className="flex-grow px-[5%] py-20 text-center">
          <div className="max-w-lg mx-auto bg-white dark:bg-dark-900 p-10 rounded-[30px] shadow-sm">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Link Expired</h1>
            <p className="text-gray-500 dark:text-dark-400 mb-6">{error || "This share link is no longer valid."}</p>
            <Link to="/product" className="inline-block bg-[#8c52ff] text-white px-8 py-3 rounded-full font-bold hover:bg-purple-700 transition-all">
              Start New Analysis
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const question = data.question || "Financial Analysis";
  const reasoning = data.reasoning || "";
  const answer = data.answer || {};
  const ratioDashboard = data.ratioDashboard || null;
  const anomalyDetection = data.anomalyDetection || null;
  const fanCharts = data.fanCharts || null;
  const plot = data.plotImage || null;

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-dark-950 font-sans">
      <Navbar />
      <main className="px-[5%] py-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-wider">Shared Analysis</span>
              <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white mt-1">{question}</h1>
            </div>
            <Link to="/product" className="bg-[#8c52ff] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-purple-700 transition-all">
              Try SimuCFO
            </Link>
          </div>
        </div>

        {plot && (
          <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700 mb-6">
            <img src={plot} alt="Distribution" className="max-w-full h-auto rounded-lg" style={{ maxHeight: "500px" }} />
          </div>
        )}

        {fanCharts && Object.keys(fanCharts).length > 0 && (
          <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700 mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Forecast Fan Charts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(fanCharts).map(([key, img]) => (
                <img key={key} src={img as string} alt={`${key} fan chart`} className="max-w-full h-auto rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {Object.keys(answer).length > 0 && (
          <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700 mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Key Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(answer).filter(([k]) => k !== "question").map(([key, val]) => (
                <div key={key} className="bg-gray-50 dark:bg-dark-800/50 p-3 rounded-[16px] border border-gray-100 dark:border-dark-700">
                  <div className="text-[10px] font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider mb-1">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="text-lg font-extrabold text-gray-800 dark:text-white">
                    {typeof val === "object" ? JSON.stringify(val) : String(typeof val === "number" ? (val % 1 ? val.toFixed(2) : val) : val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reasoning && (
          <div className="bg-[#1a1a1a] text-white p-6 rounded-[30px] mb-6">
            <h2 className="text-lg font-bold mb-3">AI Interpretation</h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{reasoning.replace(/[*=]/g, "").trim()}</div>
          </div>
        )}

        <div className="text-center pb-8">
          <Link to="/product" className="inline-block bg-[#8c52ff] text-white px-10 py-3 rounded-full font-bold text-lg hover:bg-purple-700 transition-all shadow-lg">
            Run Your Own Analysis
          </Link>
        </div>
      </main>
    </div>
  );
}
