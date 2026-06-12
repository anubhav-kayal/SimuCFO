import { Link } from "react-router-dom";
import { FaXTwitter, FaLinkedin, FaGithub, FaInstagram } from "react-icons/fa6";

const footerLinks = {
  Product: [
    { label: "Features", href: "#" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Launch App", href: "/product" },
  ],
  Company: [
    { label: "About", href: "/#about" },
    { label: "Services", href: "/#service" },
    { label: "Contact", href: "/#contact" },
  ],
  Support: [
    { label: "FAQ", href: "/#faq" },
    { label: "Documentation", href: "#" },
    { label: "Status", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">S</span>
              <span className="text-dark-900 dark:text-white">Simu</span>
              <span className="gradient-text">CFO</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-dark-400 dark:text-dark-400 leading-relaxed">
              AI-powered financial intelligence for modern CFOs. Monte Carlo simulations, anomaly detection, and automated reporting.
            </p>
            <div className="mt-6 flex gap-4">
              {[FaXTwitter, FaLinkedin, FaGithub, FaInstagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-dark-200 text-dark-400 transition-colors hover:border-accent hover:text-accent dark:border-dark-700 dark:hover:border-accent"
                >
                  <Icon className="text-sm" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-dark-400 transition-colors hover:text-accent dark:text-dark-400 dark:hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-dark-100 pt-8 sm:flex-row dark:border-dark-800">
          <p className="text-sm text-dark-400 dark:text-dark-500">
            &copy; {new Date().getFullYear()} SimuCFO. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-dark-400 dark:text-dark-500">
            <a href="#" className="hover:text-accent transition-colors">Privacy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
