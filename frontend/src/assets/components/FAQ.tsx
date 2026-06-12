import { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa6";

const faqs = [
  { q: "Is my financial data secure?", a: "Yes. We use bank-grade AES-256 encryption. Your data is processed in an isolated environment and never shared." },
  { q: "How accurate are the AI predictions?", a: "Our models provide probability-based forecasts (e.g., 95% confidence). We run thousands of Monte Carlo simulations to show you the range of likely outcomes." },
  { q: "Can I upload Excel files?", a: "Yes, we support PDF, CSV, and XLSX formats for direct data ingestion." },
  { q: "Do you offer a free trial?", a: "Yes, the Starter plan is completely free forever. You can try the Pro features with a 14-day trial." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-dark-50 dark:bg-dark-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center text-dark-900 dark:text-white mb-16 tracking-tight">
          Frequently Asked Questions
        </h2>

        <div className="divide-y divide-dark-100 dark:divide-dark-800">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="py-6">
                <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between text-left group">
                  <span className={`text-base font-semibold transition-colors ${isOpen ? "text-accent" : "text-dark-700 dark:text-dark-200 group-hover:text-dark-900 dark:group-hover:text-white"}`}>
                    {faq.q}
                  </span>
                  <span className={`ml-6 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                    {isOpen ? <FaMinus className="text-accent" /> : <FaPlus className="text-dark-400" />}
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-40 opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
                  <p className="text-sm text-dark-400 dark:text-dark-400 leading-relaxed pr-8">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
