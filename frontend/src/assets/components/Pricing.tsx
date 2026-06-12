import { FaCheck } from "react-icons/fa6";

const plans = [
  {
    name: "Starter",
    desc: "Essential tools for small businesses.",
    price: "$0",
    period: "/month",
    features: ["Basic Cash Flow Trends", "5 Document Uploads/mo", "Standard Support", "1 User Seat"],
    popular: false,
  },
  {
    name: "Pro CFO",
    desc: "AI-powered predictions for growing teams.",
    price: "$49",
    period: "/month",
    features: ["Unlimited Monte Carlo Sims", "50 RAG Document Uploads", "Anomaly Detection", "Board-Ready Reports", "Priority Support"],
    popular: true,
  },
  {
    name: "Enterprise",
    desc: "Custom solutions for large organizations.",
    price: "$199",
    period: "/month",
    features: ["API Access", "Custom ML Models", "Dedicated Account Manager", "SSO & Advanced Security", "Unlimited Seats"],
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white dark:bg-dark-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-dark-900 sm:text-4xl dark:text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-dark-400 dark:text-dark-300">
            Start for free, upgrade when you need the full power of our AI financial engine.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-center">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                p.popular
                  ? "border-accent/40 bg-white shadow-xl shadow-accent/5 scale-105 z-10 dark:bg-dark-850 dark:shadow-accent/10"
                  : "border-dark-100 bg-white dark:border-dark-700 dark:bg-dark-850 shadow-sm"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              )}

              <h3 className={`text-xl font-bold mb-1 ${p.popular ? "text-accent" : "text-dark-900 dark:text-white"}`}>{p.name}</h3>
              <p className="text-sm text-dark-400 dark:text-dark-400 mb-5 min-h-[40px]">{p.desc}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-dark-900 dark:text-white">{p.price}</span>
                <span className="text-sm text-dark-400">{p.period}</span>
              </div>

              <button
                className={`w-full rounded-xl py-3 text-sm font-bold transition-all mb-8 ${
                  p.popular
                    ? "btn-primary"
                    : "border border-dark-200 text-dark-700 hover:bg-dark-100 dark:border-dark-600 dark:text-dark-200 dark:hover:bg-dark-800"
                }`}
              >
                Choose {p.name}
              </button>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">What's included</p>
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full ${
                      p.popular ? "bg-accent/10 text-accent" : "bg-dark-100 text-dark-500 dark:bg-dark-700 dark:text-dark-400"
                    }`}>
                      <FaCheck className="text-[8px]" />
                    </div>
                    <span className="text-sm text-dark-500 dark:text-dark-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
