import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaFilePdf, FaRobot, FaChartLine, FaCircleCheck, FaSpinner } from "react-icons/fa6";

const STEPS = [
  { icon: FaFilePdf, label: "Uploading documents" },
  { icon: FaRobot, label: "Extracting financial data" },
  { icon: FaChartLine, label: "Running Monte Carlo" },
  { icon: FaCircleCheck, label: "Generating report" },
];

export default function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const { files, question } = location.state || { files: [], question: "" };
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!files?.length) {
      navigate("/product", { replace: true });
      return;
    }
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const progress = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 2500);

    const process = async () => {
      setStatus("Uploading documents...");
      const formData = new FormData();
      files.forEach((f: File) => formData.append("pdfFile", f));
      formData.append("question", question);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/upload`, { method: "POST", body: formData });
        clearInterval(progress);
        setStep(STEPS.length - 1);

        if (res.ok) {
          const json = await res.json();
          setStatus("Complete!");
          setTimeout(() => navigate("/data", { state: { data: json.data, sessionId: json.sessionId } }), 800);
        } else {
          setStatus("Analysis failed. Redirecting...");
          setTimeout(() => navigate("/product", { replace: true }), 2500);
        }
      } catch {
        clearInterval(progress);
        setStatus("Connection error. Redirecting...");
        setTimeout(() => navigate("/product", { replace: true }), 2500);
      }
    };

    process();
  }, [files, navigate, question]);

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="card p-8 text-center">
          <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <FaSpinner className="text-3xl text-accent animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Processing Your Analysis</h2>
          <p className="text-sm text-dark-400 dark:text-dark-400 mb-10 max-w-sm mx-auto">
            Our AI engine is extracting metrics, running simulations, and preparing your report.
          </p>

          <div className="space-y-4 text-left">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              const Icon = s.icon;
              return (
                <div key={s.label} className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-500 ${
                  active
                    ? "border-accent/30 bg-accent/5 dark:bg-accent/10"
                    : done
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/10"
                    : "border-dark-100 dark:border-dark-800 opacity-40"
                }`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-all ${
                    done
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : active
                      ? "bg-accent/10 text-accent"
                      : "bg-dark-100 text-dark-400 dark:bg-dark-800 dark:text-dark-500"
                  }`}>
                    {done ? <FaCircleCheck /> : active ? <FaSpinner className="animate-spin" /> : <Icon />}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${
                      done ? "text-emerald-700 dark:text-emerald-400" : active ? "text-accent" : "text-dark-500 dark:text-dark-400"
                    }`}>{s.label}</p>
                    <p className="text-xs text-dark-400 dark:text-dark-500">
                      {done ? "Completed" : active ? status : "Waiting"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
