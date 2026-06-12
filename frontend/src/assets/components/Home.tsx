import { Link } from "react-router-dom";
import { FaArrowRight, FaChartLine, FaShield, FaBrain, FaRocket } from "react-icons/fa6";

const stats = [
  { value: "10K+", label: "Simulations / run" },
  { value: "32", label: "Financial metrics" },
  { value: "99.9%", label: "Uptime SLA" },
];

const features = [
  { icon: FaChartLine, label: "Monte Carlo Forecasting" },
  { icon: FaShield, label: "Anomaly Detection" },
  { icon: FaBrain, label: "ML Predictions" },
  { icon: FaRocket, label: "Auto Reporting" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent dark:bg-accent/10">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            AI-Powered Financial Intelligence
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-dark-900 sm:text-5xl lg:text-6xl dark:text-white">
            Your AI-Powered{" "}
            <span className="gradient-text">CFO Co-Pilot</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-dark-400 dark:text-dark-300 max-w-2xl mx-auto">
            Move beyond static dashboards. Upload financial documents, ask
            complex questions, and get instant Monte Carlo simulations with
            board-ready insights.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/product" className="btn-primary text-base px-8 py-4">
              Start Analysis <FaArrowRight />
            </Link>
            <a href="#service" className="btn-ghost text-base px-8 py-4">
              See How It Works
            </a>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm text-dark-400 dark:text-dark-400">
                <f.icon className="text-accent" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="card p-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dark-100 dark:divide-dark-800">
          {stats.map((s) => (
            <div key={s.value} className="py-6 sm:py-0 sm:px-8 first:pl-0 last:pr-0 text-center">
              <div className="text-3xl font-extrabold gradient-text">{s.value}</div>
              <div className="mt-1 text-sm text-dark-400 dark:text-dark-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[20%] top-[10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] dark:bg-accent/8" />
        <div className="absolute right-[20%] bottom-[20%] h-[400px] w-[400px] rounded-full bg-violet-500/5 blur-[100px] dark:bg-violet-500/10" />
      </div>
    </section>
  );
}
