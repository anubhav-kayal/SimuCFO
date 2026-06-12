import { FaCode, FaLightbulb, FaRocket } from "react-icons/fa6";

const features = [
  { icon: FaRocket, title: "Monte Carlo Sims", desc: "Advanced cash flow forecasting and probability-based scenario analysis." },
  { icon: FaLightbulb, title: "ML Forecasting", desc: "Predictive models for revenue, expenses, and burn-rate trends." },
  { icon: FaCode, title: "Anomaly Detection", desc: "Identifies irregular transactions and prevents cost leakages instantly." },
  { icon: FaRocket, title: "Cost Optimization", desc: "AI-driven suggestions to cut costs and reallocate spend efficiently." },
  { icon: FaLightbulb, title: "Board-Ready Reports", desc: "One-click generation of investor summaries and visual dashboards." },
  { icon: FaCode, title: "Visual Trust", desc: "Interactive graphs comparing actual vs. predicted outcomes." },
];

export default function About() {
  return (
    <section id="about" className="relative py-24 overflow-hidden bg-dark-50 dark:bg-dark-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
          <div>
            <div className="card relative overflow-hidden p-8 sm:p-12">
              <div className="absolute top-0 right-0 bg-accent text-white text-xs font-bold px-5 py-2 rounded-bl-2xl">
                HACKATHON PROJECT
              </div>
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-3">
                <FaCode /> BUILT WITH PASSION
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-dark-900 dark:text-white mb-6">
                More Than a Tool.<br />An AI CFO.
              </h2>
              <p className="text-dark-400 dark:text-dark-300 leading-relaxed mb-4">
                We are building SimuCFO with a single mission: to prove that financial intelligence can be automated, accurate, and explainable.
              </p>
              <p className="text-dark-400 dark:text-dark-300 leading-relaxed">
                By combining <strong className="text-dark-700 dark:text-dark-200">Machine Learning</strong>,{" "}
                <strong className="text-dark-700 dark:text-dark-200">Monte Carlo simulations</strong>, and{" "}
                <strong className="text-dark-700 dark:text-dark-200">RAG technology</strong>, we aren't just reporting the future — we are helping CFOs confidently decide it.
              </p>
              <div className="mt-8 pt-8 border-t border-dark-100 dark:border-dark-800 flex gap-8">
                <div>
                  <span className="block text-3xl font-bold gradient-text">98%</span>
                  <span className="text-sm text-dark-400">Accuracy Goal</span>
                </div>
                <div>
                  <span className="block text-3xl font-bold gradient-text">24/7</span>
                  <span className="text-sm text-dark-400">Monitoring</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card-hover group p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                    <Icon />
                  </div>
                  <h4 className="font-semibold text-dark-900 dark:text-white mb-1.5">{f.title}</h4>
                  <p className="text-sm text-dark-400 leading-snug">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
