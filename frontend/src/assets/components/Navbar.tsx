import { Link, useLocation } from "react-router-dom";
import { FaSun, FaMoon, FaBars, FaXmark } from "react-icons/fa6";
import { useTheme } from "../../context/ThemeContext";
import { useState } from "react";

const links = [
  { label: "Product", href: "/product" },
  { label: "Scenario", href: "/scenario" },
  { label: "Ratios", href: "/ratios" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#service" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === "/";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-dark-100/60 dark:border-dark-800 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">S</span>
          <span className="text-dark-900 dark:text-white">Simu</span>
          <span className="gradient-text">CFO</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-900 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          {!isHome && (
            <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-900 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white">
              Home
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-dark-200 bg-white text-sm text-dark-500 transition-all hover:bg-dark-100 hover:text-dark-900 dark:border-dark-700 dark:bg-dark-850 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>

          <Link
            to="/product"
            className="hidden sm:inline-flex btn-primary text-sm px-5 py-2"
          >
            Launch App
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-dark-200 dark:border-dark-700 text-dark-500 dark:text-dark-400"
          >
            {mobileOpen ? <FaXmark /> : <FaBars />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-950 md:hidden">
          <div className="space-y-1 px-4 pb-4 pt-2">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-dark-500 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-800"
              >
                {l.label}
              </Link>
            ))}
            {!isHome && (
              <Link to="/" onClick={() => setMobileOpen(false)} className="block rounded-lg px-4 py-2.5 text-sm font-medium text-dark-500 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-800">
                Home
              </Link>
            )}
            <Link
              to="/product"
              onClick={() => setMobileOpen(false)}
              className="btn-primary text-sm mt-3 w-full"
            >
              Launch App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
